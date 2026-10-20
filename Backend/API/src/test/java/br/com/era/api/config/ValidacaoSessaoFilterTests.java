package br.com.era.api.config;

import br.com.era.api.model.Usuario;
import br.com.era.api.model.PerfilUsuario;
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
        Usuario usuario = usuario(true, true);
        autenticar(usuario);

        MockHttpServletResponse response = executar("GET", "/equipamentos");

        assertEquals(403, response.getStatus());
        assertTrue(response.getContentAsString().contains("Altere a senha temporária"));
    }

    @Test
    void devePermitirEndpointDeAlteracaoDaSenhaTemporaria() throws Exception {
        autenticar(usuario(true, true));

        MockHttpServletResponse response = executar("POST", "/auth/alterar-senha");

        assertEquals(200, response.getStatus());
    }

    @Test
    void deveEncerrarAcessoDeUsuarioDesativado() throws Exception {
        Usuario usuario=usuario(true,false);
        autenticar(usuario);
        usuario.setAtivo(false);

        MockHttpServletResponse response = executar("GET", "/auth/me");

        assertEquals(401, response.getStatus());
        assertTrue(response.getContentAsString().contains("Sessão encerrada"));
    }

    @Test
    void deveRevogarPermissoesAntigasAposRebaixarAdministrador() throws Exception {
        Usuario usuario=usuario(true,false);usuario.setPerfil(PerfilUsuario.ADMIN);
        autenticar(usuario);usuario.setPerfil(PerfilUsuario.TECNICO);
        assertEquals(401,executar("GET","/usuarios").getStatus());
        assertTrue(SecurityContextHolder.getContext().getAuthentication()==null);
    }

    @Test
    void sessaoAntigaNaoPodeTrocarSenhaRedefinidaPeloAdministrador() throws Exception {
        Usuario usuario=usuario(true,false);autenticar(usuario);
        usuario.setSenhaHash("nova-senha-temporaria");usuario.setDeveAlterarSenha(true);
        assertEquals(401,executar("POST","/auth/alterar-senha").getStatus());
    }

    @Test
    void desativarEReativarNaoRestauraSessaoAnterior() throws Exception {
        Usuario usuario=usuario(true,false);autenticar(usuario);
        usuario.setAtivo(false);usuario.setAtivo(true);
        assertEquals(401,executar("GET","/auth/me").getStatus());
    }

    @Test
    void sessaoDeContaRemovidaNaoPodeAssumirOutroUsuarioComMesmoLogin() throws Exception {
        Usuario usuario=usuario(true,false);autenticar(usuario);
        when(usuarios.buscarParaSessao(1L)).thenReturn(java.util.Optional.empty());
        assertEquals(401,executar("GET","/auth/me").getStatus());
    }

    @Test
    void loginOuVinculoAlteradoRevogaSessao() throws Exception {
        Usuario usuario=usuario(true,false);autenticar(usuario);usuario.setLogin("outro-login");
        assertEquals(401,executar("GET","/auth/me").getStatus());
    }

    private void autenticar(Usuario usuario) {
        var principal=new UsuarioAutenticado(usuario);
        SecurityContextHolder.getContext().setAuthentication(
            UsernamePasswordAuthenticationToken.authenticated(principal, "", principal.getAuthorities())
        );
        when(usuarios.buscarParaSessao(usuario.getId())).thenReturn(java.util.Optional.of(usuario));
    }

    private Usuario usuario(boolean ativo, boolean deveAlterarSenha) {
        Usuario usuario = new Usuario();
        org.springframework.test.util.ReflectionTestUtils.setField(usuario,"id",1L);
        usuario.setLogin("tecnico@era.com");usuario.setSenhaHash("hash");usuario.setPerfil(PerfilUsuario.TECNICO);
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
