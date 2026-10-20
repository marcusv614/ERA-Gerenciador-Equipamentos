CREATE TABLE calibracoes_equipamentos (
    id BIGSERIAL PRIMARY KEY,
    equipamento_id BIGINT NOT NULL REFERENCES equipamentos(id),
    obra_origem_id BIGINT REFERENCES obras(id),
    modelo VARCHAR(180) NOT NULL,
    serie VARCHAR(120) NOT NULL,
    local_origem VARCHAR(180) NOT NULL,
    tecnico_origem VARCHAR(150),
    status VARCHAR(30) NOT NULL CHECK (status IN ('AGUARDANDO_RETIRADA','AGUARDANDO_ENVIO','EM_CALIBRACAO','CONCLUIDA','CANCELADA')),
    historico BOOLEAN NOT NULL DEFAULT FALSE,
    laboratorio VARCHAR(180),
    certificado VARCHAR(120),
    observacao VARCHAR(4000),
    data_retirada DATE,
    data_envio DATE,
    previsao_retorno DATE,
    data_retorno DATE,
    data_calibracao DATE,
    validade DATE,
    criado_em TIMESTAMPTZ NOT NULL,
    eventos JSONB NOT NULL DEFAULT '[]'::jsonb,
    CHECK (validade IS NULL OR (data_calibracao IS NOT NULL AND validade >= data_calibracao)),
    CHECK (data_retorno IS NULL OR (data_envio IS NOT NULL AND data_retorno >= data_envio)),
    CHECK (data_envio IS NULL OR laboratorio IS NOT NULL),
    CHECK (status <> 'EM_CALIBRACAO' OR data_envio IS NOT NULL),
    CHECK (status <> 'CONCLUIDA' OR (data_calibracao IS NOT NULL AND validade IS NOT NULL AND certificado IS NOT NULL)),
    CHECK (status <> 'CONCLUIDA' OR historico OR data_retorno IS NOT NULL)
);
CREATE UNIQUE INDEX uq_calibracao_aberta_por_equipamento ON calibracoes_equipamentos(equipamento_id)
    WHERE status IN ('AGUARDANDO_RETIRADA','AGUARDANDO_ENVIO','EM_CALIBRACAO');
CREATE INDEX idx_calibracoes_equipamento ON calibracoes_equipamentos(equipamento_id, criado_em DESC, id DESC);
CREATE INDEX idx_calibracoes_validade ON calibracoes_equipamentos(validade) WHERE status='CONCLUIDA';
