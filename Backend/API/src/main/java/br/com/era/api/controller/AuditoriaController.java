package br.com.era.api.controller;
import br.com.era.api.dto.AuditoriaTecnicoDto;
import br.com.era.api.service.AuditoriaTecnicoService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/auditorias")
public class AuditoriaController {
    private final AuditoriaTecnicoService service;
    public AuditoriaController(AuditoriaTecnicoService service){this.service=service;}
    @GetMapping public List<AuditoriaTecnicoDto.Resposta> listar(Authentication auth){return service.listarTodas(auth.getName());}
}
