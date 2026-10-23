package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class RelatorioPedidoServiceTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final RelatorioPedidoService service=new RelatorioPedidoService(pedidos,equipamentos,usuarios);
    Usuario usuario(PerfilUsuario perfil){var u=new Usuario();u.setAtivo(true);u.setNome(perfil.name());u.setLogin("conta");u.setPerfil(perfil);when(usuarios.buscarPorLogin("conta")).thenReturn(u);return u;}
    Solicitacao pedido(long id,boolean epi,String status){
        var s=new Solicitacao();ReflectionTestUtils.setField(s,"id",id);s.setTipo("Movimentação");s.setStatus(status);s.setSolicitanteNome("Quem pediu");s.setSolicitanteLogin("autor");s.setDataSolicitacao(LocalDate.of(2026,10,22));
        ReflectionTestUtils.setField(s,"criadoEm",OffsetDateTime.parse("2026-10-22T10:00:00-04:00"));
        var t=new Funcionario();t.setNome("Pessoa");ReflectionTestUtils.setField(t,"id",id+100);s.setTecnico(t);
        var o=new Obra();o.setNome("Obra");ReflectionTestUtils.setField(o,"id",10L);s.setObraDestino(o);
        s.substituirMateriais(List.of(new MaterialSolicitado(epi?"Luva":"Alicate",2,null,epi?"epi|luva|":"manual|alicate|")));
        when(pedidos.findById(id)).thenReturn(Optional.of(s));return s;
    }
    @Test void separaEscopoRhEGerenciaEmListasEConsultaIndividual(){
        var epi=pedido(1,true,"Pendente");var campo=pedido(2,false,"Pendente");when(pedidos.findAll()).thenReturn(List.of(epi,campo));
        usuario(PerfilUsuario.RH);assertEquals(List.of(1L),service.consultar("conta",null,null).stream().map(RelatorioPedidoService.Pedido::id).toList());assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(2L,"conta"));
        usuario(PerfilUsuario.GERENTE);assertEquals(List.of(2L),service.consultar("conta",null,null).stream().map(RelatorioPedidoService.Pedido::id).toList());assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));
    }
    @Test void financeiroNaoVeEtapaInicialNemMovimentacaoDireta(){
        var inicial=pedido(1,false,"Pendente");var direto=pedido(2,false,"Concluída");direto.setMovimentacaoDireta(true);var analisavel=pedido(3,false,"Aguardando financeiro");
        when(pedidos.findAll()).thenReturn(List.of(inicial,direto,analisavel));usuario(PerfilUsuario.FINANCEIRO);
        assertEquals(List.of(3L),service.consultar("conta",null,null).stream().map(RelatorioPedidoService.Pedido::id).toList());assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));
    }
    @Test void estoqueSomenteExportaPedidoLiberadoSemConsultaAmpla(){
        var s=pedido(1,false,"Aprovada");when(pedidos.findAll()).thenReturn(List.of(s));usuario(PerfilUsuario.ESTOQUE);assertEquals(1L,service.pedido(1L,"conta").id());assertThrows(AccessDeniedException.class,()->service.consultar("conta",null,null));
        s.setStatus("Aguardando financeiro");assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));
    }
    @Test void comprasExigemAprovacaoFinanceiraEEntradaComprovada(){
        var s=pedido(1,false,"Aprovada");when(pedidos.findAll()).thenReturn(List.of(s));var u=usuario(PerfilUsuario.ADMIN);
        var e=new Equipamento();ReflectionTestUtils.setField(e,"id",77L);e.setFornecedor("Fornecedor original");s.registrarAquisicaoAuditada(e,"Alicate","manual|alicate|",2,"NF original",u);
        assertTrue(service.pedido(1L,"conta").compras().isEmpty());s.registrarEventoFinanceiro("APROVACAO","Autorizado",u);
        e.setNotaFiscal("NF alterada");e.setFornecedor("Outro fornecedor");var compra=service.pedido(1L,"conta").compras().getFirst();assertEquals("NF original",compra.notaFiscal());assertEquals("Fornecedor original",compra.fornecedor());assertEquals("conta",compra.conta());assertNotNull(compra.instante());assertFalse(compra.legado());
    }
    @Test void familiaParcialNaoDuplicaEventosNemEntradasAuditadas(){
        var raiz=pedido(1,false,"Concluída");raiz.preservarPedidoOriginal();var filho=pedido(2,false,"Aprovada");filho.setSolicitacaoPai(raiz);var u=usuario(PerfilUsuario.ADMIN);raiz.registrarEventoFinanceiro("APROVACAO","Autorizado",u);filho.copiarEventosFinanceirosDe(raiz);
        var e=new Equipamento();ReflectionTestUtils.setField(e,"id",77L);raiz.registrarAquisicaoAuditada(e,"Alicate","manual|alicate|",2,"NF",u);
        raiz.adicionarEntradaCompra(new Solicitacao.OrigemPlanejada(77L,"LOTE",null,2,"manual|alicate|","Alicate"));
        when(pedidos.findAll()).thenReturn(List.of(raiz,filho));var r=service.pedido(2L,"conta");assertEquals(1L,r.id());assertEquals(2,r.atendimentos().size());assertEquals(1,r.compras().size());assertEquals(1,r.eventos().stream().filter(ev->"APROVACAO".equals(ev.acao())).count());assertEquals(2,r.materiais().getFirst().quantidade());
    }
    @Test void legadoNaoInventaDataNemResponsavelDeConferencia(){
        var s=pedido(1,false,"Concluída");when(pedidos.findAll()).thenReturn(List.of(s));var u=usuario(PerfilUsuario.ADMIN);s.registrarEventoFinanceiro("APROVACAO","Autorizado",u);s.adicionarEntradaCompra(new Solicitacao.OrigemPlanejada(77L,"LOTE",null,2,"manual|alicate|","Alicate"));
        var r=service.pedido(1L,"conta");assertTrue(r.compras().getFirst().legado());assertNull(r.compras().getFirst().instante());assertNull(r.compras().getFirst().autor());assertFalse(r.avisos().isEmpty());
    }
    @Test void filtraFuncionarioPorIdENaoPorNomeEObraPorId(){
        var a=pedido(1,false,"Pendente");var b=pedido(2,false,"Pendente");when(pedidos.findAll()).thenReturn(List.of(a,b));usuario(PerfilUsuario.ADMIN);
        assertEquals(List.of(2L),service.consultar("conta",10L,102L).stream().map(RelatorioPedidoService.Pedido::id).toList());assertTrue(service.consultar("conta",999L,102L).isEmpty());
    }
    @Test void contaInativaEProfissionaisDeCampoNaoAcessamRelatorioAmplo(){
        var s=pedido(1,false,"Concluída");when(pedidos.findAll()).thenReturn(List.of(s));var u=usuario(PerfilUsuario.ADMIN);u.setAtivo(false);assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));
        for(var perfil:List.of(PerfilUsuario.TECNICO,PerfilUsuario.TST)){usuario(perfil);assertThrows(AccessDeniedException.class,()->service.consultar("conta",null,null));assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));}
    }
    @Test void cancelamentoNaPrimeiraEtapaNaoVazaParaFinanceiroOuEstoque(){
        var s=pedido(1,false,"Cancelada");s.setStatusAntesCancelamento("Pendente");when(pedidos.findAll()).thenReturn(List.of(s));
        for(var perfil:List.of(PerfilUsuario.FINANCEIRO,PerfilUsuario.ESTOQUE)){usuario(perfil);assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(1L,"conta"));}
    }
    @Test void previaDoAdminTambemRespeitaEscopoSemAmpliarPermissoesReais(){
        var epi=pedido(1,true,"Pendente");var campo=pedido(2,false,"Pendente");when(pedidos.findAll()).thenReturn(List.of(epi,campo));usuario(PerfilUsuario.ADMIN);
        assertEquals(List.of(1L),service.consultar("conta",null,null,PerfilUsuario.RH).stream().map(RelatorioPedidoService.Pedido::id).toList());
        assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(2L,"conta",PerfilUsuario.RH));assertTrue(service.consultar("conta",null,null,PerfilUsuario.FINANCEIRO).isEmpty());
        usuario(PerfilUsuario.RH);assertThrows(RecursoNaoEncontradoException.class,()->service.pedido(2L,"conta",PerfilUsuario.ADMIN));assertTrue(service.consultar("conta",null,null,PerfilUsuario.GERENTE).isEmpty());
    }
}
