package br.com.era.api.controller;

import br.com.era.api.exception.ApiExceptionHandler;
import br.com.era.api.repository.CategoriaEquipamentoRepository;
import br.com.era.api.service.CategoriaEquipamentoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Contrato MVC com Bean Validation e serviço real; autorização tem suíte separada.
class QaCategoriaHttpTests {
    final CategoriaEquipamentoRepository repository = mock(CategoriaEquipamentoRepository.class);
    MockMvc mvc;
    @BeforeEach void preparar() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
        mvc = MockMvcBuilders.standaloneSetup(new CategoriaEquipamentoController(new CategoriaEquipamentoService(repository)))
            .setControllerAdvice(new ApiExceptionHandler()).build();
    }
    @Test void cadastroValidoResponde201() throws Exception {
        mvc.perform(post("/categorias-equipamento").contentType("application/json").content("{\"nome\":\"Medição QA\",\"campos\":[]}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("slug").value("medicao-qa"));
    }
    @Test void campoAninhadoSemRotuloEhRejeitadoSemPersistir() throws Exception {
        mvc.perform(post("/categorias-equipamento").contentType("application/json").content("{\"nome\":\"QA\",\"campos\":[{\"chave\":\"marca\",\"tipo\":\"text\"}]}"))
            .andExpect(status().isBadRequest());
        verify(repository,never()).save(any());
    }
    @Test void QA_BUG_001_campoNuloDeveSerErro400EmVezDe500() throws Exception {
        mvc.perform(post("/categorias-equipamento").contentType("application/json").content("{\"nome\":\"QA\",\"campos\":[null]}"))
            .andExpect(status().isBadRequest());
        verify(repository,never()).save(any());
    }
}
