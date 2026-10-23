package br.com.era.api.dto;

import jakarta.validation.constraints.*;

public final class RecuperacaoDto {
    private RecuperacaoDto() {}
    public record Configuracao(boolean disponivel,boolean obrigatorio,String emailVerificado,String emailPendente) {}
    public record CadastrarEmail(@NotBlank @Email @Size(max=254) String email,@NotBlank @Size(max=128) String senhaAtual) {}
    public record ConfirmarEmail(@NotBlank @Pattern(regexp="[0-9]{8}") String codigo) {}
    public record Solicitar(@NotBlank @Size(max=120) String login) {}
    public record Redefinir(@NotBlank @Pattern(regexp="[A-Za-z0-9_-]{43}") String token,@NotBlank @Size(min=8,max=128) String novaSenha) {}
    public record Mensagem(String mensagem) {}
}
