package br.com.era.api.controller;

import br.com.era.api.dto.CalibracaoDto;
import br.com.era.api.exception.*;
import br.com.era.api.service.CalibracaoService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CalibracaoErrosHttpTests {
    final CalibracaoService service=mock(CalibracaoService.class);
    MockMvc mvc;
    @BeforeEach void configurar(){mvc=MockMvcBuilders.standaloneSetup(new CalibracaoController(service)).setControllerAdvice(new ApiExceptionHandler()).build();}
    @Test void envioExigeLaboratorioEDataSemStackTrace() throws Exception {
        mvc.perform(post("/equipamentos/1/calibracoes/2/envio").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalhes.laboratorio").exists()).andExpect(jsonPath("$.detalhes.dataEnvio").exists()).andExpect(jsonPath("$.trace").doesNotExist());
        verifyNoInteractions(service);
    }
    @Test void retornoExigeDatasECertificado() throws Exception {
        mvc.perform(post("/equipamentos/1/calibracoes/2/retorno").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalhes.certificado").exists()).andExpect(jsonPath("$.detalhes.validade").exists());
        verifyNoInteractions(service);
    }
    @Test void etapaRepetidaRetorna409() throws Exception {
        when(service.cancelar(eq(1L),eq(2L),any(CalibracaoDto.Cancelamento.class),eq("gerente"))).thenThrow(new RegraNegocioException("O equipamento já foi enviado ao laboratório."));
        mvc.perform(post("/equipamentos/1/calibracoes/2/cancelamento").principal(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("gerente","")).contentType("application/json").content("{\"motivo\":\"Reagendado\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.trace").doesNotExist());
    }
    @Test void dataInvalidaNaoChegaAoServico() throws Exception {
        mvc.perform(post("/equipamentos/1/calibracoes/2/retirada").contentType("application/json").content("{\"dataRetirada\":\"invalida\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.exception").doesNotExist());verifyNoInteractions(service);
    }
}
