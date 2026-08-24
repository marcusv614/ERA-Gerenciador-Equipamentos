CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    funcionario_id BIGINT UNIQUE REFERENCES funcionarios(id),
    nome VARCHAR(150) NOT NULL,
    login VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(30) NOT NULL CHECK (perfil IN ('ADMIN', 'GERENTE', 'TECNICO')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    deve_alterar_senha BOOLEAN NOT NULL DEFAULT TRUE,
    tentativas_falhas INTEGER NOT NULL DEFAULT 0,
    bloqueado_ate TIMESTAMPTZ,
    ultimo_login TIMESTAMPTZ,
    senha_alterada_em TIMESTAMPTZ,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuarios_login_ativo ON usuarios(login, ativo);
