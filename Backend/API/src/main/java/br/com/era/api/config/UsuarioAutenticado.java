package br.com.era.api.config;

import br.com.era.api.model.Usuario;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;
import java.time.OffsetDateTime;

/** Identidade e versão do acesso no instante da autenticação; nunca retornada pela API. */
public final class UsuarioAutenticado extends User {
    private final Long usuarioId;
    private final long versaoSessao;

    public UsuarioAutenticado(Usuario usuario) {
        super(usuario.getLogin(), usuario.getSenhaHash(), usuario.isAtivo(), true, true,
            usuario.getBloqueadoAte() == null || !usuario.getBloqueadoAte().isAfter(OffsetDateTime.now()),
            AuthorityUtils.createAuthorityList("ROLE_" + usuario.getPerfil().name()));
        this.usuarioId = usuario.getId();
        this.versaoSessao = usuario.getVersaoSessao();
    }

    public Long getUsuarioId() { return usuarioId; }
    public long getVersaoSessao() { return versaoSessao; }
}
