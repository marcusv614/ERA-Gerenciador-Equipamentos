const ETAPAS_POR_STATUS = {
  Cancelada: {chave:'rejeitada',rotulo:'Cancelada'},
  'Cancelamento solicitado': {chave:'pendente',rotulo:'Cancelamento solicitado'},
  Pendente: { chave: 'pendente', rotulo: 'Pendente' },
  'Aguardando financeiro': { chave: 'pendente', rotulo: 'Aguardando financeiro' },
  Aprovada: { chave: 'aceita', rotulo: 'Aceita' },
  'Aguardando coleta': { chave: 'aceita', rotulo: 'Aceita' },
  'Em trânsito': { chave: 'aceita', rotulo: 'Aceita' },
  Rejeitada: { chave: 'rejeitada', rotulo: 'Rejeitada' },
  Concluída: { chave: 'finalizada', rotulo: 'Finalizada' },
};

const ETAPA_DESCONHECIDA = { chave: 'pendente', rotulo: 'Pendente' };

export function obterEtapaSolicitacao(status) {
  return ETAPAS_POR_STATUS[status] || ETAPA_DESCONHECIDA;
}

export function pertenceEtapaSolicitacao(status, etapa) {
  return obterEtapaSolicitacao(status).chave === etapa;
}
