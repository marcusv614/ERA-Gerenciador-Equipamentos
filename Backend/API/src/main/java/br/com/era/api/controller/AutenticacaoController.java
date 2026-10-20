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
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import br.com.era.api.config.UsuarioAutenticado;

@RestController @RequestMapping("/auth")
public class AutenticacaoController {
    private final AuthenticationManager authenticationManager; private final UsuarioService usuarios; private final SessionAuthenticationStrategy estrategiaSessao;
    public AutenticacaoController(AuthenticationManager authenticationManager,UsuarioService usuarios,SessionAuthenticationStrategy estrategiaSessao){this.authenticationManager=authenticationManager;this.usuarios=usuarios;this.estrategiaSessao=estrategiaSessao;}
    @GetMapping("/csrf") public CsrfToken csrf(CsrfToken token){return token;}
    @PostMapping("/login") public AutenticacaoDto.Sessao login(@Valid @RequestBody AutenticacaoDto.Login dados,HttpServletRequest request,HttpServletResponse response){
        try{Authentication auth=authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(dados.login(),dados.senha()));UsuarioAutenticado principal=(UsuarioAutenticado)auth.getPrincipal();Usuario usuario=usuarios.registrarSucesso(principal.getUsuarioId(),principal.getVersaoSessao());request.getSession(true);estrategiaSessao.onAuthentication(auth,request,response);salvarContexto(auth,request,response);return usuarios.sessao(usuario);}catch(AuthenticationException e){usuarios.registrarFalha(dados.login());throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Login ou senha inválidos.");}
    }
    @GetMapping("/me") public AutenticacaoDto.Sessao me(Authentication auth){return usuarios.sessao(usuarios.buscarPorLogin(auth.getName()));}
    @PostMapping("/alterar-senha") @ResponseStatus(HttpStatus.NO_CONTENT) public void alterarSenha(Authentication auth,@Valid @RequestBody AutenticacaoDto.AlterarSenha dados,HttpServletRequest request,HttpServletResponse response){
        UsuarioAutenticado principal=(UsuarioAutenticado)auth.getPrincipal();
        var atualizado=usuarios.alterarSenha(principal.getUsuarioId(),dados,principal.getVersaoSessao());
        atualizado.eraseCredentials();
        salvarContexto(UsernamePasswordAuthenticationToken.authenticated(atualizado,null,atualizado.getAuthorities()),request,response);
    }
    private void salvarContexto(Authentication auth,HttpServletRequest request,HttpServletResponse response){
        SecurityContext context=SecurityContextHolder.createEmptyContext();context.setAuthentication(auth);SecurityContextHolder.setContext(context);
        new HttpSessionSecurityContextRepository().saveContext(context,request,response);
    }
}
