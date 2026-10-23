package br.com.era.api.controller;
import br.com.era.api.service.RelatorioPedidoService;
import br.com.era.api.model.PerfilUsuario;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import java.util.List;
@RestController @RequestMapping("/relatorios")
public class RelatorioPedidoController {
    private final RelatorioPedidoService service;
    public RelatorioPedidoController(RelatorioPedidoService s){service=s;}
    @GetMapping("/pedidos/{id}") public RelatorioPedidoService.Pedido pedido(@PathVariable Long id,@RequestParam(required=false) PerfilUsuario escopo,Authentication a){return service.pedido(id,a.getName(),escopo);}
    @GetMapping("/pedidos") public List<RelatorioPedidoService.Pedido> pedidos(@RequestParam(required=false) Long obraId,@RequestParam(required=false) Long funcionarioId,@RequestParam(required=false) PerfilUsuario escopo,Authentication a){return service.consultar(a.getName(),obraId,funcionarioId,escopo);}
}
