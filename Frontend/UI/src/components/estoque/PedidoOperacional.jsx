import { Box, ChevronRight, FileDown, FileText, MapPin, PackageCheck, ShoppingCart, Truck } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { formatarData } from '../../utils/datas';
import { etapaEstoque, itensOperacionais } from '../../utils/operacaoEstoque';
import { CancelamentoPedido } from '../painel/CancelamentoPedido';
import css from './OperacaoEstoque.module.css';

export function LinhaPedidoEstoque({ pedido, nomeLocal, aoAbrir }) {
  const etapa = etapaEstoque(pedido), itens = itensOperacionais(pedido);
  const origens = [...new Set([...itens.flatMap(m=>m.origens.map(o=>nomeLocal(o.obraOrigemId))), ...(itens.some(m=>m.recebida>0)&&!pedido.materiais.every(m=>m.identificacao) ? ['Depósito central'] : [])])];
  return <article className={css.linha}>
    <div className={css.identidade}><span>Pedido #{String(pedido.id).padStart(4,'0')} · {formatarData(pedido.dataSolicitacao)}</span><h3>{nomeLocal(pedido.obraDestinoId)}</h3><p>{pedido.tecnico}</p></div>
    <ul className={css.previa}>{itens.slice(0,2).map(m=><li key={m.chave}><b>{m.quantidade}×</b><span>{m.nome}</span></li>)}{itens.length>2&&<li className={css.mais}>+{itens.length-2} materiais</li>}{origens.length>0&&<li className={css.origemResumo}><MapPin size={14}/><span>{['Em trânsito','Concluída','Rejeitada'].includes(pedido.status)?'Origem':'Retirar'}: {origens.join(' · ')}</span></li>}</ul>
    <div className={css.abrir}><span className={css.situacao} data-etapa={etapa.chave}>{etapa.titulo}</span><button type="button" aria-label={`Atender pedido ${pedido.id}`} onClick={aoAbrir}>Ver pedido<ChevronRight size={16}/></button></div>
  </article>;
}

export function PedidoOperacional({ pedido, nomeLocal, processando, erro, aoFechar, aoAcao, aoComprar, aoEditar, aoDocumento }) {
  const etapa = etapaEstoque(pedido), itens = itensOperacionais(pedido);
  const separado = pedido.materiais.every(m=>m.identificacao?.trim());
  const editavel = pedido.status==='Aprovada'&&!separado&&pedido.planoFinanceiro?.length>0;
  const historico = ['Concluída','Rejeitada','Em trânsito'].includes(pedido.status);
  const aprovacoes = (pedido.eventosFinanceiros||[]).filter(e=>['APROVACAO_INICIAL','APROVACAO'].includes(e.tipo));
  return <EstruturaModal titulo={`Pedido #${String(pedido.id).padStart(4,'0')}`} subtitulo={`${nomeLocal(pedido.obraDestinoId)} · ${pedido.tecnico}`} aoFechar={processando ? () => {} : aoFechar} largo>
    <div className={css.detalhes} aria-busy={processando}><CancelamentoPedido pedidoId={pedido.id}/>
      <div className={css.contexto}><span className={css.situacao} data-etapa={etapa.chave}>{etapa.titulo}</span><p>{etapa.descricao}</p></div>
      <section aria-label="Materiais e instruções"><header className={css.tituloMateriais}><h3>Materiais do pedido</h3><span>{itens.reduce((s,m)=>s+m.quantidade,0)} un.</span></header>
        <div className={css.itens}>{itens.map(m=><article className={css.item} key={m.chave}><header><strong>{m.nome}</strong><b>{m.quantidade} un.</b></header>
          {m.origens.map((o,i)=><div key={`${o.identificacao}-${i}`} className={css.retirada}><MapPin size={19}/><div><small>{historico?'Origem':'Retirar'} · {o.quantidade} un.</small><strong>{nomeLocal(o.obraOrigemId)}</strong>{o.identificacao&&<span>{o.identificacao}</span>}</div></div>)}
          {!separado&&m.recebida>0&&<div className={css.retirada}><PackageCheck size={19}/><div><small>Compra recebida · {m.recebida} un.</small><strong>Depósito central</strong></div></div>}
          {pedido.status==='Aprovada'&&!separado&&m.materiais.filter(i=>i.quantidadeCompra>(i.quantidadeEntradaEstoque||0)).map(i=><div className={css.compra} key={i.id}><ShoppingCart size={19}/><div><strong>{i.quantidadeCompra-(i.quantidadeEntradaEstoque||0)} un. pendentes da compra</strong>{i.quantidadeEntradaEstoque>0&&<span>{i.quantidadeEntradaEstoque} de {i.quantidadeCompra} un. já recebidas</span>}</div><button type="button" disabled={processando} onClick={()=>aoComprar(i)}>Registrar compra</button></div>)}
          {!m.origens.length&&!m.compra&&<p className={css.nota}>Origem ainda não definida pelo Financeiro.</p>}
        </article>)}</div>
      </section>
      {editavel&&<div className={css.parcial}><div><strong>Vai enviar apenas uma parte?</strong><p>Separe o que está disponível. O restante continuará pendente.</p></div><button type="button" disabled={processando} onClick={aoEditar}>Ajustar envio</button></div>}
      {pedido.observacao&&<section className={css.observacao}><h3>Observação do pedido</h3><p>{pedido.observacao}</p></section>}
      <details className={css.documentos}><summary>Documentos e dados do pedido</summary><div className={css.dadosPedido}><dl><div><dt>Solicitado por</dt><dd>{pedido.solicitante||pedido.tecnico}</dd></div><div><dt>Data do pedido</dt><dd>{formatarData(pedido.dataSolicitacao)}</dd></div></dl>{aprovacoes.map((e,i)=><p key={i}><strong>{e.tipo==='APROVACAO_INICIAL'?'Gerência / RH':'Financeiro'}: {e.autorNome}</strong><span>{new Date(e.registradoEm).toLocaleString('pt-BR',{timeZone:'America/Manaus'})}</span></p>)}{pedido.solicitacaoPaiId&&<p>Vinculado ao pedido #{pedido.solicitacaoPaiId}</p>}<div className={css.documentosBotoes}><button type="button" onClick={()=>aoDocumento('ordem')}><FileDown size={17}/>Ordem de atendimento</button><button type="button" onClick={()=>aoDocumento('historico')}><FileText size={17}/>Rastreabilidade PDF</button>{separado&&pedido.status==='Aprovada'&&<button type="button" onClick={()=>aoDocumento('romaneio')}><FileDown size={17}/>Romaneio</button>}</div></div></details>
      <footer className={css.rodape}>{erro&&<p className={css.erro} role="alert">{erro}</p>}<div><button type="button" disabled={processando} onClick={aoFechar}>Fechar pedido</button>{etapa.acao&&<button type="button" className={css.primario} disabled={processando} onClick={aoAcao}>{etapa.chave==='separar'?<Box size={18}/>:<Truck size={18}/>} {processando?'Processando…':etapa.acao}</button>}</div></footer>
    </div>
  </EstruturaModal>;
}
