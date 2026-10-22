import test from 'node:test';
import assert from 'node:assert/strict';
import { dadosEnvioParcial, materiaisParaEnvioParcial } from '../src/utils/atendimentoParcial.js';
import { equipamentosParaRevisao } from '../src/utils/planoFinanceiro.js';

const material = { id: 1, nome: 'Alicate', quantidade: 10, catalogoChave: 'ferramentas|alicate|' };
const entrada = { equipamentoId: 30, identificacao: 'ERA-30', quantidade: 6, obraOrigemId: null, nome: material.nome, catalogoChave: material.catalogoChave };
const pedido = { id: 1, materiais: [material], planoFinanceiro: [{ materialId: 1, quantidadeCompra: 10, origens: [] }], entradasCompra: [entrada] };
test('estoque envia seis recebidos e mantém quatro pendentes; compra sem entrada não entra nas origens', () => {
  const [m] = materiaisParaEnvioParcial(pedido);
  assert.equal(m.origens.length, 1);assert.equal(m.origens[0].quantidade, 6);
  assert.deepEqual(dadosEnvioParcial(pedido, { '1-30': 6 }, ' Fornecedor tinha seis. '), { motivo: 'Fornecedor tinha seis.', materiais: [{ materialId: 1, origens: [{ equipamentoId: 30, quantidade: 6 }] }] });
  assert.equal(materiaisParaEnvioParcial({ ...pedido, entradasCompra: [] })[0].origens.length, 0);
});
test('não permite enviar mais que a entrada, fracionar unidades ou confirmar sem motivo e sem material', () => {
  for (const valor of [7, -1, 1.2, Infinity]) assert.throws(() => dadosEnvioParcial(pedido, { '1-30': valor }, 'Falta no fornecedor.'), /Revise/);
  assert.throws(() => dadosEnvioParcial(pedido, {}, 'Falta no fornecedor.'), /ao menos/);
  assert.throws(() => dadosEnvioParcial(pedido, { '1-30': 6 }, ''), /motivo/);
});
test('materiais indisponíveis continuam no ajuste com zero envio', () => {
  const p = { ...pedido, materiais: [material, { id: 2, nome: 'Escada', quantidade: 4, catalogoChave: 'escada' }] };
  assert.deepEqual(dadosEnvioParcial(p, { '1-30': 2 }, 'Enviar o que chegou.').materiais[1], { materialId: 2, origens: [] });
});
test('revisão financeira oferece as próprias reservas sem usar reservas de outro pedido', () => {
  const p = { status: 'Aprovada', planoFinanceiro: [{ origens: [{ equipamentoId: 10, quantidade: 3 }] }] };
  const equipamentos = [{ id: 10, quantidadeDisponivel: 2, quantidadeReservada: 8 }, { id: 11, quantidadeDisponivel: 0, quantidadeReservada: 5 }];
  const revisao = equipamentosParaRevisao(p, equipamentos);
  assert.equal(revisao[0].quantidadeDisponivel, 5);assert.equal(revisao[1].quantidadeDisponivel, 0);
  assert.equal(equipamentos[0].quantidadeDisponivel, 2);
});
