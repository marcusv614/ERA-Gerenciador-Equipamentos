import styles from './Field.module.css';

export function CampoFormulario({ rotulo, dica, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>{rotulo}</span>
      {dica && <small className={styles.hint}>{dica}</small>}
      {children}
    </label>
  );
}
