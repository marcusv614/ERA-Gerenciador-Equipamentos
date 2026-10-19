ALTER TABLE solicitacoes ADD COLUMN compras JSONB NOT NULL DEFAULT '[]'::jsonb;
