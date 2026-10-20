package br.com.era.api.dto;

import br.com.era.api.model.CalibracaoEquipamento;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public final class CalibracaoDto {
    private CalibracaoDto() {}
    public record Solicitacao(@Size(max=180) String laboratorio,@Size(max=4000) String observacao) {}
    public record Retirada(@NotNull @PastOrPresent LocalDate dataRetirada) {}
    public record Envio(@NotBlank @Size(max=180) String laboratorio,@NotNull @PastOrPresent LocalDate dataEnvio,LocalDate previsaoRetorno) {}
    public record Retorno(@NotNull @PastOrPresent LocalDate dataRetorno,@NotNull @PastOrPresent LocalDate dataCalibracao,@NotNull LocalDate validade,@NotBlank @Size(max=120) String certificado,@Size(max=4000) String observacao) {}
    public record Certificado(@NotBlank @Size(max=180) String laboratorio,@NotBlank @Size(max=120) String certificado,@NotNull @PastOrPresent LocalDate dataCalibracao,@NotNull LocalDate validade,@Size(max=4000) String observacao) {}
    public record Cancelamento(@NotBlank @Size(max=4000) String motivo) {}
    public record Resposta(Long id,String status,boolean historico,String modelo,String serie,Long obraOrigemId,String localOrigem,String tecnicoOrigem,String laboratorio,String certificado,String observacao,LocalDate dataRetirada,LocalDate dataEnvio,LocalDate previsaoRetorno,LocalDate dataRetorno,LocalDate dataCalibracao,LocalDate validade,OffsetDateTime criadoEm,List<CalibracaoEquipamento.Evento> eventos) {
        public static Resposta de(CalibracaoEquipamento c){return new Resposta(c.getId(),c.getStatus(),c.isHistorico(),c.getModelo(),c.getSerie(),c.getObraOrigem()==null?null:c.getObraOrigem().getId(),c.getLocalOrigem(),c.getTecnicoOrigem(),c.getLaboratorio(),c.getCertificado(),c.getObservacao(),c.getDataRetirada(),c.getDataEnvio(),c.getPrevisaoRetorno(),c.getDataRetorno(),c.getDataCalibracao(),c.getValidade(),c.getCriadoEm(),List.copyOf(c.getEventos()));}
    }
}
