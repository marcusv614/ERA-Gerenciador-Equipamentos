import { clienteHttp, obterDadosResposta } from './clienteHttp';
import { adaptarPedidoFinanceiro } from '../../utils/pedidosFinanceiros';
export const financeiroApi = {
  pedidos: async()=>obterDadosResposta(await clienteHttp.get('/atividades/pedidos-financeiros')).map(adaptarPedidoFinanceiro),
  disponibilidade: async()=>obterDadosResposta(await clienteHttp.get('/equipamentos/disponibilidade-financeira')),
};
