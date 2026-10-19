package br.com.era.api.dto;
import jakarta.validation.constraints.*;
import java.time.OffsetDateTime;
public final class ManutencaoDto {
    private ManutencaoDto() {}
    public record Abertura(@NotNull @Min(1) Integer quantidade,@NotBlank @Size(max=4000) String motivo) {}
    public record Conclusao(@NotBlank @Size(max=4000) String observacao) {}
    public record Resposta(Long id,String status,int quantidade,String motivo,String modelo,String serie,String local,String tecnico,
        OffsetDateTime abertaEm,String abertaPorNome,String abertaPorLogin,OffsetDateTime concluidaEm,String concluidaPorNome,String concluidaPorLogin,String observacaoConclusao) {}
}
