package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public final class AutenticacaoDto {
    private AutenticacaoDto() {}
    public record Login(@NotBlank String login,@NotBlank String senha) {}
    public record Sessao(Long id,Long funcionarioId,String nome,String login,String perfil,boolean deveAlterarSenha) {}
    public record AlterarSenha(@NotBlank String senhaAtual,@NotBlank @Size(min=6,max=128) String novaSenha) {}
}
