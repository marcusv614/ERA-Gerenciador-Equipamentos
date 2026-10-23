package br.com.era.api.service;
import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.MovimentacaoRepository;
import br.com.era.api.repository.SolicitacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
@Service
public class SolicitacaoService {
    private final SolicitacaoRepository repository; private final EquipamentoRepository equipamentos; private final MovimentacaoRepository movimentacoes; private final ObraService obras; private final FuncionarioService funcionarios; private final EquipamentoService equipamentoService; private final UsuarioService usuarios; private final InventarioHistoricoService inventarioHistorico; private final NotificacaoMovimentacaoService notificacoes;
    public SolicitacaoService(SolicitacaoRepository repository,EquipamentoRepository equipamentos,MovimentacaoRepository movimentacoes,ObraService obras,FuncionarioService funcionarios,EquipamentoService equipamentoService,UsuarioService usuarios,InventarioHistoricoService inventarioHistorico,NotificacaoMovimentacaoService notificacoes){this.repository=repository;this.equipamentos=equipamentos;this.movimentacoes=movimentacoes;this.obras=obras;this.funcionarios=funcionarios;this.equipamentoService=equipamentoService;this.usuarios=usuarios;this.inventarioHistorico=inventarioHistorico;this.notificacoes=notificacoes;}
    @Transactional(readOnly=true) public List<SolicitacaoDto.Resposta> listar(){return repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).map(this::resposta).toList();}
    @Transactional(readOnly=true) public List<SolicitacaoDto.Resposta> listarParaUsuario(String login){
        Usuario usuario=usuarios.buscarPorLogin(login);
        if(usuario.getPerfil()==PerfilUsuario.GERENTE)return repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(s->!EscopoEquipamento.pedidoContemEpi(s)).map(this::resposta).toList();
        if(usuario.getPerfil()==PerfilUsuario.RH)return repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(this::pertenceAoRh).map(this::resposta).toList();
        if(usuario.getPerfil()==PerfilUsuario.FINANCEIRO)return repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(this::visivelFinanceiro).filter(PedidosFinanceiros::permiteAnalise).map(this::respostaFinanceira).toList();
        if(usuario.getPerfil()==PerfilUsuario.ESTOQUE)return repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(this::liberadaParaEstoque).map(this::resposta).toList();
        if(!usuario.getPerfil().ehProfissionalDeCampo())return listar();
        if(usuario.getFuncionario()==null)throw new RegraNegocioException("O usuário técnico ou TST precisa estar vinculado a um funcionário.");
        Set<Long> permitidas=obras.idsPermitidos(login);return repository.findByTecnicoIdOrderByCriadoEmDesc(usuario.getFuncionario().getId()).stream().filter(s->"Movimentação".equals(s.getTipo())).map(s->respostaTecnico(s,permitidas)).toList();
    }
    @Transactional(readOnly=true) public List<br.com.era.api.dto.PedidoFinanceiroDto.Resposta> listarPedidosFinanceiros(String login){
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.FINANCEIRO).contains(usuarios.buscarPorLogin(login).getPerfil()))throw new AccessDeniedException("Somente o Financeiro e o administrador podem consultar os pedidos financeiros.");
        return PedidosFinanceiros.consolidar(repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(this::visivelFinanceiro).toList(),this::respostaFinanceira);
    }
    @Transactional(readOnly=true) public List<br.com.era.api.dto.PedidoFinanceiroDto.Resposta> listarPedidosRh(String login){
        var perfil=usuarios.buscarPorLogin(login).getPerfil();
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.RH).contains(perfil))throw new AccessDeniedException("Consulta exclusiva do RH.");
        return PedidosFinanceiros.consolidar(repository.findAll().stream().filter(s->"Movimentação".equals(s.getTipo())).filter(this::pertenceAoRh).toList(),this::resposta,true);
    }
    @Transactional
    public SolicitacaoDto.Resposta cadastrar(SolicitacaoDto.Requisicao d, String login) {
        return cadastrar(d,login,false);
    }
    @Transactional
    public SolicitacaoDto.Resposta cadastrarTransporteDireto(SolicitacaoDto.Requisicao d,String login){
        PerfilUsuario perfil=usuarios.buscarPorLogin(login).getPerfil();
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.RH).contains(perfil))throw new AccessDeniedException("Somente a Gerência e o RH podem solicitar transporte direto.");
        if(d.materiais().size()!=1||d.materiais().getFirst().identificacao()==null||d.materiais().getFirst().identificacao().isBlank())throw new RegraNegocioException("O transporte direto exige um único equipamento existente, com identificação e origem definidas.");
        return cadastrar(d,login,true);
    }
    private SolicitacaoDto.Resposta cadastrar(SolicitacaoDto.Requisicao d,String login,boolean transporteDireto){
        validarRota(d.obraOrigemId(), d.obraDestinoId());
        Usuario usuario = usuarios.buscarPorLogin(login);
        boolean gerencia = Set.of(PerfilUsuario.ADMIN, PerfilUsuario.GERENTE, PerfilUsuario.RH).contains(usuario.getPerfil());
        if (!gerencia && !usuario.getPerfil().ehProfissionalDeCampo())
            throw new RegraNegocioException("Somente técnicos, TSTs, RH, gerentes e administradores podem criar pedidos.");
        Funcionario tecnico;
        if (!gerencia) {
            if (usuario.getFuncionario() == null)
                throw new RegraNegocioException("O usuário técnico ou TST precisa estar vinculado a um funcionário.");
            obras.validarAcessoTecnico(usuario, d.obraOrigemId());
            obras.validarAcessoTecnico(usuario, d.obraDestinoId());
            if (d.obraDestinoId() != null && d.materiais().stream().anyMatch(m -> m.identificacao() != null && !m.identificacao().isBlank()))
                throw new RegraNegocioException("Selecione materiais do catálogo. O Financeiro define o plano de transporte e compra.");
            tecnico = usuario.getFuncionario();
        } else tecnico = funcionarios.buscarPorNome(d.tecnico());
        Solicitacao s = new Solicitacao();
        s.setTipo("Movimentação");
        s.setMovimentacaoDireta(transporteDireto);
        s.setStatus("Pendente");
        s.setTecnico(tecnico);
        s.setSolicitante(usuario.getFuncionario());
        s.setSolicitanteUsuario(usuario);
        s.setSolicitanteNome(gerencia ? usuario.getNome() : tecnico.getNome());
        s.setSolicitanteLogin(usuario.getLogin());
        s.setSolicitantePerfil(usuario.getPerfil());
        s.setObraOrigem(obras.buscarOpcional(d.obraOrigemId()));
        s.setObraDestino(obras.buscarOpcional(d.obraDestinoId()));
        s.setDataSolicitacao(d.dataSolicitacao());
        s.setObservacao(d.observacao());
        boolean exigeSeparacao = d.materiais().stream().anyMatch(m -> m.identificacao() == null || m.identificacao().isBlank());
        boolean possuiItemDefinido = d.materiais().stream().anyMatch(m -> m.identificacao() != null && !m.identificacao().isBlank());
        if (exigeSeparacao && possuiItemDefinido)
            throw new RegraNegocioException("Não misture materiais separados com materiais ainda pendentes de separação.");
        if (exigeSeparacao && d.obraOrigemId() != null)
            throw new RegraNegocioException("As origens dos materiais do catálogo são definidas no plano financeiro.");
        s.substituirMateriais(exigeSeparacao ? criarMateriaisDoCatalogo(d.materiais()) : criarMateriais(d.materiais()));
        validarCompatibilidadeResponsavel(tecnico,s.getMateriais());
        if(usuario.getPerfil()==PerfilUsuario.RH&&!solicitacaoEhEpi(s))throw new AccessDeniedException("O RH pode criar somente solicitações de EPI para TSTs.");
        validarEscopoRh(s,usuario);
        validarDestinoRecebimento(s);
        if (!exigeSeparacao) reservarMateriais(s);
        s.registrarEventoFinanceiro("CRIACAO","Pedido registrado.",usuario);
        if (gerencia) {
            s.setStatus(transporteDireto?(s.getObraDestino()==null?"Aguardando coleta":"Aprovada"):"Aguardando financeiro");
            s.setDataDecisao(LocalDate.now());
            s.registrarEventoFinanceiro("APROVACAO_INICIAL",transporteDireto?"Transporte direto autorizado pela Gerência/RH; não exige análise financeira.":"Pedido criado e aprovado na primeira etapa pela Gerência/RH, encaminhado ao Financeiro.",usuario);
        }
        Solicitacao salva = repository.save(s);
        notificacoes.notificarNovoPedido(salva);
        return gerencia ? resposta(salva) : respostaTecnico(salva, obras.idsPermitidos(login));
    }
    @Transactional
    public SolicitacaoDto.Resposta atualizar(Long id, SolicitacaoDto.Atualizacao d) {
        Solicitacao s = buscarParaAtualizacao(id);
        if (!Set.of("Pendente", "Aguardando financeiro", "Aprovada").contains(s.getStatus()))
            throw new RegraNegocioException("Este pedido não pode mais ser editado.");
        boolean emAtendimento = s.isReservasPlanoAtivas() || s.getSolicitacaoPai() != null || s.getMateriais().stream().anyMatch(m ->
            (m.getIdentificacao() != null && !m.getIdentificacao().isBlank()) || m.getQuantidadeEntradaEstoque()>0 || (!"Aguardando financeiro".equals(s.getStatus())&&m.getQuantidadeCompra() > 0));
        Long origem = s.getObraOrigem() == null ? null : s.getObraOrigem().getId();
        Long destino = s.getObraDestino() == null ? null : s.getObraDestino().getId();
        if (emAtendimento) {
            if (d.materiais() != null || !Objects.equals(origem, d.obraOrigemId()) || !Objects.equals(destino, d.obraDestinoId())
                || (d.tecnico() != null && !d.tecnico().equals(s.getTecnico().getNome())))
                throw new RegraNegocioException("O atendimento pelo estoque já foi iniciado. Apenas a observação pode ser editada para preservar reservas e compras.");
            if (d.observacao() != null) s.setObservacao(d.observacao());
            return resposta(s);
        }
        if (d.obraOrigemId() != null || d.obraDestinoId() == null)
            throw new RegraNegocioException("Informe a obra de destino. As origens dos materiais são definidas no plano financeiro.");
        if (d.materiais() != null) {
            if (d.materiais().isEmpty()) throw new RegraNegocioException("Informe ao menos um material.");
            if (d.materiais().stream().anyMatch(m -> m.identificacao() != null && !m.identificacao().isBlank()))
                throw new RegraNegocioException("Defina as séries e origens no plano financeiro.");
            s.substituirMateriais(criarMateriaisDoCatalogo(d.materiais()));
        }
        if (d.tecnico() != null) s.setTecnico(funcionarios.buscarPorNome(d.tecnico()));
        s.setObraOrigem(null);
        s.setObraDestino(obras.buscarOpcional(d.obraDestinoId()));
        validarCompatibilidadeResponsavel(s.getTecnico(),s.getMateriais());
        validarDestinoRecebimento(s);
        if (d.observacao() != null) s.setObservacao(d.observacao());
        return resposta(s);
    }
    @Transactional public SolicitacaoDto.Resposta atualizar(Long id,SolicitacaoDto.Atualizacao d,String login){
        Solicitacao s=buscarParaAtualizacao(id);Usuario autor=usuarios.buscarPorLogin(login);validarEscopoRh(s,autor);
        validarPermissaoEdicao(s,autor);
        String antes=resumoParaAuditoria(s);
        if(d.materiais()!=null&&!agruparQuantidades(d.materiais()).equals(agruparQuantidades(s.getMateriais().stream().map(m->new SolicitacaoDto.MaterialRequisicao(m.getNome(),m.getQuantidade(),m.getIdentificacao(),m.getCatalogoChave())).toList())))s.preservarPedidoOriginal();
        atualizar(id,d);
        s=buscarParaAtualizacao(id);validarEscopoRh(s,autor);
        if(!antes.equals(resumoParaAuditoria(s))&&"Aguardando financeiro".equals(s.getStatus())){s.setPlanoFinanceiro(List.of());if(s.getMateriais().stream().noneMatch(m->m.getQuantidadeEntradaEstoque()>0))s.getMateriais().forEach(m->m.solicitarCompra(0));}
        if(!antes.equals(resumoParaAuditoria(s))){
            s.registrarEventoFinanceiro("ALTERACAO","Dados alterados. Antes: "+antes+". Depois: "+resumoParaAuditoria(s),autor);
            if(autor.getPerfil()==PerfilUsuario.FINANCEIRO)notificacoes.notificarAlteracaoFinanceira(s);
        }
        return respostaParaUsuario(s,login);
    }
    @Transactional public SolicitacaoDto.Resposta aprovar(Long id){Solicitacao s=buscarParaAtualizacao(id);return aprovarPrimeiraEtapa(s);}
    @Transactional public SolicitacaoDto.Resposta aprovar(Long id,String login){
        Solicitacao s=buscarParaAtualizacao(id);Usuario autor=usuarios.buscarPorLogin(login);validarEscopoRh(s,autor);
        if("Pendente".equals(s.getStatus())){
            if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.RH).contains(autor.getPerfil()))throw new AccessDeniedException("A primeira análise cabe à Gerência ou ao RH.");
            aprovarPrimeiraEtapa(s);
            s.registrarEventoFinanceiro("APROVACAO_INICIAL","Pedido aprovado pela Gerência/RH e encaminhado ao Financeiro.",autor);
            notificacoes.notificarAnaliseFinanceira(s);
            return respostaParaUsuario(s,login);
        }
        if("Aguardando financeiro".equals(s.getStatus())){
            if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.FINANCEIRO).contains(autor.getPerfil()))throw new AccessDeniedException("A análise financeira cabe ao Financeiro.");
            validarEReservarPlano(s);
            s.setStatus(s.getObraDestino()==null?"Aguardando coleta":"Aprovada");
            if("Aguardando coleta".equals(s.getStatus())&&s.getMateriais().stream().anyMatch(m->m.getIdentificacao()==null||m.getIdentificacao().isBlank()))throw new RegraNegocioException("Defina os equipamentos antes de aprovar a retirada.");
            s.registrarEventoFinanceiro("APROVACAO","Pedido aprovado pelo Financeiro e liberado para separação ou compra.",autor);
            notificacoes.notificarPlanoLiberado(s);
            return respostaParaUsuario(s,login);
        }
        throw new RegraNegocioException("A solicitação já foi analisada nesta etapa.");
    }
    @Transactional public SolicitacaoDto.Resposta rejeitar(Long id){Solicitacao s=buscarParaAtualizacao(id);if(!"Pendente".equals(s.getStatus()))throw new RegraNegocioException("A solicitação já foi analisada.");liberarReservas(s);s.setStatus("Rejeitada");s.setDataDecisao(LocalDate.now());return resposta(s);}
    @Transactional public SolicitacaoDto.Resposta rejeitar(Long id,String login){
        return rejeitar(id,login,null);
    }
    private void validarJustificativaRejeicao(String motivo){if(motivo==null||motivo.trim().length()<5||motivo.length()>1000)throw new RegraNegocioException("Informe a justificativa da rejeição entre 5 e 1000 caracteres.");}
    @Transactional public SolicitacaoDto.Resposta rejeitar(Long id,String login,String justificativa){
        Solicitacao s=buscarParaAtualizacao(id);Usuario autor=usuarios.buscarPorLogin(login);validarEscopoRh(s,autor);
        if("Pendente".equals(s.getStatus())){
            if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.RH).contains(autor.getPerfil()))throw new AccessDeniedException("A primeira análise cabe à Gerência ou ao RH.");
            validarJustificativaRejeicao(justificativa);
            rejeitar(id);s.registrarEventoFinanceiro("REJEICAO_INICIAL","Pedido rejeitado pelo setor responsável. Justificativa: "+justificativa.trim(),autor);notificacoes.notificarRejeicao(s,false);return respostaParaUsuario(s,login);
        }
        if("Aguardando financeiro".equals(s.getStatus())){
            if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.FINANCEIRO).contains(autor.getPerfil()))throw new AccessDeniedException("A análise financeira cabe ao Financeiro.");
            validarJustificativaRejeicao(justificativa);
            liberarReservas(s);s.setStatus("Rejeitada");s.registrarEventoFinanceiro("REJEICAO","Pedido rejeitado pelo Financeiro. Justificativa: "+justificativa.trim(),autor);notificacoes.notificarRejeicao(s,true);return respostaParaUsuario(s,login);
        }
        throw new RegraNegocioException("A solicitação já foi analisada nesta etapa.");
    }
    @Transactional public SolicitacaoDto.Resposta solicitarCompra(Long id,Long materialId,int quantidade){Solicitacao s=buscarParaAtualizacao(id);if(!"Aprovada".equals(s.getStatus()))throw new RegraNegocioException("A compra só pode ser solicitada para uma movimentação aprovada.");MaterialSolicitado material=s.getMateriais().stream().filter(m->m.getId().equals(materialId)).findFirst().orElseThrow(()->new RecursoNaoEncontradoException("Material não encontrado na solicitação."));if(material.getIdentificacao()!=null&&!material.getIdentificacao().isBlank())throw new RegraNegocioException("O material já possui equipamento definido.");if(quantidade>material.getQuantidade())throw new RegraNegocioException("A quantidade para compra não pode superar a quantidade solicitada.");if(quantidade<material.getQuantidadeEntradaEstoque())throw new RegraNegocioException("A compra não pode ser reduzida abaixo da quantidade já recebida no estoque.");material.solicitarCompra(quantidade);return resposta(s);}
    @Transactional public SolicitacaoDto.Resposta solicitarCompra(Long id,Long materialId,int quantidade,String login){
        Usuario autor=usuarios.buscarPorLogin(login);
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.FINANCEIRO).contains(autor.getPerfil()))throw new AccessDeniedException("Somente o Financeiro pode decidir compras. Defina a compra no plano financeiro.");
        throw new RegraNegocioException("Defina as quantidades de compra e transporte no plano financeiro antes de aprovar.");
    }
    @Transactional public SolicitacaoDto.Resposta registrarAquisicao(Long id,Long materialId,int quantidade,String numeroNota,String identificacao){return registrarAquisicaoAuditada(id,materialId,quantidade,numeroNota,identificacao,null);}
    private SolicitacaoDto.Resposta registrarAquisicaoAuditada(Long id,Long materialId,int quantidade,String numeroNota,String identificacao,Usuario autor){Solicitacao s=buscarParaAtualizacao(id);if(!"Aprovada".equals(s.getStatus()))throw new RegraNegocioException("A entrada da compra só pode ser registrada para uma movimentação aprovada.");MaterialSolicitado material=s.getMateriais().stream().filter(m->m.getId().equals(materialId)).findFirst().orElseThrow(()->new RecursoNaoEncontradoException("Material não encontrado na solicitação."));if(material.getQuantidadeCompra()<=0)throw new RegraNegocioException("Não existe compra solicitada para este material.");int saldoEntrada=material.getQuantidadeCompra()-material.getQuantidadeEntradaEstoque();if(quantidade>saldoEntrada)throw new RegraNegocioException("A quantidade para entrada não pode superar o saldo de "+saldoEntrada+" unidade(s).");int jaAdquiridoSemEntrada=material.getQuantidadeAdquirida()-material.getQuantidadeEntradaEstoque();int novaAquisicao=Math.max(0,quantidade-jaAdquiridoSemEntrada);Equipamento recebido=equipamentoService.registrarEntradaCompra(material.getNome(),material.getCatalogoChave(),quantidade,numeroNota,identificacao,s.getId());if(!s.getPlanoFinanceiro().isEmpty()){recebido.setQuantidadeReservada(recebido.getQuantidadeReservada()+quantidade);s.adicionarEntradaCompra(new Solicitacao.OrigemPlanejada(recebido.getId(),recebido.getSerie(),null,quantidade,material.getCatalogoChave(),material.getNome()));}if(novaAquisicao>0)material.registrarAquisicao(novaAquisicao);material.registrarEntradaEstoque(quantidade);s.registrarAquisicaoAuditada(recebido,material.getNome(),material.getCatalogoChave(),quantidade,numeroNota,autor);if(autor!=null)s.registrarEventoFinanceiro("ENTRADA_COMPRA",quantidade+" unidade(s) de "+material.getNome()+" conferidas no estoque. NF: "+numeroNota,autor);return resposta(s);}
    @Transactional public SolicitacaoDto.Resposta registrarAquisicao(Long id,Long materialId,int quantidade,String numeroNota,String identificacao,String login){validarOperadorEstoque(login);registrarAquisicaoAuditada(id,materialId,quantidade,numeroNota,identificacao,usuarios.buscarPorLogin(login));Solicitacao s=buscarParaAtualizacao(id);registrarInicioAtendimento(s,usuarios.buscarPorLogin(login));return resposta(s);}
    @Transactional public SolicitacaoDto.Resposta iniciarAtendimento(Long id,String login){
        validarOperadorEstoque(login);Solicitacao s=buscarParaAtualizacao(id);
        if(!"Aprovada".equals(s.getStatus())||s.getPlanoFinanceiro().isEmpty()||!s.isReservasPlanoAtivas()||s.getMateriais().stream().anyMatch(m->m.getIdentificacao()!=null&&!m.getIdentificacao().isBlank()))throw new RegraNegocioException("O início do atendimento exige um plano aprovado pelo Financeiro, ainda não separado.");
        registrarInicioAtendimento(s,usuarios.buscarPorLogin(login));return resposta(s);
    }
    private void registrarInicioAtendimento(Solicitacao s,Usuario autor){
        if(s.getEventosFinanceiros().stream().anyMatch(e->"INICIO_ATENDIMENTO".equals(e.tipo())))return;
        boolean compra=s.getMateriais().stream().anyMatch(m->m.getQuantidadeCompra()>0);
        s.registrarEventoFinanceiro("INICIO_ATENDIMENTO",compra?"O estoque iniciou a compra e as providências dos materiais autorizados.":"O estoque iniciou a coleta e a separação dos materiais autorizados.",autor);
    }
    @Transactional public List<SolicitacaoDto.Resposta> distribuir(Long id,SolicitacaoDto.Distribuicao dados) {
        Solicitacao original=buscarParaAtualizacao(id);
        if(!"Aprovada".equals(original.getStatus()))throw new RegraNegocioException("Somente uma solicitação aprovada pode ser distribuída.");
        if(original.getMateriais().stream().anyMatch(m->m.getQuantidadeCompra()>m.getQuantidadeEntradaEstoque()))
            throw new RegraNegocioException("Conclua as entradas das compras solicitadas antes de confirmar a separação.");
        Map<String,Integer> solicitadas=agruparQuantidades(original.getMateriais().stream().map(m->new SolicitacaoDto.MaterialRequisicao(m.getNome(),m.getQuantidade(),m.getIdentificacao(),m.getCatalogoChave())).toList());
        List<SolicitacaoDto.MaterialRequisicao> selecionadas=dados.atendimentos().stream().flatMap(a->a.materiais().stream()).toList();
        if(!solicitadas.equals(agruparQuantidades(selecionadas)))throw new RegraNegocioException("As quantidades distribuídas precisam corresponder ao pedido original.");
        Set<Long> origens=new HashSet<>();
        for(SolicitacaoDto.AtendimentoOrigem atendimento:dados.atendimentos()) {
            validarRota(atendimento.obraOrigemId(),original.getObraDestino()==null?null:original.getObraDestino().getId());
            Long chave=atendimento.obraOrigemId()==null?Long.MIN_VALUE:atendimento.obraOrigemId();
            if(!origens.add(chave))throw new RegraNegocioException("Agrupe os materiais que saem da mesma origem.");
        }
        if(dados.atendimentos().size()>1)original.preservarPedidoOriginal();
        original.preservarCompras();
        liberarReservasPlano(original);
        liberarReservas(original);
        Solicitacao raiz=original.getSolicitacaoPai()==null?original:original.getSolicitacaoPai();
        List<Solicitacao> atendimentos=new java.util.ArrayList<>();
        for(int indice=0;indice<dados.atendimentos().size();indice++) {
            SolicitacaoDto.AtendimentoOrigem atendimento=dados.atendimentos().get(indice);
            Solicitacao destino=indice==0?original:copiarParaAtendimento(original,raiz);
            destino.setObraOrigem(obras.buscarOpcional(atendimento.obraOrigemId()));
            destino.substituirMateriais(criarMateriais(atendimento.materiais()));
            reservarMateriais(destino);
            if(indice>0)repository.save(destino);
            atendimentos.add(destino);
        }
        repository.flush(); // Retornar os IDs persistidos dos materiais de todos os atendimentos.
        return atendimentos.stream().map(this::resposta).toList();
    }
    @Transactional public List<SolicitacaoDto.Resposta> distribuir(Long id,SolicitacaoDto.Distribuicao dados,String login){
        validarOperadorEstoque(login);Solicitacao s=buscarParaAtualizacao(id);
        if(s.getPlanoFinanceiro().isEmpty()||!s.isReservasPlanoAtivas())throw new RegraNegocioException("O Financeiro precisa definir e aprovar o plano de atendimento.");
        if(!quantidadesPorOrigem(dados.atendimentos()).equals(quantidadesPorOrigem(atendimentosPlanejados(s))))throw new AccessDeniedException("O estoque deve executar exatamente as origens, equipamentos e quantidades autorizados pelo Financeiro.");
        s.registrarEventoFinanceiro("SEPARACAO","Separação confirmada conforme plano autorizado pelo Financeiro.",usuarios.buscarPorLogin(login));
        return distribuir(id,dados);
    }
    @Transactional public List<SolicitacaoDto.Resposta> executarPlano(Long id,String login){
        validarOperadorEstoque(login);Solicitacao s=buscarParaAtualizacao(id);
        return distribuir(id,new SolicitacaoDto.Distribuicao(atendimentosPlanejados(s)),login);
    }
    @Transactional public SolicitacaoDto.Resposta salvarPlanoFinanceiro(Long id,SolicitacaoDto.PlanoFinanceiro dados,String login){
        Usuario autor=usuarios.buscarPorLogin(login);
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.FINANCEIRO).contains(autor.getPerfil()))throw new AccessDeniedException("Somente o Financeiro pode definir o plano de compras e transporte.");
        Solicitacao s=buscarParaAtualizacao(id);
        boolean revisao="Aprovada".equals(s.getStatus());
        if(!revisao&&!"Aguardando financeiro".equals(s.getStatus()))throw new RegraNegocioException("O plano só pode ser definido na análise financeira ou revisado antes da separação.");
        if(s.getMateriais().stream().anyMatch(m->m.getIdentificacao()!=null&&!m.getIdentificacao().isBlank()))throw new RegraNegocioException("Este transporte já possui equipamento e origem definidos.");
        if(revisao&&(dados.motivoRevisao()==null||dados.motivoRevisao().isBlank()))throw new RegraNegocioException("Informe o motivo da revisão do atendimento.");
        restaurarEntradasLegadas(s);
        if(revisao)liberarReservasPlano(s);
        List<Solicitacao.ItemPlano> plano=montarPlano(s,dados);
        if(!plano.equals(s.getPlanoFinanceiro())){
            s.setPlanoFinanceiro(plano);
            for(Solicitacao.ItemPlano item:plano)s.getMateriais().stream().filter(m->Objects.equals(m.getId(),item.materialId())).findFirst().orElseThrow().solicitarCompra(item.quantidadeCompra());
            String descricao=plano.stream().map(item->item.nome()+": "+item.origens().stream().mapToInt(Solicitacao.OrigemPlanejada::quantidade).sum()+" para transportar, "+item.quantidadeCompra()+" para comprar"+(item.justificativa()==null||item.justificativa().isBlank()?"":". Motivo: "+item.justificativa())).collect(java.util.stream.Collectors.joining("; "));
            s.registrarEventoFinanceiro("ALTERACAO","Plano de atendimento definido pelo Financeiro. "+descricao,autor);
            notificacoes.notificarAlteracaoFinanceira(s);
        }
        if(revisao){validarEReservarPlano(s);s.registrarEventoFinanceiro("REVISAO_PLANO","O Financeiro revisou o atendimento antes da separação. Motivo: "+dados.motivoRevisao().trim(),autor);notificacoes.notificarAlteracaoFinanceira(s);}
        return respostaParaUsuario(s,login);
    }

    private record DivisaoParcial(MaterialSolicitado original,int envio,int compraEnviada,String justificativa,List<Solicitacao.OrigemPlanejada> origensEnvio,List<Solicitacao.OrigemPlanejada> origensPendentes) {}

    @Transactional public List<SolicitacaoDto.Resposta> atenderParcialmente(Long id,SolicitacaoDto.AtendimentoParcial dados,String login){
        validarOperadorEstoque(login);
        Usuario autor=usuarios.buscarPorLogin(login);Solicitacao s=buscarParaAtualizacao(id);
        if(!"Aprovada".equals(s.getStatus())||!s.isReservasPlanoAtivas()||s.getPlanoFinanceiro().isEmpty()||s.getMateriais().stream().anyMatch(m->m.getIdentificacao()!=null))
            throw new RegraNegocioException("O atendimento só pode ser ajustado antes da separação, com um plano financeiro aprovado.");
        if(dados.motivo()==null||dados.motivo().isBlank()||dados.motivo().length()>1000)throw new RegraNegocioException("Informe o motivo do atendimento parcial, com até 1000 caracteres.");
        if(dados.materiais().size()!=s.getMateriais().size())throw new RegraNegocioException("Revise todos os materiais antes de confirmar o atendimento parcial.");
        Map<Long,SolicitacaoDto.MaterialParcial> escolhas=new LinkedHashMap<>();
        for(var item:dados.materiais())if(escolhas.put(item.materialId(),item)!=null)throw new RegraNegocioException("Material repetido no atendimento parcial.");
        Map<Long,Integer> usados=new LinkedHashMap<>(),limites=new LinkedHashMap<>();
        origensDeExecucao(s).forEach(o->limites.merge(o.equipamentoId(),o.quantidade(),Math::addExact));
        List<Solicitacao.OrigemPlanejada> entradasEnvio=new java.util.ArrayList<>(),entradasPendentes=new java.util.ArrayList<>();
        Map<Long,Integer> consumidoEntrada=new LinkedHashMap<>();
        List<DivisaoParcial> divisoes=new java.util.ArrayList<>();long totalEnvio=0,totalPedido=0;
        for(MaterialSolicitado material:s.getMateriais()){
            var escolha=escolhas.get(material.getId());
            var plano=s.getPlanoFinanceiro().stream().filter(p->Objects.equals(p.materialId(),material.getId())).findFirst().orElseThrow(()->new RegraNegocioException("O plano mudou. Atualize a solicitação."));
            if(escolha==null)throw new RegraNegocioException("Material não encontrado no pedido.");
            Map<Long,Integer> quantidades=new LinkedHashMap<>();
            for(var origem:escolha.origens()){
                if(origem.quantidade()==null||origem.quantidade()<1||quantidades.put(origem.equipamentoId(),origem.quantidade())!=null)throw new RegraNegocioException("Origem repetida ou quantidade inválida.");
                int autorizado=java.util.stream.Stream.concat(plano.origens().stream(),s.getEntradasCompra().stream().filter(e->Objects.equals(e.catalogoChave(),material.getCatalogoChave()))).filter(e->Objects.equals(e.equipamentoId(),origem.equipamentoId())).mapToInt(Solicitacao.OrigemPlanejada::quantidade).sum();
                if(origem.quantidade()>autorizado)throw new RegraNegocioException("O envio não pode superar as origens autorizadas e as compras que já deram entrada.");
                int total=usados.merge(origem.equipamentoId(),origem.quantidade(),Math::addExact);
                if(total>limites.getOrDefault(origem.equipamentoId(),0))throw new RegraNegocioException("O mesmo saldo não pode ser usado duas vezes.");
            }
            int envio=quantidades.values().stream().mapToInt(Integer::intValue).sum();
            if(envio>material.getQuantidade())throw new RegraNegocioException("A quantidade do envio não pode superar o pedido.");
            List<Solicitacao.OrigemPlanejada> origensEnvio=new java.util.ArrayList<>(),origensPendentes=new java.util.ArrayList<>();
            for(var origem:plano.origens()){
                int quantidade=quantidades.getOrDefault(origem.equipamentoId(),0);
                if(quantidade>0)origensEnvio.add(parteOrigem(origem,quantidade));
                if(quantidade<origem.quantidade())origensPendentes.add(parteOrigem(origem,origem.quantidade()-quantidade));
            }
            int compraEnviada=0;
            for(var entrada:s.getEntradasCompra()){
                if(!Objects.equals(entrada.catalogoChave(),material.getCatalogoChave()))continue;
                int livre=entrada.quantidade()-consumidoEntrada.getOrDefault(entrada.equipamentoId(),0);
                int quantidade=Math.min(livre,quantidades.getOrDefault(entrada.equipamentoId(),0));
                if(quantidade>0){entradasEnvio.add(parteOrigem(entrada,quantidade));consumidoEntrada.merge(entrada.equipamentoId(),quantidade,Integer::sum);compraEnviada+=quantidade;}
            }
            if(compraEnviada>material.getQuantidadeEntradaEstoque()||envio!=compraEnviada+origensEnvio.stream().mapToInt(Solicitacao.OrigemPlanejada::quantidade).sum())throw new RegraNegocioException("Confira as entradas e os equipamentos autorizados para este material.");
            divisoes.add(new DivisaoParcial(material,envio,compraEnviada,plano.justificativa(),origensEnvio,origensPendentes));totalEnvio+=envio;totalPedido+=material.getQuantidade();
        }
        if(totalEnvio==0)throw new RegraNegocioException("Selecione ao menos uma unidade disponível para enviar.");
        if(totalEnvio==totalPedido){s.registrarEventoFinanceiro("AJUSTE_ESTOQUE","O estoque conferiu o atendimento. Motivo: "+dados.motivo().trim(),autor);return executarPlano(id,login);}
        for(var entrada:s.getEntradasCompra()){
            int restante=entrada.quantidade()-consumidoEntrada.getOrDefault(entrada.equipamentoId(),0);
            if(restante>0)entradasPendentes.add(parteOrigem(entrada,restante));
        }
        // Transferir as reservas para os dois atendimentos dentro da mesma transação.
        liberarReservasPlano(s);s.preservarPedidoOriginal();
        Solicitacao raiz=s.getSolicitacaoPai()==null?s:s.getSolicitacaoPai();
        Solicitacao pendente=copiarParaAtendimento(s,raiz);
        List<MaterialSolicitado> envio=new java.util.ArrayList<>(),restante=new java.util.ArrayList<>();
        List<DivisaoParcial> comEnvio=new java.util.ArrayList<>(),comPendencia=new java.util.ArrayList<>();
        for(var divisao:divisoes){
            var material=divisao.original();
            if(divisao.envio()>0){envio.add(materialParcial(material,divisao.envio(),divisao.compraEnviada(),divisao.compraEnviada(),divisao.compraEnviada()));comEnvio.add(divisao);}
            int faltante=material.getQuantidade()-divisao.envio();
            if(faltante>0){restante.add(materialParcial(material,faltante,material.getQuantidadeCompra()-divisao.compraEnviada(),material.getQuantidadeAdquirida()-divisao.compraEnviada(),material.getQuantidadeEntradaEstoque()-divisao.compraEnviada()));comPendencia.add(divisao);}
        }
        s.substituirMateriais(envio);s.setEntradasCompra(entradasEnvio);
        pendente.substituirMateriais(restante);pendente.setEntradasCompra(entradasPendentes);
        repository.saveAndFlush(pendente);repository.saveAndFlush(s);
        s.setPlanoFinanceiro(planoDividido(envio,comEnvio,true));
        pendente.setPlanoFinanceiro(planoDividido(restante,comPendencia,false));
        validarEReservarPlano(pendente);validarEReservarPlano(s);
        String descricao="Atendimento parcial: "+totalEnvio+" de "+totalPedido+" unidade(s) separadas. Restante pendente no atendimento #"+pendente.getId()+". Motivo: "+dados.motivo().trim();
        s.registrarEventoFinanceiro("ATENDIMENTO_PARCIAL",descricao,autor);pendente.registrarEventoFinanceiro("ATENDIMENTO_PARCIAL",descricao,autor);
        var atendidos=new java.util.ArrayList<>(distribuir(id,new SolicitacaoDto.Distribuicao(atendimentosPlanejados(s)),login));
        atendidos.add(resposta(pendente));return atendidos;
    }
    private Solicitacao.OrigemPlanejada parteOrigem(Solicitacao.OrigemPlanejada o,int quantidade){return new Solicitacao.OrigemPlanejada(o.equipamentoId(),o.identificacao(),o.obraOrigemId(),quantidade,o.catalogoChave(),o.nome());}
    private MaterialSolicitado materialParcial(MaterialSolicitado origem,int quantidade,int compra,int adquirida,int entrada){var m=new MaterialSolicitado(origem.getNome(),quantidade,null,origem.getCatalogoChave());m.copiarCompraParcial(origem,compra,adquirida,entrada);return m;}
    private List<Solicitacao.ItemPlano> planoDividido(List<MaterialSolicitado> materiais,List<DivisaoParcial> divisoes,boolean envio){
        List<Solicitacao.ItemPlano> plano=new java.util.ArrayList<>();for(int indice=0;indice<materiais.size();indice++){var m=materiais.get(indice);var d=divisoes.get(indice);plano.add(new Solicitacao.ItemPlano(m.getId(),m.getNome(),m.getCatalogoChave(),m.getQuantidade(),m.getQuantidadeCompra(),d.justificativa(),envio?d.origensEnvio():d.origensPendentes()));}return plano;
    }
    @Transactional public SolicitacaoDto.Resposta iniciarTransito(Long id,String login){Solicitacao s=buscarParaAtualizacao(id);validarInicioTransito(s,login);if(!Set.of("Aprovada","Aguardando coleta").contains(s.getStatus()))throw new RegraNegocioException("A movimentação ainda não pode iniciar o transporte.");if(s.getMateriais().stream().anyMatch(m->m.getIdentificacao()==null||m.getIdentificacao().isBlank()))throw new RegraNegocioException("O estoque precisa definir os equipamentos antes do envio.");s.setStatus("Em trânsito");s.setTransitoEm(OffsetDateTime.now());s.registrarEventoFinanceiro("ENVIO","Saída dos materiais confirmada.",usuarios.buscarPorLogin(login));notificacoes.notificarEnvio(s);return respostaParaUsuario(s,login);}
    @Transactional public SolicitacaoDto.Resposta concluir(Long id,String login){Solicitacao s=buscarParaAtualizacao(id);validarConclusao(s,login);if(!"Em trânsito".equals(s.getStatus()))throw new RegraNegocioException("A movimentação precisa estar em trânsito para confirmar o recebimento.");s.setConcluidaEm(OffsetDateTime.now());sincronizarMovimentacoes(s);if(s.getObraOrigem()!=null)inventarioHistorico.registrar(s.getObraOrigem());if(s.getObraDestino()!=null&&(s.getObraOrigem()==null||!s.getObraDestino().getId().equals(s.getObraOrigem().getId())))inventarioHistorico.registrar(s.getObraDestino());s.setStatus("Concluída");s.registrarEventoFinanceiro("RECEBIMENTO","Recebimento dos materiais confirmado.",usuarios.buscarPorLogin(login));notificacoes.notificarRecebimento(s);return respostaParaUsuario(s,login);}
    @Transactional(readOnly=true) public Solicitacao buscar(Long id){return repository.findById(id).filter(s->"Movimentação".equals(s.getTipo())).orElseThrow(()->new RecursoNaoEncontradoException("Movimentação não encontrada."));}
    private Solicitacao buscarParaAtualizacao(Long id){return repository.buscarParaAtualizacao(id).filter(s->"Movimentação".equals(s.getTipo())).orElseThrow(()->new RecursoNaoEncontradoException("Movimentação não encontrada."));}
    private void sincronizarMovimentacoes(Solicitacao s){LocalDate dataRecebimento=s.getConcluidaEm().atZoneSameInstant(java.time.ZoneId.of("America/Manaus")).toLocalDate();Set<Long> idsAtuais=new HashSet<>();Map<String,Integer> quantidadesPorSerie=new LinkedHashMap<>();Map<String,String> seriesOriginais=new LinkedHashMap<>();for(MaterialSolicitado material:s.getMateriais()){if(material.getIdentificacao()==null||material.getIdentificacao().isBlank())throw new RegraNegocioException("Todo equipamento movimentado precisa de identificação/série.");String chave=material.getIdentificacao().trim().toLowerCase();seriesOriginais.putIfAbsent(chave,material.getIdentificacao().trim());quantidadesPorSerie.merge(chave,material.getQuantidade(),Integer::sum);}for(Map.Entry<String,Integer> item:quantidadesPorSerie.entrySet()){String serie=seriesOriginais.get(item.getKey());Equipamento e=equipamentos.buscarPorSerieParaAtualizacao(serie).orElseThrow(()->new RecursoNaoEncontradoException("Equipamento não encontrado pela série: "+serie));int quantidade=item.getValue();if(e.getQuantidadeReservada()<quantidade)throw new RegraNegocioException("A reserva do item "+e.getModelo()+" não está mais disponível.");e.setQuantidadeReservada(e.getQuantidadeReservada()-quantidade);String status=s.getObraDestino()==null?"Em estoque":"Em campo";Equipamento movimentado=e;if(e.isLote()&&quantidade<e.getQuantidade()){e.setQuantidade(e.getQuantidade()-quantidade);movimentado=equipamentoService.criarLoteDerivado(e,quantidade,s.getObraDestino(),s.getTecnico(),status,dataRecebimento,s.getId());}else{equipamentoService.aplicarDestino(e,s.getObraDestino(),s.getTecnico(),status,dataRecebimento);}movimentado.setDataSaida(s.getTransitoEm()==null?null:s.getTransitoEm().atZoneSameInstant(java.time.ZoneId.of("America/Manaus")).toLocalDate());Equipamento loteMovimentado=movimentado;idsAtuais.add(loteMovimentado.getId());Movimentacao m=movimentacoes.findBySolicitacaoIdAndEquipamentoId(s.getId(),loteMovimentado.getId()).orElseGet(()->equipamentoService.novaMovimentacao(loteMovimentado,s,s.getObraOrigem(),s.getObraDestino(),s.getTecnico(),status,quantidade,dataRecebimento));m.reativar();m.setObraOrigem(s.getObraOrigem());m.setObraDestino(s.getObraDestino());m.setTecnico(s.getTecnico());m.setStatus(status);m.setQuantidade(quantidade);m.setDataMovimentacao(dataRecebimento);movimentacoes.save(m);}
        for(Movimentacao removida:movimentacoes.findBySolicitacaoId(s.getId()))if(removida.isAtiva()&&!idsAtuais.contains(removida.getEquipamento().getId())){Equipamento e=removida.getEquipamento();equipamentoService.aplicarDestino(e,s.getObraOrigem(),null,s.getObraOrigem()==null?"Em estoque":"Em campo",dataRecebimento);removida.cancelar();}
    }
    private void reservarMateriais(Solicitacao s){for(MaterialSolicitado material:s.getMateriais()){if(material.getIdentificacao()==null||material.getIdentificacao().isBlank())throw new RegraNegocioException("Todo equipamento movimentado precisa de identificação/série.");Equipamento e=equipamentos.buscarPorSerieParaAtualizacao(material.getIdentificacao()).filter(x->!x.isArquivado()).orElseThrow(()->new RecursoNaoEncontradoException("Equipamento ativo não encontrado pela série: "+material.getIdentificacao()));Long obraAtual=e.getObra()==null?null:e.getObra().getId();Long obraOrigem=s.getObraOrigem()==null?null:s.getObraOrigem().getId();if(!Objects.equals(obraAtual,obraOrigem))throw new RegraNegocioException("O item "+e.getModelo()+" não está na origem informada.");if(!statusMovimentavel(e.getStatus()))throw new RegraNegocioException("O item "+e.getModelo()+" não está disponível para movimentação.");String chaveEquipamento=CatalogoChave.criar(e.getTipo(),e.getModelo(),e.getMedida());if(material.getCatalogoChave()!=null&&!material.getCatalogoChave().isBlank()&&!material.getCatalogoChave().equals(chaveEquipamento))throw new RegraNegocioException("O equipamento selecionado não corresponde ao material solicitado.");if(!e.isLote()&&material.getQuantidade()!=1)throw new RegraNegocioException("Ativos individuais devem ser movimentados uma unidade por vez.");if(material.getQuantidade()>e.getQuantidadeDisponivel())throw new RegraNegocioException("Quantidade indisponível para "+e.getModelo()+". Disponível: "+e.getQuantidadeDisponivel()+".");material.setNome(e.getModelo());e.setQuantidadeReservada(e.getQuantidadeReservada()+material.getQuantidade());}}
    private void liberarReservas(Solicitacao s){for(MaterialSolicitado material:s.getMateriais()){if(material.getIdentificacao()==null)continue;equipamentos.buscarPorSerieParaAtualizacao(material.getIdentificacao()).ifPresent(e->e.setQuantidadeReservada(Math.max(0,e.getQuantidadeReservada()-material.getQuantidade())));}}
    private void validarResponsavel(Solicitacao solicitacao,String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil().ehProfissionalDeCampo()&&(usuario.getFuncionario()==null||!usuario.getFuncionario().getId().equals(solicitacao.getTecnico().getId())))throw new RegraNegocioException("Você não pode atualizar a movimentação de outro profissional.");}
    private void validarInicioTransito(Solicitacao s,String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil().ehProfissionalDeCampo())throw new RegraNegocioException("A retirada ou o envio deve ser confirmado pelo estoque.");if(s.getObraDestino()==null&&!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.ESTOQUE).contains(usuario.getPerfil()))throw new RegraNegocioException("A retirada deve ser confirmada exclusivamente pelo estoque ou administrador.");}
    private void validarConclusao(Solicitacao s,String login){Usuario usuario=usuarios.buscarPorLogin(login);if(s.getObraDestino()!=null){if(!usuario.getPerfil().ehProfissionalDeCampo())throw new RegraNegocioException("O recebimento na obra deve ser confirmado pelo técnico responsável.");validarResponsavel(s,login);return;}if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.ESTOQUE).contains(usuario.getPerfil()))throw new RegraNegocioException("O retorno ao depósito deve ser confirmado pelo estoque ou administrador.");}
    private List<MaterialSolicitado> criarMateriais(List<SolicitacaoDto.MaterialRequisicao> itens){return itens.stream().map(i->{
        if(i.identificacao()==null||i.identificacao().isBlank())return new MaterialSolicitado(i.nome(),i.quantidade(),null,i.catalogoChave());
        Equipamento equipamento=equipamentos.buscarPorSerieParaAtualizacao(i.identificacao()).filter(e->!e.isArquivado())
            .orElseThrow(()->new RecursoNaoEncontradoException("Equipamento ativo não encontrado pela série: "+i.identificacao()));
        String chave=CatalogoChave.criar(equipamento.getTipo(),equipamento.getModelo(),equipamento.getMedida());
        if(i.catalogoChave()!=null&&!i.catalogoChave().isBlank()&&!chave.equals(i.catalogoChave()))throw new RegraNegocioException("O equipamento selecionado não corresponde ao material solicitado.");
        return new MaterialSolicitado(equipamento.getModelo(),i.quantidade(),equipamento.getSerie(),chave);
    }).toList();}
    private List<MaterialSolicitado> criarMateriaisDoCatalogo(List<SolicitacaoDto.MaterialRequisicao> itens){List<Equipamento> catalogo=equipamentos.findAll().stream().filter(e->!e.isArquivado()).toList();return itens.stream().map(item->{Equipamento referencia=catalogo.stream().filter(e->{String chave=CatalogoChave.criar(e.getTipo(),e.getModelo(),e.getMedida());return item.catalogoChave()!=null&&!item.catalogoChave().isBlank()&&chave.equals(item.catalogoChave());}).findFirst().orElseThrow(()->new RegraNegocioException("O material "+item.nome()+" não existe no catálogo cadastrado pelo administrador."));return new MaterialSolicitado(referencia.getModelo(),item.quantidade(),item.identificacao(),CatalogoChave.criar(referencia.getTipo(),referencia.getModelo(),referencia.getMedida()));}).toList();}
    private Map<String,Integer> agruparQuantidades(List<SolicitacaoDto.MaterialRequisicao> materiais){Map<String,Integer> totais=new LinkedHashMap<>();for(SolicitacaoDto.MaterialRequisicao material:materiais){String chave=material.catalogoChave()==null||material.catalogoChave().isBlank()?CatalogoChave.normalizar(material.nome()):material.catalogoChave();try{totais.merge(chave,material.quantidade(),Math::addExact);}catch(ArithmeticException e){throw new RegraNegocioException("A quantidade total do material excede o limite permitido.");}}return totais;}
    private boolean statusMovimentavel(String status){String normalizado=CatalogoChave.normalizar(status);return Set.of("em estoque","em campo","disponivel").contains(normalizado);}
    private void validarOperadorEstoque(String login){if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.ESTOQUE).contains(usuarios.buscarPorLogin(login).getPerfil()))throw new AccessDeniedException("Somente o estoque pode executar este atendimento.");}
    private List<Solicitacao.ItemPlano> montarPlano(Solicitacao s,SolicitacaoDto.PlanoFinanceiro dados){
        Map<Long,MaterialSolicitado> materiais=new LinkedHashMap<>();s.getMateriais().forEach(m->materiais.put(m.getId(),m));
        if(dados.materiais().size()!=materiais.size())throw new RegraNegocioException("Defina o atendimento de todos os materiais do pedido.");
        Set<Long> vistos=new HashSet<>();Map<Long,Long> totaisEquipamento=new LinkedHashMap<>();
        List<Solicitacao.ItemPlano> resultado=new java.util.ArrayList<>();
        for(var item:dados.materiais()){
            MaterialSolicitado material=materiais.get(item.materialId());
            if(material==null||!vistos.add(item.materialId()))throw new RegraNegocioException("Material inválido ou repetido no plano financeiro.");
            if(item.quantidadeCompra()<0||item.quantidadeCompra()>material.getQuantidade())throw new RegraNegocioException("Quantidade de compra inválida para "+material.getNome()+".");
            if(item.quantidadeCompra()<material.getQuantidadeEntradaEstoque())throw new RegraNegocioException("Preserve as compras que já tiveram entrada no estoque.");
            String justificativa=item.justificativa()==null?"":item.justificativa().trim();
            if(item.quantidadeCompra()>0&&justificativa.isBlank())throw new RegraNegocioException("Informe a justificativa da compra de "+material.getNome()+".");
            long total=item.quantidadeCompra();Set<Long> origensVistas=new HashSet<>();List<Solicitacao.OrigemPlanejada> origens=new java.util.ArrayList<>();
            for(var origem:item.origens()){
                if(origem.quantidade()<1||!origensVistas.add(origem.equipamentoId()))throw new RegraNegocioException("Origem repetida ou quantidade inválida no plano.");
                Equipamento e=equipamentos.buscarParaAtualizacao(origem.equipamentoId()).orElseThrow(()->new RecursoNaoEncontradoException("Equipamento não encontrado."));
                if(s.getEntradasCompra().stream().anyMatch(entrada->Objects.equals(entrada.equipamentoId(),e.getId())))throw new RegraNegocioException("O lote comprado já integra as entradas deste pedido; não o duplique como transporte de outra origem.");
                validarEquipamentoPlano(s,material.getCatalogoChave(),e);
                long reservado=totaisEquipamento.merge(e.getId(),(long)origem.quantidade(),Long::sum);
                if(reservado>e.getQuantidadeDisponivel()||(!e.isLote()&&origem.quantidade()!=1))throw new RegraNegocioException("Saldo insuficiente para "+e.getModelo()+". Atualize as origens do plano.");
                total+=origem.quantidade();
                origens.add(new Solicitacao.OrigemPlanejada(e.getId(),e.getSerie(),e.getObra()==null?null:e.getObra().getId(),origem.quantidade(),material.getCatalogoChave(),material.getNome()));
            }
            if(total!=material.getQuantidade())throw new RegraNegocioException("Transporte e compra devem somar exatamente "+material.getQuantidade()+" unidade(s) de "+material.getNome()+".");
            resultado.add(new Solicitacao.ItemPlano(material.getId(),material.getNome(),material.getCatalogoChave(),material.getQuantidade(),item.quantidadeCompra(),justificativa,origens));
        }
        return resultado;
    }
    private void validarEquipamentoPlano(Solicitacao s,String chave,Equipamento e){
        Long origem=e.getObra()==null?null:e.getObra().getId();Long destino=s.getObraDestino()==null?null:s.getObraDestino().getId();
        if(e.isArquivado()||!statusMovimentavel(e.getStatus())||!Objects.equals(chave,CatalogoChave.criar(e.getTipo(),e.getModelo(),e.getMedida())))throw new RegraNegocioException("O equipamento escolhido não está disponível ou não corresponde ao material.");
        if(Objects.equals(origem,destino))throw new RegraNegocioException("Não use o saldo da própria obra de destino no transporte.");
    }
    private void validarEReservarPlano(Solicitacao s){
        if(s.getMateriais().stream().allMatch(m->m.getIdentificacao()!=null&&!m.getIdentificacao().isBlank()))return;
        if(s.getPlanoFinanceiro().isEmpty())throw new RegraNegocioException("Defina o plano de transporte e compra antes de aprovar o pedido.");
        var dados=new SolicitacaoDto.PlanoFinanceiro(s.getPlanoFinanceiro().stream().map(p->new SolicitacaoDto.MaterialPlano(p.materialId(),p.quantidadeCompra(),p.justificativa(),p.origens().stream().map(o->new SolicitacaoDto.OrigemPlano(o.equipamentoId(),o.quantidade())).toList())).toList());
        List<Solicitacao.ItemPlano> atual=montarPlano(s,dados);
        if(!atual.equals(s.getPlanoFinanceiro()))throw new RegraNegocioException("As origens mudaram desde o planejamento. Atualize o plano antes de aprovar.");
        for(var origem:origensDeExecucao(s)){
            Equipamento e=equipamentos.buscarParaAtualizacao(origem.equipamentoId()).orElseThrow();
            validarEquipamentoPlano(s,origem.catalogoChave(),e);
            if(!Objects.equals(origem.obraOrigemId(),e.getObra()==null?null:e.getObra().getId()))throw new RegraNegocioException("O local do material recebido mudou. Revise o plano financeiro.");
            if(e.getQuantidadeDisponivel()<origem.quantidade())throw new RegraNegocioException("O saldo mudou. Atualize o plano financeiro.");
            e.setQuantidadeReservada(Math.addExact(e.getQuantidadeReservada(),origem.quantidade()));
        }
        s.setReservasPlanoAtivas(true);
    }
    private void restaurarEntradasLegadas(Solicitacao s){
        if(!s.getEntradasCompra().isEmpty()||s.getMateriais().stream().noneMatch(m->m.getQuantidadeEntradaEstoque()>0))return;
        List<Solicitacao.OrigemPlanejada> entradas=new java.util.ArrayList<>();Map<Long,Integer> usadas=new LinkedHashMap<>();
        for(var material:s.getMateriais()){
            int restante=material.getQuantidadeEntradaEstoque();
            for(Equipamento referencia:equipamentos.findAll()){
                if(restante==0)break;
                if(!Objects.equals(referencia.getObservacoes(),"Adquirido para a solicitação #"+s.getId())||!Objects.equals(material.getCatalogoChave(),CatalogoChave.criar(referencia.getTipo(),referencia.getModelo(),referencia.getMedida())))continue;
                Equipamento e=equipamentos.buscarParaAtualizacao(referencia.getId()).orElseThrow();
                if(e.isArquivado()||e.getObra()!=null||!statusMovimentavel(e.getStatus()))continue;
                int quantidade=Math.min(restante,Math.max(0,e.getQuantidadeDisponivel()-usadas.getOrDefault(e.getId(),0)));
                if(quantidade==0)continue;
                entradas.add(new Solicitacao.OrigemPlanejada(e.getId(),e.getSerie(),null,quantidade,material.getCatalogoChave(),material.getNome()));
                usadas.merge(e.getId(),quantidade,Integer::sum);restante-=quantidade;
            }
            if(restante>0)throw new RegraNegocioException("Confira o lote já recebido de "+material.getNome()+" no estoque antes de aprovar. A entrada anterior será preservada.");
        }
        entradas.forEach(s::adicionarEntradaCompra);
    }
    private List<Solicitacao.OrigemPlanejada> origensDeExecucao(Solicitacao s){return java.util.stream.Stream.concat(s.getPlanoFinanceiro().stream().flatMap(p->p.origens().stream()),s.getEntradasCompra().stream()).toList();}
    private List<SolicitacaoDto.AtendimentoOrigem> atendimentosPlanejados(Solicitacao s){
        Map<Long,List<SolicitacaoDto.MaterialRequisicao>> grupos=new LinkedHashMap<>();
        for(var origem:origensDeExecucao(s))grupos.computeIfAbsent(origem.obraOrigemId(),k->new java.util.ArrayList<>()).add(new SolicitacaoDto.MaterialRequisicao(origem.nome(),origem.quantidade(),origem.identificacao(),origem.catalogoChave()));
        return grupos.entrySet().stream().map(e->new SolicitacaoDto.AtendimentoOrigem(e.getKey(),e.getValue())).toList();
    }
    private Map<String,Long> quantidadesPorOrigem(List<SolicitacaoDto.AtendimentoOrigem> atendimentos){
        Map<String,Long> resultado=new LinkedHashMap<>();for(var atendimento:atendimentos)for(var m:atendimento.materiais())resultado.merge(Objects.toString(atendimento.obraOrigemId(),"deposito")+"|"+Objects.toString(m.catalogoChave(),"")+"|"+CatalogoChave.normalizar(m.identificacao()),(long)m.quantidade(),Long::sum);return resultado;
    }
    private void liberarReservasPlano(Solicitacao s){
        if(!s.isReservasPlanoAtivas())return;
        for(var origem:origensDeExecucao(s)){
            Equipamento e=equipamentos.buscarParaAtualizacao(origem.equipamentoId()).orElseThrow();
            if(e.getQuantidadeReservada()<origem.quantidade())throw new RegraNegocioException("A reserva do plano não está íntegra. Solicite revisão do atendimento.");
            e.setQuantidadeReservada(e.getQuantidadeReservada()-origem.quantidade());
        }
        s.setReservasPlanoAtivas(false);
    }
    private void validarRota(Long origemId,Long destinoId){if(origemId==null&&destinoId==null)throw new RegraNegocioException("Informe a origem ou o destino da movimentação.");if(Objects.equals(origemId,destinoId))throw new RegraNegocioException("A origem e o destino da movimentação precisam ser diferentes.");}
    private Solicitacao copiarParaAtendimento(Solicitacao base,Solicitacao raiz){Solicitacao copia=new Solicitacao();copia.setTipo(base.getTipo());copia.setStatus("Aprovada");copia.setSolicitante(base.getSolicitante());copia.setSolicitanteUsuario(base.getSolicitanteUsuario());copia.setSolicitanteNome(base.getSolicitanteNome());copia.setSolicitanteLogin(base.getSolicitanteLogin());copia.setSolicitantePerfil(base.getSolicitantePerfil());copia.setTecnico(base.getTecnico());copia.setObraDestino(base.getObraDestino());copia.setDataSolicitacao(base.getDataSolicitacao());copia.setDataDecisao(base.getDataDecisao());copia.setObservacao(base.getObservacao());copia.setSolicitacaoPai(raiz);copia.copiarEventosFinanceirosDe(base);copia.copiarPedidoOriginalDe(base);copia.setPlanoFinanceiro(base.getPlanoFinanceiro());copia.setMovimentacaoDireta(base.isMovimentacaoDireta());return copia;}
    private SolicitacaoDto.Resposta resposta(Solicitacao s){return new SolicitacaoDto.Resposta(s.getId(),s.getSolicitacaoPai()==null?null:s.getSolicitacaoPai().getId(),s.getTipo(),s.getStatus(),s.nomeSolicitante(),s.getTecnico().getNome(),s.getObraOrigem()==null?null:s.getObraOrigem().getId(),s.getObraDestino()==null?null:s.getObraDestino().getId(),s.getDataSolicitacao(),s.getDataDecisao(),s.getTransitoEm(),s.getConcluidaEm(),s.getObservacao(),s.getMateriais().stream().map(this::respostaMaterial).toList(),s.getSolicitanteLogin(),s.getSolicitantePerfil()==null?null:s.getSolicitantePerfil().name(),comprasPreservadas(s),eventosFinanceiros(s),s.getPlanoFinanceiro(),s.getEntradasCompra(),s.isMovimentacaoDireta(),s.getMateriaisOriginais());}
    private SolicitacaoDto.Resposta respostaFinanceira(Solicitacao s){return new SolicitacaoDto.Resposta(s.getId(),null,s.getTipo(),s.getStatus(),s.nomeSolicitante(),s.getTecnico().getNome(),null,s.getObraDestino()==null?null:s.getObraDestino().getId(),s.getDataSolicitacao(),s.getDataDecisao(),null,null,s.getObservacao(),s.getMateriais().stream().map(m->new SolicitacaoDto.MaterialResposta(m.getId(),m.getNome(),m.getQuantidade(),"Aguardando financeiro".equals(s.getStatus())?m.getIdentificacao():null,m.getCatalogoChave(),m.getQuantidadeCompra(),m.getCompraSolicitadaEm(),m.getQuantidadeAdquirida(),m.getQuantidadeEntradaEstoque(),m.getAdquiridaEm())).toList(),s.getSolicitanteLogin(),s.getSolicitantePerfil()==null?null:s.getSolicitantePerfil().name(),List.of(),eventosFinanceiros(s).stream().filter(e->e.tipo().startsWith("CANCELAMENTO")||Set.of("APROVACAO_INICIAL","APROVACAO","REJEICAO","ALTERACAO","REVISAO_PLANO").contains(e.tipo())).toList(),PedidosFinanceiros.permiteAnalise(s)?s.getPlanoFinanceiro():List.of(),PedidosFinanceiros.permiteAnalise(s)?s.getEntradasCompra():List.of(),false,List.of());}
    private SolicitacaoDto.Resposta respostaParaUsuario(Solicitacao s,String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil()==PerfilUsuario.FINANCEIRO)return respostaFinanceira(s);return usuario.getPerfil().ehProfissionalDeCampo()?respostaTecnico(s,obras.idsPermitidos(login)):resposta(s);}
    private SolicitacaoDto.Resposta respostaTecnico(Solicitacao s,Set<Long> permitidas){Long origem=s.getObraOrigem()!=null&&permitidas.contains(s.getObraOrigem().getId())?s.getObraOrigem().getId():null;Long destino=s.getObraDestino()!=null&&permitidas.contains(s.getObraDestino().getId())?s.getObraDestino().getId():null;return new SolicitacaoDto.Resposta(s.getId(),s.getSolicitacaoPai()==null?null:s.getSolicitacaoPai().getId(),s.getTipo(),s.getStatus(),s.nomeSolicitante(),s.getTecnico().getNome(),origem,destino,s.getDataSolicitacao(),s.getDataDecisao(),s.getTransitoEm(),s.getConcluidaEm(),s.getObservacao(),s.getMateriais().stream().map(this::respostaMaterial).toList(),s.getSolicitanteLogin(),s.getSolicitantePerfil()==null?null:s.getSolicitantePerfil().name(),List.of(),eventosFinanceiros(s).stream().filter(e->Set.of("REJEICAO","REJEICAO_INICIAL").contains(e.tipo())).toList(),List.of(),List.of(),s.isMovimentacaoDireta(),s.getMateriaisOriginais());}
    private List<SolicitacaoDto.MaterialResposta> comprasPreservadas(Solicitacao s){return s.getCompras().stream().map(c->new SolicitacaoDto.MaterialResposta(c.id(),c.nome(),c.quantidade(),c.identificacao(),c.catalogoChave(),c.quantidadeCompra(),c.compraSolicitadaEm(),c.quantidadeAdquirida(),c.quantidadeEntradaEstoque(),c.adquiridaEm())).toList();}
    private List<SolicitacaoDto.EventoFinanceiroResposta> eventosFinanceiros(Solicitacao s){return s.getEventosFinanceiros().stream().map(e->new SolicitacaoDto.EventoFinanceiroResposta(e.tipo(),e.descricao(),e.autorNome(),e.autorLogin(),e.registradoEm())).toList();}
    private void validarDestinoRecebimento(Solicitacao s) {
        if(s.getObraDestino()==null)return;
        if("Concluída".equals(s.getObraDestino().getStatus()))
            throw new RegraNegocioException("Selecione uma obra em andamento para receber os materiais.");
        usuarios.validarAcessoRecebimento(s.getTecnico(),s.getObraDestino());
    }
    private void validarCompatibilidadeResponsavel(Funcionario responsavel,List<MaterialSolicitado> materiais){
        boolean possuiEpi=materiais.stream().anyMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));
        boolean possuiNaoEpi=materiais.stream().anyMatch(m->!EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));
        if(possuiEpi&&possuiNaoEpi)throw new RegraNegocioException("Não misture EPI com outros equipamentos na mesma solicitação.");
        PerfilUsuario esperado=possuiEpi?PerfilUsuario.TST:PerfilUsuario.TECNICO;
        PerfilUsuario atual=usuarios.perfilAtivoDoFuncionario(responsavel);
        if(atual!=null&&atual!=esperado)throw new RegraNegocioException(possuiEpi?"Equipamentos EPI só podem ser solicitados para um TST.":"Equipamentos que não são EPI só podem ser solicitados para um técnico.");
    }
    private boolean solicitacaoEhEpi(Solicitacao solicitacao){return !solicitacao.getMateriais().isEmpty()&&solicitacao.getMateriais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));}
    private boolean pertenceAoRh(Solicitacao solicitacao){return solicitacaoEhEpi(solicitacao)&&usuarios.funcionarioTemPerfilAtivo(solicitacao.getTecnico(),PerfilUsuario.TST);}
    private boolean visivelFinanceiro(Solicitacao s){return !s.isMovimentacaoDireta()&&(Set.of("Aguardando financeiro","Aprovada","Aguardando coleta","Em trânsito","Concluída","Cancelada","Cancelamento solicitado").contains(s.getStatus())||("Rejeitada".equals(s.getStatus())&&s.getEventosFinanceiros().stream().anyMatch(e->"REJEICAO".equals(e.tipo()))));}
    private boolean liberadaParaEstoque(Solicitacao s){return Set.of("Aprovada","Aguardando coleta","Em trânsito","Concluída","Cancelamento solicitado","Cancelada").contains(s.getStatus());}
    private void validarEscopoRh(Solicitacao solicitacao,String login){validarEscopoRh(solicitacao,usuarios.buscarPorLogin(login));}
    private void validarEscopoRh(Solicitacao solicitacao,Usuario usuario){
        if(usuario.getPerfil()==PerfilUsuario.GERENTE&&EscopoEquipamento.pedidoContemEpi(solicitacao))throw new AccessDeniedException("Pedidos de EPI são de responsabilidade exclusiva do RH, não da Gerência.");
        if(usuario.getPerfil()==PerfilUsuario.RH&&!pertenceAoRh(solicitacao))throw new AccessDeniedException("O RH pode operar somente solicitações de EPI dos TSTs.");
    }
    private void validarPermissaoEdicao(Solicitacao s,Usuario usuario){
        if(usuario.getPerfil()==PerfilUsuario.ADMIN)return;
        if(usuario.getPerfil()==PerfilUsuario.FINANCEIRO&&"Aguardando financeiro".equals(s.getStatus()))return;
        if(Set.of(PerfilUsuario.GERENTE,PerfilUsuario.RH).contains(usuario.getPerfil())&&"Pendente".equals(s.getStatus()))return;
        throw new AccessDeniedException("Você não pode editar esta solicitação nesta etapa do fluxo.");
    }
    private SolicitacaoDto.Resposta aprovarPrimeiraEtapa(Solicitacao s){if(!"Pendente".equals(s.getStatus()))throw new RegraNegocioException("A solicitação já foi analisada.");s.setStatus("Aguardando financeiro");s.setDataDecisao(LocalDate.now());return resposta(s);}
    private String resumoParaAuditoria(Solicitacao s){
        Long destino=s.getObraDestino()==null?null:s.getObraDestino().getId();
        return Objects.toString(s.getTecnico()==null?null:s.getTecnico().getId(),"")+"|"+Objects.toString(destino,"")+"|"+Objects.toString(s.getObservacao(),"")+"|"+
            s.getMateriais().stream().map(m->Objects.toString(m.getCatalogoChave(),m.getNome())+":"+m.getQuantidade()+":"+Objects.toString(m.getIdentificacao(),"")).toList();
    }
    private SolicitacaoDto.MaterialResposta respostaMaterial(MaterialSolicitado m){return new SolicitacaoDto.MaterialResposta(m.getId(),m.getNome(),m.getQuantidade(),m.getIdentificacao(),m.getCatalogoChave(),m.getQuantidadeCompra(),m.getCompraSolicitadaEm(),m.getQuantidadeAdquirida(),m.getQuantidadeEntradaEstoque(),m.getAdquiridaEm());}
}
