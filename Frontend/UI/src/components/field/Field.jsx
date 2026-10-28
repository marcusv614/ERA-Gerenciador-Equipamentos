import styles from './Field.module.css';

export function CampoFormulario({ rotulo, dica, children, agrupado = false }) {
  if (agrupado) return <fieldset className={`${styles.field} ${styles.grupo}`}>
    <legend className={styles.label}>{rotulo}</legend>
    {dica && <small className={styles.hint}>{dica}</small>}
    {children}
  </fieldset>;
  return (
    <label className={styles.field}>
      <span className={styles.label}>{rotulo}</span>
      {dica && <small className={styles.hint}>{dica}</small>}
      {children}
    </label>
  );
}
