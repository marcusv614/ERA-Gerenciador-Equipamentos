CREATE TABLE manutencoes_equipamentos (
    id BIGSERIAL PRIMARY KEY,
    equipamento_id BIGINT NOT NULL REFERENCES equipamentos(id),
    obra_id BIGINT REFERENCES obras(id),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    motivo VARCHAR(4000) NOT NULL,
    modelo VARCHAR(180) NOT NULL,
    serie VARCHAR(120) NOT NULL,
    local VARCHAR(180) NOT NULL,
    tecnico VARCHAR(150),
    aberta_em TIMESTAMPTZ,
    aberta_por_nome VARCHAR(150),
    aberta_por_login VARCHAR(120),
    concluida_em TIMESTAMPTZ,
    concluida_por_nome VARCHAR(150),
    concluida_por_login VARCHAR(120),
    observacao_conclusao VARCHAR(4000),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_manutencoes_equipamento ON manutencoes_equipamentos(equipamento_id);

-- Preservar bloqueios anteriores sem inventar uma data ou autoria de abertura.
INSERT INTO manutencoes_equipamentos(equipamento_id,obra_id,quantidade,motivo,modelo,serie,local,tecnico)
SELECT e.id,e.obra_id,e.quantidade-e.quantidade_reservada,
       'Manutenção já indicada no cadastro antes da implantação deste histórico. Início e responsável não informados.',
       e.modelo,e.serie,COALESCE(o.nome,'Depósito central'),f.nome
FROM equipamentos e LEFT JOIN obras o ON o.id=e.obra_id LEFT JOIN funcionarios f ON f.id=e.tecnico_id
WHERE lower(e.status) IN ('em manutenção','manutenção','em manutencao','manutencao') AND e.quantidade>e.quantidade_reservada;
UPDATE equipamentos SET status=CASE WHEN obra_id IS NULL THEN 'Em estoque' ELSE 'Em campo' END
WHERE lower(status) IN ('em manutenção','manutenção','em manutencao','manutencao');
