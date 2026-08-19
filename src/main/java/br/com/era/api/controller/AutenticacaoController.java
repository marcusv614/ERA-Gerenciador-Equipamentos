package br.com.era.api.controller;
import br.com.era.api.dto.AutenticacaoDto;
import br.com.era.api.model.Usuario;
import br.com.era.api.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.web.csrf.CsrfToken;

@RestController @RequestMapping("/auth")
public class AutenticacaoController {
    private final AuthenticationManager authenticationManager; private final UsuarioService usuarios;
    public AutenticacaoController(AuthenticationManager authenticationManager,UsuarioService usuarios){this.authenticationManager=authenticationManager;this.usuarios=usuarios;}
    @GetMapping("/csrf") public CsrfToken csrf(CsrfToken token){return token;}
    @PostMapping("/login") public AutenticacaoDto.Sessao login(@Valid @RequestBody AutenticacaoDto.Login dados,HttpServletRequest request,HttpServletResponse response){
        try{Authentication auth=authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(dados.login(),dados.senha()));SecurityContext context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);SecurityContextHolder.setContext(context);new HttpSessionSecurityContextRepository().saveContext(context,request,response);Usuario usuario=usuarios.registrarSucesso(auth.getName());return usuarios.sessao(usuario);}catch(AuthenticationException e){usuarios.registrarFalha(dados.login());throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Login ou senha inválidos.");}
    }
    @GetMapping("/me") public AutenticacaoDto.Sessao me(Authentication auth){return usuarios.sessao(usuarios.buscarPorLogin(auth.getName()));}
    @PostMapping("/alterar-senha") @ResponseStatus(HttpStatus.NO_CONTENT) public void alterarSenha(Authentication auth,@Valid @RequestBody AutenticacaoDto.AlterarSenha dados){usuarios.alterarSenha(auth.getName(),dados);}
}
