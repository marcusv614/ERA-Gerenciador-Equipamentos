package br.com.era.api.model;
import jakarta.persistence.*;
@Entity @Table(name="cautela_materiais")
public class CautelaMaterial {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="cautela_id") private Cautela cautela;
    @Column(nullable=false,length=180) private String nome; @Column(nullable=false) private Integer quantidade; @Column(nullable=false,length=120) private String identificacao;
    protected CautelaMaterial(){} public CautelaMaterial(String nome,Integer quantidade,String identificacao){this.nome=nome;this.quantidade=quantidade;this.identificacao=identificacao;}
    public Long getId(){return id;} public void setCautela(Cautela v){cautela=v;} public String getNome(){return nome;} public Integer getQuantidade(){return quantidade;} public String getIdentificacao(){return identificacao;}
}
