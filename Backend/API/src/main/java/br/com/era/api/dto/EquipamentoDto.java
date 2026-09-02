package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
public final class EquipamentoDto {
    private EquipamentoDto() {}
    public record Requisicao(@NotBlank @Size(max=40) String tipo,@NotBlank @Size(max=180) String modelo,@NotBlank @Size(max=120) String serie,@NotBlank @Size(max=40) String status,Long obraId,@Size(max=150) String tecnico,LocalDate data,LocalDate dataEntrada,LocalDate dataSaida,@Size(max=100) String medida,@Positive Integer quantidade,@Size(max=4000) String observacoes,@Size(max=20) String controleQuantidade) {}
    public record Resposta(Long id,String tipo,String modelo,String serie,String status,Long obraId,String tecnico,LocalDate data,LocalDate dataEntrada,LocalDate dataSaida,LocalDate saida,List<MovimentacaoDto.Resposta> historico,String medida,Integer quantidade,Integer quantidadeReservada,Integer quantidadeDisponivel,String observacoes,String controleQuantidade) {}
    public record ItemCatalogo(String tipo,String modelo,String medida) {}
}
