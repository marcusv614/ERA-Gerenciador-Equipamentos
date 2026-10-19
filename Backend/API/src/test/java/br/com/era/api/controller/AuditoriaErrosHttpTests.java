package br.com.era.api.controller;
import br.com.era.api.exception.*;
import br.com.era.api.service.AuditoriaTecnicoService;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
class AuditoriaErrosHttpTests {
    final AuditoriaTecnicoService service=mock(AuditoriaTecnicoService.class);
    final UsernamePasswordAuthenticationToken auth=new UsernamePasswordAuthenticationToken("gerente","",List.of());
    MockMvc mvc;
    @BeforeEach void configurar(){mvc=MockMvcBuilders.standaloneSetup(new AuditoriaTecnicoController(service)).setControllerAdvice(new ApiExceptionHandler()).build();}
    @Test void naoCriaFichaSemEquipamentos() throws Exception {
        mvc.perform(post("/funcionarios/1/auditorias").principal(auth).contentType("application/json").content("{\"equipamentoIds\":[]}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.trace").doesNotExist());verifyNoInteractions(service);
    }
    @Test void rejeitaQuantidadesNegativasSemDetalhesInternos() throws Exception {
        mvc.perform(patch("/funcionarios/1/auditorias/2").principal(auth).contentType("application/json").content("""
            {"versao":0,"concluir":true,"itens":[{"equipamentoId":1,"bom":-1,"avaria":0,"quebrado":0}]}
            """)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.trace").doesNotExist());verifyNoInteractions(service);
    }
    @Test void naoConsultaFichaDeOutroTecnico() throws Exception {
        when(service.consultar(1L,2L,"gerente")).thenThrow(new RecursoNaoEncontradoException("Auditoria não encontrada para este técnico."));
        mvc.perform(get("/funcionarios/1/auditorias/2").principal(auth)).andExpect(status().isNotFound()).andExpect(jsonPath("$.exception").doesNotExist());
    }
}
