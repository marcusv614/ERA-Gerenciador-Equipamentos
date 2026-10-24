export function estadoRolagemKanban({ scrollLeft = 0, scrollWidth = 0, clientWidth = 0 }) {
  const maximo = Math.max(0, scrollWidth - clientWidth);
  const posicao = Math.max(0, Math.min(maximo, scrollLeft));
  return {
    maximo,
    posicao,
  };
}

export function geometriaBarraKanban(area, larguraTrilho, minimoIndicador = 44) {
  const { maximo, posicao } = estadoRolagemKanban(area);
  const trilho = Math.max(0, larguraTrilho);
  const proporcao = area.scrollWidth > 0 ? Math.min(1, Math.max(0, area.clientWidth / area.scrollWidth)) : 1;
  const larguraIndicador = Math.min(trilho, Math.max(minimoIndicador, trilho * proporcao));
  const percurso = trilho - larguraIndicador;
  return { maximo, posicao, larguraIndicador, percurso, deslocamento: maximo > 0 ? posicao / maximo * percurso : 0 };
}

export function posicaoDoQuadroKanban(posicaoIndicador, maximo, percurso) {
  if (maximo <= 0 || percurso <= 0) return 0;
  return Math.max(0, Math.min(percurso, posicaoIndicador)) / percurso * maximo;
}
