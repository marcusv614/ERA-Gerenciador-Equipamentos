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
        when(pedidos.buscarParaAtualizacao(1L)).thenAnswer(i->Optional.of(pedido));
        when(pedidos.save(any())).thenAnswer(i->{Solicitacao s=i.getArgument(0);if(s.getId()==null)ReflectionTestUtils.setField(s,"id",9L);return s;});
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

    void material(int quantidade){var m=new MaterialSolicitado("Alicate",quantidade,null,chave);ReflectionTestUtils.setField(m,"id",2L);pedido.substituirMateriais(List.of(m));}
    SolicitacaoDto.PlanoFinanceiro plano(int comprar,List<SolicitacaoDto.OrigemPlano> origens){return new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,comprar,"Equipamento da obra A em uso",origens)));}
    Equipamento equipamento(Long id,String serie,int quantidade,Obra obra){
        Equipamento e=new Equipamento();ReflectionTestUtils.setField(e,"id",id);e.setTipo("Ferramentas");e.setModelo("Alicate");e.setSerie(serie);e.setQuantidade(quantidade);e.setControleQuantidade("LOTE");e.setStatus(obra==null?"Em estoque":"Em campo");e.setObra(obra);
        when(equipamentos.buscarParaAtualizacao(id)).thenReturn(Optional.of(e));when(equipamentos.buscarPorSerieParaAtualizacao(serie)).thenReturn(Optional.of(e));return e;
    }
}
