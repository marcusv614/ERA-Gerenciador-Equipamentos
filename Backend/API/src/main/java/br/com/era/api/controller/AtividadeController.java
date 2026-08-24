package br.com.era.api.controller;
import br.com.era.api.dto.SolicitacaoDto;
import br.com.era.api.service.SolicitacaoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/atividades")
public class AtividadeController {
    private final SolicitacaoService service; public AtividadeController(SolicitacaoService service){this.service=service;}
    @GetMapping public List<SolicitacaoDto.Resposta> listar(Authentication autenticacao){return service.listarParaUsuario(autenticacao.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public SolicitacaoDto.Resposta cadastrar(@Valid @RequestBody SolicitacaoDto.Requisicao dados,Authentication autenticacao){return service.cadastrar(dados,autenticacao.getName());}
    @PatchMapping("/{id}") public SolicitacaoDto.Resposta atualizar(@PathVariable Long id,@Valid @RequestBody SolicitacaoDto.Atualizacao dados){return service.atualizar(id,dados);}
    @PostMapping("/{id}/aprovacao") public SolicitacaoDto.Resposta aprovar(@PathVariable Long id){return service.aprovar(id);}
    @PostMapping("/{id}/rejeicao") public SolicitacaoDto.Resposta rejeitar(@PathVariable Long id){return service.rejeitar(id);}
}
