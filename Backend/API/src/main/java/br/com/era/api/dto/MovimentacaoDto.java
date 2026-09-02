package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
public final class MovimentacaoDto {
    private MovimentacaoDto() {}
    public record Requisicao(Long obraId,@NotBlank @Size(max=40) String status,@Size(max=150) String tecnico,@NotNull LocalDate dataMovimentacao) {}
    public record Resposta(Long id,Long equipamentoId,Long solicitacaoId,Long origemObraId,Long destinoObraId,String origemNome,String destinoNome,String tecnico,String status,LocalDate dataMovimentacao,LocalDate dataSaida,LocalDate dataEntrada) {}
}
