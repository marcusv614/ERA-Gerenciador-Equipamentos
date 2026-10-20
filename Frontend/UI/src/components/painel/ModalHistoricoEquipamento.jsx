import { X } from 'lucide-react';
import { useRef } from 'react';
import { useDialogo } from '../../hooks/useDialogo';
import { formatarData } from '../../utils/datas';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { descreverLocalizacao } from '../../utils/localizacaoEquipamentos';
import { ROTULOS_CALIBRACAO, EVENTOS_CALIBRACAO } from '../../utils/calibracoes';

export function ModalHistoricoEquipamento({ equipamento, historico, buscarObraPorId, aoFechar, aoImprimir, estilos }) {
  const referencia = useRef(null);
  useDialogo(referencia, aoFechar, Boolean(equipamento));
  if (!equipamento) return null;
  const obterNomeObra = (identificador) => identificador ? buscarObraPorId(identificador)?.nome : 'Depósito central';
  return <div className={estilos.overlayBack} onClick={aoFechar}><div ref={referencia} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Histórico do equipamento" className={estilos.overlayPanel} onClick={(evento) => evento.stopPropagation()}>
    <button className={estilos.overlayClose} onClick={aoFechar} aria-label="Fechar"><X size={16} /></button>
    <h3>{equipamento.modelo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : ''}</h3>
    <p className={estilos.overlayMeta}>Status: <strong>{equipamento.status}</strong> • Local: {descreverLocalizacao(equipamento,buscarObraPorId)}</p>
    <div className={estilos.histList}>{historico.map((movimentacao, indice) => <div key={movimentacao.id || indice} className={estilos.histRow}>
      <div className={estilos.histDate}>{formatarData(movimentacao.dataMovimentacao || movimentacao.date || movimentacao.saida || movimentacao.when)}</div>
      <div className={estilos.histText}><div className={estilos.histMove}><span className={estilos.histOrigin}>{movimentacao.origemNome || 'Depósito central'}</span><span className={estilos.histArrow}>→</span><span className={estilos.histDestiny}>{movimentacao.destinoNome || (movimentacao.obraId ? obterNomeObra(movimentacao.obraId) : 'Depósito central')}</span></div><div className={estilos.histDates}>Saída: {formatarData(movimentacao.dataSaida || movimentacao.dataMovimentacao || movimentacao.saida)}{' · '}Entrada: {formatarData(movimentacao.dataEntrada || movimentacao.data || movimentacao.dataMovimentacao)}</div></div>
      <div className={estilos.histObra}><div className={estilos.histTecnico}>{movimentacao.tecnico || '—'}</div><div className={estilos.histStatus}>{movimentacao.status || '—'}</div></div>
    </div>)}</div>
    {(equipamento.manutencoes || []).length > 0 && <><h4>Manutenções registradas</h4><div className={estilos.histList}>{equipamento.manutencoes.map(m => <div key={m.id} className={estilos.histRow}><div className={estilos.histDate}>{m.quantidade} unidade(s)</div><div className={estilos.histText}><strong>{m.status === 'ABERTA' ? 'Em manutenção' : 'Manutenção concluída'} · {m.local}</strong><p>{m.motivo}</p><div className={estilos.histDates}>Abertura: {m.abertaEm ? new Date(m.abertaEm).toLocaleString('pt-BR', { timeZone: 'America/Manaus' }) : 'Não informada'} · {m.abertaPorNome || 'Responsável não informado'}{m.abertaPorLogin ? ` (${m.abertaPorLogin})` : ''}</div>{m.concluidaEm && <><p>Serviço realizado: {m.observacaoConclusao}</p><div className={estilos.histDates}>Conclusão: {new Date(m.concluidaEm).toLocaleString('pt-BR', { timeZone: 'America/Manaus' })} · {m.concluidaPorNome} ({m.concluidaPorLogin})</div></>}</div></div>)}</div></>}
    {!!equipamento.calibracoes?.length&&<section><h4>Calibrações e certificados</h4><div className={estilos.histList}>{equipamento.calibracoes.map(c=><article className={estilos.calibracaoHistorico} key={c.id}>
      <strong>Calibração #{c.id} · {c.historico?'Certificado anterior':ROTULOS_CALIBRACAO[c.status]}</strong><p>Origem: {c.localOrigem}{c.tecnicoOrigem?` · Com ${c.tecnicoOrigem}`:''}</p>
      {c.laboratorio&&<p>Laboratório: {c.laboratorio}</p>}{c.dataEnvio&&<p>Envio: {formatarData(c.dataEnvio)}{c.dataRetorno?` · Retorno: ${formatarData(c.dataRetorno)}`:''}</p>}
      {c.certificado&&<p>Certificado {c.certificado} · Calibrado em {formatarData(c.dataCalibracao)} · Validade {formatarData(c.validade)}</p>}
      {(c.eventos||[]).map((evento,i)=><p className={estilos.histDates} key={i}>{EVENTOS_CALIBRACAO[evento.acao] || evento.acao} · {new Date(evento.registradoEm).toLocaleString('pt-BR',{timeZone:'America/Manaus'})} · {evento.autorNome} ({evento.autorLogin}){evento.observacao?` · ${evento.observacao}`:''}</p>)}
    </article>)}</div></section>}
    <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}><button className={estilos.btnPrimary} onClick={aoImprimir}>Exportar PDF</button></div>
  </div></div>;
}
