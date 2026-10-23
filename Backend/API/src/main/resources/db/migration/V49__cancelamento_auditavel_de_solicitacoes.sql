ALTER TABLE solicitacoes
    ADD COLUMN status_antes_cancelamento VARCHAR(30),
    ADD COLUMN financeiro_cancelamento_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN estoque_cancelamento_confirmado BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN motivo_cancelamento TEXT;
ALTER TABLE notificacoes_movimentacao ADD COLUMN tipo VARCHAR(50) NOT NULL DEFAULT 'ENVIO';
ALTER TABLE notificacoes_movimentacao ADD COLUMN mensagem TEXT;
ALTER TABLE notificacoes_movimentacao DROP CONSTRAINT uq_notificacao_envio;
ALTER TABLE notificacoes_movimentacao ADD CONSTRAINT uq_notificacao_evento UNIQUE(usuario_id, solicitacao_id, tipo);
