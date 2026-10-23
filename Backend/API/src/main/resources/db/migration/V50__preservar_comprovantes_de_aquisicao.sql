ALTER TABLE solicitacoes ADD COLUMN aquisicoes_auditadas JSONB NOT NULL DEFAULT '[]'::jsonb;
