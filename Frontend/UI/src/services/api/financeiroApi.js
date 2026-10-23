import { clienteHttp, obterDadosResposta } from './clienteHttp';
import { apiEquipamentos } from './servicoAtivosApi';
import { adaptarPedidoFinanceiro } from '../../utils/pedidosFinanceiros';
export const financeiroApi = {
  pedidos: async(perfil)=>obterDadosResposta(await clienteHttp.get(perfil==='RH'?'/atividades/pedidos-rh':'/atividades/pedidos-financeiros')).map(adaptarPedidoFinanceiro),
  disponibilidade: async(perfil)=>perfil==='RH'?apiEquipamentos.listar().then(itens=>itens.filter(e=>['epi','segurança, epi e acesso'].includes(String(e.tipo).toLocaleLowerCase('pt-BR')))):obterDadosResposta(await clienteHttp.get('/equipamentos/disponibilidade-financeira')),
};
