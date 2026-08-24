package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
public final class ObraDto {
    private ObraDto() {}
    public record Requisicao(@NotBlank String nome,@NotBlank String cliente,@NotBlank String cidade,@NotNull LocalDate inicio,@NotBlank String status,List<String> responsaveis) {}
    public record Resposta(Long id,String nome,String cliente,String cidade,LocalDate inicio,String status,List<String> responsaveis) {}
}
