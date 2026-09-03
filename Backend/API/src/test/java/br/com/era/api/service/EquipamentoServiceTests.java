package br.com.era.api.service;

import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.model.Equipamento;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.MovimentacaoRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
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
}
