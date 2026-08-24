import { IndicadorStatus } from '../status-badge/StatusBadge';
import { Wrench } from 'lucide-react';
import { iconePorTipoEquipamento } from '../../data/mockData';
import styles from './DepositoCard.module.css';

const TILE = {
  Fluke: styles.tipoFluke,
  OTDR: styles.tipoOtdr,
  Outro: styles.tipoOutro,
};

const LEGEND = [
  { key: 'Em estoque', label: 'estoque', dot: styles.dotEstoque },
  { key: 'Em manutenção', label: 'manutenção', dot: styles.dotManutencao },
];

export function CartaoDeposito({ equipamentos, obras }) {
  const buscarObraPorId = (identificador) =>
    identificador ? obras.find((obra) => obra.id === identificador) : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Depósito</h2>
          <p className={styles.subtitle}>Itens fora de campo — {equipamentos.length} registros</p>
        </div>
        <div className={styles.legend}>
          {LEGEND.map((l) => (
            <span key={l.key} className={styles.legendItem}>
              <span className={`${styles.dot} ${l.dot}`} />
              {equipamentos.filter((equipamento) => equipamento.status === l.key).length} {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.scroll}>
        {equipamentos.length === 0 ? (
          <div className={styles.empty}>Nenhum item fora de campo encontrado.</div>
        ) : (
          equipamentos.map((equipamento) => {
            const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;
            const obra = buscarObraPorId(equipamento.obraId);
            return (
              <div key={equipamento.id} className={styles.row}>
                <div className={`${styles.tile} ${TILE[equipamento.tipo] || ''}`}>
                  <IconeTipo size={15} />
                </div>
                <div className={styles.info}>
                  <div className={styles.model}>{equipamento.modelo}</div>
                  <div className={styles.serie}>{equipamento.tipo} · {equipamento.medida || equipamento.serie} · {equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1} disponíveis{equipamento.quantidadeReservada > 0 ? ` · ${equipamento.quantidadeReservada} reservadas` : ''}</div>
                </div>
                <IndicadorStatus status={equipamento.status} />
                <div className={styles.local}>{obra ? obra.nome : 'Depósito central'}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
