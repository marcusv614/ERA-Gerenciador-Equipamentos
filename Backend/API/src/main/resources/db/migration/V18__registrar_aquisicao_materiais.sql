ALTER TABLE materiais_solicitados
    ADD COLUMN quantidade_adquirida INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN adquirida_em TIMESTAMP WITH TIME ZONE;

ALTER TABLE materiais_solicitados
    ADD CONSTRAINT ck_materiais_quantidade_adquirida
    CHECK (quantidade_adquirida >= 0 AND quantidade_adquirida <= quantidade_compra);
