import test from 'node:test';
import assert from 'node:assert/strict';
import { hojeNoEstoque, intervaloEstoque, validarPeriodoEstoque, pedidoNoPeriodoEstoque, ordenarPedidosEstoque } from '../src/utils/filtrosEstoque.js';

test('Hoje usa Manaus mesmo quando a data UTC já mudou', () => {
  assert.equal(hojeNoEstoque(new Date('2026-10-24T02:00:00Z')), '2026-10-23');
  assert.deepEqual(intervaloEstoque('hoje','2026-10-23'), {inicio:'2026-10-23',fim:'2026-10-23'});
});
test('Semana vai de segunda a domingo, incluindo virada de mês e ano', () => {
  assert.deepEqual(intervaloEstoque('semana','2026-10-23'), {inicio:'2026-10-19',fim:'2026-10-25'});
  assert.deepEqual(intervaloEstoque('semana','2026-10-25'), {inicio:'2026-10-19',fim:'2026-10-25'});
  assert.deepEqual(intervaloEstoque('semana','2026-10-26'), {inicio:'2026-10-26',fim:'2026-11-01'});
  assert.deepEqual(intervaloEstoque('semana','2027-01-01'), {inicio:'2026-12-28',fim:'2027-01-03'});
});
test('Mês respeita limites do calendário, incluindo ano bissexto', () => {
  assert.deepEqual(intervaloEstoque('mes','2026-10-23'), {inicio:'2026-10-01',fim:'2026-10-31'});
  assert.deepEqual(intervaloEstoque('mes','2028-02-10'), {inicio:'2028-02-01',fim:'2028-02-29'});
  assert.deepEqual(intervaloEstoque('mes','2026-02-10'), {inicio:'2026-02-01',fim:'2026-02-28'});
  assert.deepEqual(intervaloEstoque('todos','2026-10-23'), {inicio:'',fim:''});
});
test('Período é inclusivo, aceita limite aberto e rejeita intervalo invertido', () => {
  const p = dataSolicitacao => ({dataSolicitacao});
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-22'),{inicio:'2026-10-22',fim:'2026-10-23'}),true);
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-23'),{inicio:'2026-10-22',fim:'2026-10-23'}),true);
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-21'),{inicio:'2026-10-22',fim:'2026-10-23'}),false);
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-24'),{inicio:'2026-10-22',fim:''}),true);
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-21'),{inicio:'',fim:'2026-10-23'}),true);
  assert.equal(pedidoNoPeriodoEstoque(p(null),{inicio:'',fim:''}),true);
  assert.equal(pedidoNoPeriodoEstoque(p(null),{inicio:'2026-10-22',fim:''}),false);
  assert.equal(pedidoNoPeriodoEstoque(p('2026-10-22'),{inicio:'2026-10-23',fim:'2026-10-22'}),false);
  assert.ok(validarPeriodoEstoque({inicio:'2026-10-23',fim:'2026-10-22'}));
});
test('Ordem cronológica ignora prioridade, desempata por ID e não altera a lista original', () => {
  const pedidos=[{id:3,dataSolicitacao:'2026-10-23'},{id:1,dataSolicitacao:'2026-10-20'},{id:4,dataSolicitacao:'2026-10-23'},{id:2}];
  assert.deepEqual(ordenarPedidosEstoque(pedidos,'recentes').map(p=>p.id),[4,3,1,2]);
  assert.deepEqual(ordenarPedidosEstoque(pedidos,'antigos').map(p=>p.id),[1,3,4,2]);
  assert.deepEqual(pedidos.map(p=>p.id),[3,1,4,2]);
});
test('Prioridade operacional preserva os pedidos prontos para enviar à frente', () => {
  const pronto={id:2,status:'Aprovada',dataSolicitacao:'2026-10-23',materiais:[{identificacao:'LOTE'}]};
  const compra={id:1,status:'Aprovada',dataSolicitacao:'2026-10-20',materiais:[{quantidadeCompra:1}],planoFinanceiro:[{}]};
  assert.deepEqual(ordenarPedidosEstoque([compra,pronto]).map(p=>p.id),[2,1]);
  assert.deepEqual(ordenarPedidosEstoque([compra,pronto],'antigos').map(p=>p.id),[1,2]);
});
