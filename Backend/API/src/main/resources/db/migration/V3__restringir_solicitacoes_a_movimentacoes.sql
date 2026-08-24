ALTER TABLE solicitacoes
    ADD CONSTRAINT ck_solicitacoes_somente_movimentacao
    CHECK (tipo = 'Movimentação') NOT VALID;
