import { useState } from 'react';
import { clienteHttp, obterDadosResposta } from '../../services/api/clienteHttp';
import css from './CancelamentoPedido.module.css';

export function CancelamentoPedido({ pedidoId }) {
  const [aberto,setAberto]=useState(false),[estado,setEstado]=useState(null),[motivo,setMotivo]=useState('');
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState(''),[confirmado,setConfirmado]=useState(false);
  const rota=`/atividades/${pedidoId}/cancelamento`;
  const abrir=async()=>{
    if(aberto){setAberto(false);return;}
    setOcupado(true);setErro('');setAberto(true);
    try{setEstado(obterDadosResposta(await clienteHttp.get(rota)));}catch(e){setErro(e.message);}finally{setOcupado(false);}
  };
  const executar=async(acao)=>{
    if(ocupado||!confirmado||motivo.trim().length<5)return;
    setOcupado(true);setErro('');
    try{
      setEstado(obterDadosResposta(await clienteHttp.post(rota+(acao==='solicitar'?'':'/confirmacao'),{motivo,conferenciaFisica:acao==='estoque'})));
      setConfirmado(false);setMotivo('');window.dispatchEvent(new Event('focus'));
    }catch(e){setErro(e.message);}finally{setOcupado(false);}
  };
  const podeAgir=estado&&(estado.podeSolicitar||estado.podeConfirmarFinanceiro||estado.podeConferirEstoque);
  return <section className={css.root} aria-label={`Cancelamento do atendimento ${pedidoId}`}>
    <button type="button" onClick={abrir} disabled={ocupado} aria-expanded={aberto}>Cancelamento e histórico · #{pedidoId}</button>
    {aberto&&<div className={css.corpo} aria-busy={ocupado}>
      {erro&&<p role="alert">{erro}</p>}
      {estado&&<><strong>{estado.status}</strong>{estado.motivo&&<p>Motivo: {estado.motivo}</p>}
        <p>O cancelamento vale somente para este atendimento, não para os demais pedidos vinculados. Compras e entregas realizadas não serão apagadas.</p>
        {estado.status==='Concluída'&&<p>Entrega concluída: solicite ao gestor um transporte de devolução. O recebimento original deve permanecer no histórico.</p>}
        {estado.status==='Cancelamento solicitado'&&<p>Atendimento suspenso. Confirmação responsável: {estado.financeiroConfirmou?'concluída':'pendente'}. Conferência física: {estado.exigeEstoque?(estado.estoqueConferiu?'concluída':'pendente'):'não necessária'}.</p>}
        {estado.historico.map((e,i)=><article key={i}><p>{e.descricao}</p><small>{e.autorNome} · {new Date(e.registradoEm).toLocaleString('pt-BR')}</small></article>)}
        {podeAgir&&<fieldset disabled={ocupado}>
          <label>Motivo ou parecer (obrigatório)<textarea minLength={5} maxLength={1000} value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>
          {estado.podeConferirEstoque&&<p>Antes de conferir: interrompa coletas/compras. Se houve envio, confirme o retorno de TODOS os itens à origem registrada. Compras recebidas devem permanecer no depósito. Não confirme se faltar algum material.</p>}
          {estado.podeConfirmarFinanceiro&&<p>Antes de confirmar: trate as compras pendentes com o fornecedor e registre no parecer o destino das compras já realizadas.</p>}
          <label className={css.confirmacao}><input type="checkbox" checked={confirmado} onChange={e=>setConfirmado(e.target.checked)}/>Confirmo o motivo e a veracidade das conferências informadas. Esta ação suspende ou encerra o atendimento.</label>
          <div className={css.acoes}>{estado.podeSolicitar&&<button type="button" disabled={!confirmado||motivo.trim().length<5} onClick={()=>executar('solicitar')}>Solicitar cancelamento</button>}{estado.podeConfirmarFinanceiro&&<button type="button" disabled={!confirmado||motivo.trim().length<5} onClick={()=>executar('financeiro')}>Confirmar parecer responsável</button>}{estado.podeConferirEstoque&&<button type="button" disabled={!confirmado||motivo.trim().length<5} onClick={()=>executar('estoque')}>Confirmar conferência física</button>}</div>
        </fieldset>}
      </>}
    </div>}
  </section>;
}
