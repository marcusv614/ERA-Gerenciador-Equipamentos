import styles from './StatCard.module.css';

export function CartaoResumo({ rotulo, valor, destaque }) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{rotulo}</span>
      <span className={styles.value} style={destaque ? { color: destaque } : undefined}>{valor}</span>
    </div>
  );
}
