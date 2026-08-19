package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
public final class AutenticacaoDto {
    private AutenticacaoDto() {}
    public record Login(@NotBlank String login,@NotBlank String senha) {}
    public record Sessao(Long id,String nome,String login,String perfil,boolean deveAlterarSenha) {}
    public record AlterarSenha(@NotBlank String senhaAtual,@NotBlank String novaSenha) {}
}
