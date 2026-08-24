ALTER TABLE equipamentos
    ADD COLUMN quantidade_reservada INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_reservada >= 0),
    ADD COLUMN controle_quantidade VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
    ADD CONSTRAINT ck_equipamentos_quantidade_reservada
        CHECK (quantidade_reservada <= quantidade),
    ADD CONSTRAINT ck_equipamentos_controle_quantidade
        CHECK (controle_quantidade IN ('INDIVIDUAL', 'LOTE'));

UPDATE equipamentos
SET controle_quantidade = 'LOTE'
WHERE serie LIKE 'INV-%';

UPDATE equipamentos e
SET quantidade_reservada = reservas.quantidade
FROM (
    SELECT ms.identificacao, SUM(ms.quantidade)::INTEGER AS quantidade
    FROM materiais_solicitados ms
    JOIN solicitacoes s ON s.id = ms.solicitacao_id
    WHERE s.status = 'Pendente'
      AND s.tipo = 'Movimentação'
      AND ms.identificacao IS NOT NULL
    GROUP BY ms.identificacao
) reservas
WHERE lower(e.serie) = lower(reservas.identificacao);
