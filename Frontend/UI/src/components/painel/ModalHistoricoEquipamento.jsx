import { X } from 'lucide-react';
import { formatarData } from '../../utils/datas';

export function ModalHistoricoEquipamento({ equipamento, historico, buscarObraPorId, aoFechar, aoImprimir, estilos }) {
  if (!equipamento) return null;
  const obterNomeObra = (identificador) => identificador ? buscarObraPorId(identificador)?.nome : 'Depósito central';
  return <div className={estilos.overlayBack} onClick={aoFechar}><div className={estilos.overlayPanel} onClick={(evento) => evento.stopPropagation()}>
    <button className={estilos.overlayClose} onClick={aoFechar} aria-label="Fechar"><X size={16} /></button>
    <h3>{equipamento.modelo} · {equipamento.serie}</h3>
    <p className={estilos.overlayMeta}>Status: <strong>{equipamento.status}</strong> • Local: {equipamento.obraId ? obterNomeObra(equipamento.obraId) : 'Depósito central'}</p>
    <div className={estilos.histList}>{historico.map((movimentacao, indice) => <div key={movimentacao.id || indice} className={estilos.histRow}>
      <div className={estilos.histDate}>{formatarData(movimentacao.dataMovimentacao || movimentacao.date || movimentacao.saida || movimentacao.when)}</div>
      <div className={estilos.histText}><div className={estilos.histMove}><span className={estilos.histOrigin}>{movimentacao.origemNome || 'Depósito central'}</span><span className={estilos.histArrow}>→</span><span className={estilos.histDestiny}>{movimentacao.destinoNome || (movimentacao.obraId ? obterNomeObra(movimentacao.obraId) : 'Depósito central')}</span></div><div className={estilos.histDates}>Saída: {formatarData(movimentacao.dataSaida || movimentacao.dataMovimentacao || movimentacao.saida)}{' · '}Entrada: {formatarData(movimentacao.dataEntrada || movimentacao.data || movimentacao.dataMovimentacao)}</div></div>
      <div className={estilos.histObra}><div className={estilos.histTecnico}>{movimentacao.tecnico || '—'}</div><div className={estilos.histStatus}>{movimentacao.status || '—'}</div></div>
    </div>)}</div>
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button className={estilos.btnPrimary} onClick={aoImprimir}>Exportar PDF</button></div>
  </div></div>;
}
