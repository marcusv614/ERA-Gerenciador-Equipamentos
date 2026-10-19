package br.com.era.api.controller;
import br.com.era.api.dto.AuditoriaTecnicoDto;
import br.com.era.api.model.AuditoriaTecnico;
import br.com.era.api.service.AuditoriaTecnicoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/funcionarios/{tecnicoId}/auditorias")
public class AuditoriaTecnicoController {
    private final AuditoriaTecnicoService service;
    public AuditoriaTecnicoController(AuditoriaTecnicoService service){this.service=service;}
    @GetMapping public List<AuditoriaTecnicoDto.Resposta> listar(@PathVariable Long tecnicoId,Authentication auth){return service.listar(tecnicoId,auth.getName());}
    @GetMapping("/materiais") public List<AuditoriaTecnico.Item> materiais(@PathVariable Long tecnicoId,Authentication auth){return service.materiais(tecnicoId,auth.getName());}
    @GetMapping("/{id}") public AuditoriaTecnicoDto.Resposta consultar(@PathVariable Long tecnicoId,@PathVariable Long id,Authentication auth){return service.consultar(tecnicoId,id,auth.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public AuditoriaTecnicoDto.Resposta criar(@PathVariable Long tecnicoId,@Valid @RequestBody AuditoriaTecnicoDto.Criacao dados,Authentication auth){return service.criar(tecnicoId,dados,auth.getName());}
    @PatchMapping("/{id}") public AuditoriaTecnicoDto.Resposta registrar(@PathVariable Long tecnicoId,@PathVariable Long id,@Valid @RequestBody AuditoriaTecnicoDto.Registro dados,Authentication auth){return service.registrar(tecnicoId,id,dados,auth.getName());}
}
