import styles from './ObraStatusBadge.module.css';

const STATUS_CLASS = {
  'Planejada': styles.planejada,
  'Em andamento': styles.emAndamento,
  'Concluída': styles.concluida,
};

export function IndicadorStatusObra({ status }) {
  const cls = STATUS_CLASS[status] || styles.planejada;
  return (
    <span className={`${styles.badge} ${cls}`}>{status}</span>
  );
}
