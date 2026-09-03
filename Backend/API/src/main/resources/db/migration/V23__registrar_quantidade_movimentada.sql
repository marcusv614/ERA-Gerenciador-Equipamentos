ALTER TABLE movimentacoes
    ADD COLUMN quantidade INTEGER;

-- Os registros legados não informavam a quantidade; cada um representa ao menos uma unidade.
UPDATE movimentacoes SET quantidade = 1 WHERE quantidade IS NULL;

ALTER TABLE movimentacoes
    ALTER COLUMN quantidade SET NOT NULL,
    ADD CONSTRAINT ck_movimentacoes_quantidade_positiva CHECK (quantidade > 0);
