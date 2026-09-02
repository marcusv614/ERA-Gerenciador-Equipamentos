package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="materiais_solicitados")
public class MaterialSolicitado {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitacao_id") private Solicitacao solicitacao;
    @Column(nullable=false,length=180) private String nome; @Column(nullable=false) private Integer quantidade; @Column(length=120) private String identificacao; @Column(name="catalogo_chave",length=500) private String catalogoChave;
    @Column(name="quantidade_compra",nullable=false) private Integer quantidadeCompra=0; @Column(name="compra_solicitada_em") private OffsetDateTime compraSolicitadaEm;
    @Column(name="quantidade_adquirida",nullable=false) private Integer quantidadeAdquirida=0; @Column(name="adquirida_em") private OffsetDateTime adquiridaEm;
    protected MaterialSolicitado() {} public MaterialSolicitado(String nome,Integer quantidade,String identificacao,String catalogoChave){this.nome=nome;this.quantidade=quantidade;this.identificacao=identificacao;this.catalogoChave=catalogoChave;}
    public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public Integer getQuantidade(){return quantidade;} public String getIdentificacao(){return identificacao;} public String getCatalogoChave(){return catalogoChave;} public void setSolicitacao(Solicitacao v){solicitacao=v;}
    public Integer getQuantidadeCompra(){return quantidadeCompra;} public OffsetDateTime getCompraSolicitadaEm(){return compraSolicitadaEm;}
    public Integer getQuantidadeAdquirida(){return quantidadeAdquirida;} public OffsetDateTime getAdquiridaEm(){return adquiridaEm;}
    public void solicitarCompra(int quantidade){quantidadeCompra=quantidade;quantidadeAdquirida=Math.min(quantidadeAdquirida,quantidade);compraSolicitadaEm=quantidade>0?OffsetDateTime.now():null;if(quantidadeAdquirida<quantidade)adquiridaEm=null;}
    public void registrarAquisicao(int quantidade){quantidadeAdquirida+=quantidade;adquiridaEm=OffsetDateTime.now();}
}
