import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoRolagemKanban, geometriaBarraKanban, posicaoDoQuadroKanban } from '../src/utils/rolagemKanban.js';

test('Kanban que cabe na tela não oferece rolagem lateral', () => {
  assert.deepEqual(estadoRolagemKanban({ scrollWidth: 800, clientWidth: 800 }), { maximo: 0, posicao: 0 });
  assert.equal(estadoRolagemKanban({ scrollWidth: 600, clientWidth: 800 }).maximo, 0);
});
test('posição da barra acompanha o início, meio e fim do quadro', () => {
  const dimensoes = { scrollWidth: 2100, clientWidth: 800 };
  assert.deepEqual(estadoRolagemKanban(dimensoes), { maximo: 1300, posicao: 0 });
  assert.deepEqual(estadoRolagemKanban({ ...dimensoes, scrollLeft: 310 }), { maximo: 1300, posicao: 310 });
  assert.deepEqual(estadoRolagemKanban({ ...dimensoes, scrollLeft: 1300 }), { maximo: 1300, posicao: 1300 });
});
test('preserva posições fracionárias e limita o overscroll', () => {
  const dimensoes = { scrollWidth: 2100, clientWidth: 800 };
  assert.equal(estadoRolagemKanban({ ...dimensoes, scrollLeft: .5 }).posicao, .5);
  assert.equal(estadoRolagemKanban({ ...dimensoes, scrollLeft: 1299.5 }).posicao, 1299.5);
  assert.equal(estadoRolagemKanban({ ...dimensoes, scrollLeft: -20 }).posicao, 0);
  assert.equal(estadoRolagemKanban({ ...dimensoes, scrollLeft: 1400 }).posicao, 1300);
});
test('indicador proporcional acompanha início, meio e fim sem ultrapassar o trilho', () => {
  const quadro = { scrollWidth: 2400, clientWidth: 800 };
  const inicio = geometriaBarraKanban(quadro, 720);
  assert.equal(inicio.larguraIndicador, 240);
  assert.equal(inicio.percurso, 480);
  assert.equal(inicio.deslocamento, 0);
  assert.equal(geometriaBarraKanban({ ...quadro, scrollLeft: 800 }, 720).deslocamento, 240);
  assert.equal(geometriaBarraKanban({ ...quadro, scrollLeft: 1600 }, 720).deslocamento, 480);
});
test('indicador tem tamanho mínimo confortável, limitado à largura disponível', () => {
  const quadro = { scrollWidth: 10000, clientWidth: 300 };
  assert.equal(geometriaBarraKanban(quadro, 280).larguraIndicador, 44);
  assert.equal(geometriaBarraKanban(quadro, 30).larguraIndicador, 30);
  assert.equal(geometriaBarraKanban(quadro, 0).larguraIndicador, 0);
});
test('clique e arraste convertem a posição do indicador sem exceder os limites', () => {
  assert.equal(posicaoDoQuadroKanban(240, 1600, 480), 800);
  assert.equal(posicaoDoQuadroKanban(-10, 1600, 480), 0);
  assert.equal(posicaoDoQuadroKanban(500, 1600, 480), 1600);
  assert.equal(posicaoDoQuadroKanban(.5, 1600, 480), 5 / 3);
  assert.equal(posicaoDoQuadroKanban(20, 0, 0), 0);
  assert.equal(posicaoDoQuadroKanban(20, 1600, 0), 0);
});
test('redimensionamento recalcula o percurso e mantém a posição dentro dos novos limites', () => {
  const ajustada = geometriaBarraKanban({ scrollWidth: 2400, clientWidth: 1600, scrollLeft: 1200 }, 1500);
  assert.equal(ajustada.maximo, 800);
  assert.equal(ajustada.posicao, 800);
  assert.equal(ajustada.larguraIndicador, 1000);
  assert.equal(ajustada.deslocamento, ajustada.percurso);
  const semRolagem = geometriaBarraKanban({ scrollWidth: 2400, clientWidth: 3200, scrollLeft: 500 }, 3000);
  assert.equal(semRolagem.maximo, 0);
  assert.equal(semRolagem.deslocamento, 0);
  assert.equal(semRolagem.larguraIndicador, 3000);
});
test('geometria inicial sem medidas é finita e não cria rolagem', () => {
  assert.deepEqual(geometriaBarraKanban({}, 0), {
    maximo: 0, posicao: 0, larguraIndicador: 0, percurso: 0, deslocamento: 0,
  });
});
