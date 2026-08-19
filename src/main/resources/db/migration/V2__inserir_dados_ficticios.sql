INSERT INTO funcionarios (id, nome, cargo, email, telefone, status) VALUES
    (1, 'Carlos Henrique Souza', 'Técnico de Fibra Óptica', 'carlos.souza@era.local', '(92) 99111-1001', 'Ativo'),
    (2, 'Mariana Oliveira Lima', 'Técnica de Telecomunicações', 'mariana.lima@era.local', '(92) 99111-1002', 'Ativo'),
    (3, 'Rafael Costa Alves', 'Supervisor de Campo', 'rafael.alves@era.local', '(92) 99111-1003', 'Ativo'),
    (4, 'Beatriz Santos Rocha', 'Técnica de Redes', 'beatriz.rocha@era.local', '(92) 99111-1004', 'Ativo'),
    (5, 'João Pedro Martins', 'Almoxarife', 'joao.martins@era.local', '(92) 99111-1005', 'Ativo');

INSERT INTO obras (id, nome, cliente, cidade, inicio, status) VALUES
    (1, 'Expansão FTTH — Zona Sul', 'Conecta Amazonas', 'Manaus', '2026-01-12', 'Em andamento'),
    (2, 'Backbone Metropolitano', 'Prefeitura de Manaus', 'Manaus', '2026-03-02', 'Em andamento'),
    (3, 'Enlace Óptico Industrial', 'Polo Industrial Norte', 'Manaus', '2025-11-10', 'Concluída');

INSERT INTO obra_responsaveis (obra_id, funcionario_id) VALUES
    (1, 1), (1, 3), (2, 2), (2, 4), (3, 3);

INSERT INTO equipamentos (id, tipo, modelo, serie, status, obra_id, tecnico_id, data_entrada, data_saida) VALUES
    (1, 'OTDR', 'EXFO FTB-1v2', 'OTF-88215', 'Em campo', 1, 1, '2026-01-14', NULL),
    (2, 'FLUKE', 'DSX-8000', 'FLK-44018', 'Em campo', 2, 2, '2026-03-04', NULL),
    (3, 'FUSORA', 'Fujikura 90S+', 'FJS-12077', 'Em campo', 1, 1, '2026-01-14', NULL),
    (4, 'POWER_METER', 'EXFO PPM-350D', 'PPM-33902', 'Disponível', NULL, NULL, '2026-02-20', NULL),
    (5, 'OTDR', 'VIAVI SmartOTDR', 'VVI-77104', 'Manutenção', NULL, NULL, '2025-12-05', NULL),
    (6, 'CLIVADOR', 'Fujikura CT50', 'CTV-19003', 'Em campo', 2, 4, '2026-03-05', NULL);

INSERT INTO solicitacoes (id, tipo, status, tecnico_id, obra_origem_id, obra_destino_id, data_solicitacao, data_decisao, observacao) VALUES
    (1, 'Movimentação', 'Pendente', 1, 1, 2, '2026-08-17', NULL, 'Transferência para apoio nas certificações do backbone.'),
    (2, 'Aquisição', 'Pendente', 2, 2, NULL, '2026-08-18', NULL, 'Reposição de consumíveis para a próxima etapa da obra.'),
    (3, 'Movimentação', 'Aprovada', 4, 1, 2, '2026-08-12', '2026-08-13', 'Movimentação aprovada pelo gerente.'),
    (4, 'Aquisição', 'Rejeitada', 1, 1, NULL, '2026-08-10', '2026-08-11', 'Material já disponível no depósito.');

INSERT INTO materiais_solicitados (id, solicitacao_id, nome, quantidade, identificacao) VALUES
    (1, 1, 'OTDR EXFO FTB-1v2', 1, 'OTF-88215'),
    (2, 2, 'Conector óptico SC/APC', 100, NULL),
    (3, 2, 'Álcool isopropílico 1 L', 4, NULL),
    (4, 2, 'Lenço para limpeza óptica', 10, NULL),
    (5, 3, 'Clivador Fujikura CT50', 1, 'CTV-19003'),
    (6, 4, 'Bobina de fibra drop 1 km', 2, NULL);

INSERT INTO movimentacoes (id, equipamento_id, solicitacao_id, obra_origem_id, obra_destino_id, tecnico_id, status, data_movimentacao, ativa) VALUES
    (1, 1, NULL, NULL, 1, 1, 'Concluída', '2026-01-14', TRUE),
    (2, 2, NULL, NULL, 2, 2, 'Concluída', '2026-03-04', TRUE),
    (3, 6, 3, 1, 2, 4, 'Concluída', '2026-08-13', TRUE);

SELECT setval(pg_get_serial_sequence('funcionarios', 'id'), (SELECT MAX(id) FROM funcionarios));
SELECT setval(pg_get_serial_sequence('obras', 'id'), (SELECT MAX(id) FROM obras));
SELECT setval(pg_get_serial_sequence('equipamentos', 'id'), (SELECT MAX(id) FROM equipamentos));
SELECT setval(pg_get_serial_sequence('solicitacoes', 'id'), (SELECT MAX(id) FROM solicitacoes));
SELECT setval(pg_get_serial_sequence('materiais_solicitados', 'id'), (SELECT MAX(id) FROM materiais_solicitados));
SELECT setval(pg_get_serial_sequence('movimentacoes', 'id'), (SELECT MAX(id) FROM movimentacoes));
