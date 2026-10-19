package br.com.era.api.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

@Entity @Table(name="manutencoes_equipamentos")
public class ManutencaoEquipamento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="equipamento_id") private Equipamento equipamento;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_id") private Obra obra;
    @Column(nullable=false) private int quantidade;
    @Column(nullable=false,length=4000) private String motivo;
    @Column(nullable=false,length=180) private String modelo;
    @Column(nullable=false,length=120) private String serie;
    @Column(nullable=false,length=180) private String local;
    @Column(length=150) private String tecnico;
    @Column(name="aberta_em") private OffsetDateTime abertaEm;
    @Column(name="aberta_por_nome",length=150) private String abertaPorNome;
    @Column(name="aberta_por_login",length=120) private String abertaPorLogin;
    @Column(name="concluida_em") private OffsetDateTime concluidaEm;
    @Column(name="concluida_por_nome",length=150) private String concluidaPorNome;
    @Column(name="concluida_por_login",length=120) private String concluidaPorLogin;
    @Column(name="observacao_conclusao",length=4000) private String observacaoConclusao;
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm;
    protected ManutencaoEquipamento() {}
    public ManutencaoEquipamento(Equipamento e,int quantidade,String motivo,Usuario autor) {
        equipamento=e;obra=e.getObra();this.quantidade=quantidade;this.motivo=motivo.trim();modelo=e.getModelo();serie=e.getSerie();
        local=obra==null?"Depósito central":obra.getNome();tecnico=e.getTecnico()==null?null:e.getTecnico().getNome();
        criadaAgora(autor);
    }
    private void criadaAgora(Usuario autor){criadoEm=OffsetDateTime.now();abertaEm=criadoEm;abertaPorNome=autor.getNome();abertaPorLogin=autor.getLogin();}
    public void concluir(String observacao,Usuario autor){observacaoConclusao=observacao.trim();concluidaEm=OffsetDateTime.now();concluidaPorNome=autor.getNome();concluidaPorLogin=autor.getLogin();}
    public boolean isAberta(){return concluidaEm==null;}
    public Long getId(){return id;} public Obra getObra(){return obra;} public int getQuantidade(){return quantidade;} public String getMotivo(){return motivo;}
    public String getModelo(){return modelo;} public String getSerie(){return serie;} public String getLocal(){return local;} public String getTecnico(){return tecnico;}
    public OffsetDateTime getAbertaEm(){return abertaEm;} public String getAbertaPorNome(){return abertaPorNome;} public String getAbertaPorLogin(){return abertaPorLogin;}
    public OffsetDateTime getConcluidaEm(){return concluidaEm;} public String getConcluidaPorNome(){return concluidaPorNome;} public String getConcluidaPorLogin(){return concluidaPorLogin;}
    public String getObservacaoConclusao(){return observacaoConclusao;}
}
