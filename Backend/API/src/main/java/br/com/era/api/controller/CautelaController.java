package br.com.era.api.controller;
import br.com.era.api.dto.CautelaDto;
import br.com.era.api.service.CautelaService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/cautelas")
public class CautelaController {
    private final CautelaService service; public CautelaController(CautelaService service){this.service=service;}
    @GetMapping public List<CautelaDto.Resposta> listar(@RequestParam(required=false)Long solicitacaoId,Authentication auth){return service.listar(solicitacaoId,auth.getName());}
}
