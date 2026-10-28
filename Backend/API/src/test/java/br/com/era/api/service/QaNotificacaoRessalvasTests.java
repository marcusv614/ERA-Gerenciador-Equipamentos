package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.data.domain.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaNotificacaoRessalvasTests {
    private final NotificacaoMovimentacaoRepository avisos = mock(NotificacaoMovimentacaoRepository.class);
    private final UsuarioRepository contas = mock(UsuarioRepository.class);
    private final UsuarioService usuarios = mock(UsuarioService.class);
    private final NotificacaoMovimentacaoService service = new NotificacaoMovimentacaoService(avisos,contas,usuarios);

    private Usuario usuario(long id, PerfilUsuario perfil) {
        Usuario u = new Usuario(); ReflectionTestUtils.setField(u,"id",id); u.setPerfil(perfil);
        Funcionario f = new Funcionario(); ReflectionTestUtils.setField(f,"id",id); f.setNome("Pessoa"); u.setFuncionario(f); return u;
    }
    private Solicitacao pedido(boolean epi) {
        Solicitacao s = new Solicitacao(); ReflectionTestUtils.setField(s,"id",30L);
        s.setTecnico(usuario(1,epi?PerfilUsuario.TST:PerfilUsuario.TECNICO).getFuncionario());
        Obra o = new Obra(); ReflectionTestUtils.setField(o,"id",10L); o.setNome("Obra"); s.setObraDestino(o);
        s.getMateriais().add(new MaterialSolicitado(epi?"Capacete":"Escada",2,null,epi?"epi|capacete|":"ferramentas|escada|"));
        s.setStatus("Aprovada"); return s;
    }
    @SuppressWarnings({"unchecked","rawtypes"})
    private List<NotificacaoMovimentacao> enviados() {
        var captor = org.mockito.ArgumentCaptor.forClass(Iterable.class); verify(avisos).saveAll(captor.capture());
        return (List)captor.getValue();
    }
    @ParameterizedTest @CsvSource({"-1,0","0,0","2,2","10001,10000","2147483647,10000"})
    void paginacaoRespeitaLimitesTitularEContador(int solicitada,int esperada) {
        Usuario u = usuario(1,PerfilUsuario.TECNICO); when(usuarios.buscarPorLogin("pessoa")).thenReturn(u);
        var aviso = new NotificacaoMovimentacao(u,pedido(false),"AJUSTE_FINANCEIRO","Mensagem");
        var pagina = PageRequest.of(esperada,20);
        when(avisos.listar(1L,pagina)).thenReturn(new PageImpl<>(List.of(aviso),pagina,(long)esperada*20+21));
        when(avisos.contarNaoLidas(1L)).thenReturn(7L);
        var caixa = service.listar("pessoa",solicitada);
        assertEquals(7,caixa.naoLidas()); assertTrue(caixa.temMais()); assertEquals(1,caixa.itens().size());
        assertEquals("Mensagem",caixa.itens().getFirst().mensagem()); assertEquals(30L,caixa.itens().getFirst().solicitacaoId());
        verify(avisos).listar(1L,pagina); verify(avisos).contarNaoLidas(1L);
    }
    @Test void falhaNaConsultaNaoRetornaCaixaVaziaComoSucesso() {
        when(usuarios.buscarPorLogin("pessoa")).thenReturn(usuario(1,PerfilUsuario.TECNICO));
        var falha = new org.springframework.dao.DataAccessResourceFailureException("indisponivel");
        when(avisos.listar(eq(1L),any())).thenThrow(falha);
        assertSame(falha,assertThrows(org.springframework.dao.DataAccessResourceFailureException.class, () -> service.listar("pessoa",0)));
        verify(avisos,never()).contarNaoLidas(anyLong());
    }
    @Test void inativoNaoPodeMarcarLeitura() {
        Usuario u = usuario(1,PerfilUsuario.TECNICO); u.setAtivo(false); when(usuarios.buscarPorLogin("pessoa")).thenReturn(u);
        assertThrows(AccessDeniedException.class, () -> service.marcarLida("pessoa",5L)); verifyNoInteractions(avisos);
    }
    @ParameterizedTest @ValueSource(booleans = {true,false})
    void rejeicaoFinanceiraEntregaAoGestorESolicitanteDoSetor(boolean epi) {
        Usuario gestor = usuario(2,epi?PerfilUsuario.RH:PerfilUsuario.GERENTE), solicitante = usuario(1,epi?PerfilUsuario.TST:PerfilUsuario.TECNICO);
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(gestor));
        when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(solicitante));
        service.notificarRejeicao(pedido(epi),true);
        var lista = enviados(); assertEquals(2,lista.size()); assertFalse(lista.getFirst().isDestinatario()); assertTrue(lista.getLast().isDestinatario());
        assertTrue(lista.stream().allMatch(n -> n.getTipo().equals("PEDIDO_REJEITADO")&&n.getMensagem().contains("Financeiro")));
        verify(contas).findByAtivoTrueAndPerfilIn(EnumSet.of(gestor.getPerfil()));
    }
    @ParameterizedTest @ValueSource(strings = {"inativo","setor","ausente"})
    void solicitanteSemAcessoAdequadoNaoRecebeRejeicaoNemEnvio(String motivo) {
        Usuario u = usuario(1,motivo.equals("setor")?PerfilUsuario.TST:PerfilUsuario.TECNICO);
        if(motivo.equals("inativo"))u.setAtivo(false);
        when(contas.findByFuncionarioId(1L)).thenReturn(motivo.equals("ausente")?Optional.empty():Optional.of(u));
        service.notificarRejeicao(pedido(false),false); assertTrue(enviados().isEmpty());
        clearInvocations(avisos);
        service.notificarEnvio(pedido(false)); verifyNoInteractions(avisos);
        verify(contas,never()).buscarResponsaveisParaAviso(anyLong(),any());
    }
    @Test void destinatariosDoSetorSaoFiltradosEDeduplicados() {
        Usuario gerente = usuario(2,PerfilUsuario.GERENTE), inativo = usuario(3,PerfilUsuario.GERENTE), rh = usuario(4,PerfilUsuario.RH);
        inativo.setAtivo(false); when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(gerente,gerente,inativo,rh));
        var s = pedido(false); s.setStatus("Pendente"); service.notificarNovoPedido(s);
        assertEquals(1,enviados().size()); verify(avisos).findByUsuarioIdAndSolicitacaoIdAndTipo(2L,30L,"NOVO_PEDIDO");
    }
    @ParameterizedTest @CsvSource({
        "Pendente,false,true,GERENTE", "Aguardando financeiro,false,false,FINANCEIRO",
        "Aprovada,false,false,FINANCEIRO+ESTOQUE", "Em trânsito,false,true,GERENTE+FINANCEIRO+ESTOQUE",
        "Pendente,true,false,GERENTE", "Aprovada,true,false,GERENTE+ESTOQUE", "Aprovada,true,true,GERENTE+ESTOQUE"
    })
    void cancelamentoEncaminhaSomenteAosSetoresDaEtapa(String anterior,boolean direto,boolean confirmado,String perfis) {
        Solicitacao s = pedido(false); s.setMovimentacaoDireta(direto);
        ReflectionTestUtils.setField(s,"statusAntesCancelamento",anterior);
        String tipo = confirmado?"CANCELAMENTO_CONFIRMADO":"CANCELAMENTO_SOLICITADO";
        service.notificarCancelamento(s,tipo,"Cancelamento");
        var esperados = EnumSet.noneOf(PerfilUsuario.class);
        for(String p:perfis.split("\\+"))esperados.add(PerfilUsuario.valueOf(p));
        verify(contas).findByAtivoTrueAndPerfilIn(esperados);
        if(confirmado)verify(contas).findByFuncionarioId(1L); else verify(contas,never()).findByFuncionarioId(anyLong());
    }
    @Test void recebimentoNoDepositoUsaObraDeOrigemEMensagemDeRetorno() {
        Solicitacao s = pedido(false); s.setObraOrigem(s.getObraDestino()); s.setObraDestino(null);
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(usuario(2,PerfilUsuario.ESTOQUE)));
        service.notificarRecebimento(s);
        var aviso = enviados().getFirst(); assertEquals(10L,aviso.getObraId()); assertTrue(aviso.getMensagem().contains("Retorno ao depósito"));
    }
    @Test void reentregaRenovaMesmaNotificacaoDepoisDeLeitura() {
        Usuario u = usuario(2,PerfilUsuario.GERENTE); Solicitacao s = pedido(false); s.setStatus("Pendente");
        NotificacaoMovimentacao existente = new NotificacaoMovimentacao(u,s,"NOVO_PEDIDO","Anterior");
        existente.marcarLida(); var primeiraCriacao = existente.getCriadaEm();
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(u));
        when(avisos.findByUsuarioIdAndSolicitacaoIdAndTipo(2L,30L,"NOVO_PEDIDO")).thenReturn(Optional.of(existente));
        service.notificarNovoPedido(s);
        assertSame(existente,enviados().getFirst()); assertNull(existente.getLidaEm());
        assertFalse(existente.getCriadaEm().isBefore(primeiraCriacao)); assertNotEquals("Anterior",existente.getMensagem());
    }
    @Test void QA_BUG_005_reentregaAtualizaMateriaisEObraDoResumo(){
        Usuario u=usuario(2,PerfilUsuario.GERENTE);Solicitacao s=pedido(false);
        var aviso=new NotificacaoMovimentacao(u,s,"AJUSTE_FINANCEIRO","Anterior");aviso.marcarLida();
        s.substituirMateriais(List.of(new MaterialSolicitado("Escada",5,null,"ferramentas|escada|")));
        Obra destino=new Obra();destino.setNome("Novo destino");ReflectionTestUtils.setField(destino,"id",20L);s.setObraDestino(destino);
        when(contas.findByAtivoTrueAndPerfilIn(any())).thenReturn(List.of(u));
        when(avisos.findByUsuarioIdAndSolicitacaoIdAndTipo(2L,30L,"AJUSTE_FINANCEIRO")).thenReturn(Optional.of(aviso));
        service.notificarAlteracaoFinanceira(s);
        assertSame(aviso,enviados().getFirst());assertNull(aviso.getLidaEm());
        assertEquals(List.of(new NotificacaoMovimentacao.Item("Escada",5)),aviso.getMateriais());
        assertEquals(20L,aviso.getObraId());assertEquals("Novo destino",aviso.getObraNome());
    }
}
