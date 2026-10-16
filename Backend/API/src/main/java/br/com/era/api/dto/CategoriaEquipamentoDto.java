package br.com.era.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class CategoriaEquipamentoDto {
    private CategoriaEquipamentoDto() {}

    public record Campo(
            @NotBlank @Size(max = 40) String chave,
            @NotBlank @Size(max = 80) String rotulo,
            @NotBlank @Size(max = 20) String tipo,
            @Size(max = 120) String placeholder,
            @Size(max = 180) String dica) {}

    public record Requisicao(
            @NotBlank @Size(max = 100) String nome,
            @Size(max = 255) String descricao,
            @Size(max = 12) List<@Valid Campo> campos) {}

    public record Resposta(
            Long id,
            String nome,
            String slug,
            String descricao,
            String icone,
            List<Campo> campos,
            boolean sistema) {}
}
