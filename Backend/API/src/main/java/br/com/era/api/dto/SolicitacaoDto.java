package br.com.era.api.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
public final class SolicitacaoDto {
    private SolicitacaoDto() {}
    public record MaterialRequisicao(@NotBlank String nome,@NotNull @Min(1) Integer quantidade,String identificacao) {}
    public record MaterialResposta(Long id,String nome,Integer quantidade,String identificacao,Integer quantidadeCompra,OffsetDateTime compraSolicitadaEm) {}
    public record SolicitarCompra(@NotNull @Min(1) Integer quantidade) {}
    public record Requisicao(String solicitante,@NotBlank String tecnico,Long obraOrigemId,Long obraDestinoId,@NotNull LocalDate dataSolicitacao,String observacao,@NotEmpty List<@Valid MaterialRequisicao> materiais) {}
    public record Atualizacao(String tecnico,Long obraOrigemId,Long obraDestinoId,String observacao,List<@Valid MaterialRequisicao> materiais) {}
    public record AtendimentoOrigem(Long obraOrigemId,@NotEmpty List<@Valid MaterialRequisicao> materiais) {}
    public record Distribuicao(@NotEmpty List<@Valid AtendimentoOrigem> atendimentos) {}
    public record Resposta(Long id,Long solicitacaoPaiId,String tipo,String status,String solicitante,String tecnico,Long obraOrigemId,Long obraDestinoId,LocalDate dataSolicitacao,LocalDate dataDecisao,OffsetDateTime transitoEm,OffsetDateTime concluidaEm,String observacao,List<MaterialResposta> materiais) {}
}
