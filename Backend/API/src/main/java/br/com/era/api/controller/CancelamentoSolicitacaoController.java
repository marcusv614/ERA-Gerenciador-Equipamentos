package br.com.era.api.controller;
import br.com.era.api.service.CancelamentoSolicitacaoService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/atividades/{id}/cancelamento")
public class CancelamentoSolicitacaoController {
    private final CancelamentoSolicitacaoService service;
    public CancelamentoSolicitacaoController(CancelamentoSolicitacaoService s){service=s;}
    public record Pedido(@NotBlank @Size(min=5,max=1000) String motivo,Boolean conferenciaFisica) {}
    @GetMapping public CancelamentoSolicitacaoService.Estado consultar(@PathVariable Long id,Authentication a){return service.consultar(id,a.getName());}
    @PostMapping public CancelamentoSolicitacaoService.Estado solicitar(@PathVariable Long id,@Valid @RequestBody Pedido p,Authentication a){return service.solicitar(id,p.motivo(),a.getName());}
    @PostMapping("/confirmacao") public CancelamentoSolicitacaoService.Estado confirmar(@PathVariable Long id,@Valid @RequestBody Pedido p,Authentication a){return service.confirmar(id,p.motivo(),Boolean.TRUE.equals(p.conferenciaFisica()),a.getName());}
}
