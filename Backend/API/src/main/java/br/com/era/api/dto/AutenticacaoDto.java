package br.com.era.api.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public final class AutenticacaoDto {
    private AutenticacaoDto() {}
    public record Login(@NotBlank @Size(max=120) String login,@NotBlank @Size(max=128) String senha) {}
    public record Sessao(Long id,Long funcionarioId,String nome,String login,String perfil,boolean deveAlterarSenha) {}
    public record AlterarSenha(@NotBlank @Size(max=128) String senhaAtual,@NotBlank @Size(min=8,max=128) String novaSenha) {}
}
