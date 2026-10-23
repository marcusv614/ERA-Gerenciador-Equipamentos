package br.com.era.api.service;

import br.com.era.api.dto.AuditoriaTecnicoDto;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

@Service
public class AuditoriaTecnicoService {
    private final AuditoriaTecnicoRepository auditorias;
    private final EquipamentoRepository equipamentos;
    private final SolicitacaoRepository pedidos;
    private final FuncionarioService funcionarios;
    private final UsuarioService usuarios;
    public AuditoriaTecnicoService(AuditoriaTecnicoRepository auditorias,EquipamentoRepository equipamentos,SolicitacaoRepository pedidos,FuncionarioService funcionarios,UsuarioService usuarios) {
        this.auditorias=auditorias;this.equipamentos=equipamentos;this.pedidos=pedidos;this.funcionarios=funcionarios;this.usuarios=usuarios;
    }
    private Usuario autor(String login) {
        Usuario u=usuarios.buscarPorLogin(login);
        if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.RH).contains(u.getPerfil()))throw new AccessDeniedException("Somente a gerência ou o RH podem gerenciar vistorias.");
        return u;
    }
    private void validarEscopoRh(Usuario autor,Funcionario funcionario){
        if(autor.getPerfil()==PerfilUsuario.RH&&!usuarios.funcionarioTemPerfilAtivo(funcionario,PerfilUsuario.TST))
            throw new AccessDeniedException("O RH pode gerenciar somente vistorias de TSTs.");
    }
    @Transactional(readOnly=true) public List<AuditoriaTecnicoDto.Resposta> listar(Long tecnicoId,String login) {
        Usuario autor=autor(login);Funcionario funcionario=funcionarios.buscar(tecnicoId);validarEscopoRh(autor,funcionario);
        return auditorias.findByFuncionarioIdOrderByCriadoEmDescIdDesc(tecnicoId).stream().filter(a->auditoriaPermitida(autor,a)).map(this::resposta).toList();
    }
    @Transactional(readOnly=true) public List<AuditoriaTecnicoDto.Resposta> listarTodas(String login) {
        Usuario autor=autor(login);return auditorias.findAllByOrderByCriadoEmDescIdDesc().stream().filter(a->autor.getPerfil()!=PerfilUsuario.RH||usuarios.funcionarioTemPerfilAtivo(a.getFuncionario(),PerfilUsuario.TST)).filter(a->auditoriaPermitida(autor,a)).map(this::resposta).toList();
    }
    @Transactional(readOnly=true) public AuditoriaTecnicoDto.Resposta consultar(Long tecnicoId,Long id,String login) {
        Usuario autor=autor(login);Funcionario funcionario=funcionarios.buscar(tecnicoId);validarEscopoRh(autor,funcionario);return resposta(auditorias.findByIdAndFuncionarioId(id,tecnicoId).filter(a->auditoriaPermitida(autor,a)).orElseThrow(()->new RecursoNaoEncontradoException("Vistoria não encontrada para este técnico.")));
    }
    @Transactional(readOnly=true) public List<AuditoriaTecnico.Item> materiais(Long tecnicoId,String login) {
        Usuario autor=autor(login);Funcionario funcionario=funcionarios.buscar(tecnicoId);validarEscopoRh(autor,funcionario);return materiaisPermitidos(tecnicoId,autor);
    }
    private List<AuditoriaTecnico.Item> materiaisAtuais(Long tecnicoId) {
        Map<String,Long> transito=new HashMap<>();
        pedidos.findByStatus("Em trânsito").forEach(p->p.getMateriais().forEach(m->{
            if(m.getIdentificacao()!=null)transito.merge(m.getIdentificacao().trim().toLowerCase(Locale.ROOT),m.getQuantidade().longValue(),Long::sum);
        }));
        return equipamentos.findByTecnicoIdAndAuditavelTrueAndArquivadoFalseOrderByModeloAscSerieAsc(tecnicoId).stream()
            .filter(e->e.isAuditavel()&&!e.isArquivado()&&e.getTecnico()!=null&&Objects.equals(e.getTecnico().getId(),tecnicoId)&&!"Em trânsito".equals(e.getStatus()))
            .map(e->{int presentes=(int)Math.max(0L,e.getQuantidade()-transito.getOrDefault(e.getSerie().trim().toLowerCase(Locale.ROOT),0L));
                return new AuditoriaTecnico.Item(e.getId(),e.getObra()==null?null:e.getObra().getId(),e.getTipo(),e.getModelo(),e.getSerie(),e.getMedida(),e.getObra()==null?"Depósito central":e.getObra().getNome(),presentes,0,0,0,null);})
            .filter(i->i.quantidade()>0).toList();
    }
    private List<AuditoriaTecnico.Item> materiaisPermitidos(Long tecnicoId,Usuario autor){return materiaisAtuais(tecnicoId).stream().filter(i->autor.getPerfil()!=PerfilUsuario.RH||EscopoEquipamento.ehEpi(i.tipo())).toList();}
    @Transactional public AuditoriaTecnicoDto.Resposta criar(Long tecnicoId,AuditoriaTecnicoDto.Criacao dados,String login) {
        Usuario autor=autor(login);Funcionario tecnico=funcionarios.buscar(tecnicoId);validarEscopoRh(autor,tecnico);
        if(tecnico.isArquivado())throw new RegraNegocioException("Não é possível criar uma vistoria para um funcionário arquivado.");
        Set<Long> ids=new HashSet<>(dados.equipamentoIds());
        if(ids.size()!=dados.equipamentoIds().size())throw new RegraNegocioException("Não repita equipamentos na mesma vistoria.");
        List<AuditoriaTecnico.Item> itens=materiaisPermitidos(tecnicoId,autor).stream().filter(i->ids.contains(i.equipamentoId())).toList();
        if(itens.size()!=ids.size()||itens.isEmpty())throw new RegraNegocioException("Selecione somente itens auditáveis atualmente com este técnico e fora de transporte. Atualize a lista e tente novamente.");
        return resposta(auditorias.saveAndFlush(new AuditoriaTecnico(tecnico,autor,itens)));
    }
    @Transactional public AuditoriaTecnicoDto.Resposta registrar(Long tecnicoId,Long id,AuditoriaTecnicoDto.Registro dados,String login) {
        Usuario autor=autor(login);Funcionario tecnico=funcionarios.buscar(tecnicoId);validarEscopoRh(autor,tecnico);
        AuditoriaTecnico a=auditorias.buscarParaAtualizacao(id,tecnicoId).orElseThrow(()->new RecursoNaoEncontradoException("Vistoria não encontrada para este técnico."));
        if(!auditoriaPermitida(autor,a))throw new RecursoNaoEncontradoException("Vistoria não encontrada.");
        if(!"ABERTA".equals(a.getStatus()))throw new RegraNegocioException("A vistoria concluída está preservada e não pode ser alterada. Crie uma nova vistoria.");
        if(!Objects.equals(dados.versao(),a.getVersao()))throw new RegraNegocioException("Esta vistoria foi atualizada por outra pessoa. Reabra o registro antes de salvar.");
        if(dados.dataVistoria()!=null&&dados.dataVistoria().isAfter(LocalDate.now()))throw new RegraNegocioException("A data da vistoria não pode estar no futuro.");
        if(dados.concluir()&&(dados.dataVistoria()==null||dados.fiscal()==null||dados.fiscal().isBlank()))throw new RegraNegocioException("Informe a data da vistoria e o nome do fiscal para concluir.");
        Map<Long,AuditoriaTecnicoDto.ItemRegistro> enviados=new HashMap<>();
        for(var item:dados.itens())if(enviados.put(item.equipamentoId(),item)!=null)throw new RegraNegocioException("Não repita itens no resultado da vistoria.");
        if(enviados.size()!=a.getItens().size())throw new RegraNegocioException("Registre todos os itens da ficha original.");
        List<AuditoriaTecnico.Item> resultado=new ArrayList<>();
        for(var original:a.getItens()) {
            var item=enviados.get(original.equipamentoId());
            if(item==null)throw new RegraNegocioException("Os itens precisam corresponder à ficha original.");
            long total=(long)item.bom()+item.avaria()+item.quebrado();
            if(item.bom()<0||item.avaria()<0||item.quebrado()<0||total>original.quantidade()||(dados.concluir()&&total!=original.quantidade()))
                throw new RegraNegocioException("Confira as quantidades de "+original.modelo()+". Para concluir, a soma dos estados deve ser igual a "+original.quantidade()+".");
            resultado.add(new AuditoriaTecnico.Item(original.equipamentoId(),original.obraId(),original.tipo(),original.modelo(),original.serie(),original.medida(),original.local(),original.quantidade(),item.bom(),item.avaria(),item.quebrado(),limpar(item.observacao())));
        }
        a.registrar(dados.dataVistoria(),limpar(dados.fiscal()),limpar(dados.observacoes()),resultado,autor,dados.concluir());
        auditorias.flush();return resposta(a);
    }
    private boolean auditoriaPermitida(Usuario autor,AuditoriaTecnico a){return autor.getPerfil()!=PerfilUsuario.RH||a.getItens().stream().allMatch(i->EscopoEquipamento.ehEpi(i.tipo()));}
    private String limpar(String valor){return valor==null||valor.isBlank()?null:valor.trim();}
    private AuditoriaTecnicoDto.Resposta resposta(AuditoriaTecnico a) {
        return new AuditoriaTecnicoDto.Resposta(a.getId(),a.getVersao(),a.getFuncionario().getId(),a.getTecnicoNome(),a.getStatus(),a.getCriadoEm(),a.getCriadoPorNome(),a.getCriadoPorLogin(),a.getDataVistoria(),a.getFiscal(),a.getObservacoes(),a.getRegistradoPorNome(),a.getRegistradoPorLogin(),a.getAtualizadoEm(),a.getConcluidaEm(),a.getItens());
    }
}
