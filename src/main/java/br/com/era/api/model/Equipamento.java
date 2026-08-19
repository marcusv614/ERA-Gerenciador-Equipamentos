package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
@Entity @Table(name="equipamentos")
public class Equipamento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false,length=40) private String tipo; @Column(nullable=false,length=180) private String modelo; @Column(nullable=false,unique=true,length=120) private String serie; @Column(nullable=false,length=40) private String status;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_id") private Obra obra; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="tecnico_id") private Funcionario tecnico;
    @Column(name="data_entrada") private LocalDate dataEntrada; @Column(name="data_saida") private LocalDate dataSaida;
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm; @Column(name="atualizado_em",nullable=false) private OffsetDateTime atualizadoEm;
    public Equipamento() {} @PrePersist void criarDatas(){criadoEm=OffsetDateTime.now();atualizadoEm=criadoEm;} @PreUpdate void atualizarData(){atualizadoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public String getModelo(){return modelo;} public void setModelo(String v){modelo=v;} public String getSerie(){return serie;} public void setSerie(String v){serie=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public Obra getObra(){return obra;} public void setObra(Obra v){obra=v;} public Funcionario getTecnico(){return tecnico;} public void setTecnico(Funcionario v){tecnico=v;} public LocalDate getDataEntrada(){return dataEntrada;} public void setDataEntrada(LocalDate v){dataEntrada=v;} public LocalDate getDataSaida(){return dataSaida;} public void setDataSaida(LocalDate v){dataSaida=v;}
}
