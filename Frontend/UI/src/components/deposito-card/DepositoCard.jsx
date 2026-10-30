import { descreverLocalizacao } from '../../utils/localizacaoEquipamentos';
import { IndicadorStatus } from '../status-badge/StatusBadge';
import { Pencil, Wrench } from 'lucide-react';
import { iconePorTipoEquipamento } from '../../data/constantesDominio';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { QuantidadesEquipamento } from '../painel/QuantidadesEquipamento';
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

export function CartaoDeposito({ equipamentos, obras, podeEditar, aoEditar }) {
  const buscarObraPorId = (identificador) =>
    identificador ? obras.find((obra) => obra.id === identificador) : null;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Inventário do depósito</h2>
          <p className={styles.subtitle}>{equipamentos.length} {equipamentos.length === 1 ? 'registro' : 'registros'}</p>
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

            return (
              <div key={equipamento.id} className={styles.row}>
                <div className={`${styles.tile} ${TILE[equipamento.tipo] || ''}`}>
                  <IconeTipo size={15} />
                </div>
                <div className={styles.info}>
                  <div className={styles.model}>{equipamento.modelo}</div>
                  <div className={styles.serie}>{[equipamento.tipo, equipamento.medida, identificacaoVisivel(equipamento.serie, equipamento.tipo), equipamento.notaFiscal ? `NF ${equipamento.notaFiscal}` : null].filter(Boolean).join(' · ')}</div>
                  <QuantidadesEquipamento equipamento={equipamento} className={styles.quantidades} />
                </div>
                <IndicadorStatus status={equipamento.status} />
                <div className={styles.local}>{descreverLocalizacao(equipamento,buscarObraPorId)}</div>
                {podeEditar && <button type="button" className={styles.editar} onClick={() => aoEditar(equipamento)} aria-label={`Editar ${equipamento.modelo}`} title="Editar equipamento"><Pencil size={14} /></button>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
