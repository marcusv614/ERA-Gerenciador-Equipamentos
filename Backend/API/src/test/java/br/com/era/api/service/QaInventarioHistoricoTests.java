package br.com.era.api.service;

import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaInventarioHistoricoTests {
    final InventarioObraSnapshotRepository snapshots = mock(InventarioObraSnapshotRepository.class);
    final InventarioObraSnapshotItemRepository itens = mock(InventarioObraSnapshotItemRepository.class);
    final EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
    final InventarioHistoricoService service = new InventarioHistoricoService(snapshots,itens,equipamentos);
    final Obra obra = new Obra();
    @BeforeEach void preparar() {
        ReflectionTestUtils.setField(obra,"id",1L); obra.setNome("Obra original"); obra.setCidade("Manaus"); obra.setCliente("Cliente QA"); obra.setStatus("Em andamento");
    }
    @Test void futuroEhRecusadoAntesDeConsultarBanco() {
        assertThrows(RegraNegocioException.class, () -> service.consultar(obra,LocalDate.now().plusDays(1)));
        verifyNoInteractions(snapshots,itens,equipamentos);
    }
    @Test void ausenciaDeSnapshotNaoInventaHistorico() {
        assertThrows(RegraNegocioException.class, () -> service.consultar(obra,LocalDate.now()));
        verifyNoInteractions(itens);
    }
    @Test void snapshotCopiaSaldoESerieSemAlterarEquipamento() {
        var e = new Equipamento(); ReflectionTestUtils.setField(e,"id",7L);
        e.setTipo("Ferramentas"); e.setModelo("Alicate"); e.setSerie("QA-7"); e.setQuantidade(4);
        when(equipamentos.findByObraIdOrderByModeloAscSerieAsc(1L)).thenReturn(List.of(e));
        service.registrar(obra);
        var captor = ArgumentCaptor.forClass(InventarioObraSnapshotItem.class); verify(itens).save(captor.capture());
        e.setQuantidade(99); e.setSerie("EDITADA"); obra.setNome("Nome atual");
        assertEquals(4,captor.getValue().getQuantidade()); assertEquals("QA-7",captor.getValue().getSerie());
        assertEquals("Obra original",captor.getValue().getSnapshot().getObraNome()); assertNull(captor.getValue().getTecnico());
    }
    @Test void consultaPreservaDataSolicitadaESnapshotDeDataAnterior() {
        var s = new InventarioObraSnapshot(); ReflectionTestUtils.setField(s,"id",20L);
        s.setObraNome("Nome antigo"); s.setDataReferencia(LocalDate.now().minusDays(2)); s.setResponsaveisTecnicos("");
        when(snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(1L,LocalDate.now())).thenReturn(Optional.of(s));
        when(itens.findBySnapshotIdOrderByModeloAscSerieAsc(20L)).thenReturn(List.of());
        var r = service.consultar(obra,LocalDate.now());
        assertEquals("Nome antigo",r.obraNome()); assertEquals(LocalDate.now(),r.dataReferencia());
        assertEquals(LocalDate.now().minusDays(2),r.dataSnapshot()); assertTrue(r.responsaveisTecnicos().isEmpty());
    }
    @Test void QA_BUG_002_snapshotDevePreservarNomeComVirgula() {
        var f = new Funcionario(); f.setNome("Silva, João"); obra.getResponsaveis().add(f);
        when(equipamentos.findByObraIdOrderByModeloAscSerieAsc(1L)).thenReturn(List.of());
        service.registrar(obra);
        var captor = ArgumentCaptor.forClass(InventarioObraSnapshot.class); verify(snapshots).save(captor.capture());
        when(snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(1L,LocalDate.now())).thenReturn(Optional.of(captor.getValue()));
        when(itens.findBySnapshotIdOrderByModeloAscSerieAsc(null)).thenReturn(List.of());
        assertEquals(List.of("Silva, João"),service.consultar(obra,LocalDate.now()).responsaveisTecnicos());
    }

    @Test void novosSnapshotsPreservamAspasVirgulasQuebrasEOrdenacao() {
        var nomes=List.of("Silva, João", "Ana \"QA\"", "Bia\nCosta");
        for(var nome:nomes){var f=new Funcionario();f.setNome(nome);obra.getResponsaveis().add(f);}
        when(equipamentos.findByObraIdOrderByModeloAscSerieAsc(1L)).thenReturn(List.of());
        service.registrar(obra);
        var captor=ArgumentCaptor.forClass(InventarioObraSnapshot.class);verify(snapshots).save(captor.capture());
        assertEquals(nomes.stream().sorted().toList(),consultarSnapshot(captor.getValue()));
    }

    @Test void novoSnapshotSemResponsavelContinuaVazio() {
        when(equipamentos.findByObraIdOrderByModeloAscSerieAsc(1L)).thenReturn(List.of());
        service.registrar(obra);
        var captor=ArgumentCaptor.forClass(InventarioObraSnapshot.class);verify(snapshots).save(captor.capture());
        assertTrue(consultarSnapshot(captor.getValue()).isEmpty());
    }

    @Test void consultaContinuaLendoFormatoLegadoSemReescreverSnapshot() {
        var s=new InventarioObraSnapshot();s.setResponsaveisTecnicos("Ana, Bruno,  Carlos");
        assertEquals(List.of("Ana","Bruno","Carlos"),consultarSnapshot(s));
        assertEquals("Ana, Bruno,  Carlos",s.getResponsaveisTecnicos());
        verify(snapshots,never()).save(any());
    }

    @Test void legadoQuePareceJsonPermaneceTextoLegado() {
        var s=new InventarioObraSnapshot();s.setResponsaveisTecnicos("[Ana]");
        assertEquals(List.of("[Ana]"),consultarSnapshot(s));
    }

    @Test void snapshotVersionadoCorrompidoNaoInventaResponsaveis() {
        for(var valor:List.of("json:v1:invalido","json:v1:null","json:v1:[null]")){
            var s=new InventarioObraSnapshot();s.setResponsaveisTecnicos(valor);
            assertThrows(RegraNegocioException.class,()->consultarSnapshot(s));
        }
    }

    private List<String> consultarSnapshot(InventarioObraSnapshot s) {
        when(snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(1L,LocalDate.now())).thenReturn(Optional.of(s));
        when(itens.findBySnapshotIdOrderByModeloAscSerieAsc(s.getId())).thenReturn(List.of());
        return service.consultar(obra,LocalDate.now()).responsaveisTecnicos();
    }
}
