package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
public final class EquipamentoDto {
    private EquipamentoDto() {}
    public record Requisicao(@NotBlank String tipo,@NotBlank String modelo,@NotBlank String serie,@NotBlank String status,Long obraId,String tecnico,LocalDate data,LocalDate dataEntrada,LocalDate dataSaida) {}
    public record Resposta(Long id,String tipo,String modelo,String serie,String status,Long obraId,String tecnico,LocalDate data,LocalDate dataEntrada,LocalDate dataSaida,LocalDate saida,List<MovimentacaoDto.Resposta> historico) {}
}
