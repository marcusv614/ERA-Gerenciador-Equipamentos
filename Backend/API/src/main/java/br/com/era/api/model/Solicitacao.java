package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="solicitacoes")
public class Solicitacao {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=40) private String tipo; @Column(nullable=false,length=30) private String status="Pendente";
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitante_id") private Funcionario solicitante;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="tecnico_id") private Funcionario tecnico;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_origem_id") private Obra obraOrigem; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_destino_id") private Obra obraDestino;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="solicitacao_pai_id") private Solicitacao solicitacaoPai;
    @Column(name="data_solicitacao",nullable=false) private LocalDate dataSolicitacao; @Column(name="data_decisao") private LocalDate dataDecisao; @Column(columnDefinition="text") private String observacao;
    @Column(name="transito_em") private OffsetDateTime transitoEm; @Column(name="concluida_em") private OffsetDateTime concluidaEm;
    @OneToMany(mappedBy="solicitacao",cascade=CascadeType.ALL,orphanRemoval=true) private List<MaterialSolicitado> materiais=new ArrayList<>();
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm; @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Solicitacao() {} @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Funcionario getSolicitante(){return solicitante;} public void setSolicitante(Funcionario v){solicitante=v;} public Funcionario getTecnico(){return tecnico;} public void setTecnico(Funcionario v){tecnico=v;} public Obra getObraOrigem(){return obraOrigem;} public void setObraOrigem(Obra v){obraOrigem=v;} public Obra getObraDestino(){return obraDestino;} public void setObraDestino(Obra v){obraDestino=v;} public LocalDate getDataSolicitacao(){return dataSolicitacao;} public void setDataSolicitacao(LocalDate v){dataSolicitacao=v;} public LocalDate getDataDecisao(){return dataDecisao;} public void setDataDecisao(LocalDate v){dataDecisao=v;} public String getObservacao(){return observacao;} public void setObservacao(String v){observacao=v;} public List<MaterialSolicitado> getMateriais(){return materiais;} public void substituirMateriais(List<MaterialSolicitado> novos){materiais.clear();novos.forEach(m->{m.setSolicitacao(this);materiais.add(m);});}
    public Solicitacao getSolicitacaoPai(){return solicitacaoPai;} public void setSolicitacaoPai(Solicitacao v){solicitacaoPai=v;}
    public OffsetDateTime getTransitoEm(){return transitoEm;} public void setTransitoEm(OffsetDateTime v){transitoEm=v;} public OffsetDateTime getConcluidaEm(){return concluidaEm;} public void setConcluidaEm(OffsetDateTime v){concluidaEm=v;}
}
