package br.com.era.api.controller;
import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.dto.MovimentacaoDto;
import br.com.era.api.dto.ManutencaoDto;
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
    @PatchMapping("/{id}/arquivamento") public EquipamentoDto.Resposta arquivar(@PathVariable Long id,@Valid @RequestBody br.com.era.api.dto.ArquivamentoDto.Requisicao d,Authentication auth){return service.definirArquivamento(id,d.arquivado(),auth.getName());}
    @PostMapping("/{id}/movimentacoes") @ResponseStatus(HttpStatus.CREATED) public EquipamentoDto.Resposta movimentar(@PathVariable Long id,@Valid @RequestBody MovimentacaoDto.Requisicao dados){return service.movimentar(id,dados);}
    @GetMapping("/{id}/historico") public List<MovimentacaoDto.Resposta> historico(@PathVariable Long id,Authentication autenticacao){return service.historicoParaUsuario(id,autenticacao.getName());}
    @PostMapping("/{id}/manutencoes") public EquipamentoDto.Resposta abrirManutencao(@PathVariable Long id,@Valid @RequestBody ManutencaoDto.Abertura dados,Authentication auth){return service.abrirManutencao(id,dados,auth.getName());}
    @PostMapping("/{id}/manutencoes/{manutencaoId}/conclusao") public EquipamentoDto.Resposta concluirManutencao(@PathVariable Long id,@PathVariable Long manutencaoId,@Valid @RequestBody ManutencaoDto.Conclusao dados,Authentication auth){return service.concluirManutencao(id,manutencaoId,dados,auth.getName());}
}
