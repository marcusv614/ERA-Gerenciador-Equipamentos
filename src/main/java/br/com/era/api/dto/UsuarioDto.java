package br.com.era.api.dto;
import br.com.era.api.model.PerfilUsuario;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
public final class UsuarioDto {
    private UsuarioDto() {}
    public record Cadastro(Long funcionarioId,@NotBlank String nome,@NotBlank String login,@NotBlank @Size(min=10,max=128) String senhaTemporaria,@NotNull PerfilUsuario perfil) {}
    public record Resposta(Long id,Long funcionarioId,String nome,String login,PerfilUsuario perfil,boolean ativo,boolean deveAlterarSenha) {}
    public record Status(@NotNull Boolean ativo) {}
    public record RedefinirSenha(@NotBlank @Size(min=10,max=128) String senhaTemporaria) {}
}
