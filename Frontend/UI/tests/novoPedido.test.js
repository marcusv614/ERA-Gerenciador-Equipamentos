import test from 'node:test';
import assert from 'node:assert/strict';
import { tecnicosParaRecebimento } from '../src/utils/novoPedido.js';

const obras = [{ id: 1, status: 'Em andamento', responsaveis: ['Ana', 'Bruno', 'Carlos'] }, { id: 2, status: 'Concluída', responsaveis: ['Ana'] }];
const funcionarios = [{ nome: 'Ana', status: 'Ativo' }, { nome: 'Bruno', status: 'Inativo' }, { nome: 'Carlos', status: 'Ativo', arquivado: true }, { nome: 'Daniel', status: 'Ativo' }];

test('recebimento exige funcionário ativo e vinculado à obra escolhida', () => {
  assert.deepEqual(tecnicosParaRecebimento(obras, funcionarios, '1'), ['Ana']);
});
test('obra encerrada, arquivada ou não selecionada não oferece responsáveis', () => {
  assert.deepEqual(tecnicosParaRecebimento(obras, funcionarios, '2'), []);
  assert.deepEqual(tecnicosParaRecebimento([{ ...obras[0], arquivado: true }], funcionarios, '1'), []);
  assert.deepEqual(tecnicosParaRecebimento(obras, funcionarios, ''), []);
});
