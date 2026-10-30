import { PackageCheck } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import css from './TecnicoCampo.module.css';

export function ConfirmarRecebimentoTecnico({ pedido, materiais, local, ocupado, erro, aoFechar, aoConfirmar }) {
  const permitido = pedido.status === 'Em trânsito' && Boolean(pedido.obraDestinoId);
  return <EstruturaModal titulo={`Receber pedido #${String(pedido.id).padStart(4, '0')}`} subtitulo={local} aoFechar={aoFechar}>
    <div className={css.recebimento} aria-busy={ocupado}>
      <p>Confira os materiais e as quantidades que você recebeu.</p>
      {pedido.solicitacaoPaiId && <p>Este recebimento corresponde ao pedido #{pedido.id}, parte do pedido #{pedido.solicitacaoPaiId}.</p>}
      <ul className={css.materiaisPedido} aria-label="Materiais para confirmar recebimento">{materiais.map(material => <li key={material.chave}><b>{material.quantidade}×</b><span>{material.nome}</span></li>)}</ul>
      {!permitido && <p role="status">Situação atual: {pedido.status}. O recebimento não está disponível.</p>}
      {erro && <p role="alert" className={css.erroRecebimento}>{erro}</p>}
      <div className={css.acoesRecebimento}>
        <button type="button" className={css.acaoSecundaria} onClick={aoFechar}>Voltar</button>
        <button type="button" className={css.acaoPrincipal} disabled={ocupado || !permitido || !materiais.length} onClick={aoConfirmar}><PackageCheck size={19} />{ocupado ? 'Confirmando…' : 'Confirmar recebimento'}</button>
      </div>
    </div>
  </EstruturaModal>;
}
