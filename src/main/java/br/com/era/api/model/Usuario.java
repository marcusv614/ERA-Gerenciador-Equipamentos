package br.com.era.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name = "usuarios")
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @OneToOne(fetch = FetchType.LAZY) @JoinColumn(name = "funcionario_id", unique = true) private Funcionario funcionario;
    @Column(nullable = false, length = 150) private String nome;
    @Column(nullable = false, unique = true, length = 120) private String login;
    @Column(name = "senha_hash", nullable = false) private String senhaHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 30) private PerfilUsuario perfil;
    @Column(nullable = false) private boolean ativo = true;
    @Column(name = "deve_alterar_senha", nullable = false) private boolean deveAlterarSenha = true;
    @Column(name = "tentativas_falhas", nullable = false) private int tentativasFalhas;
    @Column(name = "bloqueado_ate") private OffsetDateTime bloqueadoAte;
    @Column(name = "ultimo_login") private OffsetDateTime ultimoLogin;
    @Column(name = "senha_alterada_em") private OffsetDateTime senhaAlteradaEm;
    @Column(name = "criado_em", nullable = false) private OffsetDateTime criadoEm;
    @Column(name = "atualizado_em", nullable = false) private OffsetDateTime atualizadoEm;
    public Usuario() {}
    @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public Funcionario getFuncionario(){return funcionario;} public void setFuncionario(Funcionario v){funcionario=v;}
    public String getNome(){return nome;} public void setNome(String v){nome=v;} public String getLogin(){return login;} public void setLogin(String v){login=v;}
    public String getSenhaHash(){return senhaHash;} public void setSenhaHash(String v){senhaHash=v;} public PerfilUsuario getPerfil(){return perfil;} public void setPerfil(PerfilUsuario v){perfil=v;}
    public boolean isAtivo(){return ativo;} public void setAtivo(boolean v){ativo=v;} public boolean isDeveAlterarSenha(){return deveAlterarSenha;} public void setDeveAlterarSenha(boolean v){deveAlterarSenha=v;}
    public int getTentativasFalhas(){return tentativasFalhas;} public void setTentativasFalhas(int v){tentativasFalhas=v;} public OffsetDateTime getBloqueadoAte(){return bloqueadoAte;} public void setBloqueadoAte(OffsetDateTime v){bloqueadoAte=v;}
    public OffsetDateTime getUltimoLogin(){return ultimoLogin;} public void setUltimoLogin(OffsetDateTime v){ultimoLogin=v;} public OffsetDateTime getSenhaAlteradaEm(){return senhaAlteradaEm;} public void setSenhaAlteradaEm(OffsetDateTime v){senhaAlteradaEm=v;}
}
