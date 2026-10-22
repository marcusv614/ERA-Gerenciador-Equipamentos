import { clienteHttp, obterDadosResposta } from './clienteHttp';

export const notificacoesApi = {
  listar: async (pagina = 0) => obterDadosResposta(await clienteHttp.get('/notificacoes', { params: { pagina } })),
  marcarLida: async (id) => obterDadosResposta(await clienteHttp.post(`/notificacoes/${id}/leitura`)),
};
