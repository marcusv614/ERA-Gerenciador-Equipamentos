import { useEffect, useId, useRef, useState } from 'react';
import { estadoRolagemKanban, geometriaBarraKanban, posicaoDoQuadroKanban } from '../../utils/rolagemKanban';
import css from './KanbanRolavel.module.css';

export function KanbanRolavel({ children, className }) {
  const quadro = useRef(null);
  const barra = useRef(null);
  const arraste = useRef(null);
  const atualizar = useRef(() => {});
  const quadroId = useId();
  const [geometria, definirGeometria] = useState(() => geometriaBarraKanban({}, 0));
  const [arrastando, definirArrastando] = useState(false);
  const temRolagem = geometria.maximo > 1;

  useEffect(() => {
    const area = quadro.current;
    const controle = barra.current;
    let animacao;
    const medir = () => {
      const proxima = geometriaBarraKanban(area, controle.clientWidth);
      definirGeometria(anterior => Object.keys(proxima).every(chave => anterior[chave] === proxima[chave]) ? anterior : proxima);
    };
    const agendar = () => {
      cancelAnimationFrame(animacao);
      animacao = requestAnimationFrame(medir);
    };
    atualizar.current = agendar;
    const observador = new ResizeObserver(agendar);
    observador.observe(area);
    observador.observe(controle);
    [...area.children].forEach(coluna => observador.observe(coluna));
    area.addEventListener('scroll', agendar, { passive: true });
    agendar();
    return () => {
      cancelAnimationFrame(animacao);
      observador.disconnect();
      area.removeEventListener('scroll', agendar);
      atualizar.current = () => {};
    };
  }, [children]);

  const moverParaPonteiro = (clientX, deslocamentoClique) => {
    const controle = barra.current;
    const atual = geometriaBarraKanban(quadro.current, controle.clientWidth);
    const posicao = clientX - controle.getBoundingClientRect().left - deslocamentoClique;
    quadro.current.scrollLeft = posicaoDoQuadroKanban(posicao, atual.maximo, atual.percurso);
    atualizar.current();
  };
  const iniciarArraste = evento => {
    if (evento.button !== 0 || !evento.isPrimary || arraste.current) return;
    const atual = geometriaBarraKanban(quadro.current, barra.current.clientWidth);
    const x = evento.clientX - barra.current.getBoundingClientRect().left;
    const noIndicador = x >= atual.deslocamento && x <= atual.deslocamento + atual.larguraIndicador;
    const deslocamentoClique = noIndicador ? x - atual.deslocamento : atual.larguraIndicador / 2;
    arraste.current = { id: evento.pointerId, deslocamentoClique };
    evento.currentTarget.focus({ preventScroll: true });
    evento.currentTarget.setPointerCapture(evento.pointerId);
    definirArrastando(true);
    moverParaPonteiro(evento.clientX, deslocamentoClique);
  };
  const continuarArraste = evento => {
    if (arraste.current?.id !== evento.pointerId) return;
    moverParaPonteiro(evento.clientX, arraste.current.deslocamentoClique);
  };
  const finalizarArraste = evento => {
    if (arraste.current?.id !== evento.pointerId) return;
    arraste.current = null;
    definirArrastando(false);
    if (evento.currentTarget.hasPointerCapture(evento.pointerId)) evento.currentTarget.releasePointerCapture(evento.pointerId);
  };
  const aoTeclar = evento => {
    if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
    const area = quadro.current;
    const { maximo, posicao } = estadoRolagemKanban(area);
    const destinos = {
      ArrowLeft: posicao - 40, ArrowRight: posicao + 40,
      ArrowUp: posicao - 40, ArrowDown: posicao + 40,
      PageUp: posicao - area.clientWidth * .9, PageDown: posicao + area.clientWidth * .9,
      Home: 0, End: maximo,
    };
    if (!(evento.key in destinos)) return;
    evento.preventDefault();
    area.scrollLeft = Math.max(0, Math.min(maximo, destinos[evento.key]));
    atualizar.current();
  };

  return <div className={css.quadro} data-rolavel={temRolagem}>
    <div ref={barra} className={css.barra} hidden={!temRolagem} tabIndex={temRolagem ? 0 : -1}
      role="scrollbar" aria-label="Barra de rolagem horizontal do Kanban" aria-controls={quadroId}
      aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.round(geometria.maximo)}
      aria-valuenow={Math.round(geometria.posicao)} aria-valuetext={`${geometria.maximo > 0 ? Math.round(geometria.posicao / geometria.maximo * 100) : 0}% do Kanban`}
      data-arrastando={arrastando} onPointerDown={iniciarArraste} onPointerMove={continuarArraste}
      onPointerUp={finalizarArraste} onPointerCancel={finalizarArraste} onLostPointerCapture={finalizarArraste} onKeyDown={aoTeclar}>
      <span className={css.trilho} aria-hidden="true" />
      <span className={css.indicador} data-indicador-rolagem aria-hidden="true"
        style={{ width: geometria.larguraIndicador, transform: `translateX(${geometria.deslocamento}px)` }} />
    </div>
    <div ref={quadro} id={quadroId} className={`${className} ${css.conteudo}`} tabIndex={0}
      role="region" aria-label="Kanban de solicitações">{children}</div>
  </div>;
}
