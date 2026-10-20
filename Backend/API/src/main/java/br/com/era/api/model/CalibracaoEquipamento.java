package br.com.era.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name="calibracoes_equipamentos")
public class CalibracaoEquipamento {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="equipamento_id") private Equipamento equipamento;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="obra_origem_id") private Obra obraOrigem;
    @Column(nullable=false,length=180) private String modelo;
    @Column(nullable=false,length=120) private String serie;
    @Column(name="local_origem",nullable=false,length=180) private String localOrigem;
    @Column(name="tecnico_origem",length=150) private String tecnicoOrigem;
    @Column(nullable=false,length=30) private String status;
    @Column(nullable=false) private boolean historico;
    @Column(length=180) private String laboratorio;
    @Column(length=120) private String certificado;
    @Column(length=4000) private String observacao;
    @Column(name="data_retirada") private LocalDate dataRetirada;
    @Column(name="data_envio") private LocalDate dataEnvio;
    @Column(name="previsao_retorno") private LocalDate previsaoRetorno;
    @Column(name="data_retorno") private LocalDate dataRetorno;
    @Column(name="data_calibracao") private LocalDate dataCalibracao;
    private LocalDate validade;
    @Column(name="criado_em",nullable=false) private OffsetDateTime criadoEm;
    public record Evento(String acao,OffsetDateTime registradoEm,String autorNome,String autorLogin,String autorPerfil,String observacao) {}
    @JdbcTypeCode(SqlTypes.JSON) @Column(nullable=false,columnDefinition="jsonb") private List<Evento> eventos=new ArrayList<>();
    protected CalibracaoEquipamento() {}
    public CalibracaoEquipamento(Equipamento e,String laboratorio,String observacao,Usuario autor,boolean historico) {
        equipamento=e;obraOrigem=e.getObra();modelo=e.getModelo();serie=e.getSerie();
        localOrigem=obraOrigem==null?"Depósito central":obraOrigem.getNome();
        tecnicoOrigem=e.getTecnico()==null?null:e.getTecnico().getNome();
        this.laboratorio=laboratorio;this.observacao=observacao;this.historico=historico;criadoEm=OffsetDateTime.now();
        status=historico?"CONCLUIDA":obraOrigem==null?"AGUARDANDO_ENVIO":"AGUARDANDO_RETIRADA";
        evento(historico?"CERTIFICADO_ANTERIOR":"SOLICITADA",autor,observacao);
    }
    private void evento(String acao,Usuario autor,String texto) {
        eventos.add(new Evento(acao,OffsetDateTime.now(),autor.getNome(),autor.getLogin(),autor.getPerfil().name(),texto));
    }
    public void retirar(LocalDate data,Usuario autor){dataRetirada=data;status="AGUARDANDO_ENVIO";evento("RETIRADA_CONFIRMADA",autor,"Recebido no depósito central.");}
    public void enviar(String laboratorio,LocalDate data,LocalDate previsao,Usuario autor){this.laboratorio=laboratorio;dataEnvio=data;previsaoRetorno=previsao;status="EM_CALIBRACAO";evento("ENVIO_CONFIRMADO",autor,"Enviado ao laboratório "+laboratorio+".");}
    public void certificado(String laboratorio,String numero,LocalDate data,LocalDate validade){this.laboratorio=laboratorio;certificado=numero;dataCalibracao=data;this.validade=validade;}
    public void retornar(LocalDate data,String observacao,Usuario autor){dataRetorno=data;status="CONCLUIDA";evento("RETORNO_CONFIRMADO",autor,observacao);}
    public void cancelar(String motivo,Usuario autor){status="CANCELADA";evento("CANCELADA",autor,motivo);}
    public boolean isAberta(){return !List.of("CONCLUIDA","CANCELADA").contains(status);}
    public Long getId(){return id;} public Obra getObraOrigem(){return obraOrigem;}
    public String getModelo(){return modelo;} public String getSerie(){return serie;} public String getLocalOrigem(){return localOrigem;}
    public String getTecnicoOrigem(){return tecnicoOrigem;} public String getStatus(){return status;} public boolean isHistorico(){return historico;}
    public String getLaboratorio(){return laboratorio;} public String getCertificado(){return certificado;} public String getObservacao(){return observacao;}
    public LocalDate getDataRetirada(){return dataRetirada;} public LocalDate getDataEnvio(){return dataEnvio;} public LocalDate getPrevisaoRetorno(){return previsaoRetorno;}
    public LocalDate getDataRetorno(){return dataRetorno;} public LocalDate getDataCalibracao(){return dataCalibracao;} public LocalDate getValidade(){return validade;}
    public OffsetDateTime getCriadoEm(){return criadoEm;} public List<Evento> getEventos(){return eventos;}
}
