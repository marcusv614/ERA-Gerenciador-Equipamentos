package br.com.era.api.service;

import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PedidoMateriaisTests {
    @Test void separacaoPreservaComprasNoPedidoSemAtribuirCompraAOutraOrigem() {
        Solicitacao s=pedido("Aprovada");Obra destino=new Obra();org.springframework.test.util.ReflectionTestUtils.setField(destino,"id",5L);s.setObraDestino(destino);MaterialSolicitado m=materialComId(s);
        when(equipamentoService.registrarEntradaCompra(anyString(),anyString(),anyInt(),anyString(),isNull(),any())).thenReturn(new Equipamento());
        service.solicitarCompra(1L,2L,3);service.registrarAquisicao(1L,2L,3,"NF-1",null);
        Equipamento e=new Equipamento();e.setTipo("Manual");e.setModelo("Alicate");e.setSerie("SERIE");e.setStatus("Em estoque");e.setQuantidade(10);e.setControleQuantidade("LOTE");
        when(equipamentos.buscarPorSerieParaAtualizacao("SERIE")).thenReturn(Optional.of(e));
        var d=new SolicitacaoDto.Distribuicao(List.of(new SolicitacaoDto.AtendimentoOrigem(null,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",10,"SERIE","manual|alicate|")))));
        var resposta=service.distribuir(1L,d).get(0);
        assertEquals(3,resposta.compras().get(0).quantidadeEntradaEstoque());assertEquals(m.getCompraSolicitadaEm(),resposta.compras().get(0).compraSolicitadaEm());
        assertEquals(0,resposta.materiais().get(0).quantidadeCompra());
        service.distribuir(1L,d);
        assertEquals(1,s.getCompras().size());assertEquals(3,s.getCompras().get(0).quantidadeAdquirida());assertEquals(10,e.getQuantidadeReservada());
    }
    @Test void separacaoNaoApagaCompraComEntregaAindaPendente() {
        Solicitacao s=pedido("Aprovada");materialComId(s);service.solicitarCompra(1L,2L,3);
        var erro=assertThrows(RegraNegocioException.class,()->service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of())));
        assertEquals("Conclua as entradas das compras solicitadas antes de confirmar a separação.",erro.getMessage());
        assertEquals(3,s.getMateriais().get(0).getQuantidadeCompra());verifyNoInteractions(equipamentos);
    }
    @Test void outroTecnicoNaoPodeConfirmarRecebimento() {
        Solicitacao s=pedido("Em trânsito");s.setObraDestino(new Obra());
        org.springframework.test.util.ReflectionTestUtils.setField(tecnico,"id",20L);
        Funcionario outro=new Funcionario();org.springframework.test.util.ReflectionTestUtils.setField(outro,"id",99L);
        Usuario usuario=new Usuario();usuario.setPerfil(PerfilUsuario.TECNICO);usuario.setFuncionario(outro);
        when(usuarios.buscarPorLogin("outro")).thenReturn(usuario);
        assertThrows(RegraNegocioException.class,()->service.concluir(1L,"outro"));
        assertEquals("Em trânsito",s.getStatus());verifyNoInteractions(movimentacoes);
    }
    @Test void gerenciaEstoqueEAdminNaoConfirmamEntregaNaObra() {
        Solicitacao s=pedido("Em trânsito");s.setObraDestino(new Obra());
        for(PerfilUsuario perfil:List.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE)) {
            Usuario usuario=new Usuario();usuario.setPerfil(perfil);when(usuarios.buscarPorLogin("operador")).thenReturn(usuario);
            assertThrows(RegraNegocioException.class,()->service.concluir(1L,"operador"));
            assertEquals("Em trânsito",s.getStatus());
        }
        verifyNoInteractions(movimentacoes);
    }
    final SolicitacaoRepository pedidos = mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
    final UsuarioService usuarios = mock(UsuarioService.class);
    final ObraService obras = mock(ObraService.class);
    final MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
    final EquipamentoService equipamentoService = mock(EquipamentoService.class);
    final Funcionario tecnico = new Funcionario();
    final SolicitacaoService service = new SolicitacaoService(pedidos,equipamentos,movimentacoes,obras,mock(FuncionarioService.class),equipamentoService,usuarios,mock(InventarioHistoricoService.class),mock(NotificacaoMovimentacaoService.class));

    PedidoMateriaisTests() {
        tecnico.setNome("Tecnico");
        Usuario usuario = new Usuario(); usuario.setPerfil(PerfilUsuario.TECNICO); usuario.setFuncionario(tecnico);
        when(usuarios.buscarPorLogin("tecnico")).thenReturn(usuario);
        when(obras.idsPermitidos("tecnico")).thenReturn(Set.of());
        when(pedidos.save(any())).thenAnswer(i->i.getArgument(0));
        Equipamento e = new Equipamento(); e.setTipo("Manual");e.setModelo("Alicate");e.setQuantidade(0);
        when(equipamentos.findAll()).thenReturn(List.of(e));
    }
    SolicitacaoDto.Requisicao dados(String nome,int quantidade,String serie,String chave) {
        return new SolicitacaoDto.Requisicao(null,"Tecnico",null,1L,LocalDate.now(),null,List.of(new SolicitacaoDto.MaterialRequisicao(nome,quantidade,serie,chave)));
    }
    Solicitacao pedido(String status) {
        Solicitacao s=new Solicitacao();s.setTipo("Movimentação");s.setStatus(status);s.setTecnico(tecnico);s.setSolicitante(tecnico);
        when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(s));return s;
    }
    @Test void aceitaQuantidadeAcimaDoEstoqueSemReservar() {
        var resposta=service.cadastrar(dados("Nome adulterado",5000,null,"manual|alicate|"),"tecnico");
        assertEquals("Alicate",resposta.materiais().getFirst().nome());
        assertEquals(5000,resposta.materiais().getFirst().quantidade());
        assertEquals("Pendente",resposta.status());
        verify(equipamentos,never()).buscarPorSerieParaAtualizacao(any());
    }
    @Test void rejeitaMaterialInventado() {
        assertThrows(RegraNegocioException.class,()->service.cadastrar(dados("Inventado",1,null,"manual|inventado|"),"tecnico"));
        verify(pedidos,never()).save(any());
    }
    @Test void exigeChaveMesmoComNomeExistente() {
        assertThrows(RegraNegocioException.class,()->service.cadastrar(dados("Alicate",1,null,null),"tecnico"));
    }
    @Test void tecnicoNaoPodeDefinirSerieNoPedido() {
        assertThrows(RegraNegocioException.class,()->service.cadastrar(dados("Alicate",1,"SERIE","manual|alicate|"),"tecnico"));
    }
    @Test void rejeitaMaterialArquivado() {
        Equipamento e=new Equipamento();e.setTipo("Manual");e.setModelo("Alicate");e.definirArquivamento(true,"admin");
        when(equipamentos.findAll()).thenReturn(List.of(e));
        assertThrows(RegraNegocioException.class,()->service.cadastrar(dados("Alicate",1,null,"manual|alicate|"),"tecnico"));
    }
    @Test void aprovaUmaUnicaVez() {
        Solicitacao s=pedido("Pendente");s.setObraDestino(new Obra());
        assertEquals("Aguardando financeiro",service.aprovar(1L).status());
        assertThrows(RegraNegocioException.class,()->service.aprovar(1L));
        assertThrows(RegraNegocioException.class,()->service.rejeitar(1L));
    }
    @Test void rejeitaUmaUnicaVez() {
        pedido("Pendente");assertEquals("Rejeitada",service.rejeitar(1L).status());
        assertThrows(RegraNegocioException.class,()->service.rejeitar(1L));
    }
    @Test void naoEnviaAntesDaSeparacao() {
        Solicitacao s=pedido("Aprovada");s.setObraDestino(new Obra());s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",2,null,"manual|alicate|")));
        Usuario estoque=new Usuario();estoque.setPerfil(PerfilUsuario.ESTOQUE);when(usuarios.buscarPorLogin("estoque")).thenReturn(estoque);
        assertThrows(RegraNegocioException.class,()->service.iniciarTransito(1L,"estoque"));
    }
    @Test void tecnicoNaoEnviaMaterial() {
        pedido("Aprovada");assertThrows(RegraNegocioException.class,()->service.iniciarTransito(1L,"tecnico"));
    }
    @Test void compraExigeAprovacao() {
        pedido("Pendente");assertThrows(RegraNegocioException.class,()->service.solicitarCompra(1L,2L,1));
        assertThrows(RegraNegocioException.class,()->service.registrarAquisicao(1L,2L,1,"NF-1",null));
    }
    @Test void distribuicaoExigeAprovacao() {
        pedido("Pendente");assertThrows(RegraNegocioException.class,()->service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of())));
    }
    @Test void fluxoCompletoReservaEnviaEConfirmaUmaUnicaVez() {
        Solicitacao s=pedido("Pendente");
        Obra obra=new Obra();
        org.springframework.test.util.ReflectionTestUtils.setField(obra,"id",10L);
        org.springframework.test.util.ReflectionTestUtils.setField(tecnico,"id",20L);
        org.springframework.test.util.ReflectionTestUtils.setField(s,"id",1L);
        s.setObraDestino(obra);
        s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",1,null,"manual|alicate|")));
        Equipamento e=new Equipamento();e.setTipo("Manual");e.setModelo("Alicate");e.setSerie("SERIE");e.setStatus("Em estoque");
        org.springframework.test.util.ReflectionTestUtils.setField(e,"id",30L);
        when(equipamentos.buscarPorSerieParaAtualizacao("SERIE")).thenReturn(Optional.of(e));
        Movimentacao movimento=new Movimentacao();movimento.setEquipamento(e);
        when(equipamentoService.novaMovimentacao(any(),any(),any(),any(),any(),any(),anyInt(),any())).thenReturn(movimento);
        Usuario estoque=new Usuario();estoque.setPerfil(PerfilUsuario.ESTOQUE);when(usuarios.buscarPorLogin("estoque")).thenReturn(estoque);
        assertEquals("Aguardando financeiro",service.aprovar(1L).status());
        Usuario financeiro=new Usuario();financeiro.setPerfil(PerfilUsuario.FINANCEIRO);financeiro.setNome("Financeiro");financeiro.setLogin("financeiro");when(usuarios.buscarPorLogin("financeiro")).thenReturn(financeiro);
        org.springframework.test.util.ReflectionTestUtils.setField(s.getMateriais().getFirst(),"id",2L);
        when(equipamentos.buscarParaAtualizacao(30L)).thenReturn(Optional.of(e));
        service.salvarPlanoFinanceiro(1L,new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,0,"",List.of(new SolicitacaoDto.OrigemPlano(30L,1))))),"financeiro");
        assertEquals("Aprovada",service.aprovar(1L,"financeiro").status());
        var atendimento=new SolicitacaoDto.AtendimentoOrigem(null,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",1,"SERIE","manual|alicate|")));
        service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of(atendimento)));
        assertEquals(1,e.getQuantidadeReservada());
        assertThrows(RegraNegocioException.class,()->service.concluir(1L,"tecnico"));
        assertEquals("Em trânsito",service.iniciarTransito(1L,"estoque").status());
        assertThrows(RegraNegocioException.class,()->service.iniciarTransito(1L,"estoque"));
        assertEquals("Concluída",service.concluir(1L,"tecnico").status());
        assertEquals(0,e.getQuantidadeReservada());
        assertThrows(RegraNegocioException.class,()->service.concluir(1L,"tecnico"));
        assertEquals(s.getConcluidaEm().atZoneSameInstant(java.time.ZoneId.of("America/Manaus")).toLocalDate(),movimento.getDataMovimentacao());
        verify(movimentacoes,times(1)).save(movimento);
    }
    MaterialSolicitado materialComId(Solicitacao s) {
        MaterialSolicitado m=new MaterialSolicitado("Alicate",10,null,"manual|alicate|");
        org.springframework.test.util.ReflectionTestUtils.setField(m,"id",2L);
        s.substituirMateriais(List.of(m));return m;
    }
    @Test void compraAceitaEntradasParciaisComNotasDiferentes() {
        Solicitacao s=pedido("Aprovada");org.springframework.test.util.ReflectionTestUtils.setField(s,"id",1L);MaterialSolicitado m=materialComId(s);
        when(equipamentoService.registrarEntradaCompra(anyString(),anyString(),anyInt(),anyString(),isNull(),eq(1L))).thenReturn(new Equipamento());
        assertThrows(RegraNegocioException.class,()->service.solicitarCompra(1L,2L,11));
        service.solicitarCompra(1L,2L,5);
        service.registrarAquisicao(1L,2L,3,"NF-123",null);
        assertEquals(3,m.getQuantidadeEntradaEstoque());
        service.registrarAquisicao(1L,2L,2,"NF-456",null);
        assertEquals(5,m.getQuantidadeEntradaEstoque());
        assertEquals(List.of("NF-123","NF-456"),s.getAquisicoesAuditadas().stream().map(Solicitacao.AquisicaoAuditada::notaFiscal).toList());
        assertEquals(List.of(3,2),s.getAquisicoesAuditadas().stream().map(Solicitacao.AquisicaoAuditada::quantidade).toList());
        verify(equipamentoService).registrarEntradaCompra("Alicate","manual|alicate|",3,"NF-123",null,1L);
        verify(equipamentoService).registrarEntradaCompra("Alicate","manual|alicate|",2,"NF-456",null,1L);
        assertThrows(RegraNegocioException.class,()->service.registrarAquisicao(1L,2L,1,"NF-789",null));
        assertThrows(RegraNegocioException.class,()->service.solicitarCompra(1L,2L,4));
    }
    @Test void distribuicaoNaoPodeAlterarQuantidadeSolicitada() {
        Solicitacao s=pedido("Aprovada");materialComId(s);
        var atendimento=new SolicitacaoDto.AtendimentoOrigem(null,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",9,"SERIE","manual|alicate|")));
        assertThrows(RegraNegocioException.class,()->service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of(atendimento))));
        verify(equipamentos,never()).buscarPorSerieParaAtualizacao(any());
    }
    @Test void distribuicaoNaoPodeSairDoProprioDestino() {
        Solicitacao s=pedido("Aprovada");materialComId(s);Obra destino=new Obra();
        org.springframework.test.util.ReflectionTestUtils.setField(destino,"id",5L);s.setObraDestino(destino);
        var atendimento=new SolicitacaoDto.AtendimentoOrigem(5L,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",10,"SERIE","manual|alicate|")));
        assertThrows(RegraNegocioException.class,()->service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of(atendimento))));
    }
    @Test void distribuicaoRejeitaSomaQueEstouraInteiro() {
        Solicitacao s=pedido("Aprovada");materialComId(s);
        var m=new SolicitacaoDto.MaterialRequisicao("Alicate",Integer.MAX_VALUE,"SERIE","manual|alicate|");
        assertThrows(RegraNegocioException.class,()->service.distribuir(1L,new SolicitacaoDto.Distribuicao(List.of(new SolicitacaoDto.AtendimentoOrigem(null,List.of(m,m))))));
    }
}
