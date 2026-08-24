package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
@Entity @Table(name="funcionarios")
public class Funcionario {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=150) private String nome;
    @Column(nullable=false,length=100) private String cargo;
    @Column(nullable=false,unique=true,length=180) private String email;
    @Column(length=30) private String telefone;
    @Column(nullable=false,length=30) private String status="Ativo";
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm;
    @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Funcionario() {}
    @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now(); atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getCargo(){return cargo;} public void setCargo(String v){cargo=v;} public String getEmail(){return email;} public void setEmail(String v){email=v;} public String getTelefone(){return telefone;} public void setTelefone(String v){telefone=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
}
