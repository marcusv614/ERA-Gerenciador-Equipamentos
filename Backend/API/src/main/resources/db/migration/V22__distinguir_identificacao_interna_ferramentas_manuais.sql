UPDATE cautela_materiais cm
SET identificacao = 'INT-' || e.id
FROM equipamentos e
WHERE cm.identificacao = e.serie
  AND e.tipo IN (
      'Acessorios', 'Alicates', 'Brocas Aço Rápido', 'Brocas Alvenaria', 'Brocas Madeira',
      'Chave Canhão', 'Chaves Biela Tipo L', 'Chaves Combinadas', 'Chaves Combinadas com Catraca',
      'Chaves de Fenda', 'Chaves Fixas', 'Chaves Philips', 'Ferramentas', 'Pontas', 'Soquetes Magnéticos'
  );

UPDATE equipamentos
SET serie = 'INT-' || id
WHERE tipo IN (
    'Acessorios', 'Alicates', 'Brocas Aço Rápido', 'Brocas Alvenaria', 'Brocas Madeira',
    'Chave Canhão', 'Chaves Biela Tipo L', 'Chaves Combinadas', 'Chaves Combinadas com Catraca',
    'Chaves de Fenda', 'Chaves Fixas', 'Chaves Philips', 'Ferramentas', 'Pontas', 'Soquetes Magnéticos'
);
