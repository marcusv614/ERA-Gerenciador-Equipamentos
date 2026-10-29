package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaListagemEquipamentosTests {
    @Test void projecaoPreservaRespostaCompletaComManutencaoECalibracao() {
        var equipamentos=mock(EquipamentoRepository.class);
        var movimentos=mock(MovimentacaoRepository.class);
        var service=new EquipamentoService(equipamentos,movimentos,mock(ObraService.class),mock(FuncionarioService.class),mock(UsuarioService.class),mock(InventarioHistoricoService.class));
        var autor=new Usuario();autor.setNome("Autor QA");autor.setLogin("qa");autor.setPerfil(PerfilUsuario.GERENTE);
        var lote=equipamento(1);lote.setQuantidade(8);lote.setQuantidadeReservada(1);lote.setControleQuantidade("LOTE");
        lote.setMedida("un");lote.setObservacoes("Observação");lote.setNotaFiscal("NF-123");lote.setFornecedor("Fornecedor");
        lote.setDataCompra(LocalDate.of(2026,9,1));lote.setDataEntrada(LocalDate.of(2026,10,1));lote.setDataSaida(LocalDate.of(2026,10,2));
        lote.setAtributos(Map.of("marca","Marca QA"));lote.setAuditavel(true);
        lote.getManutencoes().add(new ManutencaoEquipamento(lote,2,"Reparo",autor));
        var fluke=equipamento(2);fluke.setTipo("Fluke");
        fluke.getCalibracoes().add(new CalibracaoEquipamento(fluke,"Laboratório","Verificar",autor,false));
        var leituraLote=projecao(lote);var leituraFluke=projecao(fluke);
        leituraLote.getManutencoes().addAll(lote.getManutencoes());
        leituraFluke.getCalibracoes().addAll(fluke.getCalibracoes());
        when(equipamentos.listarParaConsulta()).thenReturn(List.of(lote,fluke),List.of(leituraLote,leituraFluke));
        var anterior=service.listar();var projetada=service.listar();
        assertEquals(anterior,projetada,"A projeção deve preservar todos os campos públicos e históricos.");
        assertEquals(5,projetada.getFirst().quantidadeDisponivel());
        assertEquals(2,projetada.getFirst().quantidadeManutencao());
        assertEquals(0,projetada.get(1).quantidadeDisponivel());
        assertEquals(1,projetada.get(1).quantidadeCalibracao());
        assertEquals("Aguardando calibração",projetada.get(1).status());
    }

    private Equipamento projecao(Equipamento e) {
        return new Equipamento(e.getId(),e.getTipo(),e.getModelo(),e.getSerie(),"Em estoque",e.getMedida(),
            e.getQuantidade(),e.getQuantidadeReservada(),e.getControleQuantidade(),e.getObservacoes(),
            e.getNotaFiscal(),e.getFornecedor(),e.getDataCompra(),e.getAtributos(),e.getObra(),e.getTecnico(),
            e.getDataEntrada(),e.getDataSaida(),e.isArquivado(),e.isAuditavel());
    }

    @Test void listagemAgrupaHistoricosSemMisturarAtivosNemPerderOrdem() {
        var equipamentos=mock(EquipamentoRepository.class);
        var movimentos=mock(MovimentacaoRepository.class);
        var service=new EquipamentoService(equipamentos,movimentos,mock(ObraService.class),mock(FuncionarioService.class),mock(UsuarioService.class),mock(InventarioHistoricoService.class));
        var a=equipamento(1);var b=equipamento(2);var arquivado=equipamento(3);arquivado.definirArquivamento(true,"autor");
        when(equipamentos.listarParaConsulta()).thenReturn(List.of(a,b,arquivado));
        var m1=movimento(service,a,11,1);var m2=movimento(service,b,12,2);var m3=movimento(service,a,13,3);
        when(movimentos.findByEquipamentoIdInOrderByDataMovimentacaoAscIdAsc(List.of(1L,2L))).thenReturn(List.of(m1,m2,m3));
        var resposta=service.listar();
        assertEquals(List.of(1L,2L),resposta.stream().map(r->r.id()).toList());
        assertEquals(List.of(11L,13L),resposta.getFirst().historico().stream().map(m->m.id()).toList());
        assertEquals(List.of(12L),resposta.get(1).historico().stream().map(m->m.id()).toList());
        verify(movimentos,times(1)).findByEquipamentoIdInOrderByDataMovimentacaoAscIdAsc(List.of(1L,2L));
        verify(movimentos,never()).findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(any());
    }
    private Equipamento equipamento(long id){
        var e=new Equipamento();ReflectionTestUtils.setField(e,"id",id);e.setTipo("Ferramentas");e.setModelo("Modelo");e.setSerie("QA-"+id);e.setStatus("Em estoque");return e;
    }
    private Movimentacao movimento(EquipamentoService service,Equipamento e,long id,int dia){
        var m=service.novaMovimentacao(e,null,null,null,null,"Em estoque",1,LocalDate.of(2026,10,dia));ReflectionTestUtils.setField(m,"id",id);return m;
    }
}
