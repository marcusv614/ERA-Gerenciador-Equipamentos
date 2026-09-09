package br.com.era.api.service;

import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Equipamento;
import br.com.era.api.model.Obra;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.MovimentacaoRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EquipamentoServiceTests {

    @Test
    void devePersistirEdicaoDoEquipamentoComDataETecnicoOpcional() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
        Equipamento equipamento = new Equipamento();
        equipamento.setTipo("OTDR");
        equipamento.setModelo("Nome anterior");
        equipamento.setSerie("SERIE-1");
        equipamento.setStatus("Em estoque");

        when(equipamentos.findById(1L)).thenReturn(Optional.of(equipamento));
        when(equipamentos.findBySerieIgnoreCase("SERIE-1")).thenReturn(Optional.empty());
        when(equipamentos.save(equipamento)).thenReturn(equipamento);
        when(movimentacoes.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(null)).thenReturn(List.of());

        EquipamentoService service = new EquipamentoService(
                equipamentos,
                movimentacoes,
                mock(ObraService.class),
                mock(FuncionarioService.class),
                mock(UsuarioService.class),
                mock(InventarioHistoricoService.class));
        LocalDate dataEntrada = LocalDate.of(2026, 9, 3);
        EquipamentoDto.Requisicao dados = new EquipamentoDto.Requisicao(
                "FLUKE", "Nome atualizado", "SERIE-1", "Em estoque", null, null,
                dataEntrada, null, null, null, 1, null, "INDIVIDUAL");

        EquipamentoDto.Resposta resposta = service.atualizar(1L, dados);

        verify(equipamentos).save(equipamento);
        assertEquals("Nome atualizado", resposta.modelo());
        assertEquals("FLUKE", resposta.tipo());
        assertEquals(dataEntrada, resposta.dataEntrada());
        assertEquals(null, resposta.tecnico());
    }

    @Test
    void deveImpedirAlteracaoDiretaDeLocalizacaoForaDoFluxoDeMovimentacao() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
        Obra origem = mock(Obra.class);
        when(origem.getId()).thenReturn(2L);
        Equipamento equipamento = new Equipamento();
        equipamento.setTipo("OTDR");
        equipamento.setModelo("Equipamento");
        equipamento.setSerie("SERIE-2");
        equipamento.setStatus("Em campo");
        equipamento.setObra(origem);
        when(equipamentos.findById(2L)).thenReturn(Optional.of(equipamento));

        EquipamentoService service = new EquipamentoService(
                equipamentos,
                movimentacoes,
                mock(ObraService.class),
                mock(FuncionarioService.class),
                mock(UsuarioService.class),
                mock(InventarioHistoricoService.class));

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.atualizar(2L,
                new EquipamentoDto.Requisicao("OTDR", "Equipamento", "SERIE-2", "Em campo", 3L, null,
                        LocalDate.now(), null, null, null, null, null, null)));

        assertEquals("Localização, responsável e status só podem ser alterados pelo fluxo de movimentação.", erro.getMessage());
    }

    @Test
    void deveAtualizarQuantidadeEConverterRegistroParaLote() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
        Equipamento equipamento = new Equipamento();
        equipamento.setTipo("Ferramenta manual");
        equipamento.setModelo("Alicate");
        equipamento.setSerie("ERA-LOTE-1");
        equipamento.setStatus("Em estoque");
        equipamento.setQuantidade(1);
        equipamento.setControleQuantidade("INDIVIDUAL");
        when(equipamentos.findById(5L)).thenReturn(Optional.of(equipamento));
        when(equipamentos.findBySerieIgnoreCase("ERA-LOTE-1")).thenReturn(Optional.empty());
        when(equipamentos.save(equipamento)).thenReturn(equipamento);
        when(movimentacoes.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(null)).thenReturn(List.of());
        EquipamentoService service = new EquipamentoService(equipamentos, movimentacoes, mock(ObraService.class),
                mock(FuncionarioService.class), mock(UsuarioService.class), mock(InventarioHistoricoService.class));

        EquipamentoDto.Resposta resposta = service.atualizar(5L, new EquipamentoDto.Requisicao(
                "Ferramenta manual", "Alicate", "ERA-LOTE-1", "Em estoque", null, null,
                LocalDate.now(), null, null, null, 8, null, null));

        assertEquals(8, resposta.quantidade());
        assertEquals("LOTE", resposta.controleQuantidade());
    }

    @Test
    void deveImpedirQuantidadeMenorQueUnidadesReservadas() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        Equipamento equipamento = new Equipamento();
        equipamento.setTipo("Ferramenta manual");
        equipamento.setModelo("Alicate");
        equipamento.setSerie("ERA-LOTE-2");
        equipamento.setStatus("Em estoque");
        equipamento.setQuantidade(10);
        equipamento.setQuantidadeReservada(4);
        equipamento.setControleQuantidade("LOTE");
        when(equipamentos.findById(6L)).thenReturn(Optional.of(equipamento));
        when(equipamentos.findBySerieIgnoreCase("ERA-LOTE-2")).thenReturn(Optional.empty());
        EquipamentoService service = new EquipamentoService(equipamentos, mock(MovimentacaoRepository.class),
                mock(ObraService.class), mock(FuncionarioService.class), mock(UsuarioService.class),
                mock(InventarioHistoricoService.class));

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.atualizar(6L,
                new EquipamentoDto.Requisicao("Ferramenta manual", "Alicate", "ERA-LOTE-2", "Em estoque",
                        null, null, LocalDate.now(), null, null, null, 3, null, "LOTE")));

        assertEquals("A quantidade não pode ser menor que as unidades já reservadas.", erro.getMessage());
        verify(equipamentos, never()).save(equipamento);
    }

    @Test
    void deveExcluirEquipamentoSemReservasOuHistorico() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
        Equipamento equipamento = new Equipamento();
        when(equipamentos.findById(3L)).thenReturn(Optional.of(equipamento));
        when(movimentacoes.existsByEquipamentoId(3L)).thenReturn(false);
        EquipamentoService service = new EquipamentoService(equipamentos, movimentacoes, mock(ObraService.class),
                mock(FuncionarioService.class), mock(UsuarioService.class), mock(InventarioHistoricoService.class));

        service.excluir(3L);

        verify(equipamentos).delete(equipamento);
        verify(equipamentos).flush();
    }

    @Test
    void devePreservarEquipamentoComHistoricoDeMovimentacao() {
        EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
        MovimentacaoRepository movimentacoes = mock(MovimentacaoRepository.class);
        Equipamento equipamento = new Equipamento();
        when(equipamentos.findById(4L)).thenReturn(Optional.of(equipamento));
        when(movimentacoes.existsByEquipamentoId(4L)).thenReturn(true);
        EquipamentoService service = new EquipamentoService(equipamentos, movimentacoes, mock(ObraService.class),
                mock(FuncionarioService.class), mock(UsuarioService.class), mock(InventarioHistoricoService.class));

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.excluir(4L));

        assertEquals("Equipamentos com histórico de movimentação não podem ser excluídos.", erro.getMessage());
        verify(equipamentos, never()).delete(equipamento);
    }
}
