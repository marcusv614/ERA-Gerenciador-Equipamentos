import { useEffect, useEffectEvent } from 'react';

// Mantém teclado e rolagem dentro da janela, inclusive quando há outro modal atrás.
export function useDialogo(referencia, aoFechar, ativo = true) {
  const fechar = useEffectEvent(aoFechar);
  useEffect(() => {
    if (!ativo) return;
    const janela = referencia.current;
    if (!janela) return;
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    janela.focus({ preventScroll: true });
    const teclado = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        fechar();
      }
      if (evento.key !== 'Tab') return;
      const campos = [...janela.querySelectorAll('button, input, select, textarea, a[href], [tabindex]')]
        .filter((campo) => !campo.disabled && campo.tabIndex >= 0 && campo.getClientRects().length);
      const primeiro = campos[0], ultimo = campos.at(-1);
      if (!primeiro) { evento.preventDefault(); return; }
      if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === janela)) {
        evento.preventDefault(); ultimo.focus();
      } else if (!evento.shiftKey && (document.activeElement === ultimo || document.activeElement === janela)) {
        evento.preventDefault(); primeiro.focus();
      }
    };
    janela.addEventListener('keydown', teclado);
    return () => {
      janela.removeEventListener('keydown', teclado);
      document.body.style.overflow = overflow;
      if (anterior?.isConnected) anterior.focus({ preventScroll: true });
    };
  }, [referencia, ativo]);
}
