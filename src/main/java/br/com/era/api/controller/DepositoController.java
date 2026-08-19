package br.com.era.api.controller;
import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.service.EquipamentoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
@RestController @RequestMapping("/deposito/equipamentos")
public class DepositoController {
    private final EquipamentoService service; public DepositoController(EquipamentoService service){this.service=service;}
    @GetMapping public List<EquipamentoDto.Resposta> listar(){return service.listarDeposito();}
}
