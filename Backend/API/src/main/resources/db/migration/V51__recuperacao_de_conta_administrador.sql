ALTER TABLE usuarios ADD COLUMN email_recuperacao VARCHAR(254);
ALTER TABLE usuarios ADD COLUMN email_recuperacao_verificado_em TIMESTAMPTZ;
ALTER TABLE usuarios ADD CONSTRAINT ck_usuario_recuperacao_admin CHECK (
    (email_recuperacao IS NULL AND email_recuperacao_verificado_em IS NULL)
    OR (perfil = 'ADMIN' AND email_recuperacao IS NOT NULL AND email_recuperacao_verificado_em IS NOT NULL)
);

CREATE TABLE recuperacao_tokens (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    finalidade VARCHAR(30) NOT NULL CHECK (finalidade IN ('CONFIRMAR_EMAIL','REDEFINIR_SENHA')),
    email VARCHAR(254) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    versao_sessao BIGINT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL,
    expira_em TIMESTAMPTZ NOT NULL,
    usado_em TIMESTAMPTZ,
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK (tentativas BETWEEN 0 AND 5)
);
CREATE INDEX ix_recuperacao_usuario_finalidade ON recuperacao_tokens(usuario_id,finalidade,criado_em DESC);

-- Contadores atômicos persistentes: reiniciar a API não reinicia os limites.
-- A chave é um hash; não guardamos IPs nem logins digitados nessa tabela.
CREATE TABLE recuperacao_limites (
    chave VARCHAR(64) PRIMARY KEY,
    janela TIMESTAMPTZ NOT NULL,
    tentativas INTEGER NOT NULL
);
CREATE TABLE recuperacao_eventos (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    tipo VARCHAR(50) NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_recuperacao_eventos_usuario ON recuperacao_eventos(usuario_id,criado_em DESC);
