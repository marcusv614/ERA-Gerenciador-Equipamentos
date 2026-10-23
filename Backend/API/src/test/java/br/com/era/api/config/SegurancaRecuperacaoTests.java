package br.com.era.api.config;

import br.com.era.api.controller.RecuperacaoContaController;
import br.com.era.api.dto.RecuperacaoDto;
import br.com.era.api.model.*;
import br.com.era.api.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.core.task.TaskExecutor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(SegurancaRecuperacaoTests.Config.class)
@WebAppConfiguration
@TestPropertySource(properties="app.cors.allowed-origins=http://localhost:5173")
class SegurancaRecuperacaoTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class,ValidacaoSessaoFilter.class,RecuperacaoContaController.class,br.com.era.api.controller.EventosSegurancaController.class})
    static class Config {
        @Bean UsuarioService usuarios(){return mock(UsuarioService.class);}
        @Bean RecuperacaoContaService recuperacao(){return mock(RecuperacaoContaService.class);}
        @Bean LimitesRecuperacao limites(){return mock(LimitesRecuperacao.class);}
        @Bean AuditoriaSegurancaService auditoria(){return mock(AuditoriaSegurancaService.class);}
        @Bean("recuperacaoExecutor") TaskExecutor executor(){return mock(TaskExecutor.class);}
    }
    @Autowired WebApplicationContext contexto;
    @Autowired UsuarioService usuarios;
    @Autowired RecuperacaoContaService recuperacao;
    @Autowired LimitesRecuperacao limites;
    MockMvc mvc;
    @BeforeEach void preparar(){
        reset(usuarios,recuperacao,limites);
        mvc=MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(true);
    }
    @Test void rotasPublicasContinuamExigindoCsrf() throws Exception {
        mvc.perform(post("/auth/recuperacao/solicitar").contentType("application/json").content("{\"login\":\"admin\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/auth/recuperacao/redefinir").contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(recuperacao);
    }
    @Test void permiteSolicitarSemLoginComCsrfERespostaGenerica() throws Exception {
        mvc.perform(post("/auth/recuperacao/solicitar").with(csrf()).contentType("application/json").content("{\"login\":\"admin\"}"))
            .andExpect(status().isAccepted());
    }
    @Test void configuracaoNaoPodeSerConsultadaAnonimamente() throws Exception {
        mvc.perform(get("/auth/recuperacao/configuracao")).andExpect(status().isUnauthorized());
    }
    @Test void todosOsPerfisNaoAdminSaoBloqueadosNaCadeiaRealDeSeguranca() throws Exception {
        for(PerfilUsuario perfil:PerfilUsuario.values()){
            if(perfil==PerfilUsuario.ADMIN)continue;
            var auth=autenticar(perfil);
            mvc.perform(get("/usuarios/eventos-seguranca").with(authentication(auth))).andExpect(status().isForbidden());
            mvc.perform(get("/auth/recuperacao/configuracao").with(authentication(auth))).andExpect(status().isForbidden());
            mvc.perform(post("/auth/recuperacao/email").with(authentication(auth)).with(csrf()).contentType("application/json")
                .content("{\"email\":\"teste@gmail.com\",\"senhaAtual\":\"Senha#Atual123\"}")).andExpect(status().isForbidden());
            mvc.perform(post("/auth/recuperacao/confirmar-email").with(authentication(auth)).with(csrf()).contentType("application/json")
                .content("{\"codigo\":\"12345678\"}")).andExpect(status().isForbidden());
        }
        verify(recuperacao,never()).configuracao(anyLong(),anyLong());
        verify(recuperacao,never()).cadastrarEmail(anyLong(),anyLong(),any());
    }
    @Test void adminSemCadastroPodeConfigurarMasNaoPodeContornarEtapa() throws Exception {
        var auth=autenticar(PerfilUsuario.ADMIN);
        when(recuperacao.exigeCadastro(any())).thenReturn(true);
        when(recuperacao.configuracao(anyLong(),anyLong())).thenReturn(new RecuperacaoDto.Configuracao(true,true,null,null));
        mvc.perform(get("/auth/recuperacao/configuracao").servletPath("/auth/recuperacao/configuracao").with(authentication(auth))).andExpect(status().isOk());
        mvc.perform(get("/usuarios").servletPath("/usuarios").with(authentication(auth))).andExpect(status().isForbidden());
        mvc.perform(post("/auth/recuperacao/email").servletPath("/auth/recuperacao/email").with(authentication(auth)).with(csrf()).contentType("application/json")
            .content("{\"email\":\"teste@gmail.com\",\"senhaAtual\":\"Senha#Atual123\"}")).andExpect(status().isNoContent());
    }
    private UsernamePasswordAuthenticationToken autenticar(PerfilUsuario perfil){
        Usuario usuario=new Usuario();ReflectionTestUtils.setField(usuario,"id",1L);
        usuario.setLogin("teste");usuario.setSenhaHash("hash");usuario.setPerfil(perfil);usuario.setDeveAlterarSenha(false);
        when(usuarios.buscarParaSessao(1L)).thenReturn(Optional.of(usuario));
        var p=new UsuarioAutenticado(usuario);return UsernamePasswordAuthenticationToken.authenticated(p,null,p.getAuthorities());
    }
}
