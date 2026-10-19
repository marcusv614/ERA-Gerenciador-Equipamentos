package br.com.era.api.service;

import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class EdicaoPedidoTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final MovimentacaoRepository movimentos=mock(MovimentacaoRepository.class);
    final ObraService obras=mock(ObraService.class);
    final FuncionarioService funcionarios=mock(FuncionarioService.class);
    final EquipamentoService equipamentoService=mock(EquipamentoService.class);
    final SolicitacaoService service=new SolicitacaoService(pedidos,equipamentos,movimentos,obras,funcionarios,equipamentoService,mock(UsuarioService.class),mock(InventarioHistoricoService.class));
    final Solicitacao pedido=new Solicitacao();
    EdicaoPedidoTests(){
        Funcionario tecnico=new Funcionario();tecnico.setNome("Tecnico");
        pedido.setTipo("Movimentação");pedido.setStatus("Pendente");pedido.setTecnico(tecnico);pedido.setSolicitante(tecnico);
        Obra destino=new Obra();ReflectionTestUtils.setField(destino,"id",2L);pedido.setObraDestino(destino);
        when(pedidos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(pedido));
        when(funcionarios.buscarPorNome("Tecnico")).thenReturn(tecnico);
        when(obras.buscarOpcional(2L)).thenReturn(destino);
        Equipamento e=new Equipamento();e.setTipo("Ferramentas");e.setModelo("Escada");
        when(equipamentos.findAll()).thenReturn(List.of(e));
    }
    SolicitacaoDto.Atualizacao atualizacao(Long origem,List<SolicitacaoDto.MaterialRequisicao> materiais){return new SolicitacaoDto.Atualizacao("Tecnico",origem,2L,"Nova observação",materiais);}
    List<SolicitacaoDto.MaterialRequisicao> itens(){return List.of(new SolicitacaoDto.MaterialRequisicao("Escada",50,null,"ferramentas|escada|"));}

    @Test void alteraPedidoSemEscolherSerieOuOrigemMesmoSemSaldo(){
        var resposta=service.atualizar(1L,atualizacao(null,itens()));
        assertNull(resposta.obraOrigemId());assertEquals(50,resposta.materiais().getFirst().quantidade());assertNull(resposta.materiais().getFirst().identificacao());
        verifyNoInteractions(movimentos,equipamentoService);verify(equipamentos,never()).buscarPorSerieParaAtualizacao(any());
    }
    @Test void rejeitaOrigemGlobalParaPedidoDeCatalogo(){assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(3L,itens())));}
    @Test void edicaoNaoEncaminhaMateriaisParaObraEncerrada(){
        pedido.getObraDestino().setStatus("Concluída");
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens())));
    }
    @Test void naoAceitaEscolhaDeSerieNaEdicaoDoPedido(){
        var itens=List.of(new SolicitacaoDto.MaterialRequisicao("Escada",1,"ESC-1","ferramentas|escada|"));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens)));
    }
    @Test void naoAceitaCatalogoInventado(){
        var itens=List.of(new SolicitacaoDto.MaterialRequisicao("Inventado",1,null,"inexistente"));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens)));
    }
    @Test void preservaReservaAoEditarObservacaoDePedidoSeparado(){
        MaterialSolicitado material=new MaterialSolicitado("Escada",1,"ESC-1","ferramentas|escada|");pedido.substituirMateriais(List.of(material));
        var resposta=service.atualizar(1L,atualizacao(null,null));
        assertEquals("Nova observação",resposta.observacao());assertSame(material,pedido.getMateriais().getFirst());verifyNoInteractions(equipamentos,movimentos);
    }
    @Test void naoApagaReservasSubstituindoMateriais(){
        pedido.substituirMateriais(List.of(new MaterialSolicitado("Escada",1,"ESC-1","ferramentas|escada|")));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens())));verifyNoInteractions(equipamentos);
    }
    @Test void preservaContadoresDeCompraEEntrada(){
        MaterialSolicitado m=new MaterialSolicitado("Escada",10,null,"ferramentas|escada|");m.solicitarCompra(10);m.registrarAquisicao(3);m.registrarEntradaEstoque(3);pedido.substituirMateriais(List.of(m));
        service.atualizar(1L,atualizacao(null,null));assertEquals(10,m.getQuantidadeCompra());assertEquals(3,m.getQuantidadeEntradaEstoque());
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens())));
    }
    @Test void naoMudaDestinoDePedidoSeparado(){
        pedido.substituirMateriais(List.of(new MaterialSolicitado("Escada",1,"ESC-1","ferramentas|escada|")));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,new SolicitacaoDto.Atualizacao("Tecnico",null,3L,"Nova",null)));
    }
    @Test void rejeitaEdicaoDepoisDoEnvio(){pedido.setStatus("Em trânsito");assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,itens())));}
    @Test void naoAceitaPedidoVazio(){assertThrows(RegraNegocioException.class,()->service.atualizar(1L,atualizacao(null,List.of())));}
    @Test void estoquePodeSepararMesmoPedidoEntreDepositoEOutraObra(){
        pedido.setSolicitanteNome("Maria Gerente");pedido.setSolicitanteLogin("maria.gerente");pedido.setSolicitantePerfil(PerfilUsuario.GERENTE);
        pedido.setStatus("Aprovada");ReflectionTestUtils.setField(pedido,"id",1L);
        pedido.substituirMateriais(List.of(new MaterialSolicitado("Escada",1,null,"ferramentas|escada|"),new MaterialSolicitado("Alicate",1,null,"ferramentas|alicate|")));
        Obra origem=new Obra();ReflectionTestUtils.setField(origem,"id",3L);when(obras.buscarOpcional(3L)).thenReturn(origem);
        Equipamento escada=new Equipamento();escada.setTipo("Ferramentas");escada.setModelo("Escada");escada.setSerie("ESC-1");escada.setObra(origem);escada.setStatus("Em campo");
        Equipamento alicate=new Equipamento();alicate.setTipo("Ferramentas");alicate.setModelo("Alicate");alicate.setSerie("ALI-1");alicate.setStatus("Em estoque");
        when(equipamentos.buscarPorSerieParaAtualizacao("ESC-1")).thenReturn(Optional.of(escada));
        when(equipamentos.buscarPorSerieParaAtualizacao("ALI-1")).thenReturn(Optional.of(alicate));
        when(pedidos.save(any())).thenAnswer(i->i.getArgument(0));
        var atendimentos=List.of(
            new SolicitacaoDto.AtendimentoOrigem(3L,List.of(new SolicitacaoDto.MaterialRequisicao("Escada",1,"ESC-1","ferramentas|escada|"))),
            new SolicitacaoDto.AtendimentoOrigem(null,List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",1,"ALI-1","ferramentas|alicate|"))));
        var respostas=service.distribuir(1L,new SolicitacaoDto.Distribuicao(atendimentos));
        assertEquals(2,respostas.size());assertEquals(3L,respostas.getFirst().obraOrigemId());assertNull(respostas.getLast().obraOrigemId());
        assertTrue(respostas.stream().allMatch(r->Long.valueOf(2L).equals(r.obraDestinoId())));
        assertTrue(respostas.stream().allMatch(r->"Maria Gerente".equals(r.solicitante())&&"maria.gerente".equals(r.solicitanteLogin())&&"GERENTE".equals(r.solicitantePerfil())));
        assertEquals(1,escada.getQuantidadeReservada());assertEquals(1,alicate.getQuantidadeReservada());
    }
}
