package br.com.era.api.controller;
import br.com.era.api.dto.UsuarioDto;
import br.com.era.api.service.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/usuarios")
public class UsuarioController {
    private final UsuarioService service; public UsuarioController(UsuarioService service){this.service=service;}
    @GetMapping public List<UsuarioDto.Resposta> listar(){return service.listar();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public UsuarioDto.Resposta cadastrar(@Valid @RequestBody UsuarioDto.Cadastro dados){return service.cadastrar(dados);}
    @PatchMapping("/{id}/status") public UsuarioDto.Resposta status(@PathVariable Long id,@Valid @RequestBody UsuarioDto.Status dados){return service.definirStatus(id,dados.ativo());}
    @PostMapping("/{id}/redefinicao-senha") public UsuarioDto.Resposta redefinir(@PathVariable Long id,@Valid @RequestBody UsuarioDto.RedefinirSenha dados){return service.redefinirSenha(id,dados.senhaTemporaria());}
}
