CREATE TABLE eventos_seguranca (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(40) NOT NULL,
    ator_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    alvo_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
    registrado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ix_eventos_seguranca_data ON eventos_seguranca(registrado_em DESC,id DESC);
CREATE INDEX ix_eventos_seguranca_tipo ON eventos_seguranca(tipo,registrado_em DESC,id DESC);
-- Não armazenar senha, hash de senha, login digitado, endereço de e-mail, IP,
-- token, sessão, corpo de requisição ou mensagens de exceção nesta trilha.
