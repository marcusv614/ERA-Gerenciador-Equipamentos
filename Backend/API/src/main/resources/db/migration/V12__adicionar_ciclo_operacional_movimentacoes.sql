UPDATE solicitacoes s
SET status = 'Concluída'
WHERE status = 'Aprovada'
  AND EXISTS (
    SELECT 1 FROM movimentacoes m
    WHERE m.solicitacao_id = s.id AND m.ativa = TRUE
  );
