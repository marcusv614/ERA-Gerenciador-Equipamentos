package br.com.era.api.service;

import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PedidoGerenciaTests {
    final SolicitacaoRepository pedidos = mock(SolicitacaoRepository.class);
    final EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
    final MovimentacaoRepository movimentos = mock(MovimentacaoRepository.class);
    final ObraService obras = mock(ObraService.class);
    final FuncionarioService funcionarios = mock(FuncionarioService.class);
    final EquipamentoService equipamentoService = mock(EquipamentoService.class);
    final UsuarioRepository acessos = mock(UsuarioRepository.class);
    final UsuarioService usuarios = new UsuarioService(acessos, mock(FuncionarioRepository.class), mock(PasswordEncoder.class),mock(AuditoriaSegurancaService.class));
    final SolicitacaoService service = new SolicitacaoService(pedidos, equipamentos, movimentos, obras, funcionarios, equipamentoService, usuarios, mock(InventarioHistoricoService.class),mock(NotificacaoMovimentacaoService.class));
    final Funcionario tecnico = new Funcionario();
    final Usuario gerente = new Usuario();
    final Usuario acessoTecnico = new Usuario();
    final Obra obra = new Obra();
    final Equipamento escada = new Equipamento();
    Solicitacao salva;

    PedidoGerenciaTests() {
        tecnico.setNome("Ana"); ReflectionTestUtils.setField(tecnico, "id", 10L);
        gerente.setNome("Maria Gerente"); gerente.setLogin("maria.gerente"); gerente.setPerfil(PerfilUsuario.GERENTE);
        acessoTecnico.setPerfil(PerfilUsuario.TECNICO); acessoTecnico.setFuncionario(tecnico);
        obra.setNome("Obra B"); obra.setStatus("Em andamento"); obra.getResponsaveis().add(tecnico); ReflectionTestUtils.setField(obra, "id", 2L);
        escada.setTipo("Ferramentas"); escada.setModelo("Escada"); escada.setSerie("ESC-1"); escada.setStatus("Em estoque"); ReflectionTestUtils.setField(escada, "id", 20L);
        when(acessos.findByLoginIgnoreCase("gerente")).thenReturn(Optional.of(gerente));
        when(acessos.findByLoginIgnoreCase("tecnico")).thenReturn(Optional.of(acessoTecnico));
        when(acessos.findByFuncionarioId(10L)).thenReturn(Optional.of(acessoTecnico));
        when(obras.buscarOpcional(2L)).thenReturn(obra); when(obras.idsPermitidos("tecnico")).thenReturn(Set.of(2L));
        when(funcionarios.buscarPorNome("Ana")).thenReturn(tecnico);
        when(equipamentos.findAll()).thenReturn(List.of(escada));
        when(pedidos.save(any())).thenAnswer(i -> { salva = i.getArgument(0); ReflectionTestUtils.setField(salva, "id", 1L); return salva; });
        when(pedidos.buscarParaAtualizacao(1L)).thenAnswer(i -> Optional.ofNullable(salva));
    }
    SolicitacaoDto.Requisicao dados(String chave, int quantidade) {
        return new SolicitacaoDto.Requisicao("Autoria adulterada", "Ana", null, 2L, LocalDate.now(), "Mobilização de emergência", List.of(new SolicitacaoDto.MaterialRequisicao("Escada", quantidade, null, chave)));
    }
    @Test void gerenteSemFuncionarioCriaPedidoAutorizadoComAutoriaAutenticada() {
        var resposta = service.cadastrar(dados("ferramentas|escada|", 50), "gerente");
        assertEquals("Aguardando financeiro", resposta.status()); assertEquals(LocalDate.now(), resposta.dataDecisao());
        assertEquals("Maria Gerente", resposta.solicitante()); assertEquals("Ana", resposta.tecnico());
        assertEquals("maria.gerente", resposta.solicitanteLogin()); assertEquals("GERENTE", resposta.solicitantePerfil());
        assertSame(gerente, salva.getSolicitanteUsuario()); assertNull(salva.getSolicitante());
        assertEquals(50, resposta.materiais().getFirst().quantidade()); assertNull(resposta.materiais().getFirst().identificacao());
        verify(equipamentos, never()).buscarPorSerieParaAtualizacao(any());
    }
    @Test void administradorTambemPodeCriarPedidoAutorizado() {
        gerente.setPerfil(PerfilUsuario.ADMIN);
        assertEquals("Aguardando financeiro", service.cadastrar(dados("ferramentas|escada|", 1), "gerente").status());
    }
    @Test void auditoriaPreservaAutoriaMesmoDepoisDeAlterarContaETecnicoResponsavel() {
        service.cadastrar(dados("ferramentas|escada|", 1), "gerente");
        gerente.setNome("Outro nome"); gerente.setLogin("novo.login"); gerente.setPerfil(PerfilUsuario.ADMIN);
        Funcionario outro = new Funcionario(); outro.setNome("Bruno"); salva.setTecnico(outro);
        when(pedidos.findAll()).thenReturn(List.of(salva));
        var historico = service.listar().getFirst();
        assertEquals("Maria Gerente", historico.solicitante()); assertEquals("maria.gerente", historico.solicitanteLogin());
        assertEquals("GERENTE", historico.solicitantePerfil()); assertEquals("Bruno", historico.tecnico());
    }
    @Test void naoAceitaMaterialForaDoCatalogo() {
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("inexistente", 1), "gerente"));
        verify(pedidos, never()).save(any());
    }
    @Test void naoAceitaTecnicoSemAcessoAtivo() {
        acessoTecnico.setAtivo(false);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
        verify(pedidos, never()).save(any());
    }
    @Test void naoAceitaFuncionarioSemContaOuComOutroPerfil() {
        when(acessos.findByFuncionarioId(10L)).thenReturn(Optional.empty());
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
        acessoTecnico.setPerfil(PerfilUsuario.ESTOQUE); when(acessos.findByFuncionarioId(10L)).thenReturn(Optional.of(acessoTecnico));
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
    }
    @Test void naoAceitaResponsavelInativoOuDeOutraObra() {
        tecnico.setStatus("Inativo");
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
        tecnico.setStatus("Ativo"); obra.getResponsaveis().clear();
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
    }
    @Test void naoAceitaObraConcluida() {
        obra.setStatus("Concluída");
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(dados("ferramentas|escada|", 1), "gerente"));
    }
    @Test void tecnicoSeguePrecisandoDeAprovacaoEAutoriaNaoPodeSerForjada() {
        var resposta = service.cadastrar(dados("ferramentas|escada|", 1), "tecnico");
        assertEquals("Pendente", resposta.status()); assertNull(resposta.dataDecisao()); assertEquals("Ana", resposta.solicitante());
    }
    @Test void pedidoDaGerenciaSoTerminaComRecebimentoPeloTecnico() {
        service.cadastrar(dados("ferramentas|escada|", 1), "gerente");
        ReflectionTestUtils.setField(salva.getMateriais().getFirst(),"id",100L);
        when(equipamentos.buscarParaAtualizacao(20L)).thenReturn(Optional.of(escada));
        Usuario financeiro = new Usuario(); financeiro.setPerfil(PerfilUsuario.FINANCEIRO); financeiro.setNome("Financeiro"); financeiro.setLogin("financeiro");
        when(acessos.findByLoginIgnoreCase("financeiro")).thenReturn(Optional.of(financeiro));
        service.salvarPlanoFinanceiro(1L,new SolicitacaoDto.PlanoFinanceiro(List.of(new SolicitacaoDto.MaterialPlano(100L,0,"",List.of(new SolicitacaoDto.OrigemPlano(20L,1))))),"financeiro");
        assertEquals("Aprovada", service.aprovar(1L, "financeiro").status());
        assertThrows(RegraNegocioException.class, () -> service.iniciarTransito(1L, "tecnico"));
        assertThrows(RegraNegocioException.class, () -> service.concluir(1L, "tecnico"));
        when(equipamentos.buscarPorSerieParaAtualizacao("ESC-1")).thenReturn(Optional.of(escada));
        var origem = new SolicitacaoDto.AtendimentoOrigem(null, List.of(new SolicitacaoDto.MaterialRequisicao("Escada", 1, "ESC-1", "ferramentas|escada|")));
        service.distribuir(1L, new SolicitacaoDto.Distribuicao(List.of(origem)));
        Usuario estoque = new Usuario(); estoque.setPerfil(PerfilUsuario.ESTOQUE);
        when(acessos.findByLoginIgnoreCase("estoque")).thenReturn(Optional.of(estoque));
        assertEquals("Em trânsito", service.iniciarTransito(1L, "estoque").status());
        assertThrows(RegraNegocioException.class, () -> service.concluir(1L, "gerente"));
        assertEquals(1, escada.getQuantidadeReservada());
        Movimentacao movimento = new Movimentacao(); movimento.setEquipamento(escada);
        when(equipamentoService.novaMovimentacao(any(), any(), any(), any(), any(), any(), anyInt(), any())).thenReturn(movimento);
        var resposta = service.concluir(1L, "tecnico");
        assertEquals("Concluída", resposta.status()); assertEquals("Maria Gerente", resposta.solicitante());
        assertEquals(0, escada.getQuantidadeReservada()); assertNotNull(resposta.concluidaEm());
        assertThrows(RegraNegocioException.class, () -> service.concluir(1L, "tecnico"));
        verify(movimentos, times(1)).save(movimento);
    }
}
