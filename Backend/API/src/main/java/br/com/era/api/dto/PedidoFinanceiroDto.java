package br.com.era.api.dto;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
public final class PedidoFinanceiroDto {
    private PedidoFinanceiroDto() {}
    public record Material(String nome,String catalogoChave,long quantidadeSolicitada,long quantidadeCompra,long quantidadeAdquirida) {}
    public record Decisao(String tipo,String autorNome,String autorLogin,OffsetDateTime registradoEm,String descricao) {}
    public record Resposta(Long id,String tecnico,String solicitante,String solicitanteLogin,String solicitantePerfil,Long obraDestinoId,String obra,LocalDate dataSolicitacao,String status,String observacao,List<Material> materiais,List<Decisao> decisoes,List<SolicitacaoDto.Resposta> analises) {}
}
