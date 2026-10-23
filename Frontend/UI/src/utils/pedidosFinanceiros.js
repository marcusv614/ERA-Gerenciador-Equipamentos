const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();
export const COLUNAS_FINANCEIRAS = [
  {id:'cancelamento',titulo:'Cancelamentos',rotulo:'Cancelamentos',descricao:'Pedidos suspensos ou cancelados'},
  { id:'financeiro', titulo:'No Financeiro', rotulo:'Financeiro', descricao:'Análise e planejamento' },
  { id:'providencias', titulo:'Pedidos aprovados', rotulo:'Aprovados', descricao:'Pedidos sem compra pendente' },
  { id:'compras', titulo:'Compras pendentes', rotulo:'Compras pendentes', descricao:'Itens autorizados ainda não comprados' },
  { id:'finalizada', titulo:'Compras concluídas', rotulo:'Compras concluídas', descricao:'Aquisição dos itens registrada' },
  { id:'rejeitada', titulo:'Rejeitados', rotulo:'Rejeitados', descricao:'Pedidos não autorizados' },
];
export const rotuloDecisaoFinanceira = tipo => ({ APROVACAO_INICIAL:'Aprovado pela Gerência / RH', APROVACAO:'Aprovado pelo Financeiro', REJEICAO:'Rejeitado pelo Financeiro', REJEICAO_INICIAL:'Rejeitado pela Gerência / RH', ALTERACAO:'Ajuste do pedido', REVISAO_PLANO:'Revisão do planejamento', CANCELAMENTO_SOLICITADO:'Cancelamento solicitado', CANCELAMENTO_CONFIRMADO:'Cancelamento confirmado', CANCELAMENTO_FINANCEIRO:'Parecer financeiro', CANCELAMENTO_CONFERENCIA:'Conferência física' })[tipo] || 'Decisão registrada';
export function adaptarPedidoFinanceiro(pedido) {
  return {...pedido,financeiro:true,tipo:'Pedido de materiais',eventosFinanceiros:pedido.decisoes,materiais:pedido.materiais.map(m=>({...m,quantidade:m.quantidadeSolicitada})),analises:pedido.analises||[]};
}
export function acompanhamentoPedidoFinanceiro(pedido) {
  if(['Cancelada','Cancelamento solicitado'].includes(pedido.status))return {grupo:'cancelamento',rotulo:pedido.status};
  if(pedido.status==='Pendente')return {grupo:'gerencia',rotulo:'Aguardando RH'};
  if(pedido.status==='Concluída')return {grupo:'finalizada',rotulo:'Entrega confirmada'};
  if(pedido.status==='Aguardando financeiro')return {grupo:'financeiro',rotulo:'Aguardando análise financeira'};
  if(pedido.status==='Rejeitada')return {grupo:'rejeitada',rotulo:'Rejeitado pelo Financeiro'};
  const compra=pedido.materiais.reduce((s,m)=>s+(m.quantidadeCompra||0),0),adquirida=pedido.materiais.reduce((s,m)=>s+(m.quantidadeAdquirida||0),0);
  if(compra>adquirida)return {grupo:'compras',rotulo:'Compra pendente'};
  if(compra>0)return {grupo:'finalizada',rotulo:'Compra concluída'};
  return {grupo:'providencias',rotulo:'Aprovado pelo Financeiro'};
}
export function pesquisarPedidosFinanceiros(pedidos,consulta,buscarObra=()=>null) {
  const termos=normalizar(consulta).split(/\s+/).filter(Boolean);
  const codigo=normalizar(consulta).match(/^(?:(?:pedido|solicitacao|codigo)\s*)?#?\s*(\d+)$/);
  return pedidos.filter(p=>{
    if(codigo)return String(p.id)===String(Number(codigo[1]))||(p.analises||[]).some(a=>String(a.id)===String(Number(codigo[1])));
    const data=p.dataSolicitacao||'',nomeObra=p.obra||buscarObra(p.obraDestinoId)?.nome||'Depósito central';
    const texto=normalizar([p.id,p.tecnico,p.solicitante,p.solicitanteLogin,p.solicitantePerfil,nomeObra,p.status,acompanhamentoPedidoFinanceiro(p).rotulo,p.observacao,data,data.split('-').reverse().join('/'),...p.materiais.map(m=>m.nome),...(p.decisoes||[]).flatMap(d=>[d.autorNome,d.autorLogin])].join(' '));
    const palavras=texto.split(/[^\p{L}\p{N}]+/u);
    return termos.every(t=>/^#\d+$/.test(t)?Number(t.slice(1))===p.id:t.length===1?palavras.includes(t):texto.includes(t));
  });
}
