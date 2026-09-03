package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
@Entity @Table(name="movimentacoes")
public class Movimentacao {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="equipamento_id") private Equipamento equipamento;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="solicitacao_id") private Solicitacao solicitacao;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_origem_id") private Obra obraOrigem; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_destino_id") private Obra obraDestino; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tecnico_id") private Funcionario tecnico;
    @Column(nullable=false,length=40) private String status; @Column(nullable=false) private Integer quantidade; @Column(name="data_movimentacao",nullable=false) private LocalDate dataMovimentacao; @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm;
    @Column(nullable=false) private boolean ativa=true; @Column(name="cancelada_em") private OffsetDateTime canceladaEm;
    public Movimentacao() {} @PrePersist void criarData(){criadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public Equipamento getEquipamento(){return equipamento;} public void setEquipamento(Equipamento v){equipamento=v;} public Solicitacao getSolicitacao(){return solicitacao;} public void setSolicitacao(Solicitacao v){solicitacao=v;} public Obra getObraOrigem(){return obraOrigem;} public void setObraOrigem(Obra v){obraOrigem=v;} public Obra getObraDestino(){return obraDestino;} public void setObraDestino(Obra v){obraDestino=v;} public Funcionario getTecnico(){return tecnico;} public void setTecnico(Funcionario v){tecnico=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Integer getQuantidade(){return quantidade;} public void setQuantidade(Integer v){quantidade=v;} public LocalDate getDataMovimentacao(){return dataMovimentacao;} public void setDataMovimentacao(LocalDate v){dataMovimentacao=v;}
    public boolean isAtiva(){return ativa;} public void reativar(){ativa=true;canceladaEm=null;} public void cancelar(){ativa=false;canceladaEm=OffsetDateTime.now();status="Cancelada";}
}
