import { useEffect, useState } from 'react';
import { Building2, Check, ClipboardList, FileDown, LogOut, Moon, Search, ShoppingCart, Sun, Truck, Wrench, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { imprimirListaComprasGeral, imprimirListaComprasSolicitacao, imprimirRomaneioSeparacao, imprimirRelatorioAuditoriaSolicitacao, imprimirOrdemAtendimento } from '../../services/documentosEquipamentos';
import { pesquisarSolicitacoes } from '../../utils/pesquisaSolicitacoes';
import { comprasOperacionais, etapaEstoque, locaisOperacaoEstoque, ordenarFilaEstoque } from '../../utils/operacaoEstoque';
import { calibracaoAberta, ehFluke } from '../../utils/calibracoes';
import { descreverLocalizacao } from '../../utils/localizacaoEquipamentos';
import { PedidoOperacional, LinhaPedidoEstoque } from './PedidoOperacional';
import { RegistroCompraEstoque } from './RegistroCompraEstoque';
import { useOperacaoEstoque } from './useOperacaoEstoque';
import { AtendimentoParcialModal } from './AtendimentoParcialModal';
import { ModalCalibracaoEquipamento } from '../calibracao-equip-modal/CalibracaoEquipModal';
import { FilaCalibracoes } from '../calibracao-equip-modal/FilaCalibracoes';
import { IndicadorCalibracao } from '../calibracao-equip-modal/IndicadorCalibracao';
import { ModalManutencaoEquipamento } from '../manutencao-equip-modal/ManutencaoEquipModal';
import { SinoNotificacoes } from '../notificacoes/SinoNotificacoes';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelEstoque.module.css';

export function PainelEstoque({ temaEscuro: temaControlado, aoAlternarTema, incorporado = false } = {}) {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]), [equipamentos, definirEquipamentos] = useState([]), [solicitacoes, definirSolicitacoes] = useState([]);
  const [carregando, definirCarregando] = useState(true), [mensagem, definirMensagem] = useState(null), [tentativa, definirTentativa] = useState(0);
  const [busca, definirBusca] = useState(''), [obraFiltrada, definirObraFiltrada] = useState('todas'), [aba, definirAba] = useState('atividades'), [fila, definirFila] = useState('atender');
  const [pedidoId, definirPedidoId] = useState(null), [compraSelecionada, definirCompraSelecionada] = useState(null), [editandoAtendimento, definirEditandoAtendimento] = useState(null);
  const [equipamentoParaManutencao, definirEquipamentoParaManutencao] = useState(null), [equipamentoParaCalibracao, definirEquipamentoParaCalibracao] = useState(null);
  const [temaLocalEscuro, definirTemaLocalEscuro] = useState(() => { const salvo=localStorage.getItem('era-tema-estoque'); return salvo ? salvo==='escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches; });
  const { processando, executar } = useOperacaoEstoque(definirMensagem);
  const temaEscuro = temaControlado ?? temaLocalEscuro;
  const buscarObra = id => obras.find(o=>String(o.id)===String(id));
  const nomeLocal = id => id==null||id==='deposito' ? 'Depósito central' : buscarObra(id)?.nome||`Obra #${id}`;
  const alternarTema = () => { if(aoAlternarTema){aoAlternarTema();return;} definirTemaLocalEscuro(atual=>{localStorage.setItem('era-tema-estoque',atual?'claro':'escuro');return !atual;}); };

  useEffect(() => {
    if(processando) return;
    let ativo=true, consultando=false, primeira=true;
    const atualizar=async()=>{
      if(consultando||document.hidden)return; consultando=true;
      try { const [locais,itens,pedidos]=await Promise.all([apiObras.listar(),apiEquipamentos.listar(),apiAtividades.listar()]); if(ativo){definirObras(locais);definirEquipamentos(itens);definirSolicitacoes(pedidos);} }
      catch(erro){if(ativo&&primeira)definirMensagem({tipo:'erro',texto:erro.message});}
      finally{consultando=false;if(ativo&&primeira){primeira=false;definirCarregando(false);}}
    };
    atualizar(); const timer=setInterval(atualizar,10000);window.addEventListener('focus',atualizar);document.addEventListener('visibilitychange',atualizar);
    return()=>{ativo=false;clearInterval(timer);window.removeEventListener('focus',atualizar);document.removeEventListener('visibilitychange',atualizar);};
  },[tentativa,processando]);

  const mesclarPedidos = atualizados => definirSolicitacoes(atuais=>[...atuais.filter(s=>!atualizados.some(n=>n.id===s.id)),...atualizados]);
  const pedidoAberto = solicitacoes.find(p=>p.id===pedidoId);
  const abrirPedido = id => { definirMensagem(null); definirPedidoId(id); };
  const corresponde = pedido => (obraFiltrada==='todas'||locaisOperacaoEstoque(pedido).includes(obraFiltrada))&&pesquisarSolicitacoes([pedido,...locaisOperacaoEstoque(pedido).map(id=>({...pedido,obraOrigemId:id==='deposito'?null:Number(id)}))],busca,buscarObra).length>0;
  const pendentes = solicitacoes.filter(p=>['Aprovada','Aguardando coleta','Em trânsito','Cancelamento solicitado'].includes(p.status));
  const paraAtender = pendentes.filter(p=>!(p.status==='Em trânsito'&&p.obraDestinoId!=null));
  const enviados = pendentes.filter(p=>p.status==='Em trânsito'&&p.obraDestinoId!=null);
  const listaFila = ordenarFilaEstoque((fila==='enviados'?enviados:paraAtender).filter(corresponde));
  const concluidas = solicitacoes.filter(p=>['Concluída','Rejeitada','Cancelada'].includes(p.status)).sort((a,b)=>String(b.dataSolicitacao).localeCompare(String(a.dataSolicitacao))||b.id-a.id);
  const aquisicoes = comprasOperacionais(solicitacoes);
  const comprasPendentes = aquisicoes.filter(c=>c.pendenteEntrada>0);
  const comprasFiltradas = comprasPendentes.filter(c=>corresponde(c.solicitacao));
  const gruposCompra = Object.values(comprasFiltradas.reduce((grupos,item)=>{(grupos[item.solicitacao.id]||={solicitacao:item.solicitacao,itens:[]}).itens.push(item);return grupos;},{}));
  const compraAtiva = compraSelecionada&&aquisicoes.find(c=>c.solicitacao.id===compraSelecionada.pedidoId&&c.material.id===compraSelecionada.materialId);
  const abrirCompra = (pedido,material) => {definirMensagem(null);definirCompraSelecionada({pedidoId:pedido.id,materialId:material.id});};
  const registrarCompra = async(quantidade,numeroNota,identificacao)=>{
    const resultado=await executar(async()=>{const atualizada=await apiAtividades.registrarAquisicao(compraAtiva.solicitacao.id,compraAtiva.material.id,quantidade,numeroNota,identificacao);mesclarPedidos([atualizada]);});
    if(resultado.sucesso)definirCompraSelecionada(null);return resultado;
  };
  const acaoPedido = async pedido => {
    await executar(async()=>{
      if(etapaEstoque(pedido).iniciar){mesclarPedidos([await apiAtividades.iniciarAtendimento(pedido.id)]);return;}
      if(etapaEstoque(pedido).chave==='separar'){mesclarPedidos(await apiAtividades.executarPlano(pedido.id));return;}
      let atualizada=pedido;
      if(atualizada.status!=='Em trânsito'){atualizada=await apiAtividades.iniciarTransito(atualizada.id,atualizada.obraDestinoId!=null);mesclarPedidos([atualizada]);}
      if(atualizada.obraDestinoId==null){atualizada=await apiAtividades.concluir(atualizada.id);mesclarPedidos([atualizada]);}
    });
  };
  const ajustarAtendimento = async(id,dados)=>{
    const resultado=await executar(async()=>{mesclarPedidos(await apiAtividades.atenderParcialmente(id,dados));});
    if(!resultado.sucesso)throw Error(resultado.erro);
    definirEditandoAtendimento(null);
  };
  const equipamentosParaManutencao=equipamentos.filter(e=>!e.arquivado&&(obraFiltrada==='todas'||String(e.obraId??'deposito')===obraFiltrada)&&(!busca.trim()||[e.modelo,e.serie,nomeLocal(e.obraId),e.tecnico].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))));
  const calibracoesFiltradas=equipamentos.filter(e=>{const c=calibracaoAberta(e);return c&&!e.arquivado&&(obraFiltrada==='todas'||String(c.obraOrigemId??'deposito')===obraFiltrada||String(e.obraId??'deposito')===obraFiltrada)&&(!busca.trim()||[c.id,e.modelo,e.serie,c.localOrigem,c.tecnicoOrigem,c.laboratorio].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));});
  const selecionarAba=valor=>{definirAba(valor);definirMensagem(null);};
  const atualizarEquipamento=atualizado=>definirEquipamentos(atuais=>atuais.map(e=>e.id===atualizado.id?atualizado:e));
  const renderizarPedido=pedido=><LinhaPedidoEstoque key={pedido.id} pedido={pedido} nomeLocal={nomeLocal} aoAbrir={()=>abrirPedido(pedido.id)}/>;

  return <div className={estilos.pagina} data-theme={temaEscuro?'dark':'light'} data-incorporado={incorporado}>
    {!incorporado&&<header className={estilos.cabecalho}><div className={estilos.marca}><img src={logoEra} alt="ERA"/><span>Estoque</span></div><div className={estilos.usuario}><div><small>Operação de materiais</small><strong>{usuario.nome}</strong></div><SinoNotificacoes temaEscuro={temaEscuro} aoVerPedidos={abrirPedido}/><button type="button" onClick={alternarTema} aria-label={temaEscuro?'Ativar tema claro':'Ativar tema escuro'}>{temaEscuro?<Sun/>:<Moon/>}</button><button type="button" onClick={encerrarSessao} aria-label="Sair do sistema"><LogOut/></button></div></header>}
    <main className={estilos.conteudo}>
      <section className={estilos.titulo}><div><h1>Estoque</h1><p>Confira o pedido, separe os materiais e confirme o envio.</p></div></section>
      {mensagem&&!pedidoAberto&&!compraAtiva&&!editandoAtendimento&&<div role="alert" className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}><X/>{mensagem.texto}<button type="button" aria-label="Fechar aviso" onClick={()=>definirMensagem(null)}><X/></button><button type="button" className={estilos.tentarNovamente} onClick={()=>{definirMensagem(null);definirTentativa(n=>n+1);}}>Tentar novamente</button></div>}
      <nav className={estilos.abas} aria-label="Áreas do estoque">{[{id:'atividades',nome:'Pedidos',Icone:Truck,total:paraAtender.length},{id:'aquisicoes',nome:'Compras',Icone:ShoppingCart,total:comprasPendentes.length},{id:'registros',nome:'Histórico',Icone:ClipboardList},{id:'manutencoes',nome:'Manutenção',Icone:Wrench,total:equipamentos.filter(e=>!e.arquivado&&calibracaoAberta(e)).length}].map(({id,nome,Icone,total})=><button key={id} type="button" aria-current={aba===id?'page':undefined} className={aba===id?estilos.abaAtiva:''} onClick={()=>selecionarAba(id)}><Icone/><span>{nome}</span>{total>0&&<b>{total}</b>}</button>)}</nav>
      <section className={estilos.filtros} aria-label="Filtros do estoque"><label><Search/><input aria-label="Pesquisar no estoque" value={busca} onChange={e=>definirBusca(e.target.value)} placeholder="Buscar pedido, material ou técnico…"/></label><label><Building2/><select aria-label="Filtrar estoque por obra" value={obraFiltrada} onChange={e=>definirObraFiltrada(e.target.value)}><option value="todas">Todas as obras</option><option value="deposito">Depósito central</option>{obras.map(o=><option key={o.id} value={o.id}>{o.nome}</option>)}</select></label></section>
      {carregando?<p role="status" className={estilos.carregando}>Carregando estoque…</p>:<>
        {aba==='atividades'&&<section aria-label="Pedidos do estoque" className={estilos.pedidosOperacionais}><div className={estilos.barraFila}><div className={estilos.alternadorFila} role="group" aria-label="Fila de pedidos"><button type="button" aria-pressed={fila==='atender'} onClick={()=>definirFila('atender')}>Para atender <b>{paraAtender.length}</b></button><button type="button" aria-pressed={fila==='enviados'} onClick={()=>definirFila('enviados')}>Enviados <b>{enviados.length}</b></button></div><p>{fila==='atender'?'Prontos para envio primeiro. Dentro de cada etapa, os mais antigos vêm antes.':'Aguardando a confirmação do técnico.'}</p></div><div className={estilos.listaPedidos}>{listaFila.length?listaFila.map(renderizarPedido):<div className={estilos.vazio}><Check/><strong>{fila==='atender'?'Nenhum pedido para atender':'Nenhum pedido enviado'}</strong><span>{busca||obraFiltrada!=='todas'?'Confira a busca e o filtro de obra.':'Os pedidos aparecerão aqui após a aprovação.'}</span></div>}</div></section>}
        {aba==='registros'&&<section aria-label="Histórico do estoque" className={estilos.listaPedidos}>{concluidas.filter(corresponde).length?concluidas.filter(corresponde).map(renderizarPedido):<div className={estilos.vazio}><ClipboardList/><strong>Nenhum registro encontrado</strong></div>}</section>}
        {aba==='aquisicoes'&&<section className={estilos.comprasOrganizadas} aria-label="Compras pendentes"><header><div><h2>Compras pendentes</h2><p>Registre somente os materiais que já chegaram.</p></div><button type="button" disabled={!comprasFiltradas.length} onClick={()=>imprimirListaComprasGeral(comprasFiltradas,buscarObra)}><FileDown size={17}/>Lista de compras</button></header>{gruposCompra.map(({solicitacao,itens})=><article key={solicitacao.id} className={estilos.grupoCompra}><header><div><span>Pedido #{String(solicitacao.id).padStart(4,'0')}</span><h3>{nomeLocal(solicitacao.obraDestinoId)}</h3></div><button type="button" onClick={()=>abrirPedido(solicitacao.id)}>Ver pedido</button></header>{itens.map(c=><div key={c.material.id} className={estilos.itemCompra}><div><strong>{c.material.nome}</strong><span>{c.material.quantidadeEntradaEstoque||0} recebidas de {c.material.quantidadeCompra} un.</span></div><b>{c.pendenteEntrada} pendentes</b><button type="button" onClick={()=>abrirCompra(solicitacao,c.material)}>Registrar compra</button></div>)}<details><summary>Documento da compra</summary><button type="button" onClick={()=>imprimirListaComprasSolicitacao(solicitacao,itens,buscarObra)}><FileDown size={16}/>Lista de compras deste pedido</button></details></article>)}{!gruposCompra.length&&<div className={estilos.vazio}><Check/><strong>Nenhuma compra pendente</strong></div>}</section>}
        {aba==='manutencoes'&&<FilaCalibracoes equipamentos={calibracoesFiltradas} aoAbrir={definirEquipamentoParaCalibracao} estilos={estilos}/>}
        {aba === 'manutencoes' && <section className={estilos.secao} aria-label="Manutenção dos equipamentos">{!equipamentosParaManutencao.length && <div className={estilos.vazio}><Wrench /><strong>Nenhum equipamento encontrado</strong></div>}<div className={estilos.grade}>{equipamentosParaManutencao.map(e => <article key={e.id} className={estilos.card}><header><span className={estilos.icone}><Wrench /></span><div><h2>{e.modelo}</h2><small>{e.serie} · {descreverLocalizacao(e,buscarObra)}</small></div></header><p className={estilos.resumoManutencao}>{e.quantidadeDisponivel} disponível(is) · {e.quantidadeManutencao || 0} em manutenção</p><div className={estilos.resumoManutencao}><IndicadorCalibracao equipamento={e}/></div><footer>{(ehFluke(e)||e.calibracoes?.length)&&<button type="button" onClick={()=>definirEquipamentoParaCalibracao(e)}>Calibração</button>}<button type="button" onClick={() => definirEquipamentoParaManutencao(e)}><Wrench />Gerenciar manutenção</button></footer></article>)}</div></section>}
      </>}
    </main>
    {pedidoAberto&&!compraAtiva&&!editandoAtendimento&&<div className={estilos.temaManutencao}><PedidoOperacional pedido={pedidoAberto} nomeLocal={nomeLocal} processando={processando} erro={mensagem?.texto} aoFechar={()=>definirPedidoId(null)} aoAcao={()=>acaoPedido(pedidoAberto)} aoComprar={m=>abrirCompra(pedidoAberto,m)} aoEditar={()=>definirEditandoAtendimento(pedidoAberto)} aoDocumento={tipo=>({ordem:imprimirOrdemAtendimento,historico:imprimirRelatorioAuditoriaSolicitacao,romaneio:imprimirRomaneioSeparacao})[tipo](pedidoAberto,buscarObra)}/></div>}
    {compraAtiva&&<div className={estilos.temaManutencao}><RegistroCompraEstoque key={`${compraAtiva.solicitacao.id}-${compraAtiva.material.id}`} compra={compraAtiva} nomeLocal={nomeLocal} aoFechar={()=>definirCompraSelecionada(null)} aoSalvar={registrarCompra}/></div>}
    {editandoAtendimento&&<div className={estilos.temaManutencao}><AtendimentoParcialModal solicitacao={editandoAtendimento} obras={obras} aoFechar={()=>definirEditandoAtendimento(null)} aoSalvar={ajustarAtendimento}/></div>}
    {equipamentoParaCalibracao&&<div className={estilos.temaManutencao}><ModalCalibracaoEquipamento equipamento={equipamentoParaCalibracao} buscarObraPorId={buscarObra} aoFechar={()=>definirEquipamentoParaCalibracao(null)} aoAtualizar={atualizarEquipamento}/></div>}
    {equipamentoParaManutencao&&<div className={estilos.temaManutencao}><ModalManutencaoEquipamento equipamento={equipamentoParaManutencao} buscarObraPorId={buscarObra} aoFechar={()=>definirEquipamentoParaManutencao(null)} aoAtualizar={atualizarEquipamento}/></div>}
  </div>;
}
