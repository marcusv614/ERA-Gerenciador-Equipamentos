import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Download, Plus, XCircle } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAuditoriasTecnico } from '../../services/api/servicoAtivosApi';
import { imprimirVistoriaTecnico } from '../../services/documentosEquipamentos';
import { formatarData, obterDataAtual } from '../../utils/datas';
import { atualizarQuantidadeCondicao, limiteQuantidadeCondicao, somarCondicoes, validarRegistroVistoria } from '../../utils/auditoriaTecnico';
import css from './AuditoriasTecnicoModal.module.css';

const codigo = (id) => `#${String(id).padStart(4, '0')}`;
const estados = [{chave:'bom',rotulo:'Bom',Icone:CheckCircle2},{chave:'avaria',rotulo:'Com avaria',Icone:AlertTriangle},{chave:'quebrado',rotulo:'Quebrado',Icone:XCircle}];

export function AuditoriasTecnicoModal({ funcionario, aoFechar, auditoriaInicialId, iniciarNova=false }) {
  const { usuario } = useAutenticacao();
  const [registros, definirRegistros] = useState([]);
  const [materiais, definirMateriais] = useState([]);
  const [selecionados, definirSelecionados] = useState([]);
  const [tela, definirTela] = useState(iniciarNova?'nova':'historico');
  const [auditoria, definirAuditoria] = useState(null);
  const [itens, definirItens] = useState([]);
  const [data, definirData] = useState('');
  const [fiscal, definirFiscal] = useState('');
  const [observacoes, definirObservacoes] = useState('');
  const [busca, definirBusca] = useState('');
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [salvando, definirSalvando] = useState(false);
  const [confirmando, definirConfirmando] = useState(false);
  const emEnvio = useRef(false);
  useEffect(() => {
    let ativo = true;
    Promise.all([apiAuditoriasTecnico.listar(funcionario.id),apiAuditoriasTecnico.materiais(funcionario.id),auditoriaInicialId?apiAuditoriasTecnico.consultar(funcionario.id,auditoriaInicialId):Promise.resolve(null)])
      .then(([historico,atuais,inicial]) => { if(ativo){definirRegistros(historico);definirMateriais(atuais);definirSelecionados(atuais.slice(0,200).map((i)=>i.equipamentoId));if(inicial){definirAuditoria(inicial);definirItens(inicial.itens.map((i)=>({...i})));definirData(inicial.dataVistoria||obterDataAtual());definirFiscal(inicial.fiscal||usuario.nome);definirObservacoes(inicial.observacoes||'');definirTela('registro');}} })
      .catch((e)=>{if(ativo)definirErro(e.message);})
      .finally(()=>{if(ativo)definirCarregando(false);});
    return ()=>{ativo=false;};
  },[funcionario.id,auditoriaInicialId,usuario.nome]);

  const executar = async (acao) => {
    if(emEnvio.current)return;
    emEnvio.current=true;definirSalvando(true);definirErro('');
    try { await acao(); } catch(e){definirErro(e.message || 'Não foi possível salvar a auditoria.');}
    finally{emEnvio.current=false;definirSalvando(false);}
  };
  const carregarRegistro = (a) => {
    definirAuditoria(a);definirItens(a.itens.map((i)=>({...i})));
    definirData(a.dataVistoria || obterDataAtual());definirFiscal(a.fiscal || usuario.nome);
    definirObservacoes(a.observacoes || '');definirConfirmando(false);definirTela('registro');
  };
  const criar = () => executar(async()=>{
    const a=await apiAuditoriasTecnico.criar(funcionario.id,selecionados);
    definirRegistros((atuais)=>[a,...atuais]);carregarRegistro(a);
  });
  const abrir = (id) => executar(async()=>carregarRegistro(await apiAuditoriasTecnico.consultar(funcionario.id,id)));
  const nova = () => executar(async()=>{
    const atuais=await apiAuditoriasTecnico.materiais(funcionario.id);
    definirMateriais(atuais);definirSelecionados(atuais.slice(0,200).map((i)=>i.equipamentoId));definirTela('nova');
  });
  const validar = (concluir) => validarRegistroVistoria(itens,concluir) || (concluir&&(!data||!fiscal.trim())?'Informe a data da vistoria e o nome do fiscal.':'') || (data>obterDataAtual()?'A data da vistoria não pode estar no futuro.':'');
  const salvar = (concluir) => {
    const mensagem=validar(concluir);if(mensagem){definirErro(mensagem);return;}
    executar(async()=>{
      const a=await apiAuditoriasTecnico.registrar(funcionario.id,auditoria.id,{versao:auditoria.versao,dataVistoria:data||null,fiscal:fiscal.trim()||null,observacoes:observacoes.trim()||null,concluir,itens:itens.map((i)=>({equipamentoId:i.equipamentoId,bom:Number(i.bom||0),avaria:Number(i.avaria||0),quebrado:Number(i.quebrado||0),observacao:i.observacao||null}))});
      definirRegistros((atuais)=>atuais.map((r)=>r.id===a.id?a:r));carregarRegistro(a);
    });
  };
  const alterarItem = (id,chave,valor) => definirItens((atuais)=>atuais.map((i)=>i.equipamentoId===id?{...i,[chave]:valor}:i));
  const alterarQuantidade = (id, condicao, valor) => definirItens((atuais) => atuais.map((item) =>
    item.equipamentoId === id ? atualizarQuantidadeCondicao(item, condicao, valor) : item));
  const alternarSelecao = (id, marcado) => definirSelecionados((atuais) => {
    if (!marcado) return atuais.filter((atual) => atual !== id);
    return atuais.includes(id) || atuais.length >= 200 ? atuais : [...atuais, id];
  });
  const concluida=auditoria?.status==='CONCLUIDA';
  const totais=somarCondicoes(itens);
  const termo=busca.trim().toLocaleLowerCase('pt-BR');
  const filtrados=registros.filter((a)=>!termo||[codigo(a.id),formatarData(a.dataVistoria),a.fiscal,a.status==='CONCLUIDA'?'concluída':'aberta',...a.itens.flatMap((i)=>[i.modelo,i.serie,i.local])].join(' ').toLocaleLowerCase('pt-BR').includes(termo));

  return <EstruturaModal titulo="Auditorias dos materiais" subtitulo={funcionario.nome} aoFechar={salvando?()=>{}:aoFechar} largo>
    <div className={css.conteudo}>
      {carregando&&<p role="status">Carregando auditorias...</p>}
      {erro&&<p className={css.erro} role="alert">{erro}</p>}
      {!carregando&&tela==='historico'&&<>
        <div className={css.explicacao}><ClipboardCheck size={20}/><p>Gere uma ficha para inspecionar os materiais, exporte o PDF e depois registre as condições encontradas. Somente itens marcados como <strong>Auditável</strong> no cadastro entram em novas fichas.</p></div>
        <div className={css.barra}><input className={css.campo} aria-label="Pesquisar auditorias" placeholder="Código, data, fiscal, material ou obra..." value={busca} onChange={(e)=>definirBusca(e.target.value)}/><button type="button" className={css.primario} disabled={salvando||funcionario.arquivado} onClick={nova}><Plus size={16}/>Nova auditoria</button></div>
        <div className={css.tabelaWrap}><table className={css.tabela}><caption>Registros de vistorias do técnico</caption><thead><tr><th>Código</th><th>Vistoria</th><th>Fiscal</th><th>Situação</th><th>Condições</th><th>Ação</th></tr></thead><tbody>{filtrados.map((a)=>{
          const resumo=somarCondicoes(a.itens);
          return <tr key={a.id}><td>{codigo(a.id)}</td><td>{a.dataVistoria?formatarData(a.dataVistoria):'Não informada'}</td><td>{a.fiscal||'A preencher'}</td><td>{a.status==='CONCLUIDA'?'Concluída':'Aberta'}</td><td>{resumo.bom} bom · {resumo.avaria} com avaria · {resumo.quebrado} quebrado{resumo.quantidade>resumo.bom+resumo.avaria+resumo.quebrado&&<small>{resumo.quantidade-resumo.bom-resumo.avaria-resumo.quebrado} a avaliar</small>}</td><td><button type="button" className={css.secundario} disabled={salvando} onClick={()=>abrir(a.id)}>Abrir</button></td></tr>;
        })}</tbody></table>{!filtrados.length&&<p className={css.vazio}>Nenhuma auditoria encontrada.</p>}</div>
      </>}
      {!carregando&&tela==='nova'&&<>
        <p className={css.explicacao}>Selecione até 200 registros auditáveis sob responsabilidade deste técnico. Unidades em transporte não entram nesta ficha. As quantidades abaixo incluem unidades reservadas que ainda estão no local.</p>
        <div className={css.barra}><strong>{selecionados.length} registro(s) selecionado(s)</strong><button type="button" className={css.secundario} disabled={salvando} onClick={()=>definirSelecionados(selecionados.length?[]:materiais.slice(0,200).map((i)=>i.equipamentoId))}>{selecionados.length?'Desmarcar todos':'Selecionar até 200'}</button></div>
        <div className={css.selecao}>{materiais.map((i)=><label key={i.equipamentoId} data-selecionado={selecionados.includes(i.equipamentoId)}><input type="checkbox" checked={selecionados.includes(i.equipamentoId)} disabled={salvando||(!selecionados.includes(i.equipamentoId)&&selecionados.length>=200)} onChange={(e)=>alternarSelecao(i.equipamentoId,e.currentTarget.checked)}/><span><strong>{i.modelo}</strong><small>{i.tipo} · {i.serie} · {i.quantidade} unidade(s)</small><small>{i.local} · Auditável</small></span></label>)}</div>
        {!materiais.length&&<p className={css.vazio}>Nenhum item auditável disponível com este técnico. Marque a opção “Auditável” no cadastro ou na edição do equipamento. Itens arquivados ou totalmente em trânsito não aparecem aqui.</p>}
        <div className={css.acoes}><button type="button" className={css.secundario} disabled={salvando} onClick={()=>{definirTela('historico');definirErro('');}}>Voltar</button><button type="button" className={css.primario} disabled={salvando||!selecionados.length} onClick={criar}>{salvando?'Criando...':'Criar ficha de vistoria'}</button></div>
      </>}
      {!carregando&&tela==='registro'&&auditoria&&<>
        <div className={css.barra}><strong>Auditoria {codigo(auditoria.id)} · {concluida?'Concluída':'Em preenchimento'}</strong><button type="button" className={css.secundario} disabled={salvando} onClick={()=>imprimirVistoriaTecnico(auditoria,false)}><Download size={15}/>Ficha PDF para preencher</button>{concluida&&<button type="button" className={css.secundario} onClick={()=>imprimirVistoriaTecnico(auditoria,true)}><Download size={15}/>Resultado em PDF</button>}</div>
        <p className={css.explicacao}>Ficha de {auditoria.tecnicoNome}, gerada por {auditoria.criadoPorNome}. Os itens e as quantidades são os registrados na criação da ficha. As assinaturas do fiscal e do técnico são coletadas no documento impresso.</p>
        <div className={css.dados}><label>Data da vistoria<input type="date" className={css.campo} max={obterDataAtual()} value={data} disabled={concluida||salvando} onChange={(e)=>definirData(e.target.value)}/></label><label>Fiscal que realizou a vistoria<input className={css.campo} maxLength={150} value={fiscal} disabled={concluida||salvando} onChange={(e)=>definirFiscal(e.target.value)}/></label></div>
        <div className={css.itens}>{itens.map((i)=><section className={css.item} key={i.equipamentoId}>
          <header><div><h3>{i.modelo}</h3><small>{i.serie} · {i.tipo}{i.medida?` · ${i.medida}`:''}</small><small>{i.local}</small></div><b>{i.quantidade} unidade(s)</b></header>
          <div className={css.estados}>{estados.map(({chave,rotulo,Icone})=><label key={chave} data-estado={chave}><span><Icone size={16}/>{rotulo}</span><input type="number" min={0} max={limiteQuantidadeCondicao(i,chave)} step={1} aria-label={`${rotulo}: ${i.modelo} (${i.serie})`} aria-describedby={`saldo-vistoria-${i.equipamentoId}`} title={`Até ${limiteQuantidadeCondicao(i,chave)} unidade(s), considerando os outros estados.`} value={i[chave]} disabled={concluida||salvando} onChange={(e)=>alterarQuantidade(i.equipamentoId,chave,e.currentTarget.value)} onBlur={(e)=>{if(e.currentTarget.value==='')alterarQuantidade(i.equipamentoId,chave,0);}}/></label>)}</div>
          <small id={`saldo-vistoria-${i.equipamentoId}`} className={css.pendente}>{i.quantidade-Number(i.bom||0)-Number(i.avaria||0)-Number(i.quebrado||0)} unidade(s) a avaliar. Distribua as {i.quantidade} unidades entre os três estados.</small>
          <label className={css.anotacao}>Observação do item<textarea className={css.campo} rows={2} maxLength={1000} value={i.observacao||''} disabled={concluida||salvando} onChange={(e)=>alterarItem(i.equipamentoId,'observacao',e.target.value)}/></label>
        </section>)}</div>
        <label className={css.anotacao}>Observações gerais<textarea className={css.campo} rows={3} maxLength={4000} value={observacoes} disabled={concluida||salvando} onChange={(e)=>definirObservacoes(e.target.value)}/></label>
        <p className={css.resumo}>{totais.bom} bom · {totais.avaria} com avaria · {totais.quebrado} quebrado · {totais.quantidade} unidade(s) na ficha</p>
        {auditoria.registradoPorNome&&<p className={css.pendente}>Último lançamento por {auditoria.registradoPorNome} ({auditoria.registradoPorLogin}).</p>}
        {confirmando&&!concluida&&<section className={css.confirmacao} role="alertdialog" aria-label="Confirmar conclusão da auditoria"><strong>Concluir esta vistoria?</strong><p>Confira os estados, a data e o fiscal. Após concluir, este registro será preservado para consulta e novas inspeções terão uma nova ficha.</p><div className={css.acoes}><button type="button" className={css.secundario} disabled={salvando} onClick={()=>definirConfirmando(false)}>Continuar revisando</button><button type="button" className={css.primario} disabled={salvando} onClick={()=>salvar(true)}>Confirmar conclusão</button></div></section>}
        <div className={css.acoes}><button type="button" className={css.secundario} disabled={salvando} onClick={()=>{definirTela('historico');definirErro('');}}>Voltar aos registros</button>{!concluida&&!confirmando&&<><button type="button" className={css.secundario} disabled={salvando} onClick={()=>salvar(false)}>Salvar rascunho</button><button type="button" className={css.primario} disabled={salvando} onClick={()=>{const mensagem=validar(true);if(mensagem)definirErro(mensagem);else{definirErro('');definirConfirmando(true);}}}>Concluir vistoria</button></>}</div>
      </>}
    </div>
  </EstruturaModal>;
}
