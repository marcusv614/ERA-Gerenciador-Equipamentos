import test from 'node:test';
import assert from 'node:assert/strict';
import { tokenRecuperacaoDoFragmento, validarNovaSenhaRecuperacao } from '../src/utils/recuperacaoConta.js';

test('aceita apenas tokens de 256 bits no fragmento da recuperação', () => {
  const token = 'a'.repeat(43);
  assert.equal(tokenRecuperacaoDoFragmento(`#recuperacao=${token}`), token);
  for (const invalido of ['', '#recuperacao=123', '#recuperacao=' + 'a'.repeat(44), '#outro=123', '#recuperacao=' + '<'.repeat(43)]) {
    assert.equal(tokenRecuperacaoDoFragmento(invalido), '');
  }
});
test('valida tamanho e confirmação da nova senha', () => {
  assert.ok(validarNovaSenhaRecuperacao('curta', 'curta'));
  assert.ok(validarNovaSenhaRecuperacao('Senha#12345', 'diferente'));
  assert.ok(validarNovaSenhaRecuperacao('a'.repeat(129), 'a'.repeat(129)));
  assert.equal(validarNovaSenhaRecuperacao('Senha#12345', 'Senha#12345'), '');
});
