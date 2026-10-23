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
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PerfisTstRhTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final ObraService obras=mock(ObraService.class);
    final FuncionarioService funcionarios=mock(FuncionarioService.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final SolicitacaoService service=new SolicitacaoService(pedidos,equipamentos,mock(MovimentacaoRepository.class),obras,funcionarios,mock(EquipamentoService.class),usuarios,mock(InventarioHistoricoService.class),mock(NotificacaoMovimentacaoService.class));
    final Funcionario tecnico=funcionario(1L,"Técnico");
    final Funcionario tst=funcionario(2L,"TST");
    final Equipamento epi=equipamento("EPI","Capacete");
    final Equipamento ferramenta=equipamento("Ferramentas manuais","Alicate");

    @BeforeEach void preparar(){
        when(usuarios.buscarPorLogin("tecnico")).thenReturn(usuario(PerfilUsuario.TECNICO,tecnico));
        when(usuarios.buscarPorLogin("tst")).thenReturn(usuario(PerfilUsuario.TST,tst));
        when(usuarios.buscarPorLogin("rh")).thenReturn(usuario(PerfilUsuario.RH,null));
        when(usuarios.buscarPorLogin("gerente")).thenReturn(usuario(PerfilUsuario.GERENTE,null));
        when(usuarios.buscarPorLogin("admin")).thenReturn(usuario(PerfilUsuario.ADMIN,null));
        when(usuarios.buscarPorLogin("financeiro")).thenReturn(usuario(PerfilUsuario.FINANCEIRO,null));
        when(usuarios.perfilAtivoDoFuncionario(tecnico)).thenReturn(PerfilUsuario.TECNICO);
        when(usuarios.perfilAtivoDoFuncionario(tst)).thenReturn(PerfilUsuario.TST);
        when(obras.idsPermitidos(anyString())).thenReturn(Set.of(10L));
        when(obras.buscarOpcional(10L)).thenReturn(obra());
        when(pedidos.save(any())).thenAnswer(invocacao->invocacao.getArgument(0));
    }

    @Test void reconheceCategoriaLegadaComoEpiDuranteAMigracao(){
        assertTrue(EscopoEquipamento.ehEpi("Segurança, EPI e acesso"));
        assertTrue(EscopoEquipamento.ehEpi("EPI"));
        assertFalse(EscopoEquipamento.ehEpi("Ferramentas manuais"));
    }
    @Test void todaRejeicaoAutenticadaExigeJustificativaERegistraAutor(){
        for(String login:List.of("gerente","rh","financeiro","admin")){
            boolean rh=login.equals("rh");var p=pedido(rh?tst:tecnico,rh?"EPI":"Ferramentas",rh?"Capacete":"Alicate");
            p.setStatus(login.equals("financeiro")?"Aguardando financeiro":"Pendente");String antes=p.getStatus();
            when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(p));when(usuarios.funcionarioTemPerfilAtivo(tst,PerfilUsuario.TST)).thenReturn(true);
            for(String motivo:java.util.Arrays.asList(null,"","    ","abcd","x".repeat(1001)))assertThrows(RegraNegocioException.class,()->service.rejeitar(1L,login,motivo));
            assertEquals(antes,p.getStatus());assertTrue(p.getEventosFinanceiros().isEmpty());
            assertEquals("Rejeitada",service.rejeitar(1L,login,"Material não necessário nesta etapa").status());
            assertTrue(p.getEventosFinanceiros().stream().anyMatch(e->e.descricao().contains("Material não necessário")&&e.autorLogin().equals(login)));
        }
    }

    @Test void tecnicoNaoPodePedirEpi(){
        when(equipamentos.findAll()).thenReturn(List.of(epi));
        RegraNegocioException erro=assertThrows(RegraNegocioException.class,()->service.cadastrar(requisicao("Técnico","Capacete","epi|capacete|"),"tecnico"));
        assertEquals("Equipamentos EPI só podem ser solicitados para um TST.",erro.getMessage());
        verify(pedidos,never()).save(any());
    }

    @Test void tstNaoPodePedirEquipamentoForaDeEpi(){
        when(equipamentos.findAll()).thenReturn(List.of(ferramenta));
        RegraNegocioException erro=assertThrows(RegraNegocioException.class,()->service.cadastrar(requisicao("TST","Alicate","ferramentas manuais|alicate|"),"tst"));
        assertEquals("Equipamentos que não são EPI só podem ser solicitados para um técnico.",erro.getMessage());
        verify(pedidos,never()).save(any());
    }

    @Test void tstPodePedirEpi(){
        when(equipamentos.findAll()).thenReturn(List.of(epi));
        var resposta=service.cadastrar(requisicao("TST","Capacete","epi|capacete|"),"tst");
        assertEquals("Pendente",resposta.status());
        assertEquals("EPI",epi.getTipo());
        verify(pedidos).save(any());
    }

    @Test void rhListaSomentePedidosEpiDeTsts(){
        Solicitacao pedidoTst=pedido(tst,"EPI","Capacete");
        Solicitacao pedidoTecnico=pedido(tecnico,"Ferramentas manuais","Alicate");
        when(pedidos.findAll()).thenReturn(List.of(pedidoTst,pedidoTecnico));
        when(usuarios.funcionarioTemPerfilAtivo(tst,PerfilUsuario.TST)).thenReturn(true);
        assertEquals(1,service.listarParaUsuario("rh").size());
        assertEquals("TST",service.listarParaUsuario("rh").getFirst().tecnico());
    }

    @Test void rhNaoPodeAprovarPedidoForaDoEscopo(){
        Solicitacao pedido=pedido(tecnico,"Ferramentas manuais","Alicate");
        when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(pedido));
        assertThrows(AccessDeniedException.class,()->service.aprovar(1L,"rh"));
        assertEquals("Pendente",pedido.getStatus());
    }
    @Test void gerenteNaoListaPedidosEpiMasAdminPreservaAcesso(){
        var epi=pedido(tst,"EPI","Capacete");var comum=pedido(tecnico,"Ferramentas","Alicate");
        when(pedidos.findAll()).thenReturn(List.of(epi,comum));
        assertEquals(1,service.listarParaUsuario("gerente").size());assertEquals("Técnico",service.listarParaUsuario("gerente").getFirst().tecnico());
        assertEquals(2,service.listarParaUsuario("admin").size());
    }
    @Test void gerenteNaoPodeAprovarRejeitarOuEditarPedidoEpiPorId(){
        var p=pedido(tst,"EPI","Capacete");when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(p));
        assertThrows(AccessDeniedException.class,()->service.aprovar(1L,"gerente"));
        assertThrows(AccessDeniedException.class,()->service.rejeitar(1L,"gerente"));
        assertThrows(AccessDeniedException.class,()->service.atualizar(1L,new SolicitacaoDto.Atualizacao(null,null,10L,"Tentativa",null),"gerente"));
        assertEquals("Pendente",p.getStatus());assertNull(p.getObservacao());
    }
    @Test void gerenteNaoPodeCriarPedidoEpiNemTransporteDireto(){
        when(funcionarios.buscarPorNome("TST")).thenReturn(tst);when(equipamentos.findAll()).thenReturn(List.of(epi));
        assertThrows(AccessDeniedException.class,()->service.cadastrar(requisicao("TST","Capacete","epi|capacete|"),"gerente"));
        epi.setSerie("EPI-1");when(equipamentos.buscarPorSerieParaAtualizacao("EPI-1")).thenReturn(Optional.of(epi));
        var d=new SolicitacaoDto.Requisicao(null,"TST",null,10L,LocalDate.now(),null,List.of(new SolicitacaoDto.MaterialRequisicao("Capacete",1,"EPI-1","epi|capacete|")));
        assertThrows(AccessDeniedException.class,()->service.cadastrarTransporteDireto(d,"gerente"));
        verify(pedidos,never()).save(any());assertEquals(0,epi.getQuantidadeReservada());
    }
    @Test void rhContinuaSendoResponsavelPelaAprovacaoInicial(){
        var p=pedido(tst,"EPI","Capacete");when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(p));
        when(usuarios.funcionarioTemPerfilAtivo(tst,PerfilUsuario.TST)).thenReturn(true);
        assertEquals("Aguardando financeiro",service.aprovar(1L,"rh").status());
    }
    @Test void registrosOriginaisDeEpiTambemImpedemAcessoGerente(){
        var p=pedido(tst,"EPI","Capacete");p.preservarPedidoOriginal();p.substituirMateriais(List.of(new MaterialSolicitado("Alicate",1,null,"ferramentas|alicate|")));
        when(pedidos.findAll()).thenReturn(List.of(p));assertTrue(service.listarParaUsuario("gerente").isEmpty());
    }
    @Test void dashboardRhConsolidaSomenteEpiComHistoricoDoAtendimento(){
        var pedidoTst=pedido(tst,"EPI","Capacete");
        var outro=pedido(tecnico,"Ferramentas manuais","Alicate");
        when(pedidos.findAll()).thenReturn(List.of(pedidoTst,outro));
        when(usuarios.funcionarioTemPerfilAtivo(tst,PerfilUsuario.TST)).thenReturn(true);
        var resultado=service.listarPedidosRh("rh");
        assertEquals(1,resultado.size());assertEquals("Pendente",resultado.getFirst().status());
        assertEquals("Capacete",resultado.getFirst().materiais().getFirst().nome());
        assertEquals(1,resultado.getFirst().analises().size());
        assertThrows(AccessDeniedException.class,()->service.listarPedidosRh("tecnico"));
    }

    private SolicitacaoDto.Requisicao requisicao(String responsavel,String nome,String chave){return new SolicitacaoDto.Requisicao(null,responsavel,null,10L,LocalDate.now(),null,List.of(new SolicitacaoDto.MaterialRequisicao(nome,1,null,chave)));}
    private Solicitacao pedido(Funcionario responsavel,String tipo,String modelo){Solicitacao pedido=new Solicitacao();ReflectionTestUtils.setField(pedido,"id",1L);pedido.setTipo("Movimentação");pedido.setStatus("Pendente");pedido.setTecnico(responsavel);pedido.setSolicitante(responsavel);pedido.substituirMateriais(List.of(new MaterialSolicitado(modelo,1,null,CatalogoChave.criar(tipo,modelo,null))));return pedido;}
    private Obra obra(){Obra obra=new Obra();ReflectionTestUtils.setField(obra,"id",10L);obra.setStatus("Em andamento");return obra;}
    private static Funcionario funcionario(Long id,String nome){Funcionario funcionario=new Funcionario();ReflectionTestUtils.setField(funcionario,"id",id);funcionario.setNome(nome);funcionario.setStatus("Ativo");return funcionario;}
    private static Usuario usuario(PerfilUsuario perfil,Funcionario funcionario){Usuario usuario=new Usuario();usuario.setPerfil(perfil);usuario.setFuncionario(funcionario);usuario.setNome(perfil.name());usuario.setLogin(perfil.name().toLowerCase());return usuario;}
    private static Equipamento equipamento(String tipo,String modelo){Equipamento equipamento=new Equipamento();equipamento.setTipo(tipo);equipamento.setModelo(modelo);equipamento.setStatus("Em estoque");equipamento.setQuantidade(1);return equipamento;}
}
