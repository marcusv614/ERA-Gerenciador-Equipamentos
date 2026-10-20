import { CalendarCheck } from 'lucide-react';
import { calibracaoAberta, ROTULOS_CALIBRACAO } from '../../utils/calibracoes';
import { formatarData } from '../../utils/datas';
import css from './CalibracaoEquipModal.module.css';

export function FilaCalibracoes({ equipamentos, aoAbrir, estilos }) {
  const pendentes=equipamentos.filter(e=>!e.arquivado&&calibracaoAberta(e));
  if(!pendentes.length)return null;
  return <section className={`${estilos.secao} ${css.fila}`} aria-label="Calibrações a atender">
    <div className={estilos.tituloSecao}><CalendarCheck/><div><h2>Calibrações a atender</h2><p>Retirada da obra, envio ao laboratório e retorno ao depósito.</p></div></div>
    <div className={estilos.grade}>{pendentes.map(e=>{
      const c=calibracaoAberta(e);
      return <article key={e.id} className={estilos.card}>
        <header><span className={estilos.icone}><CalendarCheck/></span><div><small>Calibração #{c.id} · {e.serie}</small><h2>{e.modelo}</h2></div></header>
        <p className={estilos.instrucaoEntrega}>{ROTULOS_CALIBRACAO[c.status]}</p>
        <p className={estilos.resumoManutencao}>{c.status==='AGUARDANDO_RETIRADA'?<>Buscar em <strong>{c.localOrigem}</strong>{c.tecnicoOrigem?` · Com ${c.tecnicoOrigem}`:''} e levar ao depósito.</>:c.status==='EM_CALIBRACAO'?<>No laboratório <strong>{c.laboratorio}</strong>{c.previsaoRetorno?` · Retorno previsto: ${formatarData(c.previsaoRetorno)}`:''}.</>:<>No <strong>depósito central</strong>, aguardando envio ao laboratório.</>}</p>
        {c.observacao&&<p className={estilos.resumoManutencao}>{c.observacao}</p>}
        <footer><button type="button" className={estilos.primario} onClick={()=>aoAbrir(e)}>Gerenciar calibração</button></footer>
      </article>;
    })}</div>
  </section>;
}
