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
  assert.equal(validarNovaSenhaRecuperacao('Bico#123','Bico#123'),'');
  assert.ok(validarNovaSenhaRecuperacao('curta', 'curta'));
  assert.ok(validarNovaSenhaRecuperacao('Uma frase de senha 12345', 'diferente'));
  assert.ok(validarNovaSenhaRecuperacao('a'.repeat(129), 'a'.repeat(129)));
  assert.equal(validarNovaSenhaRecuperacao('Uma frase de senha 12345', 'Uma frase de senha 12345'), '');
});
