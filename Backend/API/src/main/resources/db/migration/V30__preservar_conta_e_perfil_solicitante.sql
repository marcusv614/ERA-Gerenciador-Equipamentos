ALTER TABLE solicitacoes
    ADD COLUMN solicitante_login VARCHAR(120),
    ADD COLUMN solicitante_perfil VARCHAR(30);

-- Não infere a conta ou o perfil de pedidos antigos a partir do cadastro atual.
-- Para pedidos novos, estes dados são registrados pela sessão autenticada.
