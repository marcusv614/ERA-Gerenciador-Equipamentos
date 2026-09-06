package br.com.era.api.dto;
import jakarta.validation.constraints.NotNull;
public final class ArquivamentoDto { private ArquivamentoDto(){} public record Requisicao(@NotNull Boolean arquivado){} }
