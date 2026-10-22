const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const chaveEquipamento = (e) => e.catalogoChave || [e.tipo, e.modelo, e.medida].map(normalizar).join('|');

export const pedidoEmAtendimento = (pedido) => pedido.solicitacaoPaiId != null || pedido.materiais.some((m) => Boolean(m.identificacao?.trim()) || m.quantidadeEntradaEstoque > 0 || (pedido.status !== 'Aguardando financeiro' && m.quantidadeCompra > 0));

export function catalogoParaEdicao(equipamentos, destinoId) {
  const grupos = new Map();
  for (const e of equipamentos.filter((item) => !item.arquivado)) {
    const chave = chaveEquipamento(e);
    if (!grupos.has(chave)) grupos.set(chave, { chave, catalogoChave: chave, nome: e.modelo, tipo: e.tipo, disponivel: 0 });
    const foraDoDestino = destinoId == null || e.obraId == null || String(e.obraId) !== String(destinoId);
    if (foraDoDestino && ['em estoque', 'em campo', 'disponivel'].includes(normalizar(e.status))) {
      grupos.get(chave).disponivel += Math.max(0, e.quantidadeDisponivel ?? e.quantidade ?? 1);
    }
  }
  return [...grupos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function agruparItensPedido(materiais) {
  const grupos = new Map();
  for (const m of materiais) {
    const chave = m.catalogoChave || normalizar(m.nome);
    if (!grupos.has(chave)) grupos.set(chave, { chave, catalogoChave: m.catalogoChave, nome: m.nome, quantidade: 0 });
    grupos.get(chave).quantidade += m.quantidade;
  }
  return [...grupos.values()];
}

export function dadosEdicaoPedido(pedido, tecnico, destinoId, itens, observacao) {
  const dados = { tecnico, obraOrigemId: pedido.obraOrigemId, obraDestinoId: destinoId, observacao: observacao.trim() };
  if (!pedidoEmAtendimento(pedido)) {
    dados.obraOrigemId = null;
    dados.materiais = itens.map(({ nome, quantidade, catalogoChave }) => ({ nome, quantidade, catalogoChave, identificacao: null }));
  }
  return dados;
}
