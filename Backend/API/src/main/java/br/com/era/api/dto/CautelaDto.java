package br.com.era.api.dto;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
public final class CautelaDto {
    private CautelaDto(){}
    public record Material(String nome,Integer quantidade,String identificacao){}
    public record Resposta(Long id,String numero,Long solicitacaoId,Long solicitacaoRaizId,String statusMovimentacao,OffsetDateTime emitidaEm,String emitidaPor,String origemNome,String destinoNome,String solicitanteNome,String tecnicoNome,LocalDate dataSolicitacao,String observacao,List<Material> materiais){}
}
