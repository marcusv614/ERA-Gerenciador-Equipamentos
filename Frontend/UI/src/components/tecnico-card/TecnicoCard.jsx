import { BriefcaseBusiness, ClipboardCheck, FileText, Mail, PackageSearch, Pencil, Phone } from 'lucide-react';
import { IndicadorStatus } from '../status-badge/StatusBadge';
import { IndicadorStatusObra } from '../obra-status-badge/ObraStatusBadge';
import { formatarData } from '../../utils/datas';
import styles from './TecnicoCard.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { ehFuncionarioEstoquista } from '../../utils/classificacaoFuncionario';

export function CartaoTecnico({ funcionario, obras, equipamentos, todasAsObras, podeEditar, aoEditar, aoAuditar, pedidosFinanceiros, aoExportarPedidos, aoVerPedidos }) {
  const financeiro=Array.isArray(pedidosFinanceiros);
  const { nome, cargo, email, telefone, status } = funcionario;
  const initials = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const buscarObraDoEquipamento = (obraId) => (obraId ? todasAsObras.find((obra) => obra.id === obraId) : null);
  const equipamentosAuditaveis = equipamentos.filter((equipamento) => equipamento.auditavel).length;
  const estoquista = ehFuncionarioEstoquista(funcionario);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>{initials}</div>
        <div className={styles.headerInfo}>
          <div className={styles.name}>{nome}</div>
          <div className={styles.roleLine}><span>{cargo}</span><b data-status={status}>{status}</b></div>
          {(email || telefone) && <div className={styles.contactList}>{email && <span><Mail size={13} />{email}</span>}{telefone && <span><Phone size={13} />{telefone}</span>}</div>}
          {!estoquista && <div className={styles.meta}>
            <span className={styles.pill}>
              <BriefcaseBusiness size={13} /><strong>{obras.length}</strong> {obras.length === 1 ? 'obra' : 'obras'}
            </span>
            <span className={styles.pill}>
              <PackageSearch size={13} /><strong>{financeiro?pedidosFinanceiros.length:equipamentos.length}</strong> {financeiro?'pedidos':equipamentos.length === 1 ? 'material' : 'materiais'}
            </span>
          </div>}
        </div>
        {podeEditar && <button type="button" className={styles.editButton} onClick={() => aoEditar(funcionario)} aria-label={`Editar dados de ${nome}`}><Pencil size={15} /> Editar</button>}
      </div>

      {!estoquista && <div className={styles.section}>
        <div className={styles.sectionHeading}><div className={styles.sectionTitle}>Obras sob responsabilidade</div><span>{obras.length}</span></div>
        {obras.length > 0 ? <div className={styles.obraList}>
          {obras.map((o) => (
              <div key={o.id} className={styles.obraRow}>
                <div className={styles.obraIdentity}><span className={styles.obraIcon}><BriefcaseBusiness size={14} /></span><span className={styles.obraNome}>{o.nome}</span></div>
                <IndicadorStatusObra status={o.status} />
              </div>
          ))}
        </div> : <div className={styles.empty}>Nenhuma obra atribuída no momento.</div>}
      </div>}

      {financeiro&&!estoquista&&<section className={styles.section}><div className={styles.sectionHeading}><div className={styles.sectionTitle}>Pedidos do técnico</div><span>{pedidosFinanceiros.length}</span></div>{pedidosFinanceiros.length?<><div className={styles.tableWrap}><div className={styles.table}><div className={styles.rowHead}><span>Pedido</span><span>Solicitante</span><span>Situação</span><span>Obra</span><span>Data</span></div>{pedidosFinanceiros.map(p=><div className={styles.row} key={p.id}><span className={styles.rowModel} data-label="Pedido">#{String(p.id).padStart(4,'0')}</span><span className={styles.rowSerie} data-label="Solicitante">{p.solicitante}</span><span className={styles.rowStatus} data-label="Situação">{p.status==='Aprovada'?'Aprovado':p.status}</span><span className={styles.rowLocal} data-label="Obra">{p.obra}</span><span className={styles.rowData} data-label="Data">{formatarData(p.dataSolicitacao)}</span></div>)}</div></div><button type="button" className={styles.auditButton} onClick={()=>aoVerPedidos(nome)}>Consultar pedidos</button><button type="button" className={styles.auditButton} onClick={()=>aoExportarPedidos(pedidosFinanceiros,`Pedidos de ${nome}`)}><FileText size={16}/>PDF dos pedidos</button></>:<div className={styles.empty}>Nenhum pedido registrado.</div>}</section>}
      {!financeiro&&!estoquista && <div className={styles.section}>
        <div className={styles.sectionHeading}><div className={styles.sectionTitle}>Materiais registrados com o técnico</div><span>{equipamentos.length}</span></div>
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
                  <div key={e.id} className={styles.row}>
                    <span className={styles.rowModel} data-label="Equipamento">
                      <PackageSearch size={13} className={styles.rowIcon} />
                      {e.modelo}
                    </span>
                    <span className={styles.rowStatus}>
                      <IndicadorStatus status={e.status} />
                    </span>
                    <span className={styles.rowSerie} data-label="Série">{serie || '—'}</span>
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
      </div>}
      {!estoquista && aoAuditar && <section className={`${styles.section} ${styles.auditSection}`}>
        <div className={styles.auditContent}><span className={styles.auditIcon}><ClipboardCheck size={18} aria-hidden="true" /></span><div><div className={styles.sectionTitle}>Vistorias dos materiais</div><p className={styles.auditHint}>{equipamentosAuditaveis === 0 ? 'Nenhum material marcado para vistoria.' : `${equipamentosAuditaveis} ${equipamentosAuditaveis === 1 ? 'material marcado' : 'materiais marcados'} para vistoria.`} Gere a ficha e registre as condições encontradas.</p></div></div>
        <button type="button" className={styles.auditButton} onClick={() => aoAuditar(funcionario)}><ClipboardCheck size={16} aria-hidden="true" /> Gerenciar vistorias</button>
      </section>}
    </div>
  );
}
