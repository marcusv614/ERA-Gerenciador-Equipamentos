ALTER TABLE equipamentos ADD COLUMN auditavel BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE auditorias_tecnicos (
    id BIGSERIAL PRIMARY KEY,
    versao BIGINT NOT NULL DEFAULT 0,
    funcionario_id BIGINT NOT NULL REFERENCES funcionarios(id),
    tecnico_nome VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','CONCLUIDA')),
    criado_em TIMESTAMPTZ NOT NULL,
    criado_por_nome VARCHAR(150) NOT NULL,
    criado_por_login VARCHAR(120) NOT NULL,
    data_vistoria DATE,
    fiscal VARCHAR(150),
    observacoes TEXT,
    registrado_por_nome VARCHAR(150),
    registrado_por_login VARCHAR(120),
    atualizado_em TIMESTAMPTZ NOT NULL,
    concluida_em TIMESTAMPTZ,
    itens JSONB NOT NULL CHECK (jsonb_typeof(itens) = 'array')
);
CREATE INDEX idx_auditorias_tecnico_data ON auditorias_tecnicos(funcionario_id, criado_em DESC);
