ALTER TABLE materiais_solicitados
    ADD COLUMN quantidade_compra INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN compra_solicitada_em TIMESTAMPTZ;

ALTER TABLE materiais_solicitados
    ADD CONSTRAINT materiais_quantidade_compra_check
    CHECK (quantidade_compra >= 0 AND quantidade_compra <= quantidade);
