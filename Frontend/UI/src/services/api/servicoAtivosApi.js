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
  solicitarCalibracao: async (id,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes`,dados),'Calibração solicitada. O equipamento foi reservado para esse atendimento.')),
  retirarParaCalibracao: async (id,cid,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes/${cid}/retirada`,dados),'Retirada confirmada. O Fluke está no depósito aguardando envio.')),
  enviarCalibracao: async (id,cid,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes/${cid}/envio`,dados),'Envio ao laboratório registrado.')),
  retornarCalibracao: async (id,cid,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes/${cid}/retorno`,dados),'Retorno e certificado registrados. O equipamento está no depósito.')),
  registrarCertificado: async (id,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes/certificados`,dados),'Certificado anterior registrado.')),
  cancelarCalibracao: async (id,cid,dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/calibracoes/${cid}/cancelamento`,dados),'Atendimento de calibração cancelado.')),
  abrirManutencao: async (id, dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/manutencoes`, dados), 'Manutenção registrada. As unidades selecionadas foram bloqueadas.')),
  concluirManutencao: async (id, manutencaoId, dados) => normalizarEquipamento(await avisarAposSucesso(criar(`${ROTAS_API.equipamento(id)}/manutencoes/${manutencaoId}/conclusao`, dados), 'Manutenção concluída. Unidades liberadas para novos pedidos.')),
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
  cadastrarTransporteDireto: (dados) => avisarAposSucesso(criar(ROTAS_API.transporteDireto,dados), 'Transporte encaminhado diretamente ao estoque.'),
  salvarPlanoFinanceiro: (id,dados) => avisarAposSucesso(criar(ROTAS_API.planoFinanceiro(id),dados), 'Plano de transporte e compra salvo. Confira os dados antes de aprovar.'),
  executarPlano: (id) => avisarAposSucesso(criar(ROTAS_API.execucaoPlano(id)), 'Separação confirmada conforme o plano financeiro.'),
  cadastrar: (dados) => avisarAposSucesso(criar(ROTAS_API.atividades, dados), (pedido) => pedido.status === 'Pendente' ? 'Pedido enviado para a primeira análise.' : 'Pedido criado e encaminhado ao Financeiro.'),
  atualizar: (atividadeId, dados) => avisarAposSucesso(atualizar(ROTAS_API.atividade(atividadeId), dados), 'Alterações da solicitação salvas.'),
  aprovar: (atividadeId) => avisarAposSucesso(criar(ROTAS_API.aprovarAtividade(atividadeId)), (pedido) => pedido.status === 'Aguardando financeiro' ? 'Pedido aprovado e encaminhado ao Financeiro.' : 'Pedido aprovado e liberado para o estoque.'),
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
export const apiAuditoriasTecnico = {
  listarTodas: () => obter('/auditorias'),
  listar: (tecnicoId) => obter(ROTAS_API.auditoriasTecnico(tecnicoId)),
  materiais: (tecnicoId) => obter(ROTAS_API.materiaisAuditoriaTecnico(tecnicoId)),
  consultar: (tecnicoId, id) => obter(ROTAS_API.auditoriaTecnico(tecnicoId, id)),
  criar: (tecnicoId, equipamentoIds) => avisarAposSucesso(criar(ROTAS_API.auditoriasTecnico(tecnicoId), { equipamentoIds }), 'Ficha de vistoria criada. Você já pode exportar o PDF.'),
  registrar: (tecnicoId, id, dados) => avisarAposSucesso(atualizar(ROTAS_API.auditoriaTecnico(tecnicoId, id), dados), dados.concluir ? 'Vistoria concluída e registrada no histórico.' : 'Rascunho da vistoria salvo.'),
};
export const apiDeposito = { listar: () => obter(ROTAS_API.deposito) };
export const apiPainel = { obterResumo: () => obter(ROTAS_API.resumo) };

export async function carregarDadosIniciaisApi() {
  const [obras, equipamentos, funcionarios, solicitacoes, categoriasEquipamento] = await Promise.all([
    apiObras.listar(), apiEquipamentos.listar(), apiFuncionarios.listar(), apiAtividades.listar(), apiCategoriasEquipamento.listar(),
  ]);
  return { obras, equipamentos, funcionarios, solicitacoes, categoriasEquipamento };
}
