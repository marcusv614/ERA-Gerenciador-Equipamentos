ALTER TABLE solicitacoes
    ADD COLUMN materiais_originais JSONB NOT NULL DEFAULT '[]'::jsonb;
