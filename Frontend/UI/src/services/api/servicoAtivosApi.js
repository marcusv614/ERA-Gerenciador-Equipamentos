import { ROTAS_API } from '../../config/rotasApi';
import { clienteHttp, obterDadosResposta } from './clienteHttp';

const obter = async (rota, configuracao) => obterDadosResposta(await clienteHttp.get(rota, configuracao));
const criar = async (rota, dados) => obterDadosResposta(await clienteHttp.post(rota, dados));
const atualizar = async (rota, dados) => obterDadosResposta(await clienteHttp.patch(rota, dados));

const tipoEquipamentoParaInterface = {
  FLUKE: 'Fluke',
  OTDR: 'OTDR',
  MAQUINA_FUSAO: 'Máquina de fusão',
  ROTULADORA: 'Rotuladora',
};

const statusEquipamentoParaInterface = {
  'DISPONÍVEL': 'Em estoque',
  DISPONIVEL: 'Em estoque',
  MANUTENÇÃO: 'Em manutenção',
  MANUTENCAO: 'Em manutenção',
};

function normalizarEquipamento(equipamento) {
  const tipoRecebido = String(equipamento.tipo || '').trim();
  const statusRecebido = String(equipamento.status || '').trim();
  const tipoNormalizado = tipoRecebido.toLocaleUpperCase('pt-BR');
  const statusNormalizado = statusRecebido.toLocaleUpperCase('pt-BR');

  return {
    ...equipamento,
    tipo: tipoEquipamentoParaInterface[tipoNormalizado] || tipoRecebido || 'Outro',
    status: statusEquipamentoParaInterface[statusNormalizado] || statusRecebido,
  };
}

export const apiObras = {
  listar: () => obter(ROTAS_API.obras),
  cadastrar: (dados) => criar(ROTAS_API.obras, dados),
  atualizar: (obraId, dados) => atualizar(ROTAS_API.obra(obraId), dados),
  obterHistorico: (obraId) => obter(ROTAS_API.historicoObra(obraId)),
  obterCautela: (obraId) => obter(ROTAS_API.cautelaObra(obraId), { responseType: 'blob' }),
};

export const apiEquipamentos = {
  listar: async () => (await obter(ROTAS_API.equipamentos)).map(normalizarEquipamento),
  cadastrar: async (dados) => normalizarEquipamento(await criar(ROTAS_API.equipamentos, dados)),
  atualizar: async (equipamentoId, dados) => normalizarEquipamento(await atualizar(ROTAS_API.equipamento(equipamentoId), dados)),
  movimentar: async (equipamentoId, dados) => normalizarEquipamento(await criar(ROTAS_API.movimentacoesEquipamento(equipamentoId), dados)),
  obterHistorico: (equipamentoId) => obter(ROTAS_API.historicoEquipamento(equipamentoId)),
};

export const apiFuncionarios = {
  listar: () => obter(ROTAS_API.funcionarios),
  cadastrar: (dados) => criar(ROTAS_API.funcionarios, dados),
  atualizar: (funcionarioId, dados) => atualizar(ROTAS_API.funcionario(funcionarioId), dados),
};

export const apiAtividades = {
  listar: () => obter(ROTAS_API.atividades),
  cadastrar: (dados) => criar(ROTAS_API.atividades, dados),
  atualizar: (atividadeId, dados) => atualizar(ROTAS_API.atividade(atividadeId), dados),
  aprovar: (atividadeId) => criar(ROTAS_API.aprovarAtividade(atividadeId)),
  rejeitar: (atividadeId) => criar(ROTAS_API.rejeitarAtividade(atividadeId)),
  obterCautela: (atividadeId) => obter(ROTAS_API.cautelaAtividade(atividadeId), { responseType: 'blob' }),
};

export const apiDeposito = { listar: () => obter(ROTAS_API.deposito) };
export const apiPainel = { obterResumo: () => obter(ROTAS_API.resumo) };

export async function carregarDadosIniciaisApi() {
  const [obras, equipamentos, funcionarios, solicitacoes] = await Promise.all([
    apiObras.listar(), apiEquipamentos.listar(), apiFuncionarios.listar(), apiAtividades.listar(),
  ]);
  return { obras, equipamentos, funcionarios, solicitacoes };
}
