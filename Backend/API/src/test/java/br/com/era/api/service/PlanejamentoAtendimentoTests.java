package br.com.era.api.service;

import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PlanejamentoAtendimentoTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final ObraService obras=mock(ObraService.class);
    final FuncionarioService funcionarios=mock(FuncionarioService.class);
    final EquipamentoService cadastro=mock(EquipamentoService.class);
    final SolicitacaoService service=new SolicitacaoService(pedidos,equipamentos,mock(MovimentacaoRepository.class),obras,funcionarios,cadastro,usuarios,mock(InventarioHistoricoService.class));
    final Funcionario tecnico=new Funcionario();
    final Obra origem=new Obra(),destino=new Obra();
    Equipamento existente,comprado;
    Solicitacao pedido;
    final String chave="ferramentas|alicate|";
    final java.util.Map<Long,Solicitacao> persistidas=new java.util.HashMap<>();
    long proximoId=10,proximoMaterial=100;

    @BeforeEach void configurar(){
        tecnico.setNome("Ana");ReflectionTestUtils.setField(tecnico,"id",10L);
        origem.setNome("Obra A");origem.setStatus("Em andamento");ReflectionTestUtils.setField(origem,"id",11L);
        destino.setNome("Obra B");destino.setStatus("Em andamento");ReflectionTestUtils.setField(destino,"id",20L);
        for(var perfil:PerfilUsuario.values()){Usuario u=new Usuario();u.setPerfil(perfil);u.setNome(perfil.name());u.setLogin(perfil.name());when(usuarios.buscarPorLogin(perfil.name())).thenReturn(u);}
        when(usuarios.perfilAtivoDoFuncionario(tecnico)).thenReturn(PerfilUsuario.TECNICO);
        when(funcionarios.buscarPorNome("Ana")).thenReturn(tecnico);
        when(obras.buscarOpcional(11L)).thenReturn(origem);when(obras.buscarOpcional(20L)).thenReturn(destino);
        existente=equipamento(30L,"ORIG-1",5,origem);comprado=equipamento(40L,"COMPRA-1",1,null);
        when(equipamentos.findAll()).thenReturn(List.of(existente));
        pedido=new Solicitacao();ReflectionTestUtils.setField(pedido,"id",1L);pedido.setTipo("Movimentação");pedido.setStatus("Aguardando financeiro");pedido.setTecnico(tecnico);pedido.setObraDestino(destino);
        material(3);
        persistidas.put(1L,pedido);
        when(pedidos.buscarParaAtualizacao(anyLong())).thenAnswer(i->Optional.ofNullable(persistidas.get(i.getArgument(0))));
        org.mockito.stubbing.Answer<Solicitacao> salvar=i->{Solicitacao s=i.getArgument(0);if(s.getId()==null)ReflectionTestUtils.setField(s,"id",proximoId++);for(var m:s.getMateriais())if(m.getId()==null)ReflectionTestUtils.setField(m,"id",proximoMaterial++);persistidas.put(s.getId(),s);return s;};
        when(pedidos.save(any())).thenAnswer(salvar);when(pedidos.saveAndFlush(any())).thenAnswer(salvar);
        when(cadastro.registrarEntradaCompra(anyString(),anyString(),anyInt(),anyString(),any(),anyLong())).thenReturn(comprado);
    }

    @Test void somenteFinanceiroDefinePlanoOuDecideCompra(){
        for(var perfil:List.of("ESTOQUE","GERENTE","RH","TECNICO","TST")){
            assertThrows(AccessDeniedException.class,()->service.salvarPlanoFinanceiro(1L,plano(3,List.of()),perfil));
            assertThrows(AccessDeniedException.class,()->service.solicitarCompra(1L,2L,1,perfil));
        }
        assertEquals("Aguardando financeiro",pedido.getStatus());
    }

    @Test void compraPodePreservarSaldoEmUsoNaObra(){
        service.salvarPlanoFinanceiro(1L,plano(3,List.of()),"FINANCEIRO");
        service.aprovar(1L,"FINANCEIRO");
        assertEquals(3,pedido.getMateriais().getFirst().getQuantidadeCompra());
        assertEquals(0,existente.getQuantidadeReservada());assertSame(origem,existente.getObra());
        assertEquals(5,existente.getQuantidade());
        assertThrows(RegraNegocioException.class,()->service.executarPlano(1L,"ESTOQUE"));
    }

    @Test void atendimentoMistoPreservaOrigensEComprasSemDuplicarReservas(){
        service.salvarPlanoFinanceiro(1L,plano(1,List.of(new SolicitacaoDto.OrigemPlano(30L,2))),"FINANCEIRO");
        assertEquals(0,existente.getQuantidadeReservada());
        service.aprovar(1L,"FINANCEIRO");
        assertEquals(2,existente.getQuantidadeReservada());assertSame(origem,existente.getObra());
        assertThrows(AccessDeniedException.class,()->service.registrarAquisicao(1L,2L,1,"NF-1","COMPRA-1","FINANCEIRO"));
        service.registrarAquisicao(1L,2L,1,"NF-1","COMPRA-1","ESTOQUE");
        assertEquals(1,comprado.getQuantidadeReservada());
        var atendimentos=service.executarPlano(1L,"ESTOQUE");
        assertEquals(2,atendimentos.size());
        assertEquals(3,atendimentos.stream().flatMap(a->a.materiais().stream()).mapToInt(SolicitacaoDto.MaterialResposta::quantidade).sum());
        assertEquals(2,existente.getQuantidadeReservada());assertEquals(1,comprado.getQuantidadeReservada());
        assertEquals(1,atendimentos.getFirst().compras().getFirst().quantidadeEntradaEstoque());
        assertFalse(pedido.isReservasPlanoAtivas());
        assertThrows(RegraNegocioException.class,()->service.executarPlano(1L,"ESTOQUE"));
    }

    @Test void somenteCompraGeraTransporteDoLoteQueRealmenteFoiRecebido(){
        material(1);service.salvarPlanoFinanceiro(1L,plano(1,List.of()),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        service.registrarAquisicao(1L,2L,1,"NF-1","COMPRA-1","ESTOQUE");
        var atendimento=service.executarPlano(1L,"ESTOQUE").getFirst();
        assertNull(atendimento.obraOrigemId());assertEquals("COMPRA-1",atendimento.materiais().getFirst().identificacao());
        assertSame(origem,existente.getObra());assertEquals(0,existente.getQuantidadeReservada());
    }

    @Test void estoqueNaoPodeTrocarOrigemNemQuantidadeAutorizada(){
        service.salvarPlanoFinanceiro(1L,plano(0,List.of(new SolicitacaoDto.OrigemPlano(30L,3))),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        var adulterado=new SolicitacaoDto.Distribuicao(List.of(new SolicitacaoDto.AtendimentoOrigem(null,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",3,"COMPRA-1",chave)))));
        assertThrows(AccessDeniedException.class,()->service.distribuir(1L,adulterado,"ESTOQUE"));
        assertEquals(3,existente.getQuantidadeReservada());
        assertThrows(AccessDeniedException.class,()->service.executarPlano(1L,"GERENTE"));
        assertThrows(RegraNegocioException.class,()->service.salvarPlanoFinanceiro(1L,plano(3,List.of()),"FINANCEIRO"));
    }

    @Test void exigePlanoCompletoSaldoAtualEJustificativa(){
        assertThrows(RegraNegocioException.class,()->service.aprovar(1L,"FINANCEIRO"));
        assertThrows(RegraNegocioException.class,()->service.salvarPlanoFinanceiro(1L,plano(1,List.of()),"FINANCEIRO"));
        var semMotivo=new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,3,"",List.of())));
        assertThrows(RegraNegocioException.class,()->service.salvarPlanoFinanceiro(1L,semMotivo,"FINANCEIRO"));
        service.salvarPlanoFinanceiro(1L,plano(0,List.of(new SolicitacaoDto.OrigemPlano(30L,3))),"FINANCEIRO");
        existente.setQuantidadeReservada(4);
        assertThrows(RegraNegocioException.class,()->service.aprovar(1L,"FINANCEIRO"));
        assertEquals("Aguardando financeiro",pedido.getStatus());
    }

    @Test void moverDaGerenciaSegueDiretoAoEstoqueSemAutorizarCompras(){
        var dados=new SolicitacaoDto.Requisicao(null,"Ana",11L,20L,LocalDate.now(),"Transporte",List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",1,"ORIG-1",chave)));
        var resposta=service.cadastrarTransporteDireto(dados,"GERENTE");
        assertEquals("Aprovada",resposta.status());assertTrue(resposta.movimentacaoDireta());
        assertEquals(1,existente.getQuantidadeReservada());assertEquals(0,resposta.materiais().getFirst().quantidadeCompra());
        assertThrows(AccessDeniedException.class,()->service.cadastrarTransporteDireto(dados,"FINANCEIRO"));
    }

    @Test void listaComMaterialExistenteContinuaPassandoPeloFinanceiro(){
        var dados=new SolicitacaoDto.Requisicao(null,"Ana",null,20L,LocalDate.now(),"Lista",List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",3,null,chave)));
        assertEquals("Aguardando financeiro",service.cadastrar(dados,"GERENTE").status());
        assertThrows(RegraNegocioException.class,()->service.cadastrarTransporteDireto(dados,"GERENTE"));
    }

    @Test void entradaAnteriorEhReaproveitadaSemComprarOuReservarEmDobro(){
        material(1);MaterialSolicitado m=pedido.getMateriais().getFirst();m.solicitarCompra(1);m.registrarAquisicao(1);m.registrarEntradaEstoque(1);
        comprado.setObservacoes("Adquirido para a solicitação #1");
        when(equipamentos.findAll()).thenReturn(List.of(existente,comprado));
        service.salvarPlanoFinanceiro(1L,plano(1,List.of()),"FINANCEIRO");
        assertEquals(1,pedido.getEntradasCompra().size());assertEquals(0,comprado.getQuantidadeReservada());
        service.aprovar(1L,"FINANCEIRO");
        assertEquals(1,comprado.getQuantidadeReservada());
        assertEquals("COMPRA-1",service.executarPlano(1L,"ESTOQUE").getFirst().materiais().getFirst().identificacao());
        verifyNoInteractions(cadastro);assertEquals(1,comprado.getQuantidadeReservada());
    }

    @Test void observacaoAdministrativaNaoDescartaPlanoOuReservasAprovados(){
        service.salvarPlanoFinanceiro(1L,plano(0,List.of(new SolicitacaoDto.OrigemPlano(30L,3))),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        service.atualizar(1L,new SolicitacaoDto.Atualizacao(null,null,20L,"Instrução de acesso à obra",null),"ADMIN");
        assertFalse(pedido.getPlanoFinanceiro().isEmpty());assertTrue(pedido.isReservasPlanoAtivas());assertEquals(3,existente.getQuantidadeReservada());
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,new SolicitacaoDto.Atualizacao(null,null,20L,"Troca indevida",List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",1,null,chave))),"ADMIN"));
    }

    @Test void pedidoDeDezEnviaSeisCompradosEMantemQuatroPendentesSemDuplicarCompras(){
        material(10);comprado.setQuantidade(6);
        service.salvarPlanoFinanceiro(1L,plano(10,List.of()),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        assertEquals(0,existente.getQuantidadeReservada());assertEquals(5,existente.getQuantidade());
        service.registrarAquisicao(1L,2L,6,"NF-6","COMPRA-1","ESTOQUE");
        var resposta=service.atenderParcialmente(1L,parcial(2L,40L,6),"ESTOQUE");
        var envio=resposta.stream().filter(s->s.id()==1L).findFirst().orElseThrow();
        var pendente=resposta.stream().filter(s->s.id()!=1L).findFirst().orElseThrow();
        assertEquals(6,envio.materiais().getFirst().quantidade());assertEquals("COMPRA-1",envio.materiais().getFirst().identificacao());
        assertEquals(6,envio.compras().getFirst().quantidadeCompra());assertEquals(6,envio.compras().getFirst().quantidadeEntradaEstoque());
        assertEquals(4,pendente.materiais().getFirst().quantidade());assertEquals(4,pendente.materiais().getFirst().quantidadeCompra());
        assertEquals(0,pendente.materiais().getFirst().quantidadeEntradaEstoque());assertEquals(1L,pendente.solicitacaoPaiId());
        assertEquals(10,envio.materiaisOriginais().getFirst().quantidade());assertEquals(10,pendente.materiaisOriginais().getFirst().quantidade());
        assertEquals(6,comprado.getQuantidadeReservada());assertEquals(0,existente.getQuantidadeReservada());
        assertTrue(persistidas.get(pendente.id()).isReservasPlanoAtivas());
        var segundaCompra=equipamento(50L,"COMPRA-2",4,null);when(cadastro.registrarEntradaCompra(anyString(),anyString(),anyInt(),anyString(),any(),anyLong())).thenReturn(segundaCompra);
        service.registrarAquisicao(pendente.id(),pendente.materiais().getFirst().id(),4,"NF-4","COMPRA-2","ESTOQUE");
        var finalizado=service.executarPlano(pendente.id(),"ESTOQUE");
        assertEquals(4,finalizado.getFirst().materiais().getFirst().quantidade());assertEquals(4,segundaCompra.getQuantidadeReservada());
        assertThrows(RegraNegocioException.class,()->service.atenderParcialmente(1L,parcial(envio.materiais().getFirst().id(),40L,6),"ESTOQUE"));
    }

    @Test void parcialMistoPreservaReservasDasOrigensEEntradasNaoEnviadas(){
        material(5);comprado.setQuantidade(2);
        service.salvarPlanoFinanceiro(1L,plano(3,List.of(new SolicitacaoDto.OrigemPlano(30L,2))),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        service.registrarAquisicao(1L,2L,2,"NF-2","COMPRA-1","ESTOQUE");
        var resposta=service.atenderParcialmente(1L,parcial(2L,40L,1),"ESTOQUE");
        var pendente=resposta.stream().filter(s->s.id()!=1L).findFirst().orElseThrow();
        assertEquals(4,pendente.materiais().getFirst().quantidade());assertEquals(2,pendente.materiais().getFirst().quantidadeCompra());
        assertEquals(1,pendente.materiais().getFirst().quantidadeEntradaEstoque());assertEquals(1,pendente.entradasCompra().getFirst().quantidade());
        assertEquals(2,existente.getQuantidadeReservada());assertEquals(2,comprado.getQuantidadeReservada());
        assertEquals("Equipamento da obra A em uso",pendente.planoFinanceiro().getFirst().justificativa());
    }

    @Test void parcialNaoPermiteForjarEquipamentoAumentarSaldoOuEnviarCompraSemEntrada(){
        service.salvarPlanoFinanceiro(1L,plano(3,List.of()),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        assertThrows(RegraNegocioException.class,()->service.atenderParcialmente(1L,parcial(2L,40L,1),"ESTOQUE"));
        assertThrows(RegraNegocioException.class,()->service.atenderParcialmente(1L,parcial(2L,999L,1),"ESTOQUE"));
        assertThrows(RegraNegocioException.class,()->service.atenderParcialmente(1L,new SolicitacaoDto.AtendimentoParcial("",List.of(new SolicitacaoDto.MaterialParcial(2L,List.of()))),"ESTOQUE"));
        for(String perfil:List.of("TECNICO","TST","GERENTE","RH","FINANCEIRO"))assertThrows(AccessDeniedException.class,()->service.atenderParcialmente(1L,parcial(2L,40L,1),perfil));
        assertEquals(3,pedido.getMateriais().getFirst().getQuantidade());assertTrue(pedido.getMateriaisOriginais().isEmpty());
    }

    @Test void financeiroPodeTrocarRetiradaAprovadaPorCompraSemMoverOEquipamento(){
        service.salvarPlanoFinanceiro(1L,plano(0,List.of(new SolicitacaoDto.OrigemPlano(30L,3))),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        assertEquals(3,existente.getQuantidadeReservada());
        var revisao=new SolicitacaoDto.PlanoFinanceiro(plano(3,List.of()).materiais(),"Preservar o equipamento na obra A.");
        service.salvarPlanoFinanceiro(1L,revisao,"FINANCEIRO");
        assertEquals(0,existente.getQuantidadeReservada());assertSame(origem,existente.getObra());assertEquals("Aprovada",pedido.getStatus());
        assertEquals(3,pedido.getMateriais().getFirst().getQuantidadeCompra());assertEquals("REVISAO_PLANO",pedido.getEventosFinanceiros().getLast().tipo());
        assertThrows(RegraNegocioException.class,()->service.salvarPlanoFinanceiro(1L,plano(3,List.of()),"FINANCEIRO"));
        assertThrows(AccessDeniedException.class,()->service.salvarPlanoFinanceiro(1L,revisao,"ESTOQUE"));
    }

    @Test void revisaoPreservaCompraRecebidaEReservaSomenteAsNovasOrigens(){
        service.salvarPlanoFinanceiro(1L,plano(1,List.of(new SolicitacaoDto.OrigemPlano(30L,2))),"FINANCEIRO");service.aprovar(1L,"FINANCEIRO");
        service.registrarAquisicao(1L,2L,1,"NF-1","COMPRA-1","ESTOQUE");
        service.salvarPlanoFinanceiro(1L,new SolicitacaoDto.PlanoFinanceiro(plano(3,List.of()).materiais(),"Comprar o restante em outro fornecedor."),"FINANCEIRO");
        assertEquals(1,pedido.getMateriais().getFirst().getQuantidadeEntradaEstoque());assertEquals(1,comprado.getQuantidadeReservada());assertEquals(0,existente.getQuantidadeReservada());
    }

    SolicitacaoDto.AtendimentoParcial parcial(Long materialId,Long equipamentoId,int quantidade){return new SolicitacaoDto.AtendimentoParcial("Fornecedor sem o saldo completo.",List.of(new SolicitacaoDto.MaterialParcial(materialId,List.of(new SolicitacaoDto.OrigemPlano(equipamentoId,quantidade)))));}
    void material(int quantidade){var m=new MaterialSolicitado("Alicate",quantidade,null,chave);ReflectionTestUtils.setField(m,"id",2L);pedido.substituirMateriais(List.of(m));}
    SolicitacaoDto.PlanoFinanceiro plano(int comprar,List<SolicitacaoDto.OrigemPlano> origens){return new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,comprar,"Equipamento da obra A em uso",origens)));}
    Equipamento equipamento(Long id,String serie,int quantidade,Obra obra){
        Equipamento e=new Equipamento();ReflectionTestUtils.setField(e,"id",id);e.setTipo("Ferramentas");e.setModelo("Alicate");e.setSerie(serie);e.setQuantidade(quantidade);e.setControleQuantidade("LOTE");e.setStatus(obra==null?"Em estoque":"Em campo");e.setObra(obra);
        when(equipamentos.buscarParaAtualizacao(id)).thenReturn(Optional.of(e));when(equipamentos.buscarPorSerieParaAtualizacao(serie)).thenReturn(Optional.of(e));return e;
    }
}
