package br.com.era.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

@Entity @Table(name="auditorias_tecnicos")
public class AuditoriaTecnico {
    public record Item(Long equipamentoId,Long obraId,String tipo,String modelo,String serie,String medida,String local,int quantidade,int bom,int avaria,int quebrado,String observacao) {}
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Version @Column(nullable=false) private Long versao=0L;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="funcionario_id") private Funcionario funcionario;
    @Column(name="tecnico_nome",nullable=false,length=150) private String tecnicoNome;
    @Column(nullable=false,length=20) private String status="ABERTA";
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm=OffsetDateTime.now();
    @Column(name="criado_por_nome",nullable=false,length=150) private String criadoPorNome;
    @Column(name="criado_por_login",nullable=false,length=120) private String criadoPorLogin;
    @Column(name="data_vistoria") private LocalDate dataVistoria;
    @Column(length=150) private String fiscal;
    @Column(columnDefinition="text") private String observacoes;
    @Column(name="registrado_por_nome",length=150) private String registradoPorNome;
    @Column(name="registrado_por_login",length=120) private String registradoPorLogin;
    @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm=criadoEm;
    @Column(name="concluida_em") private OffsetDateTime concluidaEm;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private List<Item> itens;
    public AuditoriaTecnico() {}
    public AuditoriaTecnico(Funcionario tecnico,Usuario autor,List<Item> itens) {
        funcionario=tecnico;tecnicoNome=tecnico.getNome();criadoPorNome=autor.getNome();criadoPorLogin=autor.getLogin();this.itens=List.copyOf(itens);
    }
    public void registrar(LocalDate data,String fiscal,String observacoes,List<Item> itens,Usuario autor,boolean concluir) {
        dataVistoria=data;this.fiscal=fiscal;this.observacoes=observacoes;this.itens=List.copyOf(itens);
        registradoPorNome=autor.getNome();registradoPorLogin=autor.getLogin();atualizadoEm=OffsetDateTime.now();
        if(concluir){status="CONCLUIDA";concluidaEm=atualizadoEm;}
    }
    public Long getId(){return id;} public Long getVersao(){return versao;} public Funcionario getFuncionario(){return funcionario;}
    public String getTecnicoNome(){return tecnicoNome;} public String getStatus(){return status;} public OffsetDateTime getCriadoEm(){return criadoEm;}
    public String getCriadoPorNome(){return criadoPorNome;} public String getCriadoPorLogin(){return criadoPorLogin;}
    public LocalDate getDataVistoria(){return dataVistoria;} public String getFiscal(){return fiscal;} public String getObservacoes(){return observacoes;}
    public String getRegistradoPorNome(){return registradoPorNome;} public String getRegistradoPorLogin(){return registradoPorLogin;}
    public OffsetDateTime getAtualizadoEm(){return atualizadoEm;} public OffsetDateTime getConcluidaEm(){return concluidaEm;} public List<Item> getItens(){return itens;}
}
