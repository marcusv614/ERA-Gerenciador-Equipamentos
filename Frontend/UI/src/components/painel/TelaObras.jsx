import { ArrowLeftRight, Calendar, Download, FileText, MapPin, Wrench } from 'lucide-react';
import { IndicadorStatusObra } from '../obra-status-badge/ObraStatusBadge';
import { formatarData } from '../../utils/datas';
import { iconePorTipoEquipamento } from '../../data/mockData';

const classePorTipo = { Fluke: 'tipoFluke', OTDR: 'tipoOtdr', Outro: 'tipoOutro' };

export function TelaObras({ obras, equipamentos, aoMoverEquipamento, aoImprimirCautela, aoImprimirHistorico, estilos }) {
  return <div className={estilos.obraList}>{obras.map((obra) => {
    const equipamentosDaObra = equipamentos.filter(({ obraId }) => obraId === obra.id);
    return <div key={obra.id} className={estilos.obraCard}>
      <div className={estilos.obraHead}>
        <div><div className={estilos.obraTitleRow}><h3 className={estilos.obraTitle}>{obra.nome}</h3><IndicadorStatusObra status={obra.status} /></div><div className={estilos.obraMeta}><span className={estilos.obraClient}>{obra.cliente}</span><span className={estilos.obraMetaItem}><MapPin size={11} />{obra.cidade}</span><span className={estilos.obraMetaItem}><Calendar size={11} />{formatarData(obra.inicio)}</span><span>Resp.: {obra.responsaveis?.join(', ') || '—'}</span></div></div>
        <div className={estilos.obraActionsGroup}><span className={estilos.obraCount}>{equipamentosDaObra.length} equip.</span><div className={estilos.obraExportActions}><button type="button" className={estilos.obraExportBtn} onClick={() => aoImprimirCautela(obra)}><FileText size={13} /> Exportar cautela</button><button type="button" className={estilos.obraExportBtnSecondary} onClick={() => aoImprimirHistorico(obra)}><Download size={13} /> Histórico da obra</button></div></div>
      </div>
      {equipamentosDaObra.length > 0 && <div className={estilos.obraEquipList}>{equipamentosDaObra.map((equipamento) => {
        const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;
        return <div key={equipamento.id} className={estilos.obraEquipRow}><div className={estilos.obraEquipInfo}><div className={`${estilos.obraEquipTile} ${estilos[classePorTipo[equipamento.tipo]] || ''}`}><IconeTipo size={14} /></div><div className={estilos.obraEquipText}><div className={estilos.obraEquipTopRow}><span className={estilos.obraEquipNome}>{equipamento.modelo}</span><span className={estilos.obraEquipMov}>mov. {formatarData(equipamento.saida)}</span></div><div className={estilos.obraEquipSerie}>{equipamento.serie}</div></div></div><button onClick={() => aoMoverEquipamento(equipamento)} className={estilos.obraMoverBtn}><ArrowLeftRight size={11} /> Mover</button></div>;
      })}</div>}
    </div>;
  })}{obras.length === 0 && <div className={estilos.emptyState}>Nenhuma obra encontrada.</div>}</div>;
}
