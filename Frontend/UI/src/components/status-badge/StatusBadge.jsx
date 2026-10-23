import { CircleDot } from 'lucide-react';
import styles from './StatusBadge.module.css';

const STATUS_CLASS = {
  'Em campo': styles.campo,
  'Em estoque': styles.estoque,
  'Em manutenção': styles.manutencao,
  'Em trânsito': styles.transito,
  'Em calibração': styles.calibracao,
  'Aguardando calibração': styles.calibracao,
};

export function IndicadorStatus({ status }) {
  const cls = STATUS_CLASS[status] || '';
  return (
    <span className={`${styles.badge} ${cls}`} data-status-equipamento={status}>
      <CircleDot size={11} className={styles.dot} aria-hidden="true" />
      {status}
    </span>
  );
}
