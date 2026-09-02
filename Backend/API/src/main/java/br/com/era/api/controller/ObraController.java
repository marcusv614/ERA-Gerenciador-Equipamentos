package br.com.era.api.controller;
import br.com.era.api.dto.MovimentacaoDto;
import br.com.era.api.dto.ObraDto;
import br.com.era.api.dto.InventarioHistoricoDto;
import br.com.era.api.repository.MovimentacaoRepository;
import br.com.era.api.service.EquipamentoService;
import br.com.era.api.service.ObraService;
import br.com.era.api.service.InventarioHistoricoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.time.LocalDate;
import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/obras")
public class ObraController {
    private final ObraService service; private final MovimentacaoRepository movimentacoes; private final EquipamentoService equipamentos; private final InventarioHistoricoService inventarioHistorico;
    public ObraController(ObraService service,MovimentacaoRepository movimentacoes,EquipamentoService equipamentos,InventarioHistoricoService inventarioHistorico){this.service=service;this.movimentacoes=movimentacoes;this.equipamentos=equipamentos;this.inventarioHistorico=inventarioHistorico;}
    @GetMapping public List<ObraDto.Resposta> listar(Authentication autenticacao){return service.listarParaUsuario(autenticacao.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ObraDto.Resposta cadastrar(@Valid @RequestBody ObraDto.Requisicao dados){return service.cadastrar(dados);}
    @PatchMapping("/{id}") public ObraDto.Resposta atualizar(@PathVariable Long id,@Valid @RequestBody ObraDto.Requisicao dados){return service.atualizar(id,dados);}
    @GetMapping("/{id}/historico") public List<MovimentacaoDto.Resposta> historico(@PathVariable Long id,Authentication autenticacao){service.buscarParaUsuario(id,autenticacao.getName());return equipamentos.restringirHistoricoParaUsuario(movimentacoes.findByObraOrigemIdOrObraDestinoIdOrderByDataMovimentacaoAscIdAsc(id,id),autenticacao.getName());}
    @GetMapping("/{id}/inventario-historico") public InventarioHistoricoDto.Resposta inventarioHistorico(@PathVariable Long id,@RequestParam LocalDate data,Authentication autenticacao){return inventarioHistorico.consultar(service.buscarParaUsuario(id,autenticacao.getName()),data);}
}
