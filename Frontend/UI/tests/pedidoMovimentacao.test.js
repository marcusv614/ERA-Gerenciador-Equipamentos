import test from 'node:test';
import assert from 'node:assert/strict';
import { criarPedidoMovimentacao } from '../src/utils/pedidoMovimentacao.js';

const equipamento = { modelo:'Chave Phillips PH0', serie:'ERA-DBA320B1', catalogoChave:'ferramentas|chave phillips ph0|', obraId:1, tecnico:'Marcus', quantidade:7, quantidadeDisponivel:5 };

test('devolução ao depósito preserva o técnico de origem mesmo se a seleção vier nula', () => {
  const pedido = criarPedidoMovimentacao(equipamento, { obraId:null, tecnico:null, quantidade:1, dataMovimentacao:'2026-10-19' });
  assert.equal(pedido.tecnico, 'Marcus'); assert.equal(pedido.obraOrigemId, 1); assert.equal(pedido.obraDestinoId, null);
  assert.equal(pedido.dataSolicitacao, '2026-10-19');
  assert.equal(pedido.materiais[0].identificacao, 'ERA-DBA320B1');
  assert.equal(pedido.materiais[0].quantidade, 1);
});
test('transferência para outra obra usa o técnico destinatário selecionado', () => {
  const pedido = criarPedidoMovimentacao(equipamento, { obraId:'2', tecnico:'Ana', quantidade:2 });
  assert.equal(pedido.tecnico, 'Ana'); assert.equal(pedido.obraDestinoId, 2);
});
test('item sem custódia exige selecionar responsável e não envia técnico nulo', () => {
  assert.throws(() => criarPedidoMovimentacao({ ...equipamento, tecnico:null }, { obraId:null, tecnico:null }), /retirada/);
  assert.equal(criarPedidoMovimentacao({ ...equipamento, tecnico:null }, { obraId:null, tecnico:'Ana' }).tecnico, 'Ana');
  assert.throws(() => criarPedidoMovimentacao(equipamento, { obraId:2, tecnico:'' }), /recebimento/);
});
test('quantidade da movimentação respeita inteiros e o saldo disponível', () => {
  for (const quantidade of [0,-1,1.5,6,NaN]) assert.throws(() => criarPedidoMovimentacao(equipamento, { obraId:null, quantidade }), /saldo disponível/);
});
