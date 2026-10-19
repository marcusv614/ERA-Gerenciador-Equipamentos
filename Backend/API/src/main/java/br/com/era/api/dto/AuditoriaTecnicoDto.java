package br.com.era.api.dto;

import br.com.era.api.model.AuditoriaTecnico;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class AuditoriaTecnicoDto {
    private AuditoriaTecnicoDto() {}
    public record Criacao(@NotEmpty @Size(max=200) List<@NotNull @Positive Long> equipamentoIds) {}
    public record ItemRegistro(@NotNull @Positive Long equipamentoId,@NotNull @Min(0) Integer bom,@NotNull @Min(0) Integer avaria,@NotNull @Min(0) Integer quebrado,@Size(max=1000) String observacao) {}
    public record Registro(@NotNull @Min(0) Long versao,@PastOrPresent LocalDate dataVistoria,@Size(max=150) String fiscal,@Size(max=4000) String observacoes,@NotNull Boolean concluir,@NotEmpty @Size(max=200) List<@NotNull @Valid ItemRegistro> itens) {}
    public record Resposta(Long id,Long versao,Long funcionarioId,String tecnicoNome,String status,OffsetDateTime criadoEm,String criadoPorNome,String criadoPorLogin,LocalDate dataVistoria,String fiscal,String observacoes,String registradoPorNome,String registradoPorLogin,OffsetDateTime atualizadoEm,OffsetDateTime concluidaEm,List<AuditoriaTecnico.Item> itens) {}
}
