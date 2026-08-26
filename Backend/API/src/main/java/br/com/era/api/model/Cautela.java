package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="cautelas")
public class Cautela {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(unique=true,length=40) private String numero;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitacao_id") private Solicitacao solicitacao;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitacao_raiz_id") private Solicitacao solicitacaoRaiz;
    @Column(nullable=false,length=20) private String tipo; @Column(nullable=false) private Integer versao=1;
    @Column(name="status_movimentacao",nullable=false,length=30) private String statusMovimentacao;
    @Column(name="emitida_em",nullable=false) private OffsetDateTime emitidaEm; @Column(name="emitida_por",nullable=false,length=150) private String emitidaPor;
    @Column(name="origem_nome",nullable=false,length=180) private String origemNome; @Column(name="destino_nome",nullable=false,length=180) private String destinoNome;
    @Column(name="solicitante_nome",nullable=false,length=150) private String solicitanteNome; @Column(name="tecnico_nome",nullable=false,length=150) private String tecnicoNome;
    @Column(name="data_solicitacao",nullable=false) private LocalDate dataSolicitacao; @Column(columnDefinition="text") private String observacao;
    @OneToMany(mappedBy="cautela",cascade=CascadeType.ALL,orphanRemoval=true) private List<CautelaMaterial> materiais=new ArrayList<>();
    public Long getId(){return id;} public String getNumero(){return numero;} public void setNumero(String v){numero=v;} public Solicitacao getSolicitacao(){return solicitacao;} public void setSolicitacao(Solicitacao v){solicitacao=v;} public Solicitacao getSolicitacaoRaiz(){return solicitacaoRaiz;} public void setSolicitacaoRaiz(Solicitacao v){solicitacaoRaiz=v;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public Integer getVersao(){return versao;} public String getStatusMovimentacao(){return statusMovimentacao;} public void setStatusMovimentacao(String v){statusMovimentacao=v;} public OffsetDateTime getEmitidaEm(){return emitidaEm;} public void setEmitidaEm(OffsetDateTime v){emitidaEm=v;} public String getEmitidaPor(){return emitidaPor;} public void setEmitidaPor(String v){emitidaPor=v;} public String getOrigemNome(){return origemNome;} public void setOrigemNome(String v){origemNome=v;} public String getDestinoNome(){return destinoNome;} public void setDestinoNome(String v){destinoNome=v;} public String getSolicitanteNome(){return solicitanteNome;} public void setSolicitanteNome(String v){solicitanteNome=v;} public String getTecnicoNome(){return tecnicoNome;} public void setTecnicoNome(String v){tecnicoNome=v;} public LocalDate getDataSolicitacao(){return dataSolicitacao;} public void setDataSolicitacao(LocalDate v){dataSolicitacao=v;} public String getObservacao(){return observacao;} public void setObservacao(String v){observacao=v;} public List<CautelaMaterial> getMateriais(){return materiais;} public void adicionarMaterial(CautelaMaterial m){m.setCautela(this);materiais.add(m);}
}
