package br.com.era.api.service;

import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FluxoFinanceiroTests {
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final ObraService obras=mock(ObraService.class);
    final FuncionarioService funcionarios=mock(FuncionarioService.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final SolicitacaoService service=new SolicitacaoService(pedidos,equipamentos,mock(MovimentacaoRepository.class),obras,funcionarios,mock(EquipamentoService.class),usuarios,mock(InventarioHistoricoService.class),mock(NotificacaoMovimentacaoService.class));
    final Funcionario tecnico=new Funcionario();
    final Obra obra=new Obra();
    final Usuario gerente=usuario(PerfilUsuario.GERENTE,"Gerente","gerente");
    final Usuario financeiro=usuario(PerfilUsuario.FINANCEIRO,"Financeiro","financeiro");
    final Usuario estoque=usuario(PerfilUsuario.ESTOQUE,"Estoque","estoque");
    Solicitacao pedido;

    @BeforeEach void preparar(){
        ReflectionTestUtils.setField(tecnico,"id",10L);tecnico.setNome("Ana");tecnico.setStatus("Ativo");
        ReflectionTestUtils.setField(obra,"id",20L);obra.setNome("Obra A");obra.setStatus("Em andamento");
        when(usuarios.buscarPorLogin("gerente")).thenReturn(gerente);
        when(usuarios.buscarPorLogin("financeiro")).thenReturn(financeiro);
        when(usuarios.buscarPorLogin("estoque")).thenReturn(estoque);
        when(usuarios.perfilAtivoDoFuncionario(tecnico)).thenReturn(PerfilUsuario.TECNICO);
        when(obras.buscarOpcional(20L)).thenReturn(obra);
        Equipamento alicate=new Equipamento();alicate.setTipo("Ferramentas");alicate.setModelo("Alicate");alicate.setStatus("Em estoque");
        when(equipamentos.findAll()).thenReturn(List.of(alicate));
        pedido=pedido("Pendente");
        when(pedidos.buscarParaAtualizacao(1L)).thenAnswer(i->Optional.of(pedido));
    }

    @Test void exigeAsDuasAprovacoesNaOrdemCorreta(){
        assertThrows(AccessDeniedException.class,()->service.aprovar(1L,"financeiro"));
        assertEquals("Aguardando financeiro",service.aprovar(1L,"gerente").status());
        assertThrows(AccessDeniedException.class,()->service.aprovar(1L,"gerente"));
        service.salvarPlanoFinanceiro(1L,new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,1,"Material indisponível para retirada",List.of()))),"financeiro");
        var resposta=service.aprovar(1L,"financeiro");
        assertEquals("Aprovada",resposta.status());
        assertEquals("APROVACAO",resposta.eventosFinanceiros().getLast().tipo());
    }

    @Test void edicaoFinanceiraFicaRegistradaParaGerenciaOuRh(){
        pedido.setStatus("Aguardando financeiro");
        var dados=new SolicitacaoDto.Atualizacao(null,null,20L,"Comprar somente se não houver em outra obra",List.of(new SolicitacaoDto.MaterialRequisicao("Alicate",2,null,"ferramentas|alicate|")));
        var resposta=service.atualizar(1L,dados,"financeiro");
        assertEquals(2,resposta.materiais().getFirst().quantidade());
        assertEquals("ALTERACAO",resposta.eventosFinanceiros().getFirst().tipo());
        assertEquals("financeiro",resposta.eventosFinanceiros().getFirst().autorLogin());
    }

    @Test void estoqueNaoRecebePedidoAntesDaAprovacaoFinanceira(){
        Solicitacao aguardando=pedido("Aguardando financeiro");
        Solicitacao liberado=pedido("Aprovada");ReflectionTestUtils.setField(liberado,"id",2L);
        when(pedidos.findAll()).thenReturn(List.of(aguardando,liberado));
        var visiveis=service.listarParaUsuario("estoque");
        assertEquals(1,visiveis.size());assertEquals(2L,visiveis.getFirst().id());
    }

    @Test void financeiroNaoPodeEditarPedidoAindaPendente(){
        var dados=new SolicitacaoDto.Atualizacao(null,null,20L,"Observação",null);
        assertThrows(AccessDeniedException.class,()->service.atualizar(1L,dados,"financeiro"));
    }

    @Test void financeiroSoRecebePedidoDepoisDaPrimeiraAprovacao(){
        when(pedidos.findAll()).thenAnswer(i->List.of(pedido));
        assertTrue(service.listarParaUsuario("financeiro").isEmpty());
        assertThrows(br.com.era.api.exception.RegraNegocioException.class,()->service.salvarPlanoFinanceiro(1L,new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(2L,1,"Comprar",List.of()))),"financeiro"));
        service.aprovar(1L,"gerente");
        assertEquals(1,service.listarParaUsuario("financeiro").size());
        assertEquals("APROVACAO_INICIAL",pedido.getEventosFinanceiros().getFirst().tipo());
        assertEquals("gerente",pedido.getEventosFinanceiros().getFirst().autorLogin());
    }

    @Test void financeiroNaoRecebeTransporteDiretoNemRejeicaoDaGerencia(){
        Solicitacao direto=pedido("Aprovada");direto.setMovimentacaoDireta(true);
        Solicitacao rejeitado=pedido("Rejeitada");rejeitado.registrarEventoFinanceiro("ALTERACAO","Nota administrativa",gerente);
        when(pedidos.findAll()).thenReturn(List.of(direto,rejeitado));
        assertTrue(service.listarParaUsuario("financeiro").isEmpty());
        rejeitado.registrarEventoFinanceiro("REJEICAO","Rejeição financeira",financeiro);
        assertEquals(1,service.listarParaUsuario("financeiro").size());
    }

    private Solicitacao pedido(String status){
        Solicitacao s=new Solicitacao();ReflectionTestUtils.setField(s,"id",1L);s.setTipo("Movimentação");s.setStatus(status);s.setTecnico(tecnico);s.setSolicitante(tecnico);s.setObraDestino(obra);
        s.substituirMateriais(List.of(new MaterialSolicitado("Alicate",1,null,"ferramentas|alicate|")));ReflectionTestUtils.setField(s.getMateriais().getFirst(),"id",2L);return s;
    }
    private static Usuario usuario(PerfilUsuario perfil,String nome,String login){Usuario u=new Usuario();u.setPerfil(perfil);u.setNome(nome);u.setLogin(login);return u;}
}
