package br.com.era.api.controller;

import br.com.era.api.config.UsuarioAutenticado;
import br.com.era.api.dto.RecuperacaoDto;
import br.com.era.api.service.LimitesRecuperacao;
import br.com.era.api.service.RecuperacaoContaService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.task.TaskExecutor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Locale;

@RestController @RequestMapping("/auth/recuperacao")
public class RecuperacaoContaController {
    private final RecuperacaoContaService service;
    private final LimitesRecuperacao limites;
    private final TaskExecutor executor;
    public RecuperacaoContaController(RecuperacaoContaService service,LimitesRecuperacao limites,
        @Qualifier("recuperacaoExecutor") TaskExecutor executor){this.service=service;this.limites=limites;this.executor=executor;}
    @GetMapping("/configuracao")
    public RecuperacaoDto.Configuracao configuracao(Authentication auth){var p=principal(auth);return service.configuracao(p.getUsuarioId(),p.getVersaoSessao());}
    @PostMapping("/email") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void email(Authentication auth,@Valid @RequestBody RecuperacaoDto.CadastrarEmail dados){var p=principal(auth);service.cadastrarEmail(p.getUsuarioId(),p.getVersaoSessao(),dados);}
    @PostMapping("/confirmar-email") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void confirmar(Authentication auth,@Valid @RequestBody RecuperacaoDto.ConfirmarEmail dados){var p=principal(auth);service.confirmarEmail(p.getUsuarioId(),p.getVersaoSessao(),dados.codigo());}
    @PostMapping("/solicitar") @ResponseStatus(HttpStatus.ACCEPTED)
    public RecuperacaoDto.Mensagem solicitar(@Valid @RequestBody RecuperacaoDto.Solicitar dados,HttpServletRequest request){
        String login=dados.login().trim().toLowerCase(Locale.ROOT);
        // Todas as chaves são contadas antes de consultar a existência ou o perfil da conta.
        boolean global=limites.permitir("solicitar-global","sistema",500);
        boolean origem=global&&limites.permitir("solicitar-origem",request.getRemoteAddr(),100);
        boolean conta=origem&&limites.permitir("solicitar-login",login,5);
        if(service.habilitada()&&origem&&conta&&global){
            try{executor.execute(()->{try{service.processarSolicitacao(login);}catch(RuntimeException e){
                LoggerFactory.getLogger(getClass()).warn("Solicitação de recuperação não processada; confira a configuração do serviço.");
            }});}catch(org.springframework.core.task.TaskRejectedException ignored){/* Mesma resposta pública para fila cheia. */}
        }
        return new RecuperacaoDto.Mensagem("Se esse login pertencer a um administrador ativo com e-mail confirmado, enviaremos as instruções de recuperação. Para outros perfis, procure o administrador.");
    }
    @PostMapping("/redefinir") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinir(@Valid @RequestBody RecuperacaoDto.Redefinir dados,HttpServletRequest request){
        if(!limites.permitir("redefinir-origem",request.getRemoteAddr(),60))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Limite de tentativas atingido. Tente novamente mais tarde.");
        service.redefinir(dados);
    }
    private UsuarioAutenticado principal(Authentication auth){return (UsuarioAutenticado)auth.getPrincipal();}
}
