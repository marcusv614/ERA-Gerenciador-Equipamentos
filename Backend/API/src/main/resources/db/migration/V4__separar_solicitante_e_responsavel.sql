INSERT INTO funcionarios (nome, cargo, email, telefone, status)
SELECT 'Renata Nogueira', 'Gerente de obras', 'renata.nogueira@era.com.br', '(92) 99101-1010', 'Ativo'
WHERE NOT EXISTS (
    SELECT 1 FROM funcionarios WHERE lower(email) = 'renata.nogueira@era.com.br'
);

ALTER TABLE solicitacoes
    DROP CONSTRAINT ck_solicitacoes_somente_movimentacao;

ALTER TABLE solicitacoes ADD COLUMN solicitante_id BIGINT;

UPDATE solicitacoes SET solicitante_id = tecnico_id;

ALTER TABLE solicitacoes
    ALTER COLUMN solicitante_id SET NOT NULL,
    ADD CONSTRAINT fk_solicitacoes_solicitante
        FOREIGN KEY (solicitante_id) REFERENCES funcionarios(id);

ALTER TABLE solicitacoes
    ADD CONSTRAINT ck_solicitacoes_somente_movimentacao
    CHECK (tipo = 'Movimentação') NOT VALID;
