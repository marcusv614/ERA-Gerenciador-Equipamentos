import test from 'node:test';
import assert from 'node:assert/strict';
import { alterarCompraPlano, alterarOrigemPlano, candidatosPlano, dadosPlanoFinanceiro, iniciarPlano, preencherTransportePlano, resumoMaterialPlano, saldoPlano } from '../src/utils/planoFinanceiro.js';

const material = { id: 10, nome: 'Escada', catalogoChave: 'ferramentas|escada|', quantidade: 5 };
const pedido = { id: 7, obraDestinoId: 2, materiais: [material] };
const equipamento = (id, obraId, quantidadeDisponivel = 2, extras = {}) => ({ id, serie: `ERA-${id}`, modelo: 'Escada', catalogoChave: material.catalogoChave, obraId, status: obraId ? 'Em campo' : 'Em estoque', quantidadeDisponivel, ...extras });
const deposito = equipamento(1, null), obra = equipamento(2, 1, 4);
const obras = [{ id: 1, nome: 'Obra A' }, { id: 2, nome: 'Obra B' }];

test('origens mostram depósito primeiro e excluem destino, manutenção, reservas, arquivados e compras do próprio pedido', () => {
  const equipamentos = [obra, equipamento(3, 2), equipamento(4, null, 2, { status: 'Em manutenção' }), equipamento(5, null, 0), equipamento(6, null, 2, { arquivado: true }), equipamento(7, null), deposito, equipamento(8, null, 2, { catalogoChave: 'outro' })];
  assert.deepEqual(candidatosPlano(material, { ...pedido, entradasCompra: [{ equipamentoId: 7 }] }, equipamentos, obras).map((e) => e.id), [1, 2]);
  assert.deepEqual(candidatosPlano(material, { ...pedido, obraDestinoId: null }, [deposito, obra], obras).map((e) => e.id), [2]);
});

test('quantidade digitada respeita saldo, inteiro positivo e soma do pedido', () => {
  let plano = alterarOrigemPlano(iniciarPlano(pedido), material, deposito, 999);
  assert.equal(plano[10].origens[1], 2);
  plano = alterarCompraPlano(plano, material, 2);
  plano = alterarOrigemPlano(plano, material, obra, 999);
  assert.equal(plano[10].origens[2], 1);
  plano = alterarOrigemPlano(plano, material, obra, -1);
  assert.equal(plano[10].origens[2], undefined);
  plano = alterarOrigemPlano(plano, material, obra, 'Infinity');
  assert.equal(plano[10].origens[2], undefined);
  plano = alterarOrigemPlano(plano, material, obra, 1.9);
  assert.equal(plano[10].origens[2], 1);
});

test('saldo compartilhado não pode ser usado por dois materiais ao mesmo tempo', () => {
  const outro = { ...material, id: 11 };
  const p = { ...pedido, materiais: [material, outro] };
  let plano = alterarOrigemPlano(iniciarPlano(p), material, obra, 3);
  assert.equal(saldoPlano(11, obra, plano), 1);
  plano = alterarOrigemPlano(plano, outro, obra, 4);
  assert.equal(plano[11].origens[2], 1);
  plano = preencherTransportePlano(plano, outro, [obra]);
  assert.equal(plano[11].origens[2], 1);
});

test('preencher transporte prioriza depósito e preserva a compra já planejada', () => {
  let plano = alterarCompraPlano(iniciarPlano(pedido), material, 1);
  plano = preencherTransportePlano(plano, material, candidatosPlano(material, pedido, [obra, deposito], obras));
  assert.deepEqual(plano[10].origens, { 1: 2, 2: 2 });
  assert.equal(plano[10].compra, 1);
});

test('compra respeita o restante e preserva unidades que já tiveram entrada', () => {
  const m = { ...material, quantidadeEntradaEstoque: 2 };
  const p = { ...pedido, materiais: [m] };
  let plano = iniciarPlano(p);
  plano = alterarCompraPlano(plano, m, 0);
  assert.equal(plano[10].compra, 2);
  plano = alterarOrigemPlano(plano, m, obra, 999);
  assert.equal(plano[10].origens[2], 3);
  plano = alterarCompraPlano(plano, m, 999);
  assert.equal(plano[10].compra, 2);
});

test('preenchimento mantém escolhas manuais e usa somente as origens visíveis na busca', () => {
  let plano = alterarOrigemPlano(iniciarPlano(pedido), material, obra, 1);
  plano = preencherTransportePlano(plano, material, [deposito]);
  assert.deepEqual(plano[10].origens, { 1: 2, 2: 1 });
  assert.equal(resumoMaterialPlano(material, plano, [deposito, obra]).faltante, 2);
  plano = preencherTransportePlano(plano, material, [deposito]);
  assert.deepEqual(plano[10].origens, { 1: 2, 2: 1 });
});

test('ativos individuais permitem no máximo uma unidade', () => {
  const individual = { ...obra, controleQuantidade: 'INDIVIDUAL' };
  const plano = alterarOrigemPlano(iniciarPlano(pedido), material, individual, 5);
  assert.equal(plano[10].origens[2], 1);
});

test('plano salvo com origem excluída ou saldo reduzido permanece bloqueado para revisão', () => {
  const p = { ...pedido, planoFinanceiro: [{ materialId: 10, quantidadeCompra: 0, origens: [{ equipamentoId: 2, quantidade: 5 }] }] };
  const plano = iniciarPlano(p);
  assert.equal(resumoMaterialPlano(material, plano, [obra]).completo, false);
  assert.equal(resumoMaterialPlano(material, plano, []).invalidas.length, 1);
  assert.throws(() => dadosPlanoFinanceiro(p, plano, [obra], obras), /Revise/);
});

test('comprar para preservar equipamento em uso exige motivo e mantém o contrato da API', () => {
  const plano = alterarCompraPlano(iniciarPlano(pedido), material, 5);
  assert.equal(resumoMaterialPlano(material, plano, [obra]).completo, false);
  assert.throws(() => dadosPlanoFinanceiro(pedido, plano, [obra], obras), /Revise/);
  plano[10].justificativa = '  Escada em uso na obra A.  ';
  assert.deepEqual(dadosPlanoFinanceiro(pedido, plano, [obra], obras), { materiais: [{ materialId: 10, quantidadeCompra: 5, justificativa: 'Escada em uso na obra A.', origens: [] }] });
});

test('sem saldo, compra cobre o pedido; transporte parcial e compra somam exatamente o solicitado', () => {
  let plano = alterarOrigemPlano(iniciarPlano(pedido), material, deposito, 2);
  assert.equal(resumoMaterialPlano(material, plano, [deposito]).faltante, 3);
  plano = alterarCompraPlano(plano, material, 3);
  plano[10].justificativa = 'Complementar o saldo.';
  const dados = dadosPlanoFinanceiro(pedido, plano, [deposito], obras);
  assert.deepEqual(dados.materiais[0].origens, [{ equipamentoId: 1, quantidade: 2 }]);
  assert.equal(dados.materiais[0].quantidadeCompra, 3);
});
