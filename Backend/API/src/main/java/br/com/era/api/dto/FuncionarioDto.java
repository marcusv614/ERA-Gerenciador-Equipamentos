package br.com.era.api.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
public final class FuncionarioDto {
    private FuncionarioDto() {}
    public record Requisicao(@NotBlank String nome,@NotBlank String cargo,@NotBlank @Email String email,String telefone,String status) {}
    public record Resposta(Long id,String nome,String cargo,String email,String telefone,String status) {}
}
