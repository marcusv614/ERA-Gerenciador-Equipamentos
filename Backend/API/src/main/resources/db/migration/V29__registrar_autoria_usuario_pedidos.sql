ALTER TABLE solicitacoes
    ALTER COLUMN solicitante_id DROP NOT NULL,
    ADD COLUMN solicitante_usuario_id BIGINT REFERENCES usuarios(id),
    ADD COLUMN solicitante_nome VARCHAR(150);

-- Preserva a autoria histórica; pedidos novos identificam o usuário autenticado.
UPDATE solicitacoes s
SET solicitante_nome = f.nome
FROM funcionarios f
WHERE f.id = s.solicitante_id;

ALTER TABLE solicitacoes
    ADD CONSTRAINT chk_solicitacao_autoria CHECK (
        solicitante_id IS NOT NULL OR
        (solicitante_usuario_id IS NOT NULL AND NULLIF(TRIM(solicitante_nome), '') IS NOT NULL)
    );
