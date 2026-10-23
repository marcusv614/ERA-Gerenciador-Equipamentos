package br.com.era.api.model;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
@Entity @Table(name="solicitacoes")
public class Solicitacao {
    public record AquisicaoAuditada(Long equipamentoId,String material,String catalogoChave,int quantidade,String notaFiscal,String fornecedor,OffsetDateTime registradaEm,String autorNome,String autorLogin) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="aquisicoes_auditadas",nullable=false,columnDefinition="jsonb") private List<AquisicaoAuditada> aquisicoesAuditadas=new ArrayList<>();
    public List<AquisicaoAuditada> getAquisicoesAuditadas(){return aquisicoesAuditadas;}
    public void registrarAquisicaoAuditada(Equipamento e,String nome,String chave,int quantidade,String nota,Usuario autor){
        aquisicoesAuditadas=new ArrayList<>(aquisicoesAuditadas);aquisicoesAuditadas.add(new AquisicaoAuditada(e.getId(),nome,chave,quantidade,nota,e.getFornecedor(),OffsetDateTime.now(),autor==null?null:autor.getNome(),autor==null?null:autor.getLogin()));
    }
    public OffsetDateTime getCriadoEm(){return criadoEm;}
    @Column(name="status_antes_cancelamento") private String statusAntesCancelamento;
    @Column(name="financeiro_cancelamento_confirmado",nullable=false) private boolean financeiroCancelamentoConfirmado;
    @Column(name="estoque_cancelamento_confirmado",nullable=false) private boolean estoqueCancelamentoConfirmado;
    @Column(name="motivo_cancelamento") private String motivoCancelamento;
    public String getStatusAntesCancelamento(){return statusAntesCancelamento;}
    public void setStatusAntesCancelamento(String v){statusAntesCancelamento=v;}
    public boolean isFinanceiroCancelamentoConfirmado(){return financeiroCancelamentoConfirmado;}
    public void setFinanceiroCancelamentoConfirmado(boolean v){financeiroCancelamentoConfirmado=v;}
    public boolean isEstoqueCancelamentoConfirmado(){return estoqueCancelamentoConfirmado;}
    public void setEstoqueCancelamentoConfirmado(boolean v){estoqueCancelamentoConfirmado=v;}
    public String getMotivoCancelamento(){return motivoCancelamento;}
    public void setMotivoCancelamento(String v){motivoCancelamento=v;}
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=40) private String tipo; @Column(nullable=false,length=30) private String status="Pendente";
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="solicitante_id") private Funcionario solicitante;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="solicitante_usuario_id") private Usuario solicitanteUsuario;
    @Column(name="solicitante_nome",length=150) private String solicitanteNome;
    @Column(name="solicitante_login",length=120) private String solicitanteLogin;
    @Enumerated(EnumType.STRING) @Column(name="solicitante_perfil",length=30) private PerfilUsuario solicitantePerfil;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="tecnico_id") private Funcionario tecnico;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_origem_id") private Obra obraOrigem; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_destino_id") private Obra obraDestino;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="solicitacao_pai_id") private Solicitacao solicitacaoPai;
    @Column(name="data_solicitacao",nullable=false) private LocalDate dataSolicitacao; @Column(name="data_decisao") private LocalDate dataDecisao; @Column(columnDefinition="text") private String observacao;
    @Column(name="transito_em") private OffsetDateTime transitoEm; @Column(name="concluida_em") private OffsetDateTime concluidaEm;
    @OneToMany(mappedBy="solicitacao",cascade=CascadeType.ALL,orphanRemoval=true) private List<MaterialSolicitado> materiais=new ArrayList<>();
    public record Compra(Long id,String nome,Integer quantidade,String identificacao,String catalogoChave,Integer quantidadeCompra,OffsetDateTime compraSolicitadaEm,Integer quantidadeAdquirida,Integer quantidadeEntradaEstoque,OffsetDateTime adquiridaEm) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="compras",nullable=false,columnDefinition="jsonb") private List<Compra> compras=new ArrayList<>();
    public record OrigemPlanejada(Long equipamentoId,String identificacao,Long obraOrigemId,Integer quantidade,String catalogoChave,String nome) {}
    public record ItemPlano(Long materialId,String nome,String catalogoChave,Integer quantidade,Integer quantidadeCompra,String justificativa,List<OrigemPlanejada> origens) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="plano_financeiro",nullable=false,columnDefinition="jsonb") private List<ItemPlano> planoFinanceiro=new ArrayList<>();
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="entradas_compra",nullable=false,columnDefinition="jsonb") private List<OrigemPlanejada> entradasCompra=new ArrayList<>();
    @Column(name="reservas_plano_ativas",nullable=false) private boolean reservasPlanoAtivas;
    @Column(name="movimentacao_direta",nullable=false) private boolean movimentacaoDireta;
    public List<ItemPlano> getPlanoFinanceiro(){return planoFinanceiro;}
    public void setPlanoFinanceiro(List<ItemPlano> plano){planoFinanceiro=new ArrayList<>(plano);}
    public List<OrigemPlanejada> getEntradasCompra(){return entradasCompra;}
    public void setEntradasCompra(List<OrigemPlanejada> entradas){entradasCompra=new ArrayList<>(entradas);}
    public record MaterialOriginal(String nome,String catalogoChave,Integer quantidade) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="materiais_originais",nullable=false,columnDefinition="jsonb") private List<MaterialOriginal> materiaisOriginais=new ArrayList<>();
    public List<MaterialOriginal> getMateriaisOriginais(){return materiaisOriginais;}
    public void preservarPedidoOriginal(){if(materiaisOriginais.isEmpty())materiaisOriginais=materiais.stream().map(m->new MaterialOriginal(m.getNome(),m.getCatalogoChave(),m.getQuantidade())).toList();}
    public void copiarPedidoOriginalDe(Solicitacao origem){materiaisOriginais=new ArrayList<>(origem.getMateriaisOriginais());}
    public void adicionarEntradaCompra(OrigemPlanejada entrada){entradasCompra=new ArrayList<>(entradasCompra);entradasCompra.add(entrada);}
    public boolean isReservasPlanoAtivas(){return reservasPlanoAtivas;} public void setReservasPlanoAtivas(boolean valor){reservasPlanoAtivas=valor;}
    public boolean isMovimentacaoDireta(){return movimentacaoDireta;} public void setMovimentacaoDireta(boolean valor){movimentacaoDireta=valor;}
    public record EventoFinanceiro(String tipo,String descricao,String autorNome,String autorLogin,OffsetDateTime registradoEm) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(name="eventos_financeiros",nullable=false,columnDefinition="jsonb") private List<EventoFinanceiro> eventosFinanceiros=new ArrayList<>();
    public List<Compra> getCompras(){return compras;}
    public List<EventoFinanceiro> getEventosFinanceiros(){return eventosFinanceiros;}
    public void registrarEventoFinanceiro(String tipo,String descricao,Usuario autor){
        eventosFinanceiros=new ArrayList<>(eventosFinanceiros);
        eventosFinanceiros.add(new EventoFinanceiro(tipo,descricao,autor.getNome(),autor.getLogin(),OffsetDateTime.now()));
    }
    public void copiarEventosFinanceirosDe(Solicitacao origem){eventosFinanceiros=new ArrayList<>(origem.getEventosFinanceiros());}
    public void preservarCompras(){if(compras.isEmpty())compras=materiais.stream().filter(m->m.getQuantidadeCompra()>0).map(m->new Compra(m.getId(),m.getNome(),m.getQuantidade(),m.getIdentificacao(),m.getCatalogoChave(),m.getQuantidadeCompra(),m.getCompraSolicitadaEm(),m.getQuantidadeAdquirida(),m.getQuantidadeEntradaEstoque(),m.getAdquiridaEm())).toList();}
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm; @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Solicitacao() {} @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Funcionario getSolicitante(){return solicitante;} public void setSolicitante(Funcionario v){solicitante=v;} public Funcionario getTecnico(){return tecnico;} public void setTecnico(Funcionario v){tecnico=v;} public Obra getObraOrigem(){return obraOrigem;} public void setObraOrigem(Obra v){obraOrigem=v;} public Obra getObraDestino(){return obraDestino;} public void setObraDestino(Obra v){obraDestino=v;} public LocalDate getDataSolicitacao(){return dataSolicitacao;} public void setDataSolicitacao(LocalDate v){dataSolicitacao=v;} public LocalDate getDataDecisao(){return dataDecisao;} public void setDataDecisao(LocalDate v){dataDecisao=v;} public String getObservacao(){return observacao;} public void setObservacao(String v){observacao=v;} public List<MaterialSolicitado> getMateriais(){return materiais;} public void substituirMateriais(List<MaterialSolicitado> novos){materiais.clear();novos.forEach(m->{m.setSolicitacao(this);materiais.add(m);});}
    public Solicitacao getSolicitacaoPai(){return solicitacaoPai;} public void setSolicitacaoPai(Solicitacao v){solicitacaoPai=v;}
    public Usuario getSolicitanteUsuario(){return solicitanteUsuario;} public void setSolicitanteUsuario(Usuario v){solicitanteUsuario=v;}
    public String getSolicitanteNome(){return solicitanteNome;} public void setSolicitanteNome(String v){solicitanteNome=v;}
    public String getSolicitanteLogin(){return solicitanteLogin;} public void setSolicitanteLogin(String v){solicitanteLogin=v;}
    public PerfilUsuario getSolicitantePerfil(){return solicitantePerfil;} public void setSolicitantePerfil(PerfilUsuario v){solicitantePerfil=v;}
    public String nomeSolicitante(){return solicitanteNome!=null&&!solicitanteNome.isBlank()?solicitanteNome:solicitante==null?"Não registrado":solicitante.getNome();}
    public OffsetDateTime getTransitoEm(){return transitoEm;} public void setTransitoEm(OffsetDateTime v){transitoEm=v;} public OffsetDateTime getConcluidaEm(){return concluidaEm;} public void setConcluidaEm(OffsetDateTime v){concluidaEm=v;}
}
