// Validação da entrada visual. Os limites continuam sendo fornecidos pelo painel.
export function erroQuantidadeTecnicoCampo(valor, limite) {
  if (valor === '') return 'Informe a quantidade.';
  if (!/^\d+$/.test(valor)) return 'Use um número inteiro, como 1, 2 ou 3.';
  const quantidade = Number(valor);
  if (quantidade < 1) return 'A quantidade deve ser de pelo menos 1.';
  if (quantidade > limite) return `A quantidade máxima é ${limite}.`;
  return '';
}
