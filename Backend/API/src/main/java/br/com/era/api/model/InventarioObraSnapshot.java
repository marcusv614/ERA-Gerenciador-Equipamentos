package br.com.era.api.model;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
@Entity @Table(name="inventario_obra_snapshots")
public class InventarioObraSnapshot {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="obra_id") private Obra obra;
    @Column(name="data_referencia",nullable=false) private LocalDate dataReferencia;
    @Column(name="registrado_em",nullable=false) private OffsetDateTime registradoEm;
    @Column(name="obra_nome",nullable=false,length=180) private String obraNome;
    @Column(nullable=false,length=150) private String cliente;
    @Column(nullable=false,length=150) private String cidade;
    @Column(nullable=false,length=40) private String status;
    @Column(name="responsaveis_tecnicos",nullable=false,columnDefinition="text") private String responsaveisTecnicos;
    @PrePersist void preparar(){if(registradoEm==null)registradoEm=OffsetDateTime.now();}
    public Long getId(){return id;} public Obra getObra(){return obra;} public void setObra(Obra v){obra=v;} public LocalDate getDataReferencia(){return dataReferencia;} public void setDataReferencia(LocalDate v){dataReferencia=v;} public OffsetDateTime getRegistradoEm(){return registradoEm;} public String getObraNome(){return obraNome;} public void setObraNome(String v){obraNome=v;} public String getCliente(){return cliente;} public void setCliente(String v){cliente=v;} public String getCidade(){return cidade;} public void setCidade(String v){cidade=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getResponsaveisTecnicos(){return responsaveisTecnicos;} public void setResponsaveisTecnicos(String v){responsaveisTecnicos=v;}
}
