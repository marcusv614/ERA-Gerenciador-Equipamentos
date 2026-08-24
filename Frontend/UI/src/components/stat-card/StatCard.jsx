import styles from './StatCard.module.css';

const ACCENTS = {
  'var(--accent)': styles.accent,
  'var(--info)': styles.info,
  'var(--warn)': styles.warn,
};

export function CartaoResumo({ rotulo, valor, destaque }) {
  const valueClass = destaque
    ? `${styles.value} ${ACCENTS[destaque] || styles.accent}`
    : styles.value;

  return (
    <div className={styles.card}>
      <span className={styles.label}>{rotulo}</span>
      <span className={valueClass}>{valor}</span>
    </div>
  );
}
