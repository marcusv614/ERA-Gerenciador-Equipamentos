ALTER TABLE solicitacoes
    ADD COLUMN transito_em TIMESTAMPTZ,
    ADD COLUMN concluida_em TIMESTAMPTZ;

CREATE TABLE cautelas (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(40) UNIQUE,
    solicitacao_id BIGINT NOT NULL REFERENCES solicitacoes(id),
    solicitacao_raiz_id BIGINT NOT NULL REFERENCES solicitacoes(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('SAIDA', 'FINAL')),
    versao INTEGER NOT NULL DEFAULT 1,
    status_movimentacao VARCHAR(30) NOT NULL,
    emitida_em TIMESTAMPTZ NOT NULL,
    emitida_por VARCHAR(150) NOT NULL,
    origem_nome VARCHAR(180) NOT NULL,
    destino_nome VARCHAR(180) NOT NULL,
    solicitante_nome VARCHAR(150) NOT NULL,
    tecnico_nome VARCHAR(150) NOT NULL,
    data_solicitacao DATE NOT NULL,
    observacao TEXT,
    CONSTRAINT uq_cautela_solicitacao_tipo_versao UNIQUE (solicitacao_id, tipo, versao)
);

CREATE TABLE cautela_materiais (
    id BIGSERIAL PRIMARY KEY,
    cautela_id BIGINT NOT NULL REFERENCES cautelas(id) ON DELETE CASCADE,
    nome VARCHAR(180) NOT NULL,
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    identificacao VARCHAR(120) NOT NULL
);

CREATE INDEX idx_cautelas_solicitacao ON cautelas(solicitacao_id, emitida_em DESC);
CREATE INDEX idx_cautelas_raiz ON cautelas(solicitacao_raiz_id, emitida_em DESC);

INSERT INTO cautelas (solicitacao_id, solicitacao_raiz_id, tipo, versao, status_movimentacao, emitida_em, emitida_por, origem_nome, destino_nome, solicitante_nome, tecnico_nome, data_solicitacao, observacao)
SELECT s.id, COALESCE(s.solicitacao_pai_id, s.id), 'SAIDA', 1, 'Em trânsito', COALESCE(s.transito_em, s.atualizado_em), 'Migração do sistema', COALESCE(oo.nome, 'Depósito central'), COALESCE(od.nome, 'Depósito central'), fs.nome, ft.nome, s.data_solicitacao, s.observacao
FROM solicitacoes s
JOIN funcionarios fs ON fs.id = s.solicitante_id
JOIN funcionarios ft ON ft.id = s.tecnico_id
LEFT JOIN obras oo ON oo.id = s.obra_origem_id
LEFT JOIN obras od ON od.id = s.obra_destino_id
WHERE s.status IN ('Em trânsito', 'Concluída')
  AND NOT EXISTS (SELECT 1 FROM materiais_solicitados ms WHERE ms.solicitacao_id = s.id AND (ms.identificacao IS NULL OR trim(ms.identificacao) = ''));

INSERT INTO cautelas (solicitacao_id, solicitacao_raiz_id, tipo, versao, status_movimentacao, emitida_em, emitida_por, origem_nome, destino_nome, solicitante_nome, tecnico_nome, data_solicitacao, observacao)
SELECT s.id, COALESCE(s.solicitacao_pai_id, s.id), 'FINAL', 1, 'Concluída', COALESCE(s.concluida_em, s.atualizado_em), 'Migração do sistema', COALESCE(oo.nome, 'Depósito central'), COALESCE(od.nome, 'Depósito central'), fs.nome, ft.nome, s.data_solicitacao, s.observacao
FROM solicitacoes s
JOIN funcionarios fs ON fs.id = s.solicitante_id
JOIN funcionarios ft ON ft.id = s.tecnico_id
LEFT JOIN obras oo ON oo.id = s.obra_origem_id
LEFT JOIN obras od ON od.id = s.obra_destino_id
WHERE s.status = 'Concluída'
  AND NOT EXISTS (SELECT 1 FROM materiais_solicitados ms WHERE ms.solicitacao_id = s.id AND (ms.identificacao IS NULL OR trim(ms.identificacao) = ''));

INSERT INTO cautela_materiais (cautela_id, nome, quantidade, identificacao)
SELECT c.id, ms.nome, ms.quantidade, ms.identificacao
FROM cautelas c
JOIN materiais_solicitados ms ON ms.solicitacao_id = c.solicitacao_id;

UPDATE cautelas
SET numero = 'CAU-' || EXTRACT(YEAR FROM emitida_em)::INTEGER || '-' || lpad(id::TEXT, 6, '0');
