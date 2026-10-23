package br.com.era.api.service;

import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class NotificacaoMovimentacaoServiceTests {
    final NotificacaoMovimentacaoRepository avisos=mock(NotificacaoMovimentacaoRepository.class);
    final UsuarioRepository contas=mock(UsuarioRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final NotificacaoMovimentacaoService service=new NotificacaoMovimentacaoService(avisos,contas,usuarios);
    Usuario conta(long id,PerfilUsuario perfil){Usuario u=new Usuario();u.setPerfil(perfil);ReflectionTestUtils.setField(u,"id",id);Funcionario f=new Funcionario();ReflectionTestUtils.setField(f,"id",id);u.setFuncionario(f);return u;}
    Solicitacao pedido(Usuario u){Solicitacao s=new Solicitacao();ReflectionTestUtils.setField(s,"id",30L);s.setTecnico(u.getFuncionario());Obra o=new Obra();o.setNome("Obra B");ReflectionTestUtils.setField(o,"id",10L);s.setObraDestino(o);s.setStatus("Em trânsito");s.setTransitoEm(OffsetDateTime.now());s.getMateriais().add(new MaterialSolicitado("Escada",2,"ERA-1","ferramentas|escada|"));return s;}

    @Test void envioNotificaTodosOsResponsaveisDoMesmoSetorComResumoSemDadosFinanceiros(){
        Usuario u=conta(1,PerfilUsuario.TECNICO),colega=conta(2,PerfilUsuario.TECNICO);Solicitacao s=pedido(u);
        when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(u));when(contas.buscarResponsaveisParaAviso(10L,PerfilUsuario.TECNICO)).thenReturn(List.of(u,colega));
        service.notificarEnvio(s);
        var captor=org.mockito.ArgumentCaptor.forClass(Iterable.class);verify(avisos).saveAll(captor.capture());
        var lista=(List<?>)captor.getValue();assertEquals(2,lista.size());
        NotificacaoMovimentacao propria=(NotificacaoMovimentacao)lista.get(0),equipe=(NotificacaoMovimentacao)lista.get(1);
        assertTrue(propria.isDestinatario());assertFalse(equipe.isDestinatario());assertEquals(s.getTransitoEm(),propria.getCriadaEm());
        assertEquals(List.of(new NotificacaoMovimentacao.Item("Escada",2)),propria.getMateriais());
    }
    @Test void retiradaParaDepositoNaoGeraAvisoDeEntregaEmObra(){var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setObraDestino(null);service.notificarEnvio(s);verifyNoInteractions(contas,avisos);}
    @Test void epiConsultaSomenteResponsaveisTst(){Usuario u=conta(1,PerfilUsuario.TST);when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(u));when(contas.buscarResponsaveisParaAviso(10L,PerfilUsuario.TST)).thenReturn(List.of());var s=pedido(u);s.substituirMateriais(List.of(new MaterialSolicitado("Capacete",1,null,"epi|capacete|")));service.notificarEnvio(s);verify(contas).buscarResponsaveisParaAviso(10L,PerfilUsuario.TST);}
    @Test void leituraNaoAceitaIdDeOutraConta(){Usuario u=conta(2,PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.buscarDoUsuario(70L,2L)).thenReturn(Optional.empty());assertThrows(RecursoNaoEncontradoException.class,()->service.marcarLida("tecnico",70L));}
    @Test void leituraRepetidaPreservaPrimeiroHorario(){Usuario u=conta(1,PerfilUsuario.TECNICO);var n=new NotificacaoMovimentacao(u,pedido(u));when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.buscarDoUsuario(5L,1L)).thenReturn(Optional.of(n));var primeira=service.marcarLida("tecnico",5L);assertNotNull(primeira.lidaEm());assertEquals(primeira.lidaEm(),service.marcarLida("tecnico",5L).lidaEm());}
    @Test void financeiroNaoPodeMarcarAvisoDeOutraConta(){when(usuarios.buscarPorLogin("fin")).thenReturn(conta(3,PerfilUsuario.FINANCEIRO));assertThrows(RecursoNaoEncontradoException.class,()->service.marcarLida("fin",5L));verify(avisos).buscarDoUsuario(5L,3L);}
    @Test void contaDesativadaNaoConsultaAvisos(){Usuario u=conta(3,PerfilUsuario.FINANCEIRO);u.setAtivo(false);when(usuarios.buscarPorLogin("fin")).thenReturn(u);assertThrows(AccessDeniedException.class,()->service.listar("fin",0));verifyNoInteractions(avisos);}
    @Test void envioNaoDistribuiAvisosParaGestoresFinanceiroOuEstoque(){
        var u=conta(1,PerfilUsuario.TECNICO);when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(u));
        service.notificarEnvio(pedido(u));verify(contas,never()).findByAtivoTrueAndPerfilIn(any());
    }
    private List<NotificacaoMovimentacao> enviados(){
        var captor=org.mockito.ArgumentCaptor.forClass(Iterable.class);verify(avisos).saveAll(captor.capture());
        return (List<NotificacaoMovimentacao>)captor.getValue();
    }
    private void destinatario(PerfilUsuario p){when(contas.findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(p))).thenReturn(List.of(conta(9,p)));}
    @Test void pedidoNovoVaiSomenteGerenteSemAvisarFinanceiroEstoqueAdmin(){
        var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setStatus("Pendente");destinatario(PerfilUsuario.GERENTE);
        service.notificarNovoPedido(s);verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.GERENTE));
        assertEquals("NOVO_PEDIDO",enviados().getFirst().getTipo());
    }
    @Test void pedidoEpiNovoVaiSomenteRh(){
        var s=pedido(conta(1,PerfilUsuario.TST));s.setStatus("Pendente");s.substituirMateriais(List.of(new MaterialSolicitado("Capacete",2,null,"epi|capacete|")));destinatario(PerfilUsuario.RH);
        service.notificarNovoPedido(s);verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.RH));assertEquals(1,enviados().size());
    }
    @Test void aprovacaoInicialNotificaSomenteFinanceiro(){
        var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setStatus("Aguardando financeiro");destinatario(PerfilUsuario.FINANCEIRO);
        service.notificarNovoPedido(s);assertEquals("ANALISE_FINANCEIRA",enviados().getFirst().getTipo());
        verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.FINANCEIRO));
    }
    @Test void planoLiberadoNotificaSomenteEstoque(){
        destinatario(PerfilUsuario.ESTOQUE);service.notificarPlanoLiberado(pedido(conta(1,PerfilUsuario.TECNICO)));
        assertEquals("ATENDIMENTO_LIBERADO",enviados().getFirst().getTipo());verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.ESTOQUE));
    }
    @Test void transporteDiretoPulaAvisoDoFinanceiro(){
        var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setStatus("Aprovada");s.setMovimentacaoDireta(true);destinatario(PerfilUsuario.ESTOQUE);
        service.notificarNovoPedido(s);assertTrue(enviados().getFirst().getMensagem().contains("Transporte direto"));
        verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.ESTOQUE));
    }
    @Test void ajusteFinanceiroDeEpiVaiAoRhSemFerramentas(){
        var s=pedido(conta(1,PerfilUsuario.TST));s.setStatus("Aguardando financeiro");s.substituirMateriais(List.of(new MaterialSolicitado("Capacete",2,null,"epi|capacete|")));destinatario(PerfilUsuario.RH);
        service.notificarAlteracaoFinanceira(s);verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.RH));assertEquals("AJUSTE_FINANCEIRO",enviados().getFirst().getTipo());
    }
    @Test void ajusteRepetidoRenovaAvisoSemDuplicarEReabreLeitura(){
        var u=conta(9,PerfilUsuario.GERENTE);var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setStatus("Aguardando financeiro");
        var aviso=new NotificacaoMovimentacao(u,s,"AJUSTE_FINANCEIRO","Anterior");aviso.marcarLida();
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(u));
        when(avisos.findByUsuarioIdAndSolicitacaoIdAndTipo(9L,30L,"AJUSTE_FINANCEIRO")).thenReturn(Optional.of(aviso));
        service.notificarAlteracaoFinanceira(s);assertSame(aviso,enviados().getFirst());assertNull(aviso.getLidaEm());assertNotEquals("Anterior",aviso.getMensagem());
    }
    @Test void rejeicaoInicialNotificaSomenteSolicitante(){
        var u=conta(1,PerfilUsuario.TECNICO);when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(u));
        service.notificarRejeicao(pedido(u),false);assertEquals(1,enviados().size());verify(contas,never()).findByAtivoTrueAndPerfilIn(any());
    }
    @Test void listagemLimitaPaginaEConsultaSomenteTitular(){Usuario u=conta(1,PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.listar(eq(1L),any())).thenReturn(new PageImpl<>(List.of()));assertTrue(service.listar("tecnico",-8).itens().isEmpty());verify(avisos).listar(1L,org.springframework.data.domain.PageRequest.of(0,20));}
}
