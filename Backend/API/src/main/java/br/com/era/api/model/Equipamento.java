package br.com.era.api.model;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
@Entity @Table(name="equipamentos")
public class Equipamento {
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    @OneToMany(mappedBy="equipamento",cascade={CascadeType.PERSIST,CascadeType.MERGE}) @OrderBy("criadoEm DESC, id DESC")
    private List<CalibracaoEquipamento> calibracoes=new ArrayList<>();
    public List<CalibracaoEquipamento> getCalibracoes(){return calibracoes;}
    public int getQuantidadeCalibracao(){return calibracoes.stream().anyMatch(CalibracaoEquipamento::isAberta)?1:0;}
    public boolean isFluke(){return "fluke".equalsIgnoreCase(tipo)||String.valueOf(modelo).toLowerCase(java.util.Locale.ROOT).contains("fluke")||atributos.entrySet().stream().anyMatch(a->"marca".equalsIgnoreCase(a.getKey())&&"fluke".equalsIgnoreCase(a.getValue()));}
    private String statusCalibracao(){return calibracoes.stream().filter(CalibracaoEquipamento::isAberta).map(c->switch(c.getStatus()){case "EM_CALIBRACAO" -> "Em calibração";case "AGUARDANDO_ENVIO" -> "Aguardando calibração";default -> status;}).findFirst().orElse(status);}
    @org.hibernate.annotations.Fetch(org.hibernate.annotations.FetchMode.SUBSELECT)
    @OneToMany(mappedBy="equipamento",cascade={CascadeType.PERSIST,CascadeType.MERGE}) @OrderBy("criadoEm DESC, id DESC")
    private List<ManutencaoEquipamento> manutencoes=new ArrayList<>();
    public List<ManutencaoEquipamento> getManutencoes(){return manutencoes;}
    public int getQuantidadeManutencao(){return manutencoes.stream().filter(ManutencaoEquipamento::isAberta).mapToInt(ManutencaoEquipamento::getQuantidade).sum();}
    @Column(nullable=false) private boolean auditavel=false;
    public boolean isAuditavel(){return auditavel;} public void setAuditavel(boolean v){auditavel=v;}
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=40) private String tipo; @Column(nullable=false,length=180) private String modelo; @Column(nullable=false,unique=true,length=120) private String serie; @Column(nullable=false,length=40) private String status;
    @Column(length=100) private String medida; @Column(nullable=false) private Integer quantidade=1; @Column(name="quantidade_reservada",nullable=false) private Integer quantidadeReservada=0; @Column(name="controle_quantidade",nullable=false,length=20) private String controleQuantidade="INDIVIDUAL"; @Column(columnDefinition="text") private String observacoes; @Column(name="nota_fiscal",length=120) private String notaFiscal; @Column(length=180) private String fornecedor; @Column(name="data_compra") private LocalDate dataCompra;
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private Map<String,String> atributos=new LinkedHashMap<>();
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_id") private Obra obra; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tecnico_id") private Funcionario tecnico;
    @Column(name="data_entrada") private LocalDate dataEntrada; @Column(name="data_saida") private LocalDate dataSaida;
    @Column(nullable=false) private boolean arquivado=false; @Column(name="arquivado_em") private OffsetDateTime arquivadoEm; @Column(name="arquivado_por",length=120) private String arquivadoPor;
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm; @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Equipamento() {}
    // Instâncias da projeção são somente para leitura; gravações usam buscarParaAtualizacao.
    public Equipamento(Long id,String tipo,String modelo,String serie,String status,String medida,
        Integer quantidade,Integer quantidadeReservada,String controleQuantidade,String observacoes,
        String notaFiscal,String fornecedor,LocalDate dataCompra,Map<String,String> atributos,
        Obra obra,Funcionario tecnico,LocalDate dataEntrada,LocalDate dataSaida,boolean arquivado,boolean auditavel) {
        this.id=id;this.tipo=tipo;this.modelo=modelo;this.serie=serie;this.status=status;this.medida=medida;
        this.quantidade=quantidade;this.quantidadeReservada=quantidadeReservada;this.controleQuantidade=controleQuantidade;
        this.observacoes=observacoes;this.notaFiscal=notaFiscal;this.fornecedor=fornecedor;this.dataCompra=dataCompra;
        this.atributos=atributos;this.obra=obra;this.tecnico=tecnico;this.dataEntrada=dataEntrada;this.dataSaida=dataSaida;
        this.arquivado=arquivado;this.auditavel=auditavel;
    }
    @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public String getModelo(){return modelo;} public void setModelo(String v){modelo=v;} public String getSerie(){return serie;} public void setSerie(String v){serie=v;} public String getStatus(){return getQuantidadeManutencao()>0&&getQuantidadeManutencao()==quantidade?"Em manutenção":statusCalibracao();} public void setStatus(String v){status=v;} public String getMedida(){return medida;} public void setMedida(String v){medida=v;} public Integer getQuantidade(){return quantidade;} public void setQuantidade(Integer v){quantidade=v;} public Integer getQuantidadeReservada(){return quantidadeReservada;} public void setQuantidadeReservada(Integer v){quantidadeReservada=v;} public int getQuantidadeDisponivel(){return quantidade-quantidadeReservada-getQuantidadeManutencao()-getQuantidadeCalibracao();} public String getControleQuantidade(){return controleQuantidade;} public void setControleQuantidade(String v){controleQuantidade=v;} public boolean isLote(){return "LOTE".equals(controleQuantidade);} public String getObservacoes(){return observacoes;} public void setObservacoes(String v){observacoes=v;} public String getNotaFiscal(){return notaFiscal;} public void setNotaFiscal(String v){notaFiscal=v;} public String getFornecedor(){return fornecedor;} public void setFornecedor(String v){fornecedor=v;} public LocalDate getDataCompra(){return dataCompra;} public void setDataCompra(LocalDate v){dataCompra=v;} public Map<String,String> getAtributos(){return atributos;} public void setAtributos(Map<String,String> v){atributos=v==null?new LinkedHashMap<>():v;} public Obra getObra(){return obra;} public void setObra(Obra v){obra=v;} public Funcionario getTecnico(){return tecnico;} public void setTecnico(Funcionario v){tecnico=v;} public LocalDate getDataEntrada(){return dataEntrada;} public void setDataEntrada(LocalDate v){dataEntrada=v;} public LocalDate getDataSaida(){return dataSaida;} public void setDataSaida(LocalDate v){dataSaida=v;} public boolean isArquivado(){return arquivado;} public void definirArquivamento(boolean v,String autor){arquivado=v;arquivadoEm=v?OffsetDateTime.now():null;arquivadoPor=v?autor:null;}
}
