package br.com.era.api.controller;

import br.com.era.api.dto.AutenticacaoDto;
import br.com.era.api.model.Usuario;
import br.com.era.api.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AutenticacaoControllerTests {
    @Test
    void deveTrocarIdentificadorDaSessaoDepoisDoLogin() {
        AuthenticationManager authenticationManager = mock(AuthenticationManager.class);
        UsuarioService usuarios = mock(UsuarioService.class);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        Usuario usuario = mock(Usuario.class);
        AutenticacaoDto.Sessao sessao = new AutenticacaoDto.Sessao(1L, null, "Admin", "admin", "ADMIN", false);
        var autenticacao = UsernamePasswordAuthenticationToken.authenticated("admin", "", java.util.List.of());

        when(authenticationManager.authenticate(org.mockito.ArgumentMatchers.any())).thenReturn(autenticacao);
        when(request.getSession(true)).thenReturn(session);
        when(request.getSession(false)).thenReturn(session);
        when(usuarios.registrarSucesso("admin")).thenReturn(usuario);
        when(usuarios.sessao(usuario)).thenReturn(sessao);

        var resultado = new AutenticacaoController(authenticationManager, usuarios)
            .login(new AutenticacaoDto.Login("admin", "senha-segura"), request, response);

        verify(request).changeSessionId();
        assertSame(sessao, resultado);
    }
}
