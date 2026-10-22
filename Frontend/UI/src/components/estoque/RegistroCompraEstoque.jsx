import { useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { tipoSemNumeroSerie } from '../../utils/identificacaoEquipamento';
import css from './OperacaoEstoque.module.css';

export function RegistroCompraEstoque({ compra, nomeLocal, aoFechar, aoSalvar }) {
  const { solicitacao, material, pendenteEntrada } = compra;
  const [quantidade, definirQuantidade] = useState(String(pendenteEntrada));
  const [nota, definirNota] = useState('');
  const [serie, definirSerie] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const emEnvio = useRef(false);
  const exigeSerie = !tipoSemNumeroSerie(material.catalogoChave?.split('|')[0]);
  const registrar = async evento => {
    evento.preventDefault(); if (emEnvio.current) return;
    if (!Number.isInteger(Number(quantidade)) || Number(quantidade) < 1 || Number(quantidade) > pendenteEntrada) { definirErro(`Informe de 1 a ${pendenteEntrada} unidades.`); return; }
    emEnvio.current = true; definirSalvando(true); definirErro('');
    try { const resultado = await aoSalvar(Number(quantidade), nota.trim(), serie.trim()); if (!resultado.sucesso) definirErro(resultado.erro); }
    finally { emEnvio.current = false; definirSalvando(false); }
  };
  return <EstruturaModal titulo="Registrar compra recebida" subtitulo={`Pedido #${String(solicitacao.id).padStart(4,'0')} · ${nomeLocal(solicitacao.obraDestinoId)}`} aoFechar={salvando ? () => {} : aoFechar}>
    <form onSubmit={registrar} className={css.formulario}><fieldset disabled={salvando}>
      <div className={css.resumoCompra}><strong>{material.nome}</strong><span>{pendenteEntrada} un. ainda pendentes</span></div>
      <p>Informe o que chegou. Se receber apenas uma parte, o restante continuará pendente.</p>
      <label>Quantidade recebida<input autoFocus required type="number" min="1" max={pendenteEntrada} step="1" value={quantidade} onChange={e => { const v=e.target.value; definirQuantidade(v==='' ? '' : String(Math.max(1,Math.min(pendenteEntrada,Math.trunc(Number(v)||1))))); }}/></label>
      <label>Nota fiscal<input required maxLength={120} value={nota} onChange={e=>definirNota(e.target.value)} placeholder="Número da nota fiscal"/></label>
      {exigeSerie && <label>Número de série<input required maxLength={120} value={serie} onChange={e=>definirSerie(e.target.value)} placeholder="Identificação do equipamento"/></label>}
      {erro && <p className={css.erro} role="alert">{erro}</p>}
      <div className={css.acoesFormulario}><button type="button" onClick={aoFechar}>Cancelar</button><button className={css.primario} type="submit" disabled={salvando || !nota.trim() || (exigeSerie&&!serie.trim())}><Check size={17}/>{salvando?'Registrando…':'Registrar entrada'}</button></div>
    </fieldset></form>
  </EstruturaModal>;
}
