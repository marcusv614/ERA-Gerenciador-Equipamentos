ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_perfil_check
    CHECK (perfil IN ('ADMIN', 'GERENTE', 'RH', 'FINANCEIRO', 'ESTOQUE', 'TECNICO', 'TST'));

ALTER TABLE solicitacoes
    ADD COLUMN eventos_financeiros JSONB NOT NULL DEFAULT '[]'::jsonb;
