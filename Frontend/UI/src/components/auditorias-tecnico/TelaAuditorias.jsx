import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, Download, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { apiAuditoriasTecnico } from '../../services/api/servicoAtivosApi';
import { imprimirRelatorioVistorias, imprimirVistoriaTecnico } from '../../services/documentosEquipamentos';
import { exportarPlanilhaAuditorias } from '../../services/planilhaAuditorias';
import { filtrarAuditorias, obraDoItem, somarCondicoes } from '../../utils/auditoriaTecnico';
import { formatarData } from '../../utils/datas';
import { AuditoriasTecnicoModal } from './AuditoriasTecnicoModal';
import css from './TelaAuditorias.module.css';

export function TelaAuditorias({ funcionarios, termoBusca='', aoResultados }) {
  const [registros,definirRegistros]=useState([]);
  const [carregando,definirCarregando]=useState(true);
  const [erro,definirErro]=useState('');
  const [tecnico,definirTecnico]=useState('');
  const [obra,definirObra]=useState('');
  const [status,definirStatus]=useState('');
  const [inicio,definirInicio]=useState('');
  const [fim,definirFim]=useState('');
  const [novoTecnico,definirNovoTecnico]=useState('');
  const [janela,definirJanela]=useState(null);
  const carregar=useCallback(async()=>{
    definirCarregando(true);definirErro('');
    try{definirRegistros(await apiAuditoriasTecnico.listarTodas());}catch(e){definirErro(e.message);}finally{definirCarregando(false);}
  },[]);
  useEffect(()=>{
    let ativo=true;
    apiAuditoriasTecnico.listarTodas().then((dados)=>{if(ativo)definirRegistros(dados);}).catch((e)=>{if(ativo)definirErro(e.message);}).finally(()=>{if(ativo)definirCarregando(false);});
    return()=>{ativo=false;};
  },[]);
  const filtrados=useMemo(()=>filtrarAuditorias(registros,{busca:termoBusca,tecnico,obra,status,inicio,fim}),[registros,termoBusca,tecnico,obra,status,inicio,fim]);
  useEffect(()=>{aoResultados(filtrados.length);},[filtrados.length,aoResultados]);
  const tecnicosHistoricos=[...new Map(registros.map((a)=>[a.funcionarioId,a.tecnicoNome])).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  const obras=[...new Map(registros.flatMap((a)=>a.itens.map((i)=>[obraDoItem(i),i.local]))).entries()].sort((a,b)=>a[1].localeCompare(b[1],'pt-BR'));
  const candidatos=funcionarios.filter((f)=>!f.arquivado&&f.status==='Ativo');
  const abrir=(a)=>definirJanela({funcionario:funcionarios.find((f)=>f.id===a.funcionarioId)||{id:a.funcionarioId,nome:a.tecnicoNome},id:a.id});
  const fechar=()=>{definirJanela(null);carregar();};
  const documentoOriginal=(id)=>registros.find((a)=>a.id===id);
  const periodoInvalido=Boolean(inicio&&fim&&inicio>fim);
  const filtroTexto=`Técnico: ${tecnico?tecnicosHistoricos.find(([id])=>String(id)===tecnico)?.[1]:'Todos'} · Obra: ${obra?obras.find(([id])=>id===obra)?.[1]:'Todas'} · Situação: ${status==='CONCLUIDA'?'Concluída':status==='ABERTA'?'Aberta':'Todas'} · Período: ${inicio?formatarData(inicio):'sem início'} a ${fim?formatarData(fim):'sem fim'}${termoBusca?` · Busca: ${termoBusca}`:''}`;
  return <section className={css.pagina} aria-label="Auditorias dos materiais">
    <header className={css.cabecalho}><div><ClipboardCheck size={24}/><h2>Vistorias periódicas dos materiais</h2><p>Gere fichas, lance as condições encontradas e consulte cada auditoria por técnico e obra.</p></div><button type="button" className={css.secundario} onClick={carregar} disabled={carregando}><RefreshCw size={15}/>Atualizar</button></header>
    <section className={css.nova} aria-label="Iniciar auditoria"><div><strong>Nova auditoria</strong><p>A ficha inclui somente equipamentos marcados como “Auditável” no cadastro. Registros concluídos são preservados.</p></div><label><span>Técnico fiscalizado</span><select value={novoTecnico} onChange={(e)=>definirNovoTecnico(e.target.value)}><option value="">Selecione o técnico</option>{candidatos.map((f)=><option key={f.id} value={f.id}>{f.nome}</option>)}</select></label><button type="button" className={css.primario} disabled={!novoTecnico} onClick={()=>definirJanela({funcionario:candidatos.find((f)=>String(f.id)===novoTecnico)})}><Plus size={16}/>Preparar ficha</button></section>
    <div className={css.filtros}>
      <label>Técnico<select value={tecnico} onChange={(e)=>definirTecnico(e.target.value)}><option value="">Todos os técnicos</option>{tecnicosHistoricos.map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
      <label>Obra registrada na ficha<select value={obra} onChange={(e)=>definirObra(e.target.value)}><option value="">Todas as obras</option>{obras.map(([id,nome])=><option key={id} value={id}>{nome}</option>)}</select></label>
      <label>Situação<select value={status} onChange={(e)=>definirStatus(e.target.value)}><option value="">Todas</option><option value="ABERTA">Aberta</option><option value="CONCLUIDA">Concluída</option></select></label>
      <label>De<input type="date" value={inicio} max={fim||undefined} onChange={(e)=>definirInicio(e.target.value)}/></label><label>Até<input type="date" value={fim} min={inicio||undefined} onChange={(e)=>definirFim(e.target.value)}/></label>
      <button type="button" className={css.secundario} onClick={()=>{definirTecnico('');definirObra('');definirStatus('');definirInicio('');definirFim('');}}>Limpar filtros</button>
    </div>
    <p className={css.ajuda}>O período considera a data da vistoria; em fichas sem vistoria lançada, considera a criação. O filtro por obra seleciona os materiais do local registrado na ficha.</p>
    {erro&&<p className={css.erro} role="alert">{erro}</p>}{periodoInvalido&&<p className={css.erro} role="alert">A data final deve ser igual ou posterior à data inicial.</p>}
    <div className={css.exportacoes}><strong>{filtrados.length} auditoria(s) nesta consulta</strong><button type="button" className={css.secundario} disabled={!filtrados.length||periodoInvalido||carregando} onClick={()=>imprimirRelatorioVistorias(filtrados,filtroTexto)}><Download size={15}/>Relatório PDF</button><button type="button" className={css.secundario} disabled={!filtrados.length||periodoInvalido||carregando} onClick={()=>exportarPlanilhaAuditorias(filtrados)}><FileSpreadsheet size={15}/>Planilha CSV</button></div>
    <div className={css.tabelaWrap}><table className={css.tabela}><caption>Histórico das auditorias · materiais da consulta</caption><thead><tr><th>Código / criação</th><th>Técnico / fiscal</th><th>Obras na ficha</th><th>Vistoria / situação</th><th>Condições</th><th>Ações</th></tr></thead><tbody>{filtrados.map((a)=>{
      const resumo=somarCondicoes(a.itens);
      return <tr key={a.id}><td><strong>#{String(a.id).padStart(4,'0')}</strong><small>{formatarData(a.criadoEm.slice(0,10))}</small></td><td><strong>{a.tecnicoNome}</strong><small>Fiscal: {a.fiscal||'Não informado'}</small></td><td>{[...new Set(a.itens.map((i)=>i.local))].join(' · ')}</td><td>{a.dataVistoria?formatarData(a.dataVistoria):'A realizar'}<small>{a.status==='CONCLUIDA'?'Concluída':'Aberta'}</small></td><td>{resumo.bom} bom<br/>{resumo.avaria} com avaria<br/>{resumo.quebrado} quebrado<small>{resumo.quantidade-resumo.bom-resumo.avaria-resumo.quebrado} a avaliar · {resumo.quantidade} unidade(s)</small></td><td><div className={css.acoes}><button type="button" className={css.secundario} onClick={()=>abrir(a)}>Abrir registro</button><button type="button" className={css.secundario} onClick={()=>imprimirVistoriaTecnico(documentoOriginal(a.id),false)}>Ficha PDF</button>{a.status==='CONCLUIDA'&&<button type="button" className={css.secundario} onClick={()=>imprimirVistoriaTecnico(documentoOriginal(a.id),true)}>Resultado PDF</button>}</div></td></tr>;
    })}</tbody></table>{carregando?<p className={css.ajuda} role="status">Carregando auditorias...</p>:!filtrados.length&&<p className={css.vazio}>Nenhuma auditoria encontrada. Prepare uma ficha para iniciar uma vistoria.</p>}</div>
    {janela&&<AuditoriasTecnicoModal funcionario={janela.funcionario} auditoriaInicialId={janela.id} iniciarNova={!janela.id} aoFechar={fechar}/>}
  </section>;
}
