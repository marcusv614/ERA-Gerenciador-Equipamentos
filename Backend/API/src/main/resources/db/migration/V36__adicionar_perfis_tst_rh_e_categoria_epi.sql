ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;

ALTER TABLE usuarios
    ADD CONSTRAINT usuarios_perfil_check
    CHECK (perfil IN ('ADMIN', 'GERENTE', 'RH', 'ESTOQUE', 'TECNICO', 'TST'));

UPDATE equipamentos
SET tipo = 'EPI'
WHERE LOWER(tipo) = LOWER('Segurança, EPI e acesso');

DELETE FROM categorias_equipamento categoria_antiga
WHERE categoria_antiga.slug = 'seguranca-epi-acesso'
  AND EXISTS (SELECT 1 FROM categorias_equipamento categoria_epi WHERE categoria_epi.slug = 'epi');

UPDATE categorias_equipamento
SET nome = 'EPI',
    slug = 'epi',
    descricao = 'Equipamentos de proteção individual destinados aos Técnicos de Segurança do Trabalho.',
    ordem = 105
WHERE slug = 'seguranca-epi-acesso';

INSERT INTO categorias_equipamento
    (nome, slug, descricao, icone, campos, sistema, ativa, ordem)
SELECT
    'EPI',
    'epi',
    'Equipamentos de proteção individual destinados aos Técnicos de Segurança do Trabalho.',
    'HardHat',
    '[{"chave":"marca","rotulo":"Marca ou fabricante","tipo":"text","placeholder":"Ex.: 3M"},{"chave":"medida","rotulo":"Tamanho","tipo":"text","placeholder":"Ex.: M, 42"},{"chave":"numeroCa","rotulo":"Número do CA","tipo":"text","placeholder":"Ex.: CA 12345"},{"chave":"validade","rotulo":"Data de validade","tipo":"date"},{"chave":"ultimaInspecao","rotulo":"Última inspeção","tipo":"date"},{"chave":"patrimonio","rotulo":"Número patrimonial","tipo":"text","placeholder":"Quando houver"}]'::JSONB,
    TRUE,
    TRUE,
    105
WHERE NOT EXISTS (
    SELECT 1 FROM categorias_equipamento WHERE LOWER(nome) = 'epi' OR slug = 'epi'
);
