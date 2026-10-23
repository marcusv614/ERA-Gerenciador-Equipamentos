package br.com.era.api.controller;

import br.com.era.api.config.UsuarioAutenticado;
import br.com.era.api.dto.RecuperacaoDto;
import br.com.era.api.exception.ApiExceptionHandler;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Usuario;
import br.com.era.api.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.task.TaskExecutor;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class RecuperacaoContaControllerTests {
    final RecuperacaoContaService service=mock(RecuperacaoContaService.class);
    final LimitesRecuperacao limites=mock(LimitesRecuperacao.class);
    final TaskExecutor executor=mock(TaskExecutor.class);
    final RecuperacaoContaController controller=new RecuperacaoContaController(service,limites,executor);
    MockMvc mvc;
    @BeforeEach void preparar(){
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new ApiExceptionHandler()).build();
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(true);
        when(service.habilitada()).thenReturn(true);
    }
    @Test void solicitacaoPublicaNaoRevelaExistenciaOuPerfilNemConsultaContaNaResposta() throws Exception {
        mvc.perform(post("/auth/recuperacao/solicitar").contentType("application/json").content("{\"login\":\"admin\"}"))
            .andExpect(status().isAccepted()).andExpect(jsonPath("$.mensagem").value(org.hamcrest.Matchers.containsString("Se esse login")));
        verify(executor).execute(any());verify(service,never()).processarSolicitacao(anyString());
    }
    @Test void limiteFilaCheiaERecursoDesligadoMantemMensagemGenerica(){
        var request=new MockHttpServletRequest();
        String normal=controller.solicitar(new RecuperacaoDto.Solicitar("admin"),request).mensagem();
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(false);
        assertEquals(normal,controller.solicitar(new RecuperacaoDto.Solicitar("inexistente"),request).mensagem());
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(true);
        doThrow(new TaskRejectedException("cheia")).when(executor).execute(any());
        assertEquals(normal,controller.solicitar(new RecuperacaoDto.Solicitar("admin"),request).mensagem());
        when(service.habilitada()).thenReturn(false);
        assertEquals(normal,controller.solicitar(new RecuperacaoDto.Solicitar("tecnico"),request).mensagem());
    }
    @Test void rejeitaLinkMalformadoECodigoInvalidoAntesDoServico() throws Exception {
        mvc.perform(post("/auth/recuperacao/redefinir").contentType("application/json").content("{\"token\":\"123\",\"novaSenha\":\"Nova#Senha123\"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(post("/auth/recuperacao/confirmar-email").contentType("application/json").content("{\"codigo\":\"123\"}"))
            .andExpect(status().isBadRequest());
        verify(service,never()).redefinir(any());verify(service,never()).confirmarEmail(anyLong(),anyLong(),anyString());
    }
    @Test void cadastroUsaIdentidadeDaSessaoNuncaIdEnviadoPeloCliente(){
        Usuario usuario=new Usuario();ReflectionTestUtils.setField(usuario,"id",17L);
        usuario.setLogin("admin");usuario.setSenhaHash("hash");usuario.setPerfil(PerfilUsuario.ADMIN);
        var p=new UsuarioAutenticado(usuario);
        var auth=UsernamePasswordAuthenticationToken.authenticated(p,null,p.getAuthorities());
        var dados=new RecuperacaoDto.CadastrarEmail("novo@gmail.com","Senha#Atual123");
        controller.email(auth,dados);verify(service).cadastrarEmail(17L,p.getVersaoSessao(),dados);
    }
    @Test void limitaTentativasDeRedefinicao() throws Exception {
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(false);
        mvc.perform(post("/auth/recuperacao/redefinir").contentType("application/json")
            .content("{\"token\":\""+"a".repeat(43)+"\",\"novaSenha\":\"Nova#Senha123\"}"))
            .andExpect(status().isTooManyRequests());verify(service,never()).redefinir(any());
    }
}
