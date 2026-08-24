package br.com.era.api.controller;
import br.com.era.api.dto.MovimentacaoDto;
import br.com.era.api.dto.ObraDto;
import br.com.era.api.repository.MovimentacaoRepository;
import br.com.era.api.service.EquipamentoService;
import br.com.era.api.service.ObraService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/obras")
public class ObraController {
    private final ObraService service; private final MovimentacaoRepository movimentacoes; private final EquipamentoService equipamentos;
    public ObraController(ObraService service,MovimentacaoRepository movimentacoes,EquipamentoService equipamentos){this.service=service;this.movimentacoes=movimentacoes;this.equipamentos=equipamentos;}
    @GetMapping public List<ObraDto.Resposta> listar(Authentication autenticacao){return service.listarParaUsuario(autenticacao.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public ObraDto.Resposta cadastrar(@Valid @RequestBody ObraDto.Requisicao dados){return service.cadastrar(dados);}
    @PatchMapping("/{id}") public ObraDto.Resposta atualizar(@PathVariable Long id,@Valid @RequestBody ObraDto.Requisicao dados){return service.atualizar(id,dados);}
    @GetMapping("/{id}/historico") public List<MovimentacaoDto.Resposta> historico(@PathVariable Long id,Authentication autenticacao){service.buscarParaUsuario(id,autenticacao.getName());return movimentacoes.findByObraOrigemIdOrObraDestinoIdOrderByDataMovimentacaoAscIdAsc(id,id).stream().map(equipamentos::respostaMovimentacao).toList();}
}
