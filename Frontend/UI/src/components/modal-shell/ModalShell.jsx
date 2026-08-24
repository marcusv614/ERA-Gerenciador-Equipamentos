import { X } from 'lucide-react';
import styles from './ModalShell.module.css';

export function EstruturaModal({ titulo, subtitulo, aoFechar, children, largo }) {
  return (
    <div className={styles.overlay}>
      <div
        className={`${styles.modal} ${largo ? styles.modalWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{titulo}</h2>
            {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
          </div>
          <button onClick={aoFechar} className={styles.close} aria-label="Fechar">
            <X size={17} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
