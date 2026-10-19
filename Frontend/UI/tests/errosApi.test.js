import test from 'node:test';
import assert from 'node:assert/strict';
import { mensagemErroApi } from '../src/utils/errosApi.js';

test('validação identifica o técnico e o material recusado pela API', () => {
  const mensagem = mensagemErroApi({ response:{ status:400, data:{ mensagem:'Existem campos inválidos.', detalhes:{ tecnico:'não deve estar em branco', 'materiais[0].quantidade':'deve ser maior ou igual a 1' } } } });
  assert.match(mensagem, /Técnico responsável: não deve estar em branco/);
  assert.match(mensagem, /Material 1 — Quantidade: deve ser maior ou igual a 1/);
});
test('falha interna não expõe mensagem nem detalhes do servidor', () => {
  assert.doesNotMatch(mensagemErroApi({ response:{ status:500, data:{ mensagem:'SQL privado', detalhes:{ segredo:'stack trace' } } } }), /SQL|segredo|trace/);
});
test('mantém mensagens de negócio, timeout e respostas sem detalhes', () => {
  assert.equal(mensagemErroApi({ response:{ status:409, data:{ mensagem:'Reserva indisponível.' } } }), 'Reserva indisponível.');
  assert.match(mensagemErroApi({ code:'ECONNABORTED' }), /demorou/);
  assert.equal(mensagemErroApi({ response:{ status:400, data:{ mensagem:'JSON inválido.', detalhes:{} } } }), 'JSON inválido.');
});
