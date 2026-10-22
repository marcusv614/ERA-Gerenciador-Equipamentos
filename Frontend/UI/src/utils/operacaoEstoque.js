import { locaisDoPedido } from './pesquisaSolicitacoes.js';

export function locaisOperacaoEstoque(pedido) {
  return [...new Set([...locaisDoPedido(pedido), ...(pedido.planoFinanceiro || []).flatMap(p => (p.origens || []).map(o => String(o.obraOrigemId ?? 'deposito'))), ...(pedido.materiais.some(m=>m.quantidadeEntradaEstoque>0) ? ['deposito'] : [])])];
}

export function etapaEstoque(pedido) {
  const materiais = pedido.materiais || [];
  const separado = materiais.length > 0 && materiais.every(m => m.identificacao?.trim());
  const faltaCompra = materiais.reduce((s, m) => s + Math.max(0, (m.quantidadeCompra || 0) - (m.quantidadeEntradaEstoque || 0)), 0);
  const iniciado = (pedido.eventosFinanceiros || []).some(e => e.tipo === 'INICIO_ATENDIMENTO');
  if (pedido.status === 'Concluída') return { chave: 'concluido', titulo: 'Concluído', descricao: 'Recebimento confirmado.', prioridade: 5 };
  if (pedido.status === 'Rejeitada') return { chave: 'rejeitado', titulo: 'Rejeitado', descricao: 'Pedido não autorizado.', prioridade: 5 };
  if (pedido.status === 'Em trânsito' && pedido.obraDestinoId != null) return { chave: 'aguardar', titulo: 'Enviado', descricao: 'O técnico precisa confirmar o recebimento.', prioridade: 4 };
  if (['Aguardando coleta', 'Em trânsito'].includes(pedido.status) && pedido.obraDestinoId == null) return { chave: 'receber', titulo: pedido.status === 'Aguardando coleta' ? 'Retirar na obra' : 'Receber no depósito', descricao: 'Confirme o recebimento somente quando os materiais chegarem ao depósito.', acao: 'Confirmar recebimento', prioridade: 0 };
  if (pedido.status !== 'Aprovada') return { chave: 'aguardar', titulo: 'Aguardando aprovação', descricao: 'Pedido ainda não liberado para o estoque.', prioridade: 4 };
  if (separado) return { chave: 'enviar', titulo: 'Pronto para enviar', descricao: 'Os materiais estão separados. Confirme a saída para transporte.', acao: 'Confirmar envio', prioridade: 0 };
  if (!pedido.planoFinanceiro?.length) return { chave: 'aguardar', titulo: 'Aguardando planejamento', descricao: 'O Financeiro precisa definir as origens e compras.', prioridade: 4 };
  if (faltaCompra > 0) return { chave: 'comprar', titulo: iniciado ? 'Compra em andamento' : 'Precisa comprar', descricao: `${faltaCompra} un. ainda aguardam entrada. Registre os materiais que já chegaram.`, acao: iniciado ? undefined : 'Iniciar compra', iniciar: !iniciado, faltaCompra, prioridade: 2 };
  const iniciar = !iniciado && materiais.every(m=>!(m.quantidadeEntradaEstoque>0));
  return { chave: 'separar', titulo: 'Separar materiais', descricao: 'Confira as quantidades e os locais de retirada abaixo.', acao: iniciar ? 'Iniciar separação' : 'Confirmar separação', iniciar, prioridade: 1 };
}

export function ordenarFilaEstoque(pedidos) {
  return [...pedidos].sort((a, b) => etapaEstoque(a).prioridade - etapaEstoque(b).prioridade
    || String(a.dataDecisao || a.dataSolicitacao || '').localeCompare(String(b.dataDecisao || b.dataSolicitacao || '')) || a.id - b.id);
}

export function itensOperacionais(pedido) {
  const separado = pedido.materiais.length > 0 && pedido.materiais.every(m => m.identificacao?.trim());
  const grupos = new Map();
  for (const material of pedido.materiais) {
    const chave = material.catalogoChave || material.nome.trim().toLocaleLowerCase('pt-BR');
    if (!grupos.has(chave)) grupos.set(chave, { chave, nome: material.nome, quantidade: 0, compra: 0, recebida: 0, origens: [], materiais: [] });
    const item = grupos.get(chave);
    item.quantidade += material.quantidade;
    item.compra += material.quantidadeCompra || 0;
    item.recebida += material.quantidadeEntradaEstoque || 0;
    item.materiais.push(material);
    if (separado) item.origens.push({ obraOrigemId: pedido.obraOrigemId, identificacao: material.identificacao, quantidade: material.quantidade });
    else item.origens.push(...(pedido.planoFinanceiro || []).filter(p => String(p.materialId) === String(material.id)).flatMap(p => p.origens || []));
  }
  return [...grupos.values()];
}

export function comprasOperacionais(pedidos) {
  return pedidos.filter(p => p.status === 'Aprovada' && !p.materiais.every(m => m.identificacao?.trim())).flatMap(solicitacao => solicitacao.materiais
    .filter(m => m.quantidadeCompra > 0)
    .map(material => ({ solicitacao, material, pendente: Math.max(0, material.quantidadeCompra - (material.quantidadeAdquirida || 0)), pendenteEntrada: Math.max(0, material.quantidadeCompra - (material.quantidadeEntradaEstoque || 0)) })));
}
