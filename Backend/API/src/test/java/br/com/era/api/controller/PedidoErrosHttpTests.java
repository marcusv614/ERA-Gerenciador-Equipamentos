package br.com.era.api.controller;

import br.com.era.api.exception.*;
import br.com.era.api.service.SolicitacaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PedidoErrosHttpTests {
    SolicitacaoService service=mock(SolicitacaoService.class);
    MockMvc mvc;
    @BeforeEach void configurar(){mvc=MockMvcBuilders.standaloneSetup(new AtividadeController(service)).setControllerAdvice(new ApiExceptionHandler()).build();}
    @Test void rejeitaJsonInvalidoSemExporDetalhesInternos() throws Exception {
        mvc.perform(post("/atividades").contentType("application/json").content("{"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.trace").doesNotExist()).andExpect(jsonPath("$.exception").doesNotExist());
    }
    @Test void rejeitaItemNulo() throws Exception {
        mvc.perform(post("/atividades").contentType("application/json").content("""
            {"tecnico":"Tecnico","obraDestinoId":1,"dataSolicitacao":"2026-10-15","materiais":[null]}
            """ )).andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void rejeitaQuantidadeZero() throws Exception {
        mvc.perform(post("/atividades/1/materiais/2/compra").contentType("application/json").content("{\"quantidade\":0}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalhes.quantidade").exists());
        verifyNoInteractions(service);
    }
    @Test void rejeitaQuantidadeForaDoInteiro() throws Exception {
        mvc.perform(post("/atividades/1/materiais/2/compra").contentType("application/json").content("{\"quantidade\":2147483648}"))
            .andExpect(status().isBadRequest());
    }
    @Test void retorna404ParaPedidoInexistente() throws Exception {
        when(service.rejeitar(1L)).thenThrow(new RecursoNaoEncontradoException("Pedido não encontrado."));
        mvc.perform(post("/atividades/1/rejeicao")).andExpect(status().isNotFound());
    }
    @Test void retorna409ParaTransicaoInvalida() throws Exception {
        when(service.rejeitar(1L)).thenThrow(new RegraNegocioException("Pedido já analisado."));
        mvc.perform(post("/atividades/1/rejeicao")).andExpect(status().isConflict());
    }
    @Test void erroInesperadoTemCodigoSemStackTrace() throws Exception {
        when(service.rejeitar(1L)).thenThrow(new IllegalStateException("SEGREDO SQL"));
        mvc.perform(post("/atividades/1/rejeicao")).andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.codigoErro").isString()).andExpect(jsonPath("$.trace").doesNotExist())
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("SEGREDO SQL"))));
    }
    @Test void conflitoConcorrenteRetorna409() throws Exception {
        when(service.rejeitar(1L)).thenThrow(new org.springframework.dao.CannotAcquireLockException("SQL"));
        mvc.perform(post("/atividades/1/rejeicao")).andExpect(status().isConflict());
    }
    @Test void formatoIncorretoRetorna415() throws Exception {
        mvc.perform(post("/atividades").contentType("text/plain").content("pedido")).andExpect(status().isUnsupportedMediaType());
    }
}
