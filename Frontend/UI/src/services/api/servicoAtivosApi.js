import { ROTAS_API } from '../../config/rotasApi';
import { clienteHttp, obterDadosResposta } from './clienteHttp';
import { avisarAposSucesso } from '../notificacoes';

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
  cadastrar: (dados) => avisarAposSucesso(criar(ROTAS_API.obras, dados), 'Obra cadastrada.'),
  atualizar: (obraId, dados) => avisarAposSucesso(atualizar(ROTAS_API.obra(obraId), dados), 'Alterações da obra salvas.'),
  definirArquivamento: (id, arquivado) => avisarAposSucesso(atualizar(ROTAS_API.arquivamentoObra(id), { arquivado }), arquivado ? 'Obra arquivada.' : 'Obra restaurada.'),
  obterHistorico: (obraId) => obter(ROTAS_API.historicoObra(obraId)),
  consultarInventarioHistorico: (obraId, data) => obter(ROTAS_API.inventarioHistoricoObra(obraId), { params: { data } }),
};

export const apiEquipamentos = {
  listar: async () => (await obter(ROTAS_API.equipamentos)).map(normalizarEquipamento),
  listarCatalogo: () => obter(`${ROTAS_API.equipamentos}/catalogo`),
  cadastrar: async (dados) => normalizarEquipamento(await avisarAposSucesso(criar(ROTAS_API.equipamentos, dados), 'Equipamento cadastrado.')),
  atualizar: async (equipamentoId, dados) => normalizarEquipamento(await avisarAposSucesso(atualizar(ROTAS_API.equipamento(equipamentoId), dados), 'Alterações do equipamento salvas.')),
  definirArquivamento: async (id, arquivado) => normalizarEquipamento(await avisarAposSucesso(atualizar(ROTAS_API.arquivamentoEquipamento(id), { arquivado }), arquivado ? 'Equipamento arquivado.' : 'Equipamento restaurado.')),
  excluir: async (equipamentoId) => avisarAposSucesso(clienteHttp.delete(ROTAS_API.equipamento(equipamentoId)), 'Equipamento excluído.'),
  movimentar: async (equipamentoId, dados) => normalizarEquipamento(await avisarAposSucesso(criar(ROTAS_API.movimentacoesEquipamento(equipamentoId), dados), 'Movimentação registrada.')),
  obterHistorico: (equipamentoId) => obter(ROTAS_API.historicoEquipamento(equipamentoId)),
};

export const apiCategoriasEquipamento = {
  listar: () => obter(ROTAS_API.categoriasEquipamento),
  cadastrar: (dados) => avisarAposSucesso(criar(ROTAS_API.categoriasEquipamento, dados), 'Categoria cadastrada.'),
};

export const apiFuncionarios = {
  listar: () => obter(ROTAS_API.funcionarios),
  cadastrar: (dados) => avisarAposSucesso(criar(ROTAS_API.funcionarios, dados), 'Funcionário cadastrado.'),
  atualizar: (funcionarioId, dados) => avisarAposSucesso(atualizar(ROTAS_API.funcionario(funcionarioId), dados), 'Alterações do funcionário salvas.'),
  definirArquivamento: (id, arquivado) => avisarAposSucesso(atualizar(ROTAS_API.arquivamentoFuncionario(id), { arquivado }), arquivado ? 'Funcionário arquivado.' : 'Funcionário restaurado.'),
};

export const apiAtividades = {
  listar: () => obter(ROTAS_API.atividades),
  cadastrar: (dados) => avisarAposSucesso(criar(ROTAS_API.atividades, dados), (pedido) => pedido.status === 'Pendente' ? 'Pedido enviado para análise do gerente.' : 'Pedido criado e encaminhado ao estoque.'),
  atualizar: (atividadeId, dados) => avisarAposSucesso(atualizar(ROTAS_API.atividade(atividadeId), dados), 'Alterações da solicitação salvas.'),
  aprovar: (atividadeId) => avisarAposSucesso(criar(ROTAS_API.aprovarAtividade(atividadeId)), 'Pedido aceito e encaminhado ao estoque.'),
  rejeitar: (atividadeId) => avisarAposSucesso(criar(ROTAS_API.rejeitarAtividade(atividadeId)), 'Pedido rejeitado.'),
  solicitarCompra: (atividadeId, materialId, quantidade) => avisarAposSucesso(criar(ROTAS_API.solicitarCompraMaterial(atividadeId, materialId), { quantidade }), 'Solicitação de compra registrada.'),
  registrarAquisicao: (atividadeId, materialId, quantidade, numeroNota, identificacao) => avisarAposSucesso(criar(ROTAS_API.registrarAquisicaoMaterial(atividadeId, materialId), { quantidade, numeroNota, identificacao }), 'Entrada dos materiais registrada no estoque.'),
  distribuir: (atividadeId, atendimentos) => avisarAposSucesso(criar(ROTAS_API.distribuirAtividade(atividadeId), { atendimentos }), 'Materiais separados e reservados para atendimento.'),
  iniciarTransito: (atividadeId, notificar = true) => {
    const operacao = criar(ROTAS_API.iniciarTransitoAtividade(atividadeId));
    return notificar ? avisarAposSucesso(operacao, 'Saída dos materiais registrada.') : operacao;
  },
  concluir: (atividadeId) => avisarAposSucesso(criar(ROTAS_API.concluirAtividade(atividadeId)), 'Recebimento confirmado. Solicitação finalizada.'),
};
export const apiDeposito = { listar: () => obter(ROTAS_API.deposito) };
export const apiPainel = { obterResumo: () => obter(ROTAS_API.resumo) };

export async function carregarDadosIniciaisApi() {
  const [obras, equipamentos, funcionarios, solicitacoes, categoriasEquipamento] = await Promise.all([
    apiObras.listar(), apiEquipamentos.listar(), apiFuncionarios.listar(), apiAtividades.listar(), apiCategoriasEquipamento.listar(),
  ]);
  return { obras, equipamentos, funcionarios, solicitacoes, categoriasEquipamento };
}
