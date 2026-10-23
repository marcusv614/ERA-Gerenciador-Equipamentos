import { dataRegistro } from './planilhasRelatorios.js';
const escape=v=>String(v??'Não registrado').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const quando=v=>!v?'Não registrado':/^\d{4}-\d{2}-\d{2}$/.test(v)?v.split('-').reverse().join('/'):new Date(v).toLocaleString('pt-BR',{timeZone:'America/Manaus'});
const evento=t=>({CRIACAO:'Solicitação',APROVACAO_INICIAL:'Aprovação Gerência / RH',APROVACAO:'Aprovação Financeiro',ALTERACAO:'Alteração / planejamento',REVISAO_PLANO:'Revisão do plano',ENTRADA_COMPRA:'Compra conferida no estoque',ENVIO:'Envio',RECEBIMENTO:'Recebimento',REJEICAO:'Rejeição financeira',REJEICAO_INICIAL:'Rejeição inicial',CANCELAMENTO_SOLICITADO:'Cancelamento solicitado',CANCELAMENTO_CONFIRMADO:'Cancelamento confirmado',CANCELAMENTO_FINANCEIRO:'Parecer de cancelamento',CANCELAMENTO_CONFERENCIA:'Conferência para cancelamento',INICIO_ATENDIMENTO:'Início do atendimento',ATENDIMENTO_PARCIAL:'Atendimento parcial'})[t]||t;
const tabela=(titulo,colunas,linhas,estatica=false)=>`<section><h2>${escape(titulo)}</h2><table ${estatica?'data-estatica="true"':''}><thead><tr>${colunas.map(c=>`<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${linhas.length?linhas.map(l=>`<tr data-data="${dataRegistro(l.data)}">${l.valores.map(v=>`<td>${escape(v)}</td>`).join('')}</tr>`).join(''):`<tr data-vazio="true"><td colspan="${colunas.length}">Nenhum registro comprovado.</td></tr>`}</tbody></table></section>`;
const header=(titulo,sub)=>`<h1>${escape(titulo)}</h1><p>${escape(sub)}</p>`;
const eventos=p=>p.eventos.map(e=>({data:e.instante,valores:[`#${p.id}`,`#${e.atendimento}`,p.solicitante,p.tecnico,evento(e.acao),quando(e.instante),e.autor,e.conta,e.descricao]}));
export function relatorioPedidosObra(pedidos,titulo='Rastreabilidade dos pedidos'){
  return {titulo,conteudo:header(titulo,'Trilha de solicitação, decisões, execução e encerramento. Uma linha por evento, sem relação de materiais.')+tabela('Fluxo dos pedidos',['Pedido','Atendimento','Solicitante','Destinatário','Evento','Data/hora · Manaus','Responsável','Conta','Registro / justificativa'],pedidos.flatMap(eventos))};
}
export function relatorioComprasObra(pedidos,titulo='Compras adquiridas e homologadas'){
  const linhas=pedidos.flatMap(p=>p.compras.map(c=>({data:c.instante,valores:[`#${p.id}`,`#${c.atendimento}`,p.obra,c.material,c.quantidade,c.notaFiscal,c.fornecedor,quando(c.instante),c.autor,c.conta,c.legado?'Legado: conferir documento fiscal':'Entrada conferida no estoque']})));
  return {titulo,conteudo:header(titulo,'Somente aquisições autorizadas pelo Financeiro e com entrada registrada no estoque. Não representa saldo atual nem comprova entrega na obra.')+tabela('Aquisições conferidas',['Pedido','Atendimento','Obra','Material','Quantidade','Nota fiscal','Fornecedor','Conferência · Manaus','Responsável','Conta','Evidência'],linhas)+[...new Set(pedidos.flatMap(p=>p.avisos))].map(a=>`<p>${escape(a)}</p>`).join('')};
}
export function relatorioPedido(p){
  const titulo=`Auditoria do pedido #${p.id}`;
  return {titulo,conteudo:header(titulo,`${p.obra} · Solicitante: ${p.solicitante} (${p.conta||'conta não registrada'}) · Destinatário: ${p.tecnico} · Solicitado: ${quando(p.criadoEm||p.dataSolicitacao)}`)+(p.observacao?`<p>Observação atual: ${escape(p.observacao)}</p>`:'')+tabela('Materiais solicitados',['Material','Quantidade original'],p.materiais.map(m=>({valores:[m.material,m.quantidade]})),true)+tabela('Atendimentos vinculados',['Atendimento','Situação atual','Enviado em','Recebido em'],p.atendimentos.map(a=>({data:a.recebidoEm||a.enviadoEm,valores:[`#${a.id}`,a.status,quando(a.enviadoEm),quando(a.recebidoEm)]})),true)+tabela('Rastreabilidade do pedido',['Pedido','Atendimento','Solicitante','Destinatário','Evento','Data/hora · Manaus','Responsável','Conta','Registro / justificativa'],eventos(p))+relatorioComprasObra([p],'Compras deste pedido').conteudo.replace(/<h1>[\s\S]*?<\/h1>/,'')};
}

export function relatorioFuncionario(pedidos,nome){
  const fluxo=relatorioPedidosObra(pedidos,`Auditoria de pedidos — ${nome}`);
  return {...fluxo,conteudo:fluxo.conteudo+relatorioComprasObra(pedidos,'Aquisições para o funcionário').conteudo.replace('<h1>','<h2>').replace('</h1>','</h2>')};
}
