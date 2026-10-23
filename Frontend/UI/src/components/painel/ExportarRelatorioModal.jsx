import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, FileSpreadsheet, Printer } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { EVENTO_EXPORTACAO, prepararExportacao, baixarPlanilha } from '../../services/controlesExportacao';
import css from './ExportarRelatorioModal.module.css';

function OpcoesExportacao({ documento, aoFechar }) {
  const [modo, definirModo] = useState('todos');
  const [inicio, definirInicio] = useState('');
  const [fim, definirFim] = useState('');
  const [erro, definirErro] = useState('');
  const resultado = useMemo(() => prepararExportacao(documento, { modo, inicio, fim }), [documento, modo, inicio, fim]);
  const exportar = tipo => {
    definirErro('');
    try {
      if (tipo === 'pdf') documento.imprimir(resultado.conteudo);
      else baixarPlanilha(documento.titulo, resultado.csv);
    } catch { definirErro('Não foi possível exportar. Tente novamente.'); }
  };
  return <EstruturaModal titulo="Exportar relatório" subtitulo={documento.titulo} aoFechar={aoFechar}>
    <div className={css.formulario}>
      {resultado.temData ? <>
        <label><span><CalendarDays size={15}/> Registros por data</span><select value={modo} onChange={e => definirModo(e.target.value)}><option value="todos">Todos os registros</option><option value="dia">Dia específico</option><option value="periodo">Período</option></select></label>
        {modo !== 'todos' && <div className={css.datas}>
          <label><span>{modo === 'dia' ? 'Dia' : 'Data inicial'}</span><input type="date" value={inicio} max={modo === 'periodo' ? fim || undefined : undefined} onChange={e => definirInicio(e.target.value)}/></label>
          {modo === 'periodo' && <label><span>Data final</span><input type="date" value={fim} min={inicio || undefined} onChange={e => definirFim(e.target.value)}/></label>}
        </div>}
        <p className={css.ajuda}>O filtro considera a data de cada evento ou aquisição. Materiais originais e situações atuais são apenas contexto, não saldos históricos.</p>
      </> : <p className={css.ajuda}>Este relatório não contém eventos datados. Para consultar o inventário de um dia específico, use <strong>Obras → Por data</strong>.</p>}
      <p className={css.resumo} aria-live="polite">{resultado.erro || `${resultado.quantidade} registro(s) para exportação${resultado.excluidas ? ` · ${resultado.excluidas} fora do recorte ou sem data` : ''}.`}</p>
      {erro && <p role="alert" className={css.erro}>{erro}</p>}
      <div className={css.acoes}>
        <button type="button" className={css.pdf} disabled={!!resultado.erro} onClick={() => exportar('pdf')}><Printer size={17}/>Imprimir / Salvar PDF</button>
        <button type="button" disabled={!!resultado.erro} onClick={() => exportar('csv')}><FileSpreadsheet size={17}/>Baixar planilha</button>
      </div>
      <small className={css.ajuda}>Planilha CSV compatível com Excel e LibreOffice.</small>
    </div>
  </EstruturaModal>;
}

export function ExportarRelatorioModal() {
  const [exportacao, definirExportacao] = useState(null);
  useEffect(() => {
    const abrir = evento => {
      const temas = [...document.querySelectorAll('[data-theme]')].filter(el => el.getClientRects().length);
      definirExportacao({ documento: evento.detail, alvo: temas.at(-1) || document.body });
    };
    window.addEventListener(EVENTO_EXPORTACAO, abrir);
    return () => window.removeEventListener(EVENTO_EXPORTACAO, abrir);
  }, []);
  if (!exportacao) return null;
  return createPortal(<div className={css.contexto}><OpcoesExportacao key={exportacao.documento.chave} documento={exportacao.documento} aoFechar={() => definirExportacao(null)}/></div>, exportacao.alvo);
}
