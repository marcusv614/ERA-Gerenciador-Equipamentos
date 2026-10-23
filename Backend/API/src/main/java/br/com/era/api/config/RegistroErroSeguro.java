package br.com.era.api.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.servlet.HandlerMapping;
import java.util.Arrays;
import java.util.stream.Collectors;

/** Nunca inclui mensagem/cause/SQL, parâmetros, URI bruta ou corpo da requisição. */
public final class RegistroErroSeguro {
    private RegistroErroSeguro() {}
    public static String rota(HttpServletRequest request){
        Object padrao=request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        return padrao instanceof String s&&s.length()<=180&&s.matches("[/a-zA-Z0-9_{}.*:-]+")?s:"nao-mapeada";
    }
    public static String pontos(Throwable erro){
        return Arrays.stream(erro.getStackTrace()).filter(p->p.getClassName().startsWith("br.com.era.api."))
            .limit(8).map(p->p.getClassName()+"."+p.getMethodName()+":"+p.getLineNumber()).collect(Collectors.joining(","));
    }
}
