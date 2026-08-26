WITH cautelas_repetidas AS (
    SELECT id,
           row_number() OVER (
               PARTITION BY solicitacao_id
               ORDER BY CASE WHEN tipo = 'SAIDA' THEN 0 ELSE 1 END, emitida_em, id
           ) AS ordem
    FROM cautelas
)
DELETE FROM cautelas
WHERE id IN (SELECT id FROM cautelas_repetidas WHERE ordem > 1);

ALTER TABLE cautelas
    DROP CONSTRAINT IF EXISTS uq_cautela_solicitacao_tipo_versao,
    DROP CONSTRAINT IF EXISTS cautelas_tipo_check;

UPDATE cautelas
SET tipo = 'UNICA', versao = 1;

ALTER TABLE cautelas
    ADD CONSTRAINT cautelas_tipo_check CHECK (tipo = 'UNICA'),
    ADD CONSTRAINT uq_cautela_solicitacao UNIQUE (solicitacao_id);
