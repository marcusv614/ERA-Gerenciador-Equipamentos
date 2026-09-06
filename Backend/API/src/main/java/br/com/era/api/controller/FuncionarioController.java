package br.com.era.api.controller;
import br.com.era.api.dto.FuncionarioDto;
import br.com.era.api.service.FuncionarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/funcionarios")
public class FuncionarioController {
    private final FuncionarioService service; public FuncionarioController(FuncionarioService service){this.service=service;}
    @GetMapping public List<FuncionarioDto.Resposta> listar(Authentication auth){return service.listarParaUsuario(auth.getName());}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public FuncionarioDto.Resposta cadastrar(@Valid @RequestBody FuncionarioDto.Requisicao dados){return service.cadastrar(dados);}
    @PatchMapping("/{id}") public FuncionarioDto.Resposta atualizar(@PathVariable Long id,@Valid @RequestBody FuncionarioDto.Atualizacao dados){return service.atualizar(id,dados);}
    @PatchMapping("/{id}/arquivamento") public FuncionarioDto.Resposta arquivar(@PathVariable Long id,@Valid @RequestBody br.com.era.api.dto.ArquivamentoDto.Requisicao d,Authentication auth){return service.definirArquivamento(id,d.arquivado(),auth.getName());}
}
