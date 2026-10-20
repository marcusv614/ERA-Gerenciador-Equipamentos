package br.com.era.api.controller;

import br.com.era.api.dto.*;
import br.com.era.api.service.CalibracaoService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/equipamentos/{id}/calibracoes")
public class CalibracaoController {
    private final CalibracaoService service;
    public CalibracaoController(CalibracaoService service){this.service=service;}
    @PostMapping public EquipamentoDto.Resposta solicitar(@PathVariable Long id,@Valid @RequestBody CalibracaoDto.Solicitacao dados,Authentication auth){return service.solicitar(id,dados,auth.getName());}
    @PostMapping("/certificados") public EquipamentoDto.Resposta certificado(@PathVariable Long id,@Valid @RequestBody CalibracaoDto.Certificado dados,Authentication auth){return service.registrarCertificado(id,dados,auth.getName());}
    @PostMapping("/{calibracaoId}/retirada") public EquipamentoDto.Resposta retirar(@PathVariable Long id,@PathVariable Long calibracaoId,@Valid @RequestBody CalibracaoDto.Retirada dados,Authentication auth){return service.retirar(id,calibracaoId,dados,auth.getName());}
    @PostMapping("/{calibracaoId}/envio") public EquipamentoDto.Resposta enviar(@PathVariable Long id,@PathVariable Long calibracaoId,@Valid @RequestBody CalibracaoDto.Envio dados,Authentication auth){return service.enviar(id,calibracaoId,dados,auth.getName());}
    @PostMapping("/{calibracaoId}/retorno") public EquipamentoDto.Resposta retornar(@PathVariable Long id,@PathVariable Long calibracaoId,@Valid @RequestBody CalibracaoDto.Retorno dados,Authentication auth){return service.retornar(id,calibracaoId,dados,auth.getName());}
    @PostMapping("/{calibracaoId}/cancelamento") public EquipamentoDto.Resposta cancelar(@PathVariable Long id,@PathVariable Long calibracaoId,@Valid @RequestBody CalibracaoDto.Cancelamento dados,Authentication auth){return service.cancelar(id,calibracaoId,dados,auth.getName());}
}
