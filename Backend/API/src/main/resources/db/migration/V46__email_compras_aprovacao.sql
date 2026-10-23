CREATE TABLE configuracao_email_compras (
    id BIGINT PRIMARY KEY CHECK (id = 1), versao BIGINT NOT NULL DEFAULT 0,
    para JSONB NOT NULL DEFAULT '[]', cc JSONB NOT NULL DEFAULT '[]', cco JSONB NOT NULL DEFAULT '[]',
    assunto VARCHAR(200) NOT NULL, mensagem TEXT NOT NULL, automatico BOOLEAN NOT NULL DEFAULT FALSE,
    atualizado_por VARCHAR(120), atualizado_em TIMESTAMPTZ
);
INSERT INTO configuracao_email_compras(id, assunto, mensagem) VALUES
    (1, 'Materiais aprovados — pedido {{codigo}} — {{obra}}', E'Olá, equipe de compras.\n\nSegue a relação dos materiais do pedido {{codigo}}, aprovado para {{obra}}.\nTécnico responsável: {{tecnico}}.\nSolicitado por: {{solicitante}}.\n\nPor favor, avaliem as providências necessárias.');

CREATE TABLE emails_pedidos (
    id BIGSERIAL PRIMARY KEY, solicitacao_id BIGINT NOT NULL UNIQUE REFERENCES solicitacoes(id),
    remetente VARCHAR(254) NOT NULL, para JSONB NOT NULL, cc JSONB NOT NULL, cco JSONB NOT NULL,
    assunto VARCHAR(500) NOT NULL, mensagem TEXT NOT NULL, conteudo_html TEXT NOT NULL, itens JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDENTE' CHECK(status IN ('PENDENTE','ENVIANDO','ENVIADO','FALHA','INCERTO')),
    tentativas INTEGER NOT NULL DEFAULT 0 CHECK(tentativas >= 0),
    criado_em TIMESTAMPTZ NOT NULL, atualizado_em TIMESTAMPTZ NOT NULL,
    proxima_tentativa TIMESTAMPTZ NOT NULL, enviado_em TIMESTAMPTZ,
    solicitado_por_nome VARCHAR(150) NOT NULL, solicitado_por_login VARCHAR(120) NOT NULL,
    erro VARCHAR(500), eventos JSONB NOT NULL DEFAULT '[]'
);
CREATE INDEX emails_pedidos_fila ON emails_pedidos(status, proxima_tentativa);
