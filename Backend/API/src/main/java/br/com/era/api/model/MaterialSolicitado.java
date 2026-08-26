package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="materiais_solicitados")
public class MaterialSolicitado {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitacao_id") private Solicitacao solicitacao;
    @Column(nullable=false,length=180) private String nome; @Column(nullable=false) private Integer quantidade; @Column(length=120) private String identificacao;
    @Column(name="quantidade_compra",nullable=false) private Integer quantidadeCompra=0; @Column(name="compra_solicitada_em") private OffsetDateTime compraSolicitadaEm;
    protected MaterialSolicitado() {} public MaterialSolicitado(String nome,Integer quantidade,String identificacao){this.nome=nome;this.quantidade=quantidade;this.identificacao=identificacao;}
    public Long getId(){return id;} public String getNome(){return nome;} public Integer getQuantidade(){return quantidade;} public String getIdentificacao(){return identificacao;} public void setSolicitacao(Solicitacao v){solicitacao=v;}
    public Integer getQuantidadeCompra(){return quantidadeCompra;} public OffsetDateTime getCompraSolicitadaEm(){return compraSolicitadaEm;}
    public void solicitarCompra(int quantidade){quantidadeCompra=quantidade;compraSolicitadaEm=quantidade>0?OffsetDateTime.now():null;}
}
