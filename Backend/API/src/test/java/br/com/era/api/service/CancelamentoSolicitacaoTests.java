package br.com.era.api.service;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import br.com.era.api.exception.*;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CancelamentoSolicitacaoTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final NotificacaoMovimentacaoService avisos=mock(NotificacaoMovimentacaoService.class);
    final CancelamentoSolicitacaoService service=new CancelamentoSolicitacaoService(pedidos,equipamentos,usuarios,avisos);
    Solicitacao s;Equipamento e;
    @BeforeEach void preparar(){
        var f=new Funcionario();f.setNome("Técnico");ReflectionTestUtils.setField(f,"id",1L);
        var destino=new Obra();destino.setNome("Destino");ReflectionTestUtils.setField(destino,"id",2L);
        s=new Solicitacao();ReflectionTestUtils.setField(s,"id",10L);s.setTipo("Movimentação");s.setStatus("Pendente");s.setTecnico(f);s.setObraDestino(destino);s.setSolicitanteLogin("TECNICO");
        s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",2,null,"ferramentas|alicate|")));
        when(pedidos.buscarParaAtualizacao(10L)).thenReturn(Optional.of(s));
        for(var perfil:PerfilUsuario.values()){var u=new Usuario();u.setPerfil(perfil);u.setLogin(perfil.name());u.setNome(perfil.name());u.setFuncionario(f);when(usuarios.buscarPorLogin(perfil.name())).thenReturn(u);}
        e=new Equipamento();ReflectionTestUtils.setField(e,"id",3L);e.setQuantidade(20);e.setQuantidadeReservada(5);
        when(equipamentos.buscarParaAtualizacao(3L)).thenReturn(Optional.of(e));
        when(equipamentos.buscarPorSerieParaAtualizacao("SERIE")).thenReturn(Optional.of(e));
    }
    @Test void solicitanteCancelaPendenteComHistoricoSemExcluir(){
        var resultado=service.solicitar(10L,"Pedido duplicado","TECNICO");
        assertEquals("Cancelada",resultado.status());assertEquals("Pendente",resultado.statusAnterior());
        assertEquals(2,resultado.historico().size());verify(pedidos,never()).delete(any());
    }
    @Test void motivoObrigatorio(){assertThrows(RegraNegocioException.class,()->service.solicitar(10L," ","GERENTE"));assertEquals("Pendente",s.getStatus());}
    @Test void todosOsPerfisPrecisamJustificarSemAlterarPedidoQuandoMotivoInvalido(){
        for(var perfil:PerfilUsuario.values()){
            boolean epi=perfil==PerfilUsuario.RH||perfil==PerfilUsuario.TST;
            s.substituirMateriais(List.of(new MaterialSolicitado("Material",2,null,epi?"epi|capacete|":"ferramentas|alicate|")));
            s.setStatus(perfil==PerfilUsuario.FINANCEIRO?"Aguardando financeiro":perfil==PerfilUsuario.ESTOQUE?"Aprovada":"Pendente");
            String antes=s.getStatus();
            for(String motivo:Arrays.asList(null,"","     ","abcd","x".repeat(1001)))assertThrows(RegraNegocioException.class,()->service.solicitar(10L,motivo,perfil.name()),perfil.name());
            assertEquals(antes,s.getStatus());assertTrue(s.getEventosFinanceiros().isEmpty());
        }
        verifyNoInteractions(avisos);
    }
    @Test void confirmacoesTambemExigemJustificativaPropria(){
        s.setStatus("Aguardando financeiro");service.solicitar(10L,"Obra suspensa pelo cliente","GERENTE");
        assertThrows(RegraNegocioException.class,()->service.confirmar(10L,"  ",false,"FINANCEIRO"));
        assertFalse(s.isFinanceiroCancelamentoConfirmado());assertEquals("Cancelamento solicitado",s.getStatus());
        var r=service.confirmar(10L,"Fornecedor confirmou a interrupção da compra",false,"FINANCEIRO");
        assertEquals("Obra suspensa pelo cliente",r.motivo());
        assertTrue(r.historico().stream().anyMatch(e->e.tipo().equals("CANCELAMENTO_FINANCEIRO")&&e.descricao().contains("Fornecedor confirmou")&&e.autorLogin().equals("FINANCEIRO")));
    }
    @Test void financeiroQueIniciaOCancelamentoRegistraSeuParecer(){
        s.setStatus("Aguardando financeiro");var r=service.solicitar(10L,"Orçamento não autorizado pelo cliente","FINANCEIRO");
        assertEquals("Cancelada",r.status());assertTrue(r.historico().stream().anyMatch(e->e.tipo().equals("CANCELAMENTO_FINANCEIRO")&&e.descricao().contains("Orçamento não autorizado")));
    }
    @Test void rhNaoAcessaFerramentasNemPorId(){assertThrows(RecursoNaoEncontradoException.class,()->service.consultar(10L,"RH"));}
    @Test void gerenteNaoConsultaNemCancelaEpiMesmoSeFoiAutorAntigo(){
        s.substituirMateriais(List.of(new MaterialSolicitado("Capacete",2,null,"epi|capacete|")));s.setSolicitanteLogin("GERENTE");
        assertThrows(RecursoNaoEncontradoException.class,()->service.consultar(10L,"GERENTE"));
        assertThrows(RecursoNaoEncontradoException.class,()->service.solicitar(10L,"Tentativa indevida","GERENTE"));
        assertThrows(RecursoNaoEncontradoException.class,()->service.confirmar(10L,"Tentativa indevida",false,"GERENTE"));
        assertEquals("Pendente",s.getStatus());
    }
    @Test void tstNaoAcessaPedidoDeFerramentas(){assertThrows(RecursoNaoEncontradoException.class,()->service.solicitar(10L,"Duplicado","TST"));}
    @Test void outroTecnicoNaoAcessa(){var outro=new Funcionario();ReflectionTestUtils.setField(outro,"id",99L);usuarios.buscarPorLogin("TECNICO").setFuncionario(outro);assertThrows(RecursoNaoEncontradoException.class,()->service.consultar(10L,"TECNICO"));}
    @Test void estoqueNaoConsultaPendente(){assertThrows(RecursoNaoEncontradoException.class,()->service.consultar(10L,"ESTOQUE"));}
    @Test void entregaConcluidaExigeDevolucaoNaoCancelamento(){s.setStatus("Concluída");assertThrows(AccessDeniedException.class,()->service.solicitar(10L,"Devolver itens","ADMIN"));assertEquals(5,e.getQuantidadeReservada());}
    @Test void gerenteSuspendeEFinanceiroConfirma(){s.setStatus("Aguardando financeiro");assertEquals("Cancelamento solicitado",service.solicitar(10L,"Projeto suspenso","GERENTE").status());assertThrows(AccessDeniedException.class,()->service.confirmar(10L,"Conferido",false,"GERENTE"));assertEquals("Cancelada",service.confirmar(10L,"Sem compras pendentes",false,"FINANCEIRO").status());}
    @Test void transitoMantemReservaAteRetornoFisico(){
        s.setStatus("Em trânsito");s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",2,"SERIE","ferramentas|alicate|")));
        assertEquals("Cancelamento solicitado",service.solicitar(10L,"Obra suspensa","FINANCEIRO").status());assertEquals(5,e.getQuantidadeReservada());
        assertThrows(AccessDeniedException.class,()->service.confirmar(10L,"Material devolvido",true,"GERENTE"));
        assertEquals("Cancelada",service.confirmar(10L,"Material conferido na origem",true,"ESTOQUE").status());assertEquals(3,e.getQuantidadeReservada());
        service.confirmar(10L,"Repetição da conferência",true,"ESTOQUE");assertEquals(3,e.getQuantidadeReservada());assertEquals(20,e.getQuantidade());
    }
    @Test void comprasRecebidasPreservadasEOutrasReservasNaoLiberadas(){
        s.setStatus("Aprovada");s.getMateriais().getFirst().solicitarCompra(2);s.getMateriais().getFirst().registrarAquisicao(2);s.getMateriais().getFirst().registrarEntradaEstoque(2);
        s.setReservasPlanoAtivas(true);s.adicionarEntradaCompra(new Solicitacao.OrigemPlanejada(3L,"SERIE",null,2,"ferramentas|alicate|","Alicate"));
        service.solicitar(10L,"Pedido cancelado pelo cliente","FINANCEIRO");service.confirmar(10L,"Compra conferida no depósito",true,"ESTOQUE");
        assertEquals(3,e.getQuantidadeReservada());assertEquals(2,s.getMateriais().getFirst().getQuantidadeEntradaEstoque());assertEquals(1,s.getEntradasCompra().size());
    }
    @Test void reservaInconsistenteImpedeEncerramento(){
        s.setStatus("Aprovada");s.setReservasPlanoAtivas(true);e.setQuantidadeReservada(1);
        s.setPlanoFinanceiro(List.of(new Solicitacao.ItemPlano(1L,"Alicate","ferramentas|alicate|",2,0,"",List.of(new Solicitacao.OrigemPlanejada(3L,"SERIE",null,2,"ferramentas|alicate|","Alicate")))));
        assertThrows(RegraNegocioException.class,()->service.solicitar(10L,"Pedido duplicado","FINANCEIRO"));assertEquals(1,e.getQuantidadeReservada());
    }
    @Test void transporteDiretoNaoExigeFinanceiro(){
        s.setMovimentacaoDireta(true);s.setStatus("Aprovada");s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",2,"SERIE","ferramentas|alicate|")));
        service.solicitar(10L,"Destino indisponível","GERENTE");
        assertEquals("Cancelada",service.confirmar(10L,"Itens não saíram da origem",true,"ESTOQUE").status());
    }
}
