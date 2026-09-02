CREATE TABLE inventario_obra_snapshots (
    id BIGSERIAL PRIMARY KEY,
    obra_id BIGINT NOT NULL REFERENCES obras(id),
    data_referencia DATE NOT NULL,
    registrado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    obra_nome VARCHAR(180) NOT NULL,
    cliente VARCHAR(150) NOT NULL,
    cidade VARCHAR(150) NOT NULL,
    status VARCHAR(40) NOT NULL,
    responsaveis_tecnicos TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_inventario_snapshot_obra_data
    ON inventario_obra_snapshots (obra_id, data_referencia DESC, registrado_em DESC);

CREATE TABLE inventario_obra_snapshot_itens (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id BIGINT NOT NULL REFERENCES inventario_obra_snapshots(id) ON DELETE CASCADE,
    equipamento_id BIGINT,
    tipo VARCHAR(40) NOT NULL,
    modelo VARCHAR(180) NOT NULL,
    serie VARCHAR(120) NOT NULL,
    medida VARCHAR(100),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    tecnico VARCHAR(150)
);

INSERT INTO inventario_obra_snapshots
    (obra_id, data_referencia, obra_nome, cliente, cidade, status, responsaveis_tecnicos)
SELECT o.id, CURRENT_DATE, o.nome, o.cliente, o.cidade, o.status,
       COALESCE((SELECT string_agg(f.nome, ', ' ORDER BY f.nome)
                 FROM obra_responsaveis obr
                 JOIN funcionarios f ON f.id = obr.funcionario_id
                 WHERE obr.obra_id = o.id), '')
FROM obras o;

INSERT INTO inventario_obra_snapshot_itens
    (snapshot_id, equipamento_id, tipo, modelo, serie, medida, quantidade, tecnico)
SELECT s.id, e.id, e.tipo, e.modelo, e.serie, e.medida, e.quantidade, f.nome
FROM inventario_obra_snapshots s
JOIN equipamentos e ON e.obra_id = s.obra_id
LEFT JOIN funcionarios f ON f.id = e.tecnico_id
WHERE s.data_referencia = CURRENT_DATE;
