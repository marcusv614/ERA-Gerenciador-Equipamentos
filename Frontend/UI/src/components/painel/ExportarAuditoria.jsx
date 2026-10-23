import { useContext, useState } from 'react';
import { ContextoEscopoAuditoria } from '../../contexto/ContextoEscopoAuditoria';
import { exportarPedido,exportarPedidosObra,exportarComprasObra,exportarFuncionario,exportarConjunto } from '../../services/relatoriosPedidos';
import css from './ExportarAuditoria.module.css';
export function ExportarAuditoria({id,nome,tipo='pedido',children,escopo:escopoInformado}){
  const escopoContexto=useContext(ContextoEscopoAuditoria),escopo=escopoInformado||escopoContexto;
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState('');
  const executar=async()=>{if(ocupado)return;setOcupado(true);setErro('');try{await ({pedido:exportarPedido,obra:exportarPedidosObra,compras:exportarComprasObra,funcionario:exportarFuncionario,conjunto:exportarConjunto})[tipo](id,nome,escopo);}catch(e){setErro(e.message||'Não foi possível carregar o relatório.');}finally{setOcupado(false);}};
  return <span className={css.exportacao} data-exportar-auditoria><button className={css.botao} type="button" disabled={ocupado} onClick={executar} aria-label={`${children||'Auditoria PDF / Planilha'} · ${tipo} ${id}`}>{ocupado?'Carregando…':children||'Auditoria · PDF / Planilha'}</button>{erro&&<small className={css.erro} role="alert">{erro}</small>}</span>;
}
