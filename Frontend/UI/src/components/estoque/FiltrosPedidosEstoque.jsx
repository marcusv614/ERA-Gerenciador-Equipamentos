import { ArrowDownWideNarrow, CalendarDays, RotateCcw } from 'lucide-react';
import css from './FiltrosPedidosEstoque.module.css';

export function FiltrosPedidosEstoque({ periodo, intervalo, ordem, historico, erro, resumo, filtrosAtivos, aoPeriodo, aoData, aoOrdem, aoLimpar }) {
  return <section className={css.painel} aria-label="Datas e ordenação do estoque">
    <div className={css.topo}><span><CalendarDays size={16}/>Data do pedido</span>{filtrosAtivos && <button type="button" className={css.limpar} onClick={aoLimpar}><RotateCcw size={14}/>Limpar filtros</button>}</div>
    <div className={css.atalhos} role="group" aria-label="Período dos pedidos">
      {[['todos','Todos'],['hoje','Hoje'],['semana','Semana'],['mes','Mês'],['personalizado','Personalizado']].map(([valor,nome]) => <button key={valor} type="button" aria-pressed={periodo === valor} onClick={() => aoPeriodo(valor)}>{nome}</button>)}
    </div>
    <details className={css.avancado} open={periodo === 'personalizado' || undefined}><summary>Datas e ordenação</summary><div className={css.campos}>
      <label><span>De</span><input type="date" aria-label="Data inicial dos pedidos do estoque" value={intervalo.inicio} max={intervalo.fim || undefined} onChange={e => aoData('inicio', e.target.value)} aria-invalid={!!erro}/></label>
      <label><span>Até</span><input type="date" aria-label="Data final dos pedidos do estoque" value={intervalo.fim} min={intervalo.inicio || undefined} onChange={e => aoData('fim', e.target.value)} aria-invalid={!!erro}/></label>
      <label><span><ArrowDownWideNarrow size={14}/>Ordenar por</span><select aria-label="Ordenar pedidos do estoque" value={ordem} onChange={e => aoOrdem(e.target.value)}><option value="operacional">{historico ? 'Padrão do histórico (mais recentes)' : 'Prioridade operacional'}</option><option value="recentes">Mais recentes primeiro</option><option value="antigos">Mais antigos primeiro</option></select></label>
    </div></details>

    {erro ? <p role="alert" className={css.erro}>{erro}</p> : <p className={css.resumo} role="status">{resumo}</p>}
  </section>;
}
