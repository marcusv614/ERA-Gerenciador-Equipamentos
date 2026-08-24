DELETE FROM movimentacoes WHERE id IN (1, 2, 3, 4, 5, 6, 7);
DELETE FROM solicitacoes WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8);

UPDATE equipamentos
SET quantidade = quantidade + (SELECT quantidade FROM equipamentos WHERE id = 100)
WHERE id = 9;

DELETE FROM equipamentos WHERE id IN (1, 2, 3, 4, 5, 6, 100);
DELETE FROM obra_responsaveis WHERE obra_id IN (1, 2, 3);
DELETE FROM obras WHERE id IN (1, 2, 3);
DELETE FROM funcionarios WHERE id IN (1, 2, 3, 4, 5, 6, 8);

INSERT INTO equipamentos
    (tipo, modelo, serie, status, data_entrada, quantidade, quantidade_reservada, controle_quantidade)
VALUES
    ('FLUKE', 'Fluke', '111-111', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('FLUKE', 'Fluke', '222-222', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('FLUKE', 'Fluke', '333-333', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('FLUKE', 'Fluke', '444-444', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('MAQUINA_FUSAO', 'Máquina de fusão', '555-555', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('MAQUINA_FUSAO', 'Máquina de fusão', '666-666', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('MAQUINA_FUSAO', 'Máquina de fusão', '777-777', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('MAQUINA_FUSAO', 'Máquina de fusão', '888-888', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('OTDR', 'OTDR', '999-999', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('OTDR', 'OTDR', '101-101', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL'),
    ('OTDR', 'OTDR', '202-202', 'Em estoque', CURRENT_DATE, 1, 0, 'INDIVIDUAL');
