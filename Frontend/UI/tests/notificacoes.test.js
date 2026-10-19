import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { avisarAposSucesso, notificarSucesso, obterNotificacoes, observarNotificacoes, fecharNotificacao, tempoRestante, DURACAO_NOTIFICACAO } from '../src/services/notificacoes.js';

afterEach(() => { for (const aviso of obterNotificacoes()) fecharNotificacao(aviso.id); });

test('sucesso só é anunciado após a operação terminar e preserva resposta da API', async () => {
  let finalizar;
  const operacao = new Promise((resolve) => { finalizar = resolve; });
  const resultado = avisarAposSucesso(operacao, 'Pedido enviado.');
  assert.equal(obterNotificacoes().length, 0);
  const resposta = { id: 5, status: 'Pendente' };
  finalizar(resposta);
  assert.equal(await resultado, resposta);
  assert.equal(obterNotificacoes()[0].mensagem, 'Pedido enviado.');
  assert.equal(obterNotificacoes()[0].duracao, 6000);
});
test('falha da API não gera confirmação e preserva a exceção', async () => {
  const falha = new Error('Sem permissão');
  await assert.rejects(avisarAposSucesso(Promise.reject(falha), 'Salvo.'), (e) => e === falha);
  assert.equal(obterNotificacoes().length, 0);
});
test('notificação continua disponível após troca de tela e pode ser fechada individualmente', () => {
  const primeiro = notificarSucesso('Equipamento cadastrado.');
  const segundo = notificarSucesso('Pedido enviado.');
  fecharNotificacao(primeiro);
  assert.deepEqual(obterNotificacoes().map((n) => n.id), [segundo]);
});
test('avisos em espera não são descartados quando três já estão visíveis', () => {
  for (let i = 0; i < 4; i++) notificarSucesso(`Operação ${i}`);
  assert.equal(obterNotificacoes().length, 4);
  fecharNotificacao(obterNotificacoes()[0].id);
  assert.equal(obterNotificacoes().length, 3);
  assert.equal(obterNotificacoes().at(-1).mensagem, 'Operação 3');
});
test('contagem fecha ao completar o tempo e não fica negativa', () => {
  assert.equal(tempoRestante(DURACAO_NOTIFICACAO, 2000, false), 4000);
  assert.equal(tempoRestante(4000, 6000, false), 0);
});
test('mouse, foco e aba oculta pausam o tempo restante', () => {
  const restante = tempoRestante(6000, 2500, false);
  assert.equal(tempoRestante(restante, 30000, true), 3500);
  assert.equal(tempoRestante(restante, 1000, false), 2500);
});
test('observadores são removidos ao desmontar a central', () => {
  let atualizacoes = 0;
  const remover = observarNotificacoes(() => { atualizacoes++; });
  const id = notificarSucesso('Salvo.');
  assert.equal(atualizacoes, 1);
  remover(); fecharNotificacao(id);
  assert.equal(atualizacoes, 1);
});
