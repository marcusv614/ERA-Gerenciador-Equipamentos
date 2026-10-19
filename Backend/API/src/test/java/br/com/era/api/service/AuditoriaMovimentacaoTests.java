package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditoriaMovimentacaoTests {
    final EquipamentoService service=new EquipamentoService(mock(EquipamentoRepository.class),mock(MovimentacaoRepository.class),mock(ObraService.class),mock(FuncionarioService.class),mock(UsuarioService.class),mock(InventarioHistoricoService.class));
    Movimentacao movimento(){Movimentacao m=new Movimentacao();m.setEquipamento(new Equipamento());m.setDataMovimentacao(LocalDate.of(2026,10,10));return m;}
    @Test void datasReaisVemDaSaidaEDoRecebimentoRegistrados(){
        Movimentacao m=movimento();Solicitacao s=new Solicitacao();s.setTransitoEm(OffsetDateTime.parse("2026-10-15T10:00:00-04:00"));s.setConcluidaEm(OffsetDateTime.parse("2026-10-17T14:00:00-04:00"));m.setSolicitacao(s);
        var resposta=service.respostaMovimentacao(m);
        assertEquals(LocalDate.of(2026,10,15),resposta.dataSaida());assertEquals(LocalDate.of(2026,10,17),resposta.dataEntrada());
        assertEquals(s.getTransitoEm(),resposta.saidaEm());assertEquals(s.getConcluidaEm(),resposta.entradaEm());
    }
    @Test void legadoSemPedidoNaoGanhaDatasInventadas(){
        var r=service.respostaMovimentacao(movimento());assertNull(r.dataSaida());assertNull(r.dataEntrada());assertNull(r.saidaEm());assertNull(r.entradaEm());
    }
    @Test void datasRespeitamManausNaViradaDoDiaUTC(){
        Movimentacao m=movimento();Solicitacao s=new Solicitacao();s.setTransitoEm(OffsetDateTime.parse("2026-10-16T01:00:00Z"));m.setSolicitacao(s);
        assertEquals(LocalDate.of(2026,10,15),service.respostaMovimentacao(m).dataSaida());assertNull(service.respostaMovimentacao(m).dataEntrada());
    }
    @Test void consultaHistoricaExplicitaADataRealDoRetrato(){
        InventarioObraSnapshotRepository snapshots=mock(InventarioObraSnapshotRepository.class);
        InventarioHistoricoService historico=new InventarioHistoricoService(snapshots,mock(InventarioObraSnapshotItemRepository.class),mock(EquipamentoRepository.class));
        Obra obra=new Obra();org.springframework.test.util.ReflectionTestUtils.setField(obra,"id",1L);
        InventarioObraSnapshot s=new InventarioObraSnapshot();s.setDataReferencia(LocalDate.of(2026,10,15));s.setResponsaveisTecnicos("");
        when(snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(1L,LocalDate.of(2026,10,19))).thenReturn(Optional.of(s));
        var r=historico.consultar(obra,LocalDate.of(2026,10,19));assertEquals(LocalDate.of(2026,10,19),r.dataReferencia());assertEquals(LocalDate.of(2026,10,15),r.dataSnapshot());
    }
}
