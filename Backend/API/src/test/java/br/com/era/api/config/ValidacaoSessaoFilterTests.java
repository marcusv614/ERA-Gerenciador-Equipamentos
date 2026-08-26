package br.com.era.api.config;

import br.com.era.api.model.Usuario;
import br.com.era.api.service.UsuarioService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ValidacaoSessaoFilterTests {
    private final UsuarioService usuarios = mock(UsuarioService.class);
    private final ValidacaoSessaoFilter filter = new ValidacaoSessaoFilter(usuarios);

    @AfterEach
    void limparContexto() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deveBloquearRecursosEnquantoSenhaForTemporaria() throws Exception {
        autenticar("tecnico@era.com");
        Usuario usuario = usuario(true, true);
        when(usuarios.buscarPorLogin("tecnico@era.com")).thenReturn(usuario);

        MockHttpServletResponse response = executar("GET", "/equipamentos");

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("Altere a senha temporária"));
    }

    @Test
    void devePermitirEndpointDeAlteracaoDaSenhaTemporaria() throws Exception {
        autenticar("tecnico@era.com");
        when(usuarios.buscarPorLogin("tecnico@era.com")).thenReturn(usuario(true, true));

        MockHttpServletResponse response = executar("POST", "/auth/alterar-senha");

        assertEquals(200, response.getStatus());
    }

    @Test
    void deveEncerrarAcessoDeUsuarioDesativado() throws Exception {
        autenticar("bloqueado@era.com");
        when(usuarios.buscarPorLogin("bloqueado@era.com")).thenReturn(usuario(false, false));

        MockHttpServletResponse response = executar("GET", "/auth/me");

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Usuário desativado"));
    }

    private void autenticar(String login) {
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(login, "", java.util.List.of())
        );
    }

    private Usuario usuario(boolean ativo, boolean deveAlterarSenha) {
        Usuario usuario = new Usuario();
        usuario.setAtivo(ativo);
        usuario.setDeveAlterarSenha(deveAlterarSenha);
        return usuario;
    }

    private MockHttpServletResponse executar(String metodo, String caminho) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(metodo, caminho);
        request.setServletPath(caminho);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }
}
