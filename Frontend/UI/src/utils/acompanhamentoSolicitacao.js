export const COLUNAS_ACOMPANHAMENTO = [
  { id: 'gerencia', titulo: 'Aguardando aprovação', rotulo: 'Gerência / RH', descricao: 'Primeira análise do pedido' },
  { id: 'financeiro', titulo: 'No Financeiro', rotulo: 'Financeiro', descricao: 'Análise e planejamento' },
  { id: 'providencias', titulo: 'Compra e separação', rotulo: 'Providências', descricao: 'Atendimento pelo estoque' },
  { id: 'envio', titulo: 'Em trânsito', rotulo: 'Envio', descricao: 'Aguardando recebimento' },
  { id: 'finalizada', titulo: 'Concluídas', rotulo: 'Concluídas', descricao: 'Recebimento confirmado' },
  { id: 'rejeitada', titulo: 'Rejeitadas', rotulo: 'Rejeitadas', descricao: 'Pedidos não autorizados' },
];

export function visivelNoFinanceiro(pedido) {
  if (pedido.movimentacaoDireta) return false;
  return ['Aguardando financeiro', 'Aprovada', 'Aguardando coleta', 'Em trânsito', 'Concluída'].includes(pedido.status) ||
    (pedido.status === 'Rejeitada' && (pedido.eventosFinanceiros || []).some((e) => e.tipo === 'REJEICAO'));
}

export const pedidosDoPerfil = (pedidos, perfil) => perfil === 'FINANCEIRO' ? pedidos.filter(visivelNoFinanceiro) : pedidos;

export function acompanhamentoSolicitacao(pedido) {
  const eventos = pedido.eventosFinanceiros || [];
  const compras = (pedido.compras?.length ? pedido.compras : pedido.materiais || []).filter((m) => m.quantidadeCompra > 0);
  const compra = compras.reduce((s, m) => s + m.quantidadeCompra, 0);
  const recebida = compras.reduce((s, m) => s + (m.quantidadeEntradaEstoque || 0), 0);
  const adquirida = compras.reduce((s, m) => s + (m.quantidadeAdquirida || 0), 0);
  const inicio = eventos.find((e) => e.tipo === 'INICIO_ATENDIMENTO');
  const materiais = pedido.materiais || [];
  const separado = materiais.length > 0 && materiais.every((m) => m.identificacao?.trim());
  const parcial = (pedido.materiaisOriginais || []).reduce((s, m) => s + m.quantidade, 0) > materiais.reduce((s, m) => s + m.quantidade, 0);
  const epi = materiais.length > 0 && materiais.every((m) => ['epi', 'epis', 'seguranca, epi e acesso'].includes(String(m.catalogoChave || '').split('|')[0].toLowerCase()));
  const gestor = epi ? 'RH' : 'Gerência';
  let etapa;
  switch (pedido.status) {
    case 'Pendente': etapa = { grupo: 'gerencia', passo: 0, rotulo: `Aguardando ${gestor}`, responsavel: gestor, detalhe: 'O pedido ainda não foi liberado para o Financeiro.' }; break;
    case 'Aguardando financeiro': etapa = { grupo: 'financeiro', passo: 1, rotulo: pedido.planoFinanceiro?.length ? 'Plano financeiro em preparação' : 'Aguardando análise financeira', responsavel: 'Financeiro', detalhe: 'Primeira aprovação concluída. O Financeiro definirá transporte e compra antes de liberar ao estoque.' }; break;
    case 'Aprovada':
      if (separado) etapa = { grupo: 'providencias', passo: 2, rotulo: 'Pronto para envio', responsavel: 'Estoque', detalhe: 'Materiais definidos e reservados. Aguardando a confirmação de saída.' };
      else if (compra > recebida && recebida > 0) etapa = { grupo: 'providencias', passo: 2, rotulo: 'Compra parcialmente recebida', responsavel: 'Estoque', detalhe: `${recebida} de ${compra} unidades da compra deram entrada. ${compra - recebida} ainda aguardam recebimento.` };
      else if (compra > recebida && (inicio || adquirida > 0)) etapa = { grupo: 'providencias', passo: 2, rotulo: 'Compra em andamento', responsavel: 'Estoque', detalhe: `Compra iniciada. ${compra - recebida} unidades ainda aguardam entrada no estoque.` };
      else if (compra > 0 && recebida >= compra) etapa = { grupo: 'providencias', passo: 2, rotulo: 'Compra recebida · falta separar', responsavel: 'Estoque', detalhe: 'As compras já deram entrada. Aguardando a confirmação da separação.' };
      else if (inicio) etapa = { grupo: 'providencias', passo: 2, rotulo: 'Providenciando materiais', responsavel: 'Estoque', detalhe: 'O estoque iniciou a coleta ou a separação nas origens autorizadas.' };
      else etapa = { grupo: 'providencias', passo: 2, rotulo: 'Aprovado · aguardando estoque', responsavel: 'Estoque', detalhe: compra > 0 ? `${compra} unidades autorizadas para compra. O início da compra ainda não foi registrado.` : 'Plano aprovado pelo Financeiro. O estoque ainda não registrou o início do atendimento.' };
      break;
    case 'Aguardando coleta': etapa = { grupo: 'providencias', passo: 2, rotulo: 'Aguardando coleta', responsavel: 'Estoque', detalhe: 'Retirada autorizada, aguardando confirmação pelo estoque.' }; break;
    case 'Em trânsito': etapa = { grupo: 'envio', passo: 3, rotulo: 'Em trânsito', responsavel: pedido.obraDestinoId == null ? 'Estoque' : pedido.tecnico, detalhe: 'Saída confirmada. Aguardando a confirmação do recebimento no destino.' }; break;
    case 'Concluída': etapa = { grupo: 'finalizada', passo: 4, rotulo: 'Recebimento confirmado', responsavel: pedido.obraDestinoId == null ? 'Estoque' : pedido.tecnico, detalhe: 'Os materiais deste atendimento foram recebidos e o estoque foi atualizado.' }; break;
    case 'Rejeitada': {
      const financeira = eventos.some((e) => e.tipo === 'REJEICAO');
      etapa = { grupo: 'rejeitada', passo: financeira ? 1 : 0, rotulo: financeira ? 'Rejeitado pelo Financeiro' : `Rejeitado pela ${gestor}`, responsavel: financeira ? 'Financeiro' : gestor, detalhe: 'O pedido não foi autorizado nesta etapa.' }; break;
    }
    default: etapa = { grupo: 'gerencia', passo: 0, rotulo: pedido.status || 'Etapa não informada', responsavel: gestor, detalhe: 'Consulte o histórico do pedido.' };
  }
  return { ...etapa, compra, recebida, parcial, inicio, ultimoRegistro: eventos.at(-1), direto: Boolean(pedido.movimentacaoDireta), gestor };
}
