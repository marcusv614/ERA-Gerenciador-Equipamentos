package br.com.era.api.model;
import jakarta.persistence.*;
@Entity @Table(name="inventario_obra_snapshot_itens")
public class InventarioObraSnapshotItem {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="snapshot_id") private InventarioObraSnapshot snapshot;
    @Column(name="equipamento_id") private Long equipamentoId;
    @Column(nullable=false,length=40) private String tipo; @Column(nullable=false,length=180) private String modelo; @Column(nullable=false,length=120) private String serie; @Column(length=100) private String medida; @Column(nullable=false) private Integer quantidade; @Column(length=150) private String tecnico;
    public InventarioObraSnapshot getSnapshot(){return snapshot;} public void setSnapshot(InventarioObraSnapshot v){snapshot=v;} public Long getEquipamentoId(){return equipamentoId;} public void setEquipamentoId(Long v){equipamentoId=v;} public String getTipo(){return tipo;} public void setTipo(String v){tipo=v;} public String getModelo(){return modelo;} public void setModelo(String v){modelo=v;} public String getSerie(){return serie;} public void setSerie(String v){serie=v;} public String getMedida(){return medida;} public void setMedida(String v){medida=v;} public Integer getQuantidade(){return quantidade;} public void setQuantidade(Integer v){quantidade=v;} public String getTecnico(){return tecnico;} public void setTecnico(String v){tecnico=v;}
}
