-- Executada uma única vez pelo Flyway no início oficial da aplicação.
DELETE FROM cautela_materiais;
DELETE FROM cautelas;
DELETE FROM inventario_obra_snapshot_itens;
DELETE FROM inventario_obra_snapshots;
DELETE FROM movimentacoes;
DELETE FROM materiais_solicitados;
DELETE FROM solicitacoes;
DELETE FROM obra_responsaveis;
DELETE FROM usuarios;
DELETE FROM equipamentos;
DELETE FROM obras;
DELETE FROM funcionarios;

ALTER SEQUENCE cautela_materiais_id_seq RESTART WITH 1;
ALTER SEQUENCE cautelas_id_seq RESTART WITH 1;
ALTER SEQUENCE inventario_obra_snapshot_itens_id_seq RESTART WITH 1;
ALTER SEQUENCE inventario_obra_snapshots_id_seq RESTART WITH 1;
ALTER SEQUENCE movimentacoes_id_seq RESTART WITH 1;
ALTER SEQUENCE materiais_solicitados_id_seq RESTART WITH 1;
ALTER SEQUENCE solicitacoes_id_seq RESTART WITH 1;
ALTER SEQUENCE usuarios_id_seq RESTART WITH 1;
ALTER SEQUENCE equipamentos_id_seq RESTART WITH 1;
ALTER SEQUENCE obras_id_seq RESTART WITH 1;
ALTER SEQUENCE funcionarios_id_seq RESTART WITH 1;
