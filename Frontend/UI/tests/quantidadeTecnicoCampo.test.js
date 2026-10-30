import test from 'node:test';
import assert from 'node:assert/strict';
import { erroQuantidadeTecnicoCampo } from '../src/utils/quantidadeTecnicoCampo.js';

test('quantidade do campo aceita inteiros positivos dentro do limite operacional', () => {
  for (const valor of ['1', '2', '2147483647']) assert.equal(erroQuantidadeTecnicoCampo(valor, 2147483647), '');
  assert.equal(erroQuantidadeTecnicoCampo('2', 2), '');
});

test('quantidade do campo explica entradas inválidas sem retirar sinais ou separadores', () => {
  for (const valor of ['1,5', '1.5', '-2', '+2', '1e2', 'abc', ' 2', '2 ']) {
    assert.match(erroQuantidadeTecnicoCampo(valor, 2147483647), /número inteiro/);
  }
  assert.match(erroQuantidadeTecnicoCampo('', 2), /Informe a quantidade/);
  assert.match(erroQuantidadeTecnicoCampo('0', 2), /pelo menos 1/);
});

test('quantidade do campo preserva o limite de devolução e o limite máximo de solicitação', () => {
  assert.equal(erroQuantidadeTecnicoCampo('3', 2), 'A quantidade máxima é 2.');
  assert.equal(erroQuantidadeTecnicoCampo('2147483648', 2147483647), 'A quantidade máxima é 2147483647.');
  assert.match(erroQuantidadeTecnicoCampo('9999999999999999999999999999', 2147483647), /máxima/);
});
