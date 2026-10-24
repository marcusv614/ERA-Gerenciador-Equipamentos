import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoRolagemKanban, larguraConteudoBarraKanban } from '../src/utils/rolagemKanban.js';

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
test('barra menor mantém o mesmo percurso horizontal do quadro', () => {
  const quadro = estadoRolagemKanban({ scrollWidth: 2100, clientWidth: 800 });
  const larguraBarra = 692;
  assert.equal(larguraConteudoBarraKanban(quadro.maximo, larguraBarra) - larguraBarra, quadro.maximo);
  assert.equal(larguraConteudoBarraKanban(0, 800), 800);
});
test('redimensionamento recalcula o percurso e mantém a posição dentro dos novos limites', () => {
  assert.deepEqual(estadoRolagemKanban({ scrollWidth: 2100, clientWidth: 1600, scrollLeft: 1200 }), { maximo: 500, posicao: 500 });
  assert.equal(larguraConteudoBarraKanban(500, 1560) - 1560, 500);
  assert.deepEqual(estadoRolagemKanban({ scrollWidth: 2100, clientWidth: 2400, scrollLeft: 500 }), { maximo: 0, posicao: 0 });
});
