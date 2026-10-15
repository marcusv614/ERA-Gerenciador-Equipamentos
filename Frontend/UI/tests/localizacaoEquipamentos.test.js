import test from 'node:test';
import assert from 'node:assert/strict';
import { localizarEquipamentos, descreverLocalizacao } from '../src/utils/localizacaoEquipamentos.js';

const escada = { id: 1, serie: 'ESC-001', obraId: 10, quantidade: 1, status: 'Em campo', quantidadeDisponivel: 0 };
const pedido = { id: 5, status: 'Aprovada', obraOrigemId: 10, obraDestinoId: 20, tecnico: 'João', materiais: [{ identificacao: 'ESC-001', quantidade: 1 }] };
const obra = (id) => ({ nome: id === 10 ? 'Obra A' : 'Obra B' });

test('reserva mantém origem e identifica destino antes da coleta', () => {
  const [e] = localizarEquipamentos([escada], [pedido]);
  assert.equal(e.status, 'Em campo');
  assert.equal(e.quantidadeNaOrigem, 1);
  assert.equal(descreverLocalizacao(e, obra), 'Obra A · 1 reservada(s) para Obra B');
});
test('coleta mostra transporte A para B sem declarar recebimento', () => {
  const [e] = localizarEquipamentos([escada], [{ ...pedido, status: 'Em trânsito' }]);
  assert.equal(e.status, 'Em trânsito');
  assert.equal(e.quantidadeNaOrigem, 0);
  assert.match(descreverLocalizacao(e, obra), /Em transporte|em transporte/);
  assert.match(descreverLocalizacao(e, obra), /Obra A → Obra B/);
  assert.match(descreverLocalizacao(e, obra), /aguardando recebimento de João/);
});
test('lote parcial conserva saldo na origem e soma rotas distintas', () => {
  const lote = { ...escada, quantidade: 10 };
  const [e] = localizarEquipamentos([lote], [
    { ...pedido, status: 'Em trânsito', materiais: [{ identificacao: 'ESC-001', quantidade: 3 }] },
    { ...pedido, id: 6, status: 'Em trânsito', materiais: [{ identificacao: 'ESC-001', quantidade: 2 }] },
  ]);
  assert.equal(e.quantidadeEmTransito, 5);
  assert.equal(e.quantidadeNaOrigem, 5);
  assert.equal(e.status, 'Em campo');
});
test('conclusão usa cadastro atualizado em B sem manter reserva antiga', () => {
  const [e] = localizarEquipamentos([{ ...escada, obraId: 20 }], [{ ...pedido, status: 'Concluída' }]);
  assert.equal(e.quantidadeEmTransito, 0);
  assert.equal(descreverLocalizacao(e, obra), 'Obra B');
});
test('pedido rejeitado e material não separado não inventam localização', () => {
  const [e] = localizarEquipamentos([escada], [{ ...pedido, status: 'Rejeitada' }, { ...pedido, materiais: [{ nome: 'Escada', quantidade: 1 }] }]);
  assert.deepEqual(e.deslocamentos, []);
});
test('retorno ao depósito não pede confirmação de técnico', () => {
  const [e] = localizarEquipamentos([escada], [{ ...pedido, obraDestinoId: null, status: 'Em trânsito' }]);
  assert.match(descreverLocalizacao(e, obra), /Obra A → Depósito central/);
  assert.match(descreverLocalizacao(e, obra), /aguardando recebimento no depósito/);
});
