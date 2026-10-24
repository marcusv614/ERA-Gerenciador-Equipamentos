export function estadoRolagemKanban({ scrollLeft = 0, scrollWidth = 0, clientWidth = 0 }) {
  const maximo = Math.max(0, scrollWidth - clientWidth);
  const posicao = Math.max(0, Math.min(maximo, scrollLeft));
  return {
    maximo,
    posicao,
  };
}

// A barra superior é menor que o quadro por causa do espaçamento lateral.
// As duas áreas precisam ter o mesmo percurso, não a mesma largura total.
export function larguraConteudoBarraKanban(maximo, larguraBarra) {
  return Math.max(0, maximo) + Math.max(0, larguraBarra);
}

