import { useContext, useState } from 'react';
import { ContextoEscopoAuditoria } from '../../contexto/ContextoEscopoAuditoria';
import { exportarPedido,exportarPedidosObra,exportarComprasObra,exportarFuncionario,exportarConjunto } from '../../services/relatoriosPedidos';
export function ExportarAuditoria({id,nome,tipo='pedido',children,escopo:escopoInformado}){
  const escopoContexto=useContext(ContextoEscopoAuditoria),escopo=escopoInformado||escopoContexto;
  const [ocupado,setOcupado]=useState(false),[erro,setErro]=useState('');
  const executar=async()=>{if(ocupado)return;setOcupado(true);setErro('');try{await ({pedido:exportarPedido,obra:exportarPedidosObra,compras:exportarComprasObra,funcionario:exportarFuncionario,conjunto:exportarConjunto})[tipo](id,nome,escopo);}catch(e){setErro(e.message||'Não foi possível carregar o relatório.');}finally{setOcupado(false);}};
  return <span style={{display:'inline-flex',flexWrap:'wrap',gap:6,maxWidth:'100%'}}><button type="button" disabled={ocupado} onClick={executar} aria-label={`${children||'Auditoria PDF / Planilha'} · ${tipo} ${id}`} style={{minHeight:44,padding:'8px 12px',border:'1px solid #94a3b866',borderRadius:8,background:'transparent',color:'inherit',whiteSpace:'normal',cursor:'pointer'}}>{ocupado?'Carregando…':children||'Auditoria · PDF / Planilha'}</button>{erro&&<small role="alert">{erro}</small>}</span>;
}
