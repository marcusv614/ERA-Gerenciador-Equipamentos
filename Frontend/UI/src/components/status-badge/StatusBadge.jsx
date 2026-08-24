import { CircleDot } from 'lucide-react';
import styles from './StatusBadge.module.css';

const STATUS_CLASS = {
  'Em campo': styles.campo,
  'Em estoque': styles.estoque,
  'Em manutenção': styles.manutencao,
  'Em trânsito': styles.transito,
};

export function IndicadorStatus({ status }) {
  const cls = STATUS_CLASS[status] || styles.campo;
  return (
    <span className={`${styles.badge} ${cls}`}>
      <CircleDot size={11} className={styles.dot} />
      {status}
    </span>
  );
}
