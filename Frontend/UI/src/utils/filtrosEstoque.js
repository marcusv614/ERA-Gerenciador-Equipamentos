import { ordenarFilaEstoque } from './operacaoEstoque.js';

export function hojeNoEstoque(agora = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(agora);
}

export function intervaloEstoque(periodo, hoje = hojeNoEstoque()) {
  if (periodo === 'hoje') return { inicio: hoje, fim: hoje };
  const data = new Date(`${hoje}T12:00:00Z`);
  if (periodo === 'semana') {
    const segunda = new Date(data);
    segunda.setUTCDate(data.getUTCDate() - (data.getUTCDay() + 6) % 7);
    const domingo = new Date(segunda); domingo.setUTCDate(segunda.getUTCDate() + 6);
    return { inicio: segunda.toISOString().slice(0, 10), fim: domingo.toISOString().slice(0, 10) };
  }
  if (periodo === 'mes') return {
    inicio: `${hoje.slice(0, 7)}-01`,
    fim: new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth() + 1, 0, 12)).toISOString().slice(0, 10),
  };
  return { inicio: '', fim: '' };
}

export function validarPeriodoEstoque({ inicio, fim }) {
  if (inicio && fim && fim < inicio) return 'A data final deve ser igual ou posterior à inicial.';
  return '';
}

export function pedidoNoPeriodoEstoque(pedido, intervalo) {
  if (validarPeriodoEstoque(intervalo)) return false;
  const { inicio, fim } = intervalo;
  if (!inicio && !fim) return true;
  const data = pedido.dataSolicitacao;
  return typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)
    && (!inicio || data >= inicio) && (!fim || data <= fim);
}

export function ordenarPedidosEstoque(pedidos, ordem = 'operacional') {
  if (ordem === 'operacional') return ordenarFilaEstoque(pedidos);
  const sentido = ordem === 'antigos' ? 1 : -1;
  return [...pedidos].sort((a, b) => {
    const dataA = a.dataSolicitacao || '', dataB = b.dataSolicitacao || '';
    if (!dataA && dataB) return 1;
    if (dataA && !dataB) return -1;
    return sentido * (dataA.localeCompare(dataB) || Number(a.id) - Number(b.id));
  });
}
