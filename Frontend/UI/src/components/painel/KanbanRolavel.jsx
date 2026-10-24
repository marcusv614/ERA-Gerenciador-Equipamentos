import { useEffect, useId, useRef, useState } from 'react';
import { estadoRolagemKanban, larguraConteudoBarraKanban } from '../../utils/rolagemKanban';
import css from './KanbanRolavel.module.css';

export function KanbanRolavel({ children, className }) {
  const quadro = useRef(null);
  const barra = useRef(null);
  const quadroId = useId();
  const [larguraConteudo, definirLarguraConteudo] = useState(0);
  const [temRolagem, definirTemRolagem] = useState(false);

  useEffect(() => {
    const area = quadro.current;
    const controle = barra.current;
    let quadroAnimacao;
    let posicaoAutomaticaBarra = null;
    let posicaoAutomaticaQuadro = null;
    const medir = () => {
      const { maximo, posicao } = estadoRolagemKanban(area);
      definirTemRolagem(maximo > 1);
      definirLarguraConteudo(larguraConteudoBarraKanban(maximo, controle.clientWidth));
      if (Math.abs(controle.scrollLeft - posicao) > 1) {
        controle.scrollLeft = posicao;
        posicaoAutomaticaBarra = controle.scrollLeft;
      }
    };
    const agendarMedicao = () => {
      cancelAnimationFrame(quadroAnimacao);
      quadroAnimacao = requestAnimationFrame(medir);
    };
    // Eventos de scroll são assíncronos. Não devolvemos ao quadro um evento
    // gerado pela própria sincronização, preservando o gesto de rolagem original.
    const aoRolarQuadro = () => {
      const automatico = posicaoAutomaticaQuadro !== null && Math.abs(area.scrollLeft - posicaoAutomaticaQuadro) <= 1;
      if (!automatico) posicaoAutomaticaQuadro = null;
      if (!automatico && Math.abs(controle.scrollLeft - area.scrollLeft) > 1) {
        controle.scrollLeft = area.scrollLeft;
        posicaoAutomaticaBarra = controle.scrollLeft;
      }
    };
    const aoRolarBarra = () => {
      const automatico = posicaoAutomaticaBarra !== null && Math.abs(controle.scrollLeft - posicaoAutomaticaBarra) <= 1;
      if (!automatico) posicaoAutomaticaBarra = null;
      if (!automatico && Math.abs(area.scrollLeft - controle.scrollLeft) > 1) {
        area.scrollLeft = controle.scrollLeft;
        posicaoAutomaticaQuadro = area.scrollLeft;
      }
    };
    const observador = new ResizeObserver(agendarMedicao);
    observador.observe(area);
    observador.observe(controle);
    [...area.children].forEach(coluna => observador.observe(coluna));
    area.addEventListener('scroll', aoRolarQuadro, { passive: true });
    controle.addEventListener('scroll', aoRolarBarra, { passive: true });
    agendarMedicao();
    return () => {
      cancelAnimationFrame(quadroAnimacao);
      observador.disconnect();
      area.removeEventListener('scroll', aoRolarQuadro);
      controle.removeEventListener('scroll', aoRolarBarra);
    };
  }, [children]);

  return <div className={css.quadro}>
    <div className={css.controles} hidden={!temRolagem}>
      <div ref={barra} className={css.barra} tabIndex={0} role="region" aria-label="Barra de rolagem horizontal do Kanban" aria-controls={quadroId}>
        <div className={css.trilho} style={{ width: larguraConteudo }} />
      </div>
    </div>
    <div ref={quadro} id={quadroId} className={`${className} ${css.conteudo}`} tabIndex={0} role="region" aria-label="Kanban de solicitações">{children}</div>
  </div>;
}
