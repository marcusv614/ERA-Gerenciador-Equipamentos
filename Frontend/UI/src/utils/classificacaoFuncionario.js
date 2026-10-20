const normalizarCargo = (cargo) => String(cargo || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLocaleLowerCase('pt-BR');

export const ehFuncionarioEstoquista = (funcionarioOuCargo) => {
  const cargo = typeof funcionarioOuCargo === 'string'
    ? funcionarioOuCargo
    : funcionarioOuCargo?.cargo;

  return /(^|\s)(estoquista|estoque)(\s|$)/.test(normalizarCargo(cargo));
};
