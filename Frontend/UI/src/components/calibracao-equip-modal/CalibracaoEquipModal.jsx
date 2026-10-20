import { useRef, useState } from 'react';
import { CalendarCheck, ClipboardCheck } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiEquipamentos } from '../../services/api/servicoAtivosApi';
import { obterDataAtual, formatarData } from '../../utils/datas';
import { calibracaoAberta, resumoCalibracao, ROTULOS_CALIBRACAO, EVENTOS_CALIBRACAO } from '../../utils/calibracoes';
import css from './CalibracaoEquipModal.module.css';

const instante=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Manaus'});

export function ModalCalibracaoEquipamento({ equipamento, buscarObraPorId, aoFechar, aoAtualizar, somenteLeitura=false }) {
  const { usuario }=useAutenticacao();
  const opera=!somenteLeitura&&['ADMIN','ESTOQUE'].includes(usuario.perfil);
  const [registro,definirRegistro]=useState(equipamento);
  const [laboratorio,definirLaboratorio]=useState(calibracaoAberta(equipamento)?.laboratorio || '');
  const [observacao,definirObservacao]=useState('');
  const [historico,definirHistorico]=useState(false);
  const [data,definirData]=useState(obterDataAtual());
  const [previsao,definirPrevisao]=useState('');
  const [dataCalibracao,definirDataCalibracao]=useState(obterDataAtual());
  const [validade,definirValidade]=useState('');
  const [certificado,definirCertificado]=useState('');
  const [cancelando,definirCancelando]=useState(false);
  const [motivo,definirMotivo]=useState('');
  const [salvando,definirSalvando]=useState(false);
  const [erro,definirErro]=useState('');
  const emEnvio=useRef(false);
  const aberta=calibracaoAberta(registro),resumo=resumoCalibracao(registro);
  const hoje=obterDataAtual();
  const permiteSolicitar=!registro.arquivado&&registro.quantidade===1&&registro.quantidadeDisponivel===1;
  const certificadoValido=certificado.trim()&&dataCalibracao&&dataCalibracao<=hoje&&validade&&validade>=dataCalibracao;
  const executar=async acao=>{
    if(emEnvio.current)return;emEnvio.current=true;definirSalvando(true);definirErro('');
    try { const atualizado=await acao();definirRegistro(atualizado);aoAtualizar?.(atualizado);definirHistorico(false);definirCancelando(false);definirMotivo('');definirObservacao(''); }
    catch(e){definirErro(e.message || 'Não foi possível registrar a calibração.');}
    finally { emEnvio.current=false;definirSalvando(false); }
  };
  const camposCertificado=<>
    <label>Número do certificado<input maxLength={120} value={certificado} onChange={e=>definirCertificado(e.target.value)} /></label>
    <div className={css.duasColunas}>
      <label>Data da calibração<input type="date" max={hoje} value={dataCalibracao} onChange={e=>definirDataCalibracao(e.target.value)} /></label>
      <label>Validade conforme o certificado<input type="date" min={dataCalibracao || undefined} value={validade} onChange={e=>definirValidade(e.target.value)} /></label>
    </div>
    <small>Informe a data de calibração e a validade impressas no certificado.</small>
  </>;
  return <EstruturaModal titulo="Calibração do Fluke" subtitulo={`${registro.modelo} · ${registro.serie}`} largo aoFechar={salvando?()=>{}:aoFechar}>
    <div className={css.conteudo}>
      <p className={css.resumo} data-situacao={resumo.chave}><CalendarCheck size={18}/>{resumo.texto}</p>
      <p className={css.local}>Local atual: <strong>{aberta?.status==='EM_CALIBRACAO'?`Laboratório ${aberta.laboratorio}`:registro.obraId==null?'Depósito central':buscarObraPorId?.(registro.obraId)?.nome || 'Obra'}</strong>{registro.tecnico?` · Com ${registro.tecnico}`:''}</p>
      {erro&&<p role="alert" className={css.erro}>{erro}</p>}
      {!somenteLeitura&&<fieldset disabled={salvando} className={css.formulario}>
        {!aberta?<>
          <div className={css.alternador}><button type="button" aria-pressed={!historico} onClick={()=>definirHistorico(false)}>Novo atendimento</button><button type="button" aria-pressed={historico} onClick={()=>definirHistorico(true)}>Certificado anterior</button></div>
          {historico?<>
            <p>Registre um certificado já existente. Esse lançamento não cria retirada, envio ou retorno e preserva a localização atual.</p>
            <label>Laboratório / empresa<input maxLength={180} value={laboratorio} onChange={e=>definirLaboratorio(e.target.value)} /></label>
            {camposCertificado}
            <label>Observação<textarea maxLength={4000} rows={2} value={observacao} onChange={e=>definirObservacao(e.target.value)}/></label>
            <button type="button" className={css.primario} disabled={registro.arquivado||registro.quantidade!==1||!laboratorio.trim()||!certificadoValido} onClick={()=>executar(()=>apiEquipamentos.registrarCertificado(registro.id,{laboratorio:laboratorio.trim(),certificado:certificado.trim(),dataCalibracao,validade,observacao:observacao.trim()}))}>Registrar certificado</button>
          </>:<>
            <p>{registro.obraId?'O estoque deverá retirar o Fluke da obra e confirmar a chegada ao depósito antes de enviar ao laboratório.':'O estoque deverá confirmar o envio ao laboratório.'} O equipamento ficará indisponível para outros pedidos até o retorno ou cancelamento.</p>
            {registro.quantidade!==1&&<p role="status">A calibração é individual por número de série. Cadastre cada Fluke separadamente.</p>}
            {!permiteSolicitar&&registro.quantidade===1&&<p role="status">Conclua as reservas e manutenções antes de solicitar calibração.</p>}
            <label>Laboratório previsto (opcional)<input maxLength={180} value={laboratorio} onChange={e=>definirLaboratorio(e.target.value)}/></label>
            <label>Orientações para retirada / calibração<textarea maxLength={4000} rows={3} value={observacao} onChange={e=>definirObservacao(e.target.value)}/></label>
            <button type="button" className={css.primario} disabled={!permiteSolicitar} onClick={()=>executar(()=>apiEquipamentos.solicitarCalibracao(registro.id,{laboratorio:laboratorio.trim()||null,observacao:observacao.trim()||null}))}>Solicitar calibração</button>
          </>}
        </>:<>
          <h3>{ROTULOS_CALIBRACAO[aberta.status]}</h3>
          <p><strong>Retirar de:</strong> {aberta.localOrigem}{aberta.tecnicoOrigem?` · Responsável na origem: ${aberta.tecnicoOrigem}`:''}</p>
          {aberta.observacao&&<p className={css.observacao}>{aberta.observacao}</p>}
          {aberta.status==='AGUARDANDO_RETIRADA'&&<>
            <p>O Fluke continua registrado na obra até o estoque confirmar a retirada e sua chegada ao depósito.</p>
            {opera&&<><label>Data da retirada e chegada ao depósito<input type="date" max={hoje} value={data} onChange={e=>definirData(e.target.value)} /></label><button type="button" className={css.primario} disabled={!data||data>hoje} onClick={()=>executar(()=>apiEquipamentos.retirarParaCalibracao(registro.id,aberta.id,{dataRetirada:data}))}>Confirmar retirada e chegada ao depósito</button></>}
          </>}
          {aberta.status==='AGUARDANDO_ENVIO'&&opera&&<>
            <label>Laboratório / empresa responsável<input maxLength={180} value={laboratorio} onChange={e=>definirLaboratorio(e.target.value)}/></label>
            <div className={css.duasColunas}><label>Data do envio<input type="date" max={hoje} value={data} onChange={e=>definirData(e.target.value)}/></label><label>Previsão de retorno (opcional)<input type="date" min={data||undefined} value={previsao} onChange={e=>definirPrevisao(e.target.value)}/></label></div>
            <button type="button" className={css.primario} disabled={!laboratorio.trim()||!data||data>hoje||(previsao&&previsao<data)} onClick={()=>executar(()=>apiEquipamentos.enviarCalibracao(registro.id,aberta.id,{laboratorio:laboratorio.trim(),dataEnvio:data,previsaoRetorno:previsao||null}))}>Confirmar envio ao laboratório</button>
          </>}
          {aberta.status==='EM_CALIBRACAO'&&<>
            <p>Enviado em {formatarData(aberta.dataEnvio)} para <strong>{aberta.laboratorio}</strong>{aberta.previsaoRetorno?` · Retorno previsto: ${formatarData(aberta.previsaoRetorno)}`:''}.</p>
            {opera&&<><label>Data do retorno ao depósito<input type="date" min={aberta.dataEnvio} max={hoje} value={data} onChange={e=>definirData(e.target.value)}/></label>{camposCertificado}<label>Observação do retorno<textarea maxLength={4000} rows={2} value={observacao} onChange={e=>definirObservacao(e.target.value)}/></label><button type="button" className={css.primario} disabled={!certificadoValido||!data||data>hoje||data<aberta.dataEnvio||dataCalibracao<aberta.dataEnvio||dataCalibracao>data} onClick={()=>executar(()=>apiEquipamentos.retornarCalibracao(registro.id,aberta.id,{dataRetorno:data,dataCalibracao,validade,certificado:certificado.trim(),observacao:observacao.trim()}))}><ClipboardCheck size={16}/>Confirmar retorno e certificado</button></>}
          </>}
          {!opera&&<p>As confirmações físicas de retirada, envio e retorno são registradas pelo estoque ou administrador.</p>}
          {aberta.status!=='EM_CALIBRACAO'&&(cancelando?<div className={css.cancelamento}><label>Motivo do cancelamento<textarea maxLength={4000} rows={2} value={motivo} onChange={e=>definirMotivo(e.target.value)}/></label><div className={css.acoes}><button type="button" onClick={()=>definirCancelando(false)}>Voltar</button><button type="button" disabled={!motivo.trim()} onClick={()=>executar(()=>apiEquipamentos.cancelarCalibracao(registro.id,aberta.id,{motivo:motivo.trim()}))}>Confirmar cancelamento</button></div></div>:<button type="button" className={css.secundario} onClick={()=>definirCancelando(true)}>Cancelar atendimento</button>)}
        </>}
      </fieldset>}
      <section className={css.historico} aria-label="Histórico de calibrações"><h3>Histórico de calibrações</h3>
        {!registro.calibracoes?.length&&<p>Nenhuma calibração registrada.</p>}
        {[...(registro.calibracoes||[])].sort((a,b)=>Number(b.id)-Number(a.id)).map(c=><article key={c.id} className={css.registro}>
          <header><strong>Calibração #{c.id}</strong><span>{c.historico?'Certificado anterior':ROTULOS_CALIBRACAO[c.status]}</span></header>
          <p>{c.modelo} · {c.serie}</p><p>Origem: {c.localOrigem}{c.tecnicoOrigem?` · Com ${c.tecnicoOrigem}`:''}</p>
          {c.laboratorio&&<p>Laboratório: {c.laboratorio}</p>}
          {c.certificado&&<dl><div><dt>Certificado</dt><dd>{c.certificado}</dd></div><div><dt>Calibrado em</dt><dd>{formatarData(c.dataCalibracao)}</dd></div><div><dt>Validade</dt><dd>{formatarData(c.validade)}</dd></div></dl>}
          {(c.eventos||[]).map((evento,i)=><div className={css.evento} key={i}><strong>{EVENTOS_CALIBRACAO[evento.acao]||evento.acao}</strong><small>{instante(evento.registradoEm)} · {evento.autorNome} ({evento.autorLogin})</small>{evento.observacao&&<p>{evento.observacao}</p>}</div>)}
        </article>)}
      </section>
    </div>
  </EstruturaModal>;
}
