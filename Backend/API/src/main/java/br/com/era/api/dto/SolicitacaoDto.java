package br.com.era.api.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
public final class SolicitacaoDto {
    private SolicitacaoDto() {}
    public record MaterialRequisicao(@NotBlank @Size(max=180) String nome,@NotNull @Min(1) Integer quantidade,@Size(max=120) String identificacao,@Size(max=500) String catalogoChave) {}
    public record MaterialResposta(Long id,String nome,Integer quantidade,String identificacao,String catalogoChave,Integer quantidadeCompra,OffsetDateTime compraSolicitadaEm,Integer quantidadeAdquirida,OffsetDateTime adquiridaEm) {}
    public record SolicitarCompra(@NotNull @Min(1) Integer quantidade) {}
    public record RegistrarAquisicao(@NotNull @Min(1) Integer quantidade) {}
    public record Requisicao(@Size(max=150) String solicitante,@NotBlank @Size(max=150) String tecnico,Long obraOrigemId,Long obraDestinoId,@NotNull LocalDate dataSolicitacao,@Size(max=4000) String observacao,@NotEmpty @Size(max=200) List<@Valid MaterialRequisicao> materiais) {}
    public record Atualizacao(@Size(max=150) String tecnico,Long obraOrigemId,Long obraDestinoId,@Size(max=4000) String observacao,@Size(max=200) List<@Valid MaterialRequisicao> materiais) {}
    public record AtendimentoOrigem(Long obraOrigemId,@NotEmpty @Size(max=200) List<@Valid MaterialRequisicao> materiais) {}
    public record Distribuicao(@NotEmpty @Size(max=200) List<@Valid AtendimentoOrigem> atendimentos) {}
    public record Resposta(Long id,Long solicitacaoPaiId,String tipo,String status,String solicitante,String tecnico,Long obraOrigemId,Long obraDestinoId,LocalDate dataSolicitacao,LocalDate dataDecisao,OffsetDateTime transitoEm,OffsetDateTime concluidaEm,String observacao,List<MaterialResposta> materiais) {}
}
