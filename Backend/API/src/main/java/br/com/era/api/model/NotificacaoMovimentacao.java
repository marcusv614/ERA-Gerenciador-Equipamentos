package br.com.era.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.List;

@Entity @Table(name="notificacoes_movimentacao")
public class NotificacaoMovimentacao {
    @Column(nullable=false,length=50) private String tipo="ENVIO";
    @Column(columnDefinition="text") private String mensagem;
    public String getTipo(){return tipo;} public String getMensagem(){return mensagem;}
    public void renovar(String mensagem){this.mensagem=mensagem;criadaEm=OffsetDateTime.now();lidaEm=null;}
    public NotificacaoMovimentacao(Usuario usuario,Solicitacao pedido,String tipo,String mensagem){
        this.usuario=usuario;solicitacao=pedido;perfil=usuario.getPerfil();this.tipo=tipo;this.mensagem=mensagem;
        obra=pedido.getObraDestino()!=null?pedido.getObraDestino():pedido.getObraOrigem();
        obraNome=obra.getNome();destinatario=perfil.ehProfissionalDeCampo();criadaEm=OffsetDateTime.now();
        materiais=pedido.getMateriais().stream().map(m->new Item(m.getNome(),m.getQuantidade())).toList();
    }
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="usuario_id") private Usuario usuario;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="obra_id") private Obra obra;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="solicitacao_id") private Solicitacao solicitacao;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) private PerfilUsuario perfil;
    @Column(name="obra_nome",nullable=false,length=180) private String obraNome;
    @Column(nullable=false) private boolean destinatario;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private List<Item> materiais;
    @Column(name="criada_em",nullable=false) private OffsetDateTime criadaEm;
    @Column(name="lida_em") private OffsetDateTime lidaEm;
    public record Item(String nome,Integer quantidade) {}
    protected NotificacaoMovimentacao() {}
    public NotificacaoMovimentacao(Usuario usuario,Solicitacao solicitacao) {
        this.usuario=usuario;this.solicitacao=solicitacao;obra=solicitacao.getObraDestino();perfil=usuario.getPerfil();
        obraNome=obra.getNome();destinatario=perfil.ehProfissionalDeCampo()&&usuario.getFuncionario()!=null&&usuario.getFuncionario().getId().equals(solicitacao.getTecnico().getId());
        materiais=solicitacao.getMateriais().stream().map(m->new Item(m.getNome(),m.getQuantidade())).toList();
        criadaEm=solicitacao.getTransitoEm();
    }
    public Long getId(){return id;} public Long getSolicitacaoId(){return solicitacao.getId();}
    public Long getObraId(){return obra.getId();} public String getObraNome(){return obraNome;}
    public boolean isDestinatario(){return destinatario;} public List<Item> getMateriais(){return materiais;}
    public OffsetDateTime getCriadaEm(){return criadaEm;} public OffsetDateTime getLidaEm(){return lidaEm;}
    public String getStatus(){return solicitacao.getStatus();}
    public void marcarLida(){if(lidaEm==null)lidaEm=OffsetDateTime.now();}
}
