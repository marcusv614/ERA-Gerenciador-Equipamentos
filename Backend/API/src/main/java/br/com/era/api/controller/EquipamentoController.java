package br.com.era.api.controller;
import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.dto.MovimentacaoDto;
import br.com.era.api.service.EquipamentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/equipamentos")
public class EquipamentoController {
    private final EquipamentoService service; public EquipamentoController(EquipamentoService service){this.service=service;}
    @GetMapping public List<EquipamentoDto.Resposta> listar(Authentication autenticacao){return service.listarParaUsuario(autenticacao.getName());}
    @GetMapping("/catalogo") public List<EquipamentoDto.ItemCatalogo> listarCatalogo(){return service.listarCatalogo();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public EquipamentoDto.Resposta cadastrar(@Valid @RequestBody EquipamentoDto.Requisicao dados){return service.cadastrar(dados);}
    @PatchMapping("/{id}") public EquipamentoDto.Resposta atualizar(@PathVariable Long id,@Valid @RequestBody EquipamentoDto.Requisicao dados){return service.atualizar(id,dados);}
    @PostMapping("/{id}/movimentacoes") @ResponseStatus(HttpStatus.CREATED) public EquipamentoDto.Resposta movimentar(@PathVariable Long id,@Valid @RequestBody MovimentacaoDto.Requisicao dados){return service.movimentar(id,dados);}
    @GetMapping("/{id}/historico") public List<MovimentacaoDto.Resposta> historico(@PathVariable Long id,Authentication autenticacao){return service.historicoParaUsuario(id,autenticacao.getName());}
}
