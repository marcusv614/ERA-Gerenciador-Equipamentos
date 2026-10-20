export const ROTULOS_CALIBRACAO = {
  AGUARDANDO_RETIRADA:'Aguardando retirada da obra', AGUARDANDO_ENVIO:'Aguardando envio ao laboratório',
  EM_CALIBRACAO:'Em calibração', CONCLUIDA:'Concluída', CANCELADA:'Cancelada',
};
export const EVENTOS_CALIBRACAO = { SOLICITADA:'Solicitação registrada',RETIRADA_CONFIRMADA:'Retirada e chegada ao depósito confirmadas',ENVIO_CONFIRMADO:'Envio ao laboratório confirmado',RETORNO_CONFIRMADO:'Retorno ao depósito confirmado',CERTIFICADO_ANTERIOR:'Certificado anterior lançado',CANCELADA:'Atendimento cancelado' };
export function ehFluke(e) {
  return String(e.tipo || '').toLowerCase()==='fluke' || String(e.modelo || '').toLowerCase().includes('fluke')
    || Object.entries(e.atributos || {}).some(([chave,valor])=>chave.toLowerCase()==='marca'&&String(valor).toLowerCase()==='fluke');
}
export const calibracaoAberta = e => (e.calibracoes || []).find(c=>!['CONCLUIDA','CANCELADA'].includes(c.status));
export function resumoCalibracao(e, hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date())) {
  const aberta=calibracaoAberta(e);
  if(aberta)return { chave:'ATENDIMENTO', texto:ROTULOS_CALIBRACAO[aberta.status], registro:aberta };
  const certificado=(e.calibracoes || []).filter(c=>c.status==='CONCLUIDA'&&c.dataCalibracao&&c.validade)
    .sort((a,b)=>b.dataCalibracao.localeCompare(a.dataCalibracao)||Number(b.id)-Number(a.id))[0];
  if(!certificado)return { chave:'SEM_REGISTRO',texto:'Sem certificado de calibração registrado' };
  const vencida=certificado.validade<hoje;
  const limite=new Date(`${hoje}T12:00:00Z`);limite.setUTCDate(limite.getUTCDate()+30);
  const chave=vencida?'VENCIDA':certificado.validade<=limite.toISOString().slice(0,10)?'A_VENCER':'EM_DIA';
  const data=certificado.validade.split('-').reverse().join('/');
  return { chave,texto:`${vencida?'Calibração vencida em':chave==='A_VENCER'?'Calibração vence em':'Calibração válida até'} ${data}`,registro:certificado };
}
export function localCalibracao(e) {
  const c=calibracaoAberta(e);
  return c?.status==='EM_CALIBRACAO'?`Laboratório: ${c.laboratorio}`:null;
}
