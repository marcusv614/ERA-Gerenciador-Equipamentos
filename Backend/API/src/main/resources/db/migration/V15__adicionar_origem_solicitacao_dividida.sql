ALTER TABLE solicitacoes
    ADD COLUMN solicitacao_pai_id BIGINT REFERENCES solicitacoes(id);

CREATE INDEX idx_solicitacoes_pai ON solicitacoes(solicitacao_pai_id);
