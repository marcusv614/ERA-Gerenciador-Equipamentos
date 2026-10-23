const TITULOS = {
  NOVO_PEDIDO: 'Novo pedido para sua análise',
  ANALISE_FINANCEIRA: 'Pedido aguardando análise financeira',
  ATENDIMENTO_LIBERADO: 'Plano liberado para o estoque',
  PEDIDO_REJEITADO: 'Pedido rejeitado',
  AJUSTE_FINANCEIRO: 'O Financeiro atualizou o pedido',
  RECEBIMENTO_CONFIRMADO: 'Recebimento confirmado',
  CANCELAMENTO_SOLICITADO: 'Cancelamento aguardando tratativa',
  CANCELAMENTO_CONFIRMADO: 'Cancelamento confirmado',
};
export function tituloNotificacao(aviso) {
  if(aviso.tipo==='ENVIO'||!aviso.tipo)return aviso.destinatario&&aviso.status==='Em trânsito'?'Confirme o recebimento':'Envio de material à obra';
  return TITULOS[aviso.tipo] || 'Atualização do pedido';
}
