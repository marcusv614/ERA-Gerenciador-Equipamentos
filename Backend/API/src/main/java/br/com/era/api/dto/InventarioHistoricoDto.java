package br.com.era.api.dto;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
public final class InventarioHistoricoDto {
    private InventarioHistoricoDto() {}
    public record Item(Long equipamentoId,String tipo,String modelo,String serie,String medida,Integer quantidade,String tecnico) {}
    public record Resposta(Long snapshotId,Long obraId,LocalDate dataReferencia,OffsetDateTime registradoEm,String obraNome,String cliente,String cidade,String status,List<String> responsaveisTecnicos,List<Item> materiais) {}
}
