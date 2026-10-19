import { obterEtapaSolicitacao, pertenceEtapaSolicitacao } from './statusSolicitacao.js';

export const normalizarPesquisa = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
const codigoNormalizado = (valor) => String(valor).replace(/^0+(?=\d)/, '');

export function locaisDoPedido(pedido) {
  const locais = [];
  if (pedido.obraOrigemId != null) locais.push(String(pedido.obraOrigemId));
  else if (pedido.materiais?.length && pedido.materiais.every((m) => m.identificacao?.trim())) locais.push('deposito');
  locais.push(pedido.obraDestinoId == null ? 'deposito' : String(pedido.obraDestinoId));
  return [...new Set(locais)];
}

export function pesquisarSolicitacoes(pedidos, consulta, buscarObra) {
  const termo = normalizarPesquisa(consulta);
  if (!termo) return pedidos;
  const codigo = termo.match(/^(?:(?:solicitacao|pedido|codigo)\s*)?#?\s*(\d+)$/);
  return pedidos.filter((pedido) => {
    const codigos = [pedido.id, pedido.solicitacaoPaiId].filter((id) => id != null).map(codigoNormalizado);
    if (codigo) return codigos.includes(codigoNormalizado(codigo[1]));
    const locais = locaisDoPedido(pedido).map((id) => id === 'deposito' ? 'Depósito central' : buscarObra(Number(id))?.nome || `Obra ${id}`);
    const datas = [pedido.dataSolicitacao, pedido.dataDecisao, pedido.transitoEm?.slice(0,10), pedido.concluidaEm?.slice(0,10)].filter(Boolean).flatMap((data) => [data, data.split('-').reverse().join('/')]);
    const texto = normalizarPesquisa([pedido.tecnico, pedido.solicitante, pedido.tipo, pedido.status, obterEtapaSolicitacao(pedido.status).rotulo, pedido.observacao, ...locais, ...datas, ...(pedido.materiais || []).flatMap((m) => [m.nome,m.identificacao,m.catalogoChave])].filter(Boolean).join(' '));
    return termo.split(/\s+/).every((palavra) => /^#\d+$/.test(palavra) ? codigos.includes(codigoNormalizado(palavra.slice(1))) : texto.includes(palavra));
  });
}

export function filtrarSolicitacoes(pedidos, { inicio = '', fim = '', obra = 'todas', etapa = 'todas' } = {}) {
  if (inicio && fim && fim < inicio) return [];
  return pedidos.filter((pedido) => (!inicio || pedido.dataSolicitacao >= inicio) && (!fim || pedido.dataSolicitacao <= fim)
    && (obra === 'todas' || locaisDoPedido(pedido).includes(String(obra)))
    && (etapa === 'todas' || pertenceEtapaSolicitacao(pedido.status, etapa)));
}
