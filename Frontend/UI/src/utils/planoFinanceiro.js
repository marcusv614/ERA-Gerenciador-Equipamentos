const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
export const localEquipamento = (e) => e.obraId == null ? 'deposito' : String(e.obraId);
export const nomeLocalPlano = (id, obras) => id == null || id === 'deposito' ? 'Depósito central' : obras.find((o) => String(o.id) === String(id))?.nome || `Obra #${id}`;
export function equipamentosParaRevisao(solicitacao, equipamentos) {
  if (solicitacao.status !== 'Aprovada') return equipamentos;
  const reservados = new Map();
  (solicitacao.planoFinanceiro || []).flatMap((p) => p.origens).forEach((o) => reservados.set(String(o.equipamentoId), (reservados.get(String(o.equipamentoId)) || 0) + o.quantidade));
  return equipamentos.map((e) => ({ ...e, quantidadeDisponivel: (e.quantidadeDisponivel ?? 1) + (reservados.get(String(e.id)) || 0) }));
}
const inteiro = (valor) => Number.isFinite(Number(valor)) ? Math.max(0, Math.trunc(Number(valor))) : 0;
const soma = (valores) => Object.values(valores || {}).reduce((total, valor) => total + inteiro(valor), 0);

export function iniciarPlano(solicitacao) {
  return Object.fromEntries(solicitacao.materiais.map((material) => {
    const item = (solicitacao.planoFinanceiro || []).find((p) => String(p.materialId) === String(material.id));
    return [material.id, { origens: Object.fromEntries((item?.origens || []).map((o) => [o.equipamentoId, o.quantidade])),
      compra: Math.max(material.quantidadeEntradaEstoque || 0, item?.quantidadeCompra ?? material.quantidadeCompra ?? 0), justificativa: item?.justificativa || '' }];
  }));
}

export function candidatosPlano(material, solicitacao, equipamentos, obras = []) {
  const entradas = new Set((solicitacao.entradasCompra || []).map((e) => String(e.equipamentoId)));
  return equipamentos.filter((e) => {
    const origem = localEquipamento(e);
    const destino = solicitacao.obraDestinoId == null ? 'deposito' : String(solicitacao.obraDestinoId);
    const mesmaOrigem = solicitacao.obraOrigemId == null || origem === String(solicitacao.obraOrigemId);
    const mesmoCatalogo = material.catalogoChave ? e.catalogoChave === material.catalogoChave : normalizar(e.modelo) === normalizar(material.nome);
    const entradaAntiga = material.quantidadeEntradaEstoque > 0 && e.observacoes === `Adquirido para a solicitação #${solicitacao.id}`;
    return !e.arquivado && !entradas.has(String(e.id)) && !entradaAntiga && mesmaOrigem && origem !== destino &&
      ['em estoque', 'em campo', 'disponivel'].includes(normalizar(e.status)) && (e.quantidadeDisponivel ?? 1) > 0 && mesmoCatalogo;
  }).sort((a, b) => Number(b.obraId == null) - Number(a.obraId == null) || nomeLocalPlano(a.obraId, obras).localeCompare(nomeLocalPlano(b.obraId, obras), 'pt-BR') || String(a.serie || a.id).localeCompare(String(b.serie || b.id), 'pt-BR', { numeric: true }));
}

export function saldoPlano(materialId, equipamento, plano) {
  const emOutros = Object.entries(plano).reduce((total, [id, item]) => String(id) === String(materialId) ? total : total + inteiro(item.origens[equipamento.id]), 0);
  const disponivel = equipamento.controleQuantidade === 'INDIVIDUAL' ? Math.min(1, equipamento.quantidadeDisponivel ?? 1) : equipamento.quantidadeDisponivel ?? 1;
  return Math.max(0, disponivel - emOutros);
}

export function resumoMaterialPlano(material, plano, candidatos) {
  const item = plano[material.id], transporte = soma(item.origens), compra = inteiro(item.compra);
  const invalidas = Object.entries(item.origens).filter(([id, q]) => q > 0 && !candidatos.some((e) => String(e.id) === id && q <= saldoPlano(material.id, e, plano)));
  const faltante = Math.max(0, material.quantidade - transporte - compra);
  const faltaJustificativa = compra > 0 && !item.justificativa.trim();
  return { transporte, compra, faltante, invalidas, faltaJustificativa,
    completo: transporte + compra === material.quantidade && !invalidas.length && !faltaJustificativa && compra >= (material.quantidadeEntradaEstoque || 0) };
}

export function alterarOrigemPlano(plano, material, equipamento, valor) {
  const item = plano[material.id], outros = soma(item.origens) - inteiro(item.origens[equipamento.id]);
  const quantidade = Math.min(inteiro(valor), saldoPlano(material.id, equipamento, plano), Math.max(0, material.quantidade - item.compra - outros));
  const origens = { ...item.origens };
  if (quantidade) origens[equipamento.id] = quantidade;
  else delete origens[equipamento.id];
  return { ...plano, [material.id]: { ...item, origens } };
}

export function alterarCompraPlano(plano, material, valor) {
  const item = plano[material.id];
  const compra = Math.max(material.quantidadeEntradaEstoque || 0, Math.min(inteiro(valor), Math.max(0, material.quantidade - soma(item.origens))));
  return { ...plano, [material.id]: { ...item, compra } };
}

export function preencherTransportePlano(plano, material, candidatos) {
  const origens = { ...plano[material.id].origens };
  let restante = Math.max(0, material.quantidade - plano[material.id].compra - soma(origens));
  candidatos.forEach((e) => {
    const atual = inteiro(origens[e.id]);
    const quantidade = Math.min(restante, Math.max(0, saldoPlano(material.id, e, plano) - atual));
    if (quantidade) origens[e.id] = atual + quantidade;
    restante -= quantidade;
  });
  return { ...plano, [material.id]: { ...plano[material.id], origens } };
}

export function dadosPlanoFinanceiro(solicitacao, plano, equipamentos, obras) {
  const materiais = solicitacao.materiais.map((material) => {
    if (!resumoMaterialPlano(material, plano, candidatosPlano(material, solicitacao, equipamentos, obras)).completo) throw new Error(`Revise as origens, quantidades e a justificativa de ${material.nome}.`);
    const item = plano[material.id];
    return { materialId: material.id, quantidadeCompra: item.compra, justificativa: item.justificativa.trim(),
      origens: Object.entries(item.origens).filter(([, q]) => q > 0).map(([id, quantidade]) => ({ equipamentoId: Number(id), quantidade })) };
  });
  return { materiais };
}
