import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { fecharNotificacao, observarNotificacoes, obterNotificacoes, tempoRestante } from '../../services/notificacoes';
import css from './Notificacoes.module.css';

function AvisoSucesso({ aviso }) {
  const [restante, definirRestante] = useState(aviso.duracao);
  const tempo = useRef(aviso.duracao);
  const hover = useRef(false);
  const foco = useRef(false);
  useEffect(() => {
    let anterior = performance.now();
    const visibilidade = () => { anterior = performance.now(); };
    document.addEventListener('visibilitychange', visibilidade);
    const intervalo = window.setInterval(() => {
      const agora = performance.now();
      tempo.current = tempoRestante(tempo.current, agora - anterior, hover.current || foco.current || document.hidden);
      anterior = agora;
      if (tempo.current === 0) fecharNotificacao(aviso.id);
      else definirRestante(tempo.current);
    }, 100);
    return () => { window.clearInterval(intervalo); document.removeEventListener('visibilitychange', visibilidade); };
  }, [aviso.id]);

  return <div className={css.aviso} onPointerEnter={(e) => { if (e.pointerType === 'mouse') hover.current = true; }} onPointerLeave={() => { hover.current = false; }} onFocusCapture={() => { foco.current = true; }} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) foco.current = false; }}>
    <span className={css.icone}><Check size={20} aria-hidden="true" /></span>
    <div className={css.conteudo} role="status" aria-live="polite" aria-atomic="true"><strong>Concluído com sucesso</strong><p>{aviso.mensagem}</p></div>
    <button type="button" className={css.fechar} onClick={() => fecharNotificacao(aviso.id)} aria-label="Fechar notificação"><X size={17} /></button>
    <div className={css.rodape} aria-hidden="true"><span>Fecha em {Math.ceil(restante / 1000)}s</span><div className={css.trilho}><span style={{ width: `${restante / aviso.duracao * 100}%` }} /></div></div>
  </div>;
}

export function Notificacoes() {
  const avisos = useSyncExternalStore(observarNotificacoes, obterNotificacoes);
  return createPortal(<div className={css.central} aria-label="Notificações do sistema">{avisos.slice(0, 3).map((aviso) => <AvisoSucesso key={aviso.id} aviso={aviso} />)}</div>, document.body);
}
