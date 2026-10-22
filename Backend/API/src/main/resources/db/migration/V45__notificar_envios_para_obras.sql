CREATE TABLE notificacoes_movimentacao (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
    obra_id BIGINT NOT NULL REFERENCES obras(id),
    solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes(id),
    perfil VARCHAR(30) NOT NULL,
    obra_nome VARCHAR(180) NOT NULL,
    destinatario BOOLEAN NOT NULL,
    materiais JSONB NOT NULL,
    criada_em TIMESTAMP WITH TIME ZONE NOT NULL,
    lida_em TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_notificacao_envio UNIQUE (usuario_id, solicitacao_id)
);
CREATE INDEX idx_notificacao_usuario_data ON notificacoes_movimentacao(usuario_id, criada_em DESC, id DESC);
