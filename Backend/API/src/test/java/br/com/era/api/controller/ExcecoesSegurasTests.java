package br.com.era.api.controller;

import br.com.era.api.exception.ApiExceptionHandler;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Contrato de erros independente de cada controller de negócio. */
class ExcecoesSegurasTests {
    @RestController
    static class Alvo {
        @GetMapping("/teste/{tipo}")
        Object falhar(@PathVariable String tipo) {
            throw switch (tipo) {
                case "inesperada" -> new IllegalStateException("TOKEN-PRIVADO senha=Teste!SQL jdbc:postgresql://interno");
                case "integridade" -> new DataIntegrityViolationException("SQL INSERT email=privado@example.invalid",new RuntimeException("TOKEN-PRIVADO"));
                case "concorrencia" -> new ConcurrencyFailureException("UPDATE usuarios SET senha_hash=TOKEN-PRIVADO");
                case "acesso" -> new AccessDeniedException("TOKEN-PRIVADO");
                case "ausente" -> new RecursoNaoEncontradoException("Registro não encontrado.");
                case "regra" -> new RegraNegocioException("A operação não é permitida nesta etapa.");
                default -> new ResponseStatusException(HttpStatus.BAD_GATEWAY,"TOKEN-PRIVADO");
            };
        }
    }
    MockMvc mvc;
    @BeforeEach void preparar(){mvc=MockMvcBuilders.standaloneSetup(new Alvo()).setControllerAdvice(new ApiExceptionHandler()).build();}

    @Test void erroInesperadoTemCodigoSemExporMensagemInterna() throws Exception {
        verificar("inesperada",500);
        mvc.perform(get("/teste/inesperada")).andExpect(jsonPath("$.codigoErro",matchesPattern("[a-f0-9-]{36}")));
    }
    @Test void integridadeNaoExpoeSqlOuDadosDaCausa() throws Exception {verificar("integridade",409);}
    @Test void concorrenciaRetornaConflitoSemDetalhesDoBanco() throws Exception {verificar("concorrencia",409);}
    @Test void acessoNegadoNaoExpoeMensagemDaExcecao() throws Exception {verificar("acesso",403);}
    @Test void recursoAusenteTemContratoEstavel() throws Exception {verificar("ausente",404);}
    @Test void regraDeNegocioMantemMensagemUtil() throws Exception {
        verificar("regra",409);
        mvc.perform(get("/teste/regra")).andExpect(jsonPath("$.mensagem").value("A operação não é permitida nesta etapa."));
    }
    @Test void statusCincoXxNaoExpoeReasonInterno() throws Exception {verificar("gateway",502);}
    @Test void metodoInvalidoNaoViraErroInterno() throws Exception {
        mvc.perform(post("/teste/regra")).andExpect(status().isMethodNotAllowed()).andExpect(jsonPath("$.status").value(405));
    }
    private void verificar(String tipo,int status) throws Exception {
        mvc.perform(get("/teste/"+tipo)).andExpect(status().is(status))
            .andExpect(jsonPath("$.status").value(status)).andExpect(jsonPath("$.mensagem",not(blankOrNullString())))
            .andExpect(jsonPath("$.instante").isNotEmpty()).andExpect(jsonPath("$.trace").doesNotExist())
            .andExpect(jsonPath("$.stackTrace").doesNotExist()).andExpect(jsonPath("$.exception").doesNotExist())
            .andExpect(content().string(not(containsString("TOKEN-PRIVADO"))))
            .andExpect(content().string(not(containsString("senha_hash"))))
            .andExpect(content().string(not(containsString("jdbc:postgresql"))))
            .andExpect(content().string(not(containsString("privado@example.invalid"))));
    }
}
