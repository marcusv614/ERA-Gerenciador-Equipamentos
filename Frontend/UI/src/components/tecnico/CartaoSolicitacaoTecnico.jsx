import { Check, Clock3, MapPin, PackageCheck, X } from 'lucide-react';
import { CancelamentoPedido } from '../painel/CancelamentoPedido';
import css from './TecnicoCampo.module.css';

function IconeSituacao({ status }) {
  if (['Cancelada', 'Rejeitada'].includes(status)) return <X size={18} />;
  if (status === 'Concluída') return <Check size={18} />;
  if (status === 'Em trânsito') return <PackageCheck size={18} />;
  return <Clock3 size={18} />;
}

export function CartaoSolicitacaoTecnico({ pedido, materiais, local, dataFormatada, aoReceber, processando }) {
  const codigo = `#${String(pedido.id).padStart(4, '0')}`;
  const tituloId = `titulo-pedido-campo-${pedido.id}`;
  const podeReceber = pedido.status === 'Em trânsito' && Boolean(pedido.obraDestinoId);
  return <article id={`pedido-tecnico-${pedido.id}`} tabIndex={-1} className={css.pedido} aria-labelledby={tituloId}>
    <header className={css.topoPedido}>
      <h3 id={tituloId}>Pedido {codigo}</h3>
      <span className={css.situacao} data-status={pedido.status}><IconeSituacao status={pedido.status} />{pedido.status || 'Situação não informada'}</span>
    </header>
    <p className={css.localPedido}><MapPin size={17} aria-hidden="true" /><span>{pedido.obraDestinoId ? 'Entregar em' : 'Retirar de'} <strong>{local}</strong></span></p>
    <ul className={css.materiaisPedido} aria-label="Materiais do pedido">
      {materiais.slice(0, 2).map(material => <li key={material.chave}><b>{material.quantidade}×</b><span>{material.nome}</span></li>)}
    </ul>
    {podeReceber && <button type="button" className={css.acaoPrincipal} disabled={processando} onClick={() => aoReceber(pedido.id)}><PackageCheck size={19} />Confirmar recebimento</button>}
    <details className={css.detalhesPedido}>
      <summary>Ver detalhes{materiais.length > 2 ? ` · +${materiais.length - 2} ${materiais.length === 3 ? 'material' : 'materiais'}` : ''}</summary>
      <dl><div><dt>Solicitado em</dt><dd>{dataFormatada}</dd></div>
        {pedido.solicitacaoPaiId && <div><dt>Parte do pedido</dt><dd>#{pedido.solicitacaoPaiId}</dd></div>}
        {pedido.solicitante && <div><dt>Solicitado por</dt><dd>{pedido.solicitante}</dd></div>}
      </dl>
      <h4>Todos os materiais deste pedido</h4>
      <ul className={css.materiaisPedido}>{pedido.materiais.map((material, indice) => <li key={material.id ?? indice}><b>{material.quantidade}×</b><span>{material.nome}{material.identificacao && <small>Identificação: {material.identificacao}</small>}</span></li>)}</ul>
      {pedido.observacao && <section><h4>Observação</h4><p>{pedido.observacao}</p></section>}
      {pedido.eventosFinanceiros?.length > 0 && <section><h4>Registros do pedido</h4><ol className={css.registros}>{pedido.eventosFinanceiros.map((evento, indice) => <li key={indice}><p>{evento.descricao}</p>{evento.autorNome && <small>{evento.autorNome}</small>}{evento.registradoEm && <time dateTime={evento.registradoEm}>{new Date(evento.registradoEm).toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}</time>}</li>)}</ol></section>}
      <CancelamentoPedido pedidoId={pedido.id} />
    </details>
  </article>;
}

export function PedidosTecnicoCampo({ pedidos, agruparMateriais, nomeLocal, formatarData, aoReceber, processando, aoNovoPedido }) {
  const encerrados = new Set(['Concluída', 'Rejeitada', 'Cancelada']);
  const precisaReceber = pedido => pedido.status === 'Em trânsito' && Boolean(pedido.obraDestinoId);
  const grupos = [
    { titulo: 'Para receber', pedidos: pedidos.filter(precisaReceber) },
    { titulo: 'Em andamento', pedidos: pedidos.filter(pedido => !precisaReceber(pedido) && !encerrados.has(pedido.status)) },
    { titulo: 'Pedidos anteriores', pedidos: pedidos.filter(pedido => encerrados.has(pedido.status)) },
  ];
  if (!pedidos.length) return <div className={css.vazio}><PackageCheck size={32} /><h2>Nenhum pedido ainda</h2><button type="button" className={css.acaoPrincipal} onClick={aoNovoPedido}>Novo pedido</button></div>;
  return <div className={css.gruposPedidos}>{grupos.filter(grupo => grupo.pedidos.length).map(grupo => <section key={grupo.titulo} aria-label={grupo.titulo}>
    <h2 className={css.tituloGrupo}>{grupo.titulo} <span>{grupo.pedidos.length}</span></h2>
    <div className={css.gradePedidos}>{grupo.pedidos.map(pedido => <CartaoSolicitacaoTecnico key={pedido.id} pedido={pedido} materiais={agruparMateriais(pedido.materiais)}
      local={pedido.obraDestinoId || pedido.obraOrigemId ? nomeLocal(pedido.obraDestinoId || pedido.obraOrigemId) : 'Local não disponível'} dataFormatada={formatarData(pedido.dataSolicitacao)} aoReceber={aoReceber} processando={processando} />)}</div>
  </section>)}</div>;
}
