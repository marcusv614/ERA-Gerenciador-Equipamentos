import { useRef, useState } from 'react';
import { AlertCircle, MapPin, Truck } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { dadosEnvioParcial, materiaisParaEnvioParcial } from '../../utils/atendimentoParcial';
import { nomeLocalPlano } from '../../utils/planoFinanceiro';
import css from './AtendimentoParcialModal.module.css';

export function AtendimentoParcialModal({ solicitacao, obras, aoFechar, aoSalvar }) {
  const materiais = materiaisParaEnvioParcial(solicitacao);
  const [escolhas, definirEscolhas] = useState(() => Object.fromEntries(materiais.flatMap((m) => m.origens.map((o) => [`${m.id}-${o.equipamentoId}`, o.quantidade]))));
  const [motivo, definirMotivo] = useState('');
  const [erro, definirErro] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const emEnvio = useRef(false);
  const totalPedido = materiais.reduce((soma, m) => soma + m.quantidade, 0);
  const totalEnvio = Object.values(escolhas).reduce((soma, q) => soma + Number(q || 0), 0);
  const alterar = (chave, limite, valor) => {
    const numero = Number(valor);
    definirEscolhas((atual) => ({ ...atual, [chave]: Number.isFinite(numero) ? Math.max(0, Math.min(limite, Math.trunc(numero))) : 0 }));
    definirErro('');
  };
  const salvar = async () => {
    if (emEnvio.current) return;
    try {
      const dados = dadosEnvioParcial(solicitacao, escolhas, motivo);
      emEnvio.current = true; definirSalvando(true); definirErro('');
      await aoSalvar(solicitacao.id, dados);
    } catch (falha) { definirErro(falha.message || 'Não foi possível ajustar o atendimento.'); }
    finally { emEnvio.current = false; definirSalvando(false); }
  };
  return <EstruturaModal titulo="Editar solicitação · envio parcial" subtitulo={`Pedido #${solicitacao.id} · ${nomeLocalPlano(solicitacao.obraDestinoId, obras)}`} aoFechar={salvando ? () => {} : aoFechar} largo>
    <fieldset disabled={salvando} className={css.formulario}>
      <p className={css.explicacao}>Separe o que já está disponível para enviar. Compras sem entrada no estoque não podem ser enviadas. O restante ficará pendente para um atendimento posterior.</p>
      {materiais.map((material) => {
        const enviado = material.origens.reduce((soma, o) => soma + Number(escolhas[`${material.id}-${o.equipamentoId}`] || 0), 0);
        return <section className={css.material} key={material.id}>
          <header><h3>{material.nome}</h3><span>{material.quantidade} un. solicitadas</span></header>
          {material.origens.map((origem) => {
            const chave = `${material.id}-${origem.equipamentoId}`;
            return <label className={css.origem} key={chave}><div><strong><MapPin size={16} />{nomeLocalPlano(origem.obraOrigemId, obras)}</strong><small>{origem.identificacao} · {origem.quantidade} un. autorizadas e disponíveis</small></div><span>Enviar agora<input type="number" min="0" max={origem.quantidade} step="1" value={escolhas[chave]} aria-label={`Enviar ${material.nome} de ${origem.identificacao}`} onChange={(e) => alterar(chave, origem.quantidade, e.target.value)} /></span></label>;
          })}
          {!material.origens.length && <p className={css.semSaldo}>Aguardando compra. Nenhuma unidade disponível para este envio.</p>}
          <footer><span><strong>{enviado}</strong> un. neste envio</span><span><strong>{material.quantidade - enviado}</strong> un. continuarão pendentes</span></footer>
        </section>;
      })}
      <label className={css.motivo}>Motivo do ajuste <span>*</span><textarea required rows={3} maxLength={1000} value={motivo} onChange={(e) => definirMotivo(e.target.value)} placeholder="Ex.: fornecedor tinha apenas 6 das 10 unidades. Enviar as 6 e manter as outras 4 pendentes." /></label>
      {erro && <p className={css.erro} role="alert"><AlertCircle size={18} />{erro}</p>}
      <p className={css.resumo} aria-live="polite">{totalEnvio} de {totalPedido} unidades serão separadas. A saída para transporte será confirmada depois.</p>
      <div className={css.acoes}><button type="button" onClick={aoFechar}>Cancelar</button><button type="button" disabled={!totalEnvio || !motivo.trim() || salvando} onClick={salvar}><Truck size={17} />{salvando ? 'Separando...' : 'Separar itens selecionados'}</button></div>
    </fieldset>
  </EstruturaModal>;
}
