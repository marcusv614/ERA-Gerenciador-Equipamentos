import { PackageSearch, Pencil } from 'lucide-react';
import { IndicadorStatus } from '../status-badge/StatusBadge';
import { IndicadorStatusObra } from '../obra-status-badge/ObraStatusBadge';
import { formatarData } from '../../utils/datas';
import styles from './TecnicoCard.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';

export function CartaoTecnico({ funcionario, obras, equipamentos, todasAsObras, podeEditar, aoEditar }) {
  const { nome, cargo, email, telefone, status } = funcionario;
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const buscarObraDoEquipamento = (obraId) => (obraId ? todasAsObras.find((obra) => obra.id === obraId) : null);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.headerInfo}>
          <div className={styles.name}>{nome}</div>
          <div className={styles.roleLine}><span>{cargo}</span><b data-status={status}>{status}</b></div>
          <div className={styles.contactList}><span>{email}</span>{telefone && <span>{telefone}</span>}</div>
          <div className={styles.meta}>
            <span className={styles.pill}>
              {obras.length} {obras.length === 1 ? 'obra' : 'obras'}
            </span>
            <span className={styles.pill}>
              {equipamentos.length} {equipamentos.length === 1 ? 'material' : 'materiais'}
            </span>
          </div>
        </div>
        {podeEditar && <button type="button" className={styles.editButton} onClick={() => aoEditar(funcionario)} aria-label={`Editar dados de ${nome}`}><Pencil size={15} /> Editar</button>}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Obras sob responsabilidade</div>
        {obras.length > 0 ? <div className={styles.obraList}>
          {obras.map((o) => (
              <div key={o.id} className={styles.obraRow}>
                <span className={styles.obraNome}>{o.nome}</span>
                <IndicadorStatusObra status={o.status} />
              </div>
          ))}
        </div> : <div className={styles.empty}>Nenhuma obra atribuída no momento.</div>}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Materiais registrados com o técnico</div>
        {equipamentos.length === 0 ? (
          <div className={styles.empty}>Nenhum material registrado no momento.</div>
        ) : (
          <div className={styles.tableWrap}>
            <div className={styles.table}>
              <div className={styles.rowHead}>
                <span>Equipamento</span>
                <span>Série</span>
                <span>Status</span>
                <span>Local</span>
                <span>Retirada</span>
              </div>
              {equipamentos.map((e) => {
                const obra = buscarObraDoEquipamento(e.obraId);
                const serie = identificacaoVisivel(e.serie, e.tipo);
                return (
                  <div key={e.id} className={`${styles.row} ${!serie ? styles.rowSemSerie : ''}`}>
                    <span className={styles.rowModel} data-label="Equipamento">
                      <PackageSearch size={13} className={styles.rowIcon} />
                      {e.modelo}
                    </span>
                    {serie && <span className={styles.rowSerie} data-label="Série">{serie}</span>}
                    <span className={styles.rowStatus} data-label="Status">
                      <IndicadorStatus status={e.status} />
                    </span>
                    <span className={styles.rowLocal} data-label="Local">
                      {obra ? obra.nome : 'Depósito central'}
                    </span>
                    <span className={styles.rowData} data-label="Retirada">{(e.saida && formatarData(e.saida)) || '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
