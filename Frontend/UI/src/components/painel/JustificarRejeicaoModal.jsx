import { useState } from 'react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import css from './CancelamentoPedido.module.css';
export function JustificarRejeicaoModal({pedidoId,processando,erro,aoFechar,aoConfirmar}) {
  const [motivo,setMotivo]=useState('');
  return <EstruturaModal titulo={`Justificar rejeição · pedido #${pedidoId}`} subtitulo="A justificativa será registrada com seu nome e a data no histórico do pedido." aoFechar={processando?()=>{}:aoFechar}>
    <form className={css.corpo} onSubmit={e=>{e.preventDefault();if(!processando&&motivo.trim().length>=5)aoConfirmar(motivo.trim());}}>
      {erro&&<p role="alert">{erro}</p>}
      <fieldset disabled={processando}><label>Justificativa obrigatória<textarea autoFocus required minLength={5} maxLength={1000} placeholder="Explique por que o pedido está sendo rejeitado." value={motivo} onChange={e=>setMotivo(e.target.value)}/></label>
      <small>Informe entre 5 e 1000 caracteres. O pedido só será rejeitado após a confirmação.</small>
      <div className={css.acoes}><button type="button" onClick={aoFechar}>Voltar sem rejeitar</button><button type="submit" disabled={motivo.trim().length<5}>{processando?'Registrando…':'Confirmar rejeição com justificativa'}</button></div></fieldset>
    </form>
  </EstruturaModal>;
}
