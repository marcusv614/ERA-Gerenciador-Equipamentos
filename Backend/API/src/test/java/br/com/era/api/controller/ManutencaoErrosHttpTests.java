package br.com.era.api.controller;
import br.com.era.api.exception.*;
import br.com.era.api.service.EquipamentoService;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class ManutencaoErrosHttpTests {
    final EquipamentoService service=mock(EquipamentoService.class);
    final UsernamePasswordAuthenticationToken auth=new UsernamePasswordAuthenticationToken("gerente","",List.of());
    final MockMvc mvc=MockMvcBuilders.standaloneSetup(new EquipamentoController(service)).setControllerAdvice(new ApiExceptionHandler()).build();
    @Test void quantidadeEMotivoSaoObrigatorios() throws Exception {
        mvc.perform(post("/equipamentos/1/manutencoes").principal(auth).contentType("application/json").content("{\"quantidade\":0,\"motivo\":\" \"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detalhes.quantidade").exists()).andExpect(jsonPath("$.detalhes.motivo").exists()).andExpect(jsonPath("$.trace").doesNotExist());
        verifyNoInteractions(service);
    }
    @Test void conclusaoExigeDescricaoDoServico() throws Exception {
        mvc.perform(post("/equipamentos/1/manutencoes/2/conclusao").principal(auth).contentType("application/json").content("{\"observacao\":\"\"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.exception").doesNotExist());verifyNoInteractions(service);
    }
    @Test void saldoInsuficienteRetornaConflitoSemStackTrace() throws Exception {
        when(service.abrirManutencao(eq(1L),any(),eq("gerente"))).thenThrow(new RegraNegocioException("Quantidade indisponível."));
        mvc.perform(post("/equipamentos/1/manutencoes").principal(auth).contentType("application/json").content("{\"quantidade\":2,\"motivo\":\"Revisão\"}"))
            .andExpect(status().isConflict()).andExpect(jsonPath("$.mensagem").value("Quantidade indisponível.")).andExpect(jsonPath("$.trace").doesNotExist());
    }
}
