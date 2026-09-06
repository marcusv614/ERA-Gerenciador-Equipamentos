package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
public final class ObraDto {
    private ObraDto() {}
    public record Requisicao(@NotBlank @Size(max=180) String nome,@NotBlank @Size(max=150) String cliente,@NotBlank @Size(max=150) String cidade,@NotNull LocalDate inicio,@NotBlank @Pattern(regexp="Em andamento|Concluída",message="deve ser Em andamento ou Concluída") String status,@Size(max=500) List<@Size(max=150) String> responsaveis) {}
    public record Resposta(Long id,String nome,String cliente,String cidade,LocalDate inicio,String status,List<String> responsaveis,boolean arquivado) {}
}
