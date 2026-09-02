ALTER TABLE materiais_solicitados
    ADD COLUMN quantidade_entrada_estoque INTEGER NOT NULL DEFAULT 0;

ALTER TABLE materiais_solicitados
    ADD CONSTRAINT chk_material_quantidade_entrada_estoque
    CHECK (quantidade_entrada_estoque >= 0 AND quantidade_entrada_estoque <= quantidade_adquirida);
