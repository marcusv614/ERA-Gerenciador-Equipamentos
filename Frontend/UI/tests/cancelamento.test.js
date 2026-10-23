import assert from 'node:assert/strict';
import { acompanhamentoSolicitacao } from '../src/utils/acompanhamentoSolicitacao.js';
import { acompanhamentoPedidoFinanceiro } from '../src/utils/pedidosFinanceiros.js';
import { etapaEstoque } from '../src/utils/operacaoEstoque.js';
import { obterEtapaSolicitacao } from '../src/utils/statusSolicitacao.js';
for(const status of ['Cancelada','Cancelamento solicitado']){
  const pedido={status,materiais:[{identificacao:'DEMO',quantidade:2,quantidadeCompra:2}]};
  assert.equal(acompanhamentoSolicitacao(pedido).grupo,'cancelamento');
  assert.equal(acompanhamentoPedidoFinanceiro(pedido).grupo,'cancelamento');
  assert.equal(etapaEstoque(pedido).acao,undefined);
  assert.equal(etapaEstoque(pedido).iniciar,undefined);
  assert.equal(obterEtapaSolicitacao(status).rotulo,status);
}
assert.equal(acompanhamentoPedidoFinanceiro({status:'Pendente',materiais:[]}).grupo,'gerencia');
