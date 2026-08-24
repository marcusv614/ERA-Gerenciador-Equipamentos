export function obterDataAtual() {
  const dataAtual = new Date();
  const ano = dataAtual.getFullYear();
  const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
  const dia = String(dataAtual.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function formatarData(dataIso) {
  if (!dataIso) return '—';
  if (dataIso instanceof Date) {
    const dia = String(dataIso.getDate()).padStart(2, '0');
    const mes = String(dataIso.getMonth() + 1).padStart(2, '0');
    return `${dia}/${mes}/${dataIso.getFullYear()}`;
  }
  if (typeof dataIso === 'string' && dataIso.includes('-')) {
    const [ano, mes, dia] = dataIso.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  return String(dataIso);
}
