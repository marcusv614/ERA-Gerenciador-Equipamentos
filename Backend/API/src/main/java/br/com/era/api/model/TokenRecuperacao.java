package br.com.era.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name="recuperacao_tokens")
public class TokenRecuperacao {
    public enum Finalidade { CONFIRMAR_EMAIL, REDEFINIR_SENHA }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="usuario_id", nullable=false) private Long usuarioId;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private Finalidade finalidade;
    @Column(nullable=false, length=254) private String email;
    @Column(name="token_hash", nullable=false, unique=true, length=64) private String tokenHash;
    @Column(name="versao_sessao", nullable=false) private long versaoSessao;
    @Column(name="criado_em", nullable=false) private OffsetDateTime criadoEm;
    @Column(name="expira_em", nullable=false) private OffsetDateTime expiraEm;
    @Column(name="usado_em") private OffsetDateTime usadoEm;
    @Column(nullable=false) private int tentativas;
    protected TokenRecuperacao() {}
    public TokenRecuperacao(Usuario usuario,Finalidade finalidade,String email,String hash,OffsetDateTime agora) {
        this.usuarioId=usuario.getId();this.versaoSessao=usuario.getVersaoSessao();this.finalidade=finalidade;
        this.email=email;this.tokenHash=hash;this.criadoEm=agora;this.expiraEm=agora.plusMinutes(15);
    }
    public Long getUsuarioId(){return usuarioId;}
    public String getEmail(){return email;}
    public String getTokenHash(){return tokenHash;}
    public long getVersaoSessao(){return versaoSessao;}
    public Finalidade getFinalidade(){return finalidade;}
    public OffsetDateTime getCriadoEm(){return criadoEm;}
    public boolean valido(OffsetDateTime agora){return usadoEm==null&&tentativas<5&&expiraEm.isAfter(agora);}
    public void consumir(OffsetDateTime agora){usadoEm=agora;}
    public void registrarFalha(){tentativas=Math.min(5,tentativas+1);}
}
