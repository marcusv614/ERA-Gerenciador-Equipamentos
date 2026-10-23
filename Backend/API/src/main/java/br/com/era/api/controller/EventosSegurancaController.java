package br.com.era.api.controller;

import br.com.era.api.service.AuditoriaSegurancaService;
import br.com.era.api.service.AuditoriaSegurancaService.Tipo;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;

@RestController @RequestMapping("/usuarios/eventos-seguranca")
public class EventosSegurancaController {
    private final AuditoriaSegurancaService auditoria;
    public EventosSegurancaController(AuditoriaSegurancaService auditoria){this.auditoria=auditoria;}
    @GetMapping public AuditoriaSegurancaService.Pagina listar(@RequestParam(required=false) Tipo tipo,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime inicio,
        @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE_TIME) OffsetDateTime fim,
        @RequestParam(defaultValue="0") int pagina){return auditoria.listar(tipo,inicio,fim,pagina);}
}
