import { Check, Clock3, Route } from 'lucide-react';
import { acompanhamentoSolicitacao } from '../../utils/acompanhamentoSolicitacao';
import css from './AndamentoSolicitacao.module.css';

export function AndamentoSolicitacao({ solicitacao }) {
  const atual = acompanhamentoSolicitacao(solicitacao);
  const etapas = [atual.gestor, 'Financeiro', 'Compra / separação', 'Transporte', 'Recebimento'];
  return <section className={css.painel} aria-label="Acompanhamento do pedido">
    <div className={css.atual}><Route size={22} /><div><span>Etapa atual</span><h3>{atual.rotulo}</h3><p>{atual.detalhe}</p><small>Responsável pela etapa: <strong>{atual.responsavel || 'Não informado'}</strong></small></div></div>
    <ol className={css.etapas}>{etapas.map((etapa, indice) => {
      const pulada = atual.direto && indice === 1;
      const estado = pulada ? 'ignorada' : atual.grupo === 'finalizada' ? 'concluida' : atual.grupo === 'rejeitada' && indice === atual.passo ? 'rejeitada' : indice < atual.passo ? 'concluida' : indice === atual.passo ? 'atual' : 'pendente';
      return <li key={etapa} data-estado={estado} aria-current={estado === 'atual' ? 'step' : undefined}><span>{estado === 'concluida' ? <Check size={14} /> : estado === 'atual' ? <Clock3 size={14} /> : indice + 1}</span><div><strong>{etapa}</strong>{pulada && <small>Transporte direto</small>}</div></li>;
    })}</ol>
    {atual.parcial && <p className={css.parcial}>Este é um atendimento parcial. A etapa acima se refere às unidades deste atendimento; o restante está nos atendimentos vinculados ao pedido original.</p>}
  </section>;
}
