package br.com.era.api.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
public final class FuncionarioDto {
    private FuncionarioDto() {}
    public record Requisicao(@NotBlank @Size(max=150) String nome,@NotBlank @Size(max=100) String cargo,@NotBlank @Email @Size(max=180) String email,@Size(max=30) String telefone,@Size(max=30) String status) {}
    public record Atualizacao(@NotBlank @Size(max=150) String nome,@NotBlank @Size(max=100) String cargo,@NotBlank @Email @Size(max=180) String email,@Size(max=30) String telefone,@Size(max=30) String status,@Size(max=500) List<Long> obraIds) {}
    public record Resposta(Long id,String nome,String cargo,String email,String telefone,String status,boolean arquivado) {}
}
