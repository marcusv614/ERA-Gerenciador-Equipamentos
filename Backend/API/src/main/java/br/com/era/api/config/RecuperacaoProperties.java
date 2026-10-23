package br.com.era.api.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import java.net.URI;

@ConfigurationProperties("app.recuperacao")
public record RecuperacaoProperties(boolean habilitada, String urlPublica) {
    public RecuperacaoProperties {
        urlPublica = urlPublica == null ? "" : urlPublica.trim().replaceAll("/+$", "");
        if (habilitada) {
            URI uri = URI.create(urlPublica);
            boolean local = "http".equals(uri.getScheme()) && ("localhost".equals(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
            if ((!"https".equals(uri.getScheme()) && !local) || uri.getHost() == null
                || uri.getRawUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))
                throw new IllegalArgumentException("RECOVERY_PUBLIC_URL deve ser a origem HTTPS pública do sistema (HTTP apenas em localhost).");
        }
    }
}
