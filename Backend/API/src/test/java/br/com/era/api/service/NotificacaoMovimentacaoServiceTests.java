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
    @Test void epiConsultaSomenteResponsaveisTst(){Usuario u=conta(1,PerfilUsuario.TST);when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(u));when(contas.buscarResponsaveisParaAviso(10L,PerfilUsuario.TST)).thenReturn(List.of());service.notificarEnvio(pedido(u));verify(contas).buscarResponsaveisParaAviso(10L,PerfilUsuario.TST);}
    @Test void leituraNaoAceitaIdDeOutraConta(){Usuario u=conta(2,PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.buscarDoUsuario(70L,2L)).thenReturn(Optional.empty());assertThrows(RecursoNaoEncontradoException.class,()->service.marcarLida("tecnico",70L));}
    @Test void leituraRepetidaPreservaPrimeiroHorario(){Usuario u=conta(1,PerfilUsuario.TECNICO);var n=new NotificacaoMovimentacao(u,pedido(u));when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.buscarDoUsuario(5L,1L)).thenReturn(Optional.of(n));var primeira=service.marcarLida("tecnico",5L);assertNotNull(primeira.lidaEm());assertEquals(primeira.lidaEm(),service.marcarLida("tecnico",5L).lidaEm());}
    @Test void financeiroNaoPodeMarcarAvisoDeOutraConta(){when(usuarios.buscarPorLogin("fin")).thenReturn(conta(3,PerfilUsuario.FINANCEIRO));assertThrows(RecursoNaoEncontradoException.class,()->service.marcarLida("fin",5L));verify(avisos).buscarDoUsuario(5L,3L);}
    @Test void contaDesativadaNaoConsultaAvisos(){Usuario u=conta(3,PerfilUsuario.FINANCEIRO);u.setAtivo(false);when(usuarios.buscarPorLogin("fin")).thenReturn(u);assertThrows(AccessDeniedException.class,()->service.listar("fin",0));verifyNoInteractions(avisos);}
    @Test void gestoresSemVinculoDeFuncionarioRecebemAvisoSemPoderConfirmarRecebimento(){
        Usuario u=conta(1,PerfilUsuario.TECNICO),gerente=conta(7,PerfilUsuario.GERENTE);gerente.setFuncionario(null);Solicitacao s=pedido(u);
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(gerente));service.notificarEnvio(s);
        var captor=org.mockito.ArgumentCaptor.forClass(Iterable.class);verify(avisos).saveAll(captor.capture());var n=(NotificacaoMovimentacao)((List<?>)captor.getValue()).get(0);assertFalse(n.isDestinatario());assertEquals(10L,n.getObraId());
    }
    @Test void transporteDiretoNaoNotificaFinanceiroENaoMisturaRhComFerramentas(){
        var s=pedido(conta(1,PerfilUsuario.TECNICO));s.setMovimentacaoDireta(true);service.notificarEnvio(s);
        verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE));
    }
    @Test void envioDeEpiIncluiRhEFinanceiro(){
        Usuario tst=conta(1,PerfilUsuario.TST);var s=pedido(tst);s.getMateriais().clear();s.getMateriais().add(new MaterialSolicitado("Capacete",2,"EPI-1","epi|capacete|"));when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(tst));service.notificarEnvio(s);
        verify(contas).findByAtivoTrueAndPerfilIn(java.util.EnumSet.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE,PerfilUsuario.FINANCEIRO,PerfilUsuario.RH));
    }
    @Test void listagemLimitaPaginaEConsultaSomenteTitular(){Usuario u=conta(1,PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);when(avisos.listar(eq(1L),any())).thenReturn(new PageImpl<>(List.of()));assertTrue(service.listar("tecnico",-8).itens().isEmpty());verify(avisos).listar(1L,org.springframework.data.domain.PageRequest.of(0,20));}
}
