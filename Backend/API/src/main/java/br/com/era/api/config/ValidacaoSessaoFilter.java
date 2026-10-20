package br.com.era.api.config;

import br.com.era.api.model.Usuario;
import br.com.era.api.service.UsuarioService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

@Component
public class ValidacaoSessaoFilter extends OncePerRequestFilter {
    private static final Set<String> ROTAS_PERMITIDAS_PARA_TROCA = Set.of(
        "/auth/csrf", "/auth/me", "/auth/alterar-senha", "/auth/logout"
    );

    private final UsuarioService usuarios;

    public ValidacaoSessaoFilter(UsuarioService usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        Authentication autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao == null || !autenticacao.isAuthenticated() || autenticacao instanceof AnonymousAuthenticationToken) {
            chain.doFilter(request, response);
            return;
        }

        Usuario usuario = autenticacao.getPrincipal() instanceof UsuarioAutenticado principal
            ? usuarios.buscarParaSessao(principal.getUsuarioId())
                .filter(u -> u.getVersaoSessao() == principal.getVersaoSessao()).orElse(null)
            : null;
        if (usuario == null || !usuario.isAtivo()) {
            if (request.getSession(false) != null) request.getSession(false).invalidate();
            SecurityContextHolder.clearContext();
            escreverErro(response, HttpServletResponse.SC_UNAUTHORIZED, "Sessão encerrada. Entre novamente para continuar.");
            return;
        }

        if (usuario.isDeveAlterarSenha() && !ROTAS_PERMITIDAS_PARA_TROCA.contains(request.getServletPath())) {
            escreverErro(response, HttpServletResponse.SC_FORBIDDEN, "Altere a senha temporária antes de acessar o sistema.");
            return;
        }

        chain.doFilter(request, response);
    }

    private void escreverErro(HttpServletResponse response, int status, String mensagem) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"mensagem\":\"" + mensagem + "\",\"detalhes\":{}}");
    }
}
