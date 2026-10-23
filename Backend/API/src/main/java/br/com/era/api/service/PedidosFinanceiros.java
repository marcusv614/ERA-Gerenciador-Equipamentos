package br.com.era.api.service;
import br.com.era.api.dto.PedidoFinanceiroDto;
import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.model.Solicitacao;
import java.util.*;
import java.util.function.Function;
/** Consolida pedidos e compras, sem histórico físico dos atendimentos. */
public final class PedidosFinanceiros {
    private PedidosFinanceiros() {}
    public static List<PedidoFinanceiroDto.Resposta> consolidar(List<Solicitacao> registros,Function<Solicitacao,SolicitacaoDto.Resposta> analise) {
        return consolidar(registros,analise,false);
    }
    public static List<PedidoFinanceiroDto.Resposta> consolidar(List<Solicitacao> registros,Function<Solicitacao,SolicitacaoDto.Resposta> analise,boolean rh) {
        Map<Long,List<Solicitacao>> grupos=new LinkedHashMap<>();
        for(var pedido:registros)grupos.computeIfAbsent(raiz(pedido).getId(),id->new ArrayList<>()).add(pedido);
        return grupos.values().stream().map(grupo->resumir(grupo,analise,rh)).sorted(Comparator.comparing(PedidoFinanceiroDto.Resposta::dataSolicitacao,Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(PedidoFinanceiroDto.Resposta::id,Comparator.reverseOrder())).toList();
    }
    private static Solicitacao raiz(Solicitacao pedido){while(pedido.getSolicitacaoPai()!=null)pedido=pedido.getSolicitacaoPai();return pedido;}
    private static String chave(String nome,String catalogo){return catalogo==null||catalogo.isBlank()?CatalogoChave.normalizar(nome):catalogo;}
    private static class Item {String nome,chave;long solicitada,compra,adquirida;Item(String nome,String chave){this.nome=nome;this.chave=chave;}}
    private static PedidoFinanceiroDto.Resposta resumir(List<Solicitacao> grupo,Function<Solicitacao,SolicitacaoDto.Resposta> analise,boolean rh) {
        var pedido=raiz(grupo.getFirst());Map<String,Item> itens=new LinkedHashMap<>();
        java.util.function.BiFunction<String,String,Item> item=(nome,catalogo)->itens.computeIfAbsent(chave(nome,catalogo),k->new Item(nome,k));
        if(!pedido.getMateriaisOriginais().isEmpty())pedido.getMateriaisOriginais().forEach(m->item.apply(m.nome(),m.catalogoChave()).solicitada+=m.quantidade());
        else grupo.forEach(p->p.getMateriais().forEach(m->item.apply(m.getNome(),m.getCatalogoChave()).solicitada+=m.getQuantidade()));
        Map<String,Solicitacao.Compra> compras=new LinkedHashMap<>();
        for(var p:grupo){var linhas=p.getCompras().isEmpty()?p.getMateriais().stream().filter(m->m.getQuantidadeCompra()>0).map(m->new Solicitacao.Compra(m.getId(),m.getNome(),m.getQuantidade(),null,m.getCatalogoChave(),m.getQuantidadeCompra(),m.getCompraSolicitadaEm(),m.getQuantidadeAdquirida(),m.getQuantidadeEntradaEstoque(),m.getAdquiridaEm())).toList():p.getCompras();
            int indice=0;for(var c:linhas){String id=c.id()==null?p.getId()+":"+indice++:"material:"+c.id();compras.merge(id,c,(a,b)->n(a.quantidadeAdquirida())>=n(b.quantidadeAdquirida())?a:b);}}
        compras.values().forEach(c->{var m=item.apply(c.nome(),c.catalogoChave());m.compra+=n(c.quantidadeCompra());m.adquirida+=n(c.quantidadeAdquirida());});
        var decisoes=grupo.stream().flatMap(p->p.getEventosFinanceiros().stream()).filter(e->e.tipo().startsWith("CANCELAMENTO")||Set.of("APROVACAO_INICIAL","APROVACAO","REJEICAO","ALTERACAO","REVISAO_PLANO").contains(e.tipo())).map(e->new PedidoFinanceiroDto.Decisao(e.tipo(),e.autorNome(),e.autorLogin(),e.registradoEm())).distinct().sorted(Comparator.comparing(PedidoFinanceiroDto.Decisao::registradoEm,Comparator.nullsFirst(Comparator.naturalOrder()))).toList();
        String status=grupo.stream().anyMatch(p->"Cancelamento solicitado".equals(p.getStatus()))?"Cancelamento solicitado":grupo.stream().allMatch(p->"Cancelada".equals(p.getStatus()))?"Cancelada":rh&&grupo.stream().anyMatch(p->"Pendente".equals(p.getStatus()))?"Pendente":grupo.stream().anyMatch(p->"Aguardando financeiro".equals(p.getStatus()))?"Aguardando financeiro":"Rejeitada".equals(pedido.getStatus())?"Rejeitada":rh&&grupo.stream().allMatch(p->Set.of("Concluída","Cancelada").contains(p.getStatus()))?"Concluída":"Aprovada";
        return new PedidoFinanceiroDto.Resposta(pedido.getId(),pedido.getTecnico().getNome(),pedido.nomeSolicitante(),pedido.getSolicitanteLogin(),pedido.getSolicitantePerfil()==null?null:pedido.getSolicitantePerfil().name(),pedido.getObraDestino()==null?null:pedido.getObraDestino().getId(),pedido.getObraDestino()==null?"Depósito central":pedido.getObraDestino().getNome(),pedido.getDataSolicitacao(),status,pedido.getObservacao(),itens.values().stream().map(m->new PedidoFinanceiroDto.Material(m.nome,m.chave,m.solicitada,m.compra,m.adquirida)).toList(),decisoes,grupo.stream().filter(p->rh||permiteAnalise(p)||"Cancelamento solicitado".equals(p.getStatus())||"Cancelada".equals(p.getStatus())||"Em trânsito".equals(p.getStatus())).map(analise).toList());
    }
    public static boolean permiteAnalise(Solicitacao pedido){return "Aguardando financeiro".equals(pedido.getStatus())||("Aprovada".equals(pedido.getStatus())&&pedido.getMateriais().stream().allMatch(m->m.getIdentificacao()==null||m.getIdentificacao().isBlank()));}
    private static long n(Integer valor){return valor==null?0:valor;}
}
