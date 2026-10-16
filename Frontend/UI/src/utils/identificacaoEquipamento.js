const TIPOS_MANUAIS = new Set([
  'acessorios', 'alicates', 'brocas aco rapido', 'brocas alvenaria', 'brocas madeira',
  'chave canhao', 'chaves biela tipo l', 'chaves combinadas', 'chaves combinadas com catraca',
  'chaves de fenda', 'chaves fixas', 'chaves philips', 'ferramentas', 'pontas', 'soquetes magneticos',
  'ferramentas manuais',
]);

const CATEGORIAS_SEM_SERIE = new Set([
  ...TIPOS_MANUAIS,
  'cabos e fibras',
  'conectividade e componentes passivos',
  'infraestrutura, passagem e fixacao',
  'consumiveis e limpeza',
]);

const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');

export const ferramentaManual = (tipo) => TIPOS_MANUAIS.has(normalizar(tipo));
export const tipoSemNumeroSerie = (tipo) => CATEGORIAS_SEM_SERIE.has(normalizar(tipo));

export const identificacaoVisivel = (identificacao, tipo) => {
  const valor = String(identificacao || '').trim();
  if (!valor || ferramentaManual(tipo) || /^(ERA|INT)-/i.test(valor)) return null;
  return valor;
};
