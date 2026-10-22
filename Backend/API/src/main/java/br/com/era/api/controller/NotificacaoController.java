package br.com.era.api.controller;

import br.com.era.api.service.NotificacaoMovimentacaoService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/notificacoes")
public class NotificacaoController {
    private final NotificacaoMovimentacaoService service;
    public NotificacaoController(NotificacaoMovimentacaoService service){this.service=service;}
    @GetMapping public NotificacaoMovimentacaoService.Caixa listar(Authentication auth,@RequestParam(defaultValue="0") int pagina){return service.listar(auth.getName(),pagina);}
    @PostMapping("/{id}/leitura") public NotificacaoMovimentacaoService.Aviso marcarLida(Authentication auth,@PathVariable Long id){return service.marcarLida(auth.getName(),id);}
}
