export function obterHistoricoEquipamento(equipamento, buscarObraPorId) {
  if (Array.isArray(equipamento.historico) && equipamento.historico.length > 0) {
    return equipamento.historico;
  }

  const historico = [];
  const dataInicial = equipamento.dataEntrada || equipamento.data || equipamento.saida;

  if (equipamento.saida && equipamento.obraId) {
    historico.push({
      dataMovimentacao: equipamento.saida,
      dataSaida: equipamento.saida,
      dataEntrada: equipamento.dataEntrada || equipamento.data || equipamento.saida,
      origemObraId: null,
      destinoObraId: equipamento.obraId || null,
      origemNome: 'Depósito central',
      destinoNome: equipamento.obraId
        ? buscarObraPorId(equipamento.obraId)?.nome
        : 'Depósito central',
      tecnico: equipamento.tecnico || '—',
      status: equipamento.status,
    });
  }

  if (dataInicial) {
    historico.unshift({
      id: `entrada-${equipamento.id}`,
      dataMovimentacao: dataInicial,
      dataEntrada: dataInicial,
      origemNome: 'Cadastro inicial',
      destinoNome: 'Depósito central',
      tecnico: null,
      status: 'Em estoque',
      observacao: 'Entrada no sistema',
    });
  }
  return historico;
}
