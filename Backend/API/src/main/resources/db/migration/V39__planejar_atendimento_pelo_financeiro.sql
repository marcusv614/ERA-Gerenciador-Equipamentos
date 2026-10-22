ALTER TABLE solicitacoes
    ADD COLUMN plano_financeiro JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN entradas_compra JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN reservas_plano_ativas BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN movimentacao_direta BOOLEAN NOT NULL DEFAULT FALSE;

-- Pedidos ainda não executados precisam receber as instruções do Financeiro.
-- Compras já recebidas são vinculadas ao plano pelo serviço, sem nova compra.
-- Movimentações já separadas são preservadas.
UPDATE solicitacoes s SET status = 'Aguardando financeiro'
WHERE s.status = 'Aprovada' AND s.solicitacao_pai_id IS NULL
  AND s.compras = '[]'::jsonb
  AND EXISTS (SELECT 1 FROM materiais_solicitados m WHERE m.solicitacao_id = s.id)
  AND NOT EXISTS (SELECT 1 FROM materiais_solicitados m WHERE m.solicitacao_id = s.id
      AND NULLIF(TRIM(m.identificacao), '') IS NOT NULL);
