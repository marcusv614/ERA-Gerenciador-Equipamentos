package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;
@Entity @Table(name="obras")
public class Obra {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=180) private String nome;
    @Column(nullable=false,length=150) private String cliente;
    @Column(nullable=false,length=150) private String cidade;
    @Column(nullable=false) private LocalDate inicio;
    @Column(nullable=false,length=40) private String status;
    @Column(nullable=false) private boolean arquivado=false; @Column(name="arquivado_em") private OffsetDateTime arquivadoEm; @Column(name="arquivado_por",length=120) private String arquivadoPor;
    @ManyToMany(fetch=FetchType.LAZY) @JoinTable(name="obra_responsaveis",joinColumns=@JoinColumn(name="obra_id"),inverseJoinColumns=@JoinColumn(name="funcionario_id")) private Set<Funcionario> responsaveis=new LinkedHashSet<>();
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm; @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Obra() {} @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getCliente(){return cliente;} public void setCliente(String v){cliente=v;} public String getCidade(){return cidade;} public void setCidade(String v){cidade=v;} public LocalDate getInicio(){return inicio;} public void setInicio(LocalDate v){inicio=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Set<Funcionario> getResponsaveis(){return responsaveis;} public void setResponsaveis(Set<Funcionario> v){responsaveis=v;} public boolean isArquivado(){return arquivado;} public void definirArquivamento(boolean v,String autor){arquivado=v;arquivadoEm=v?OffsetDateTime.now():null;arquivadoPor=v?autor:null;}
}
