import { filtrarSolicitacoes, locaisDoPedido, normalizarPesquisa } from '../../utils/pesquisaSolicitacoes';
import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, ChevronDown, ChevronRight, ClipboardList, Columns3, List, Package2, Plus, RotateCcw, UserRound, X } from 'lucide-react';
import { formatarData } from '../../utils/datas';
import { obterEtapaSolicitacao } from '../../utils/statusSolicitacao';
import { acompanhamentoSolicitacao, COLUNAS_ACOMPANHAMENTO, pedidosDoPerfil } from '../../utils/acompanhamentoSolicitacao';
import { DetalhesSolicitacao } from './DetalhesSolicitacao';
import { SepararEquipamentosModal } from '../estoque/SepararEquipamentosModal';
import css from './TelaAtividades.module.css';

const CHAVE_VISUALIZACAO = 'era-atividades-visualizacao';

const compararMaisRecentesPrimeiro = (primeira, segunda) => {
  const porData = String(segunda.dataSolicitacao || '').localeCompare(String(primeira.dataSolicitacao || ''));
  return porData || Number(segunda.id || 0) - Number(primeira.id || 0);
};

function obterVisualizacaoInicial() {
  try { return localStorage.getItem(CHAVE_VISUALIZACAO) === 'kanban' ? 'kanban' : 'tecnicos'; }
  catch { return 'tecnicos'; }
}

function JanelaSolicitacao({ solicitacao, aoFechar, children }) {
  const janela = useRef(null);
  useEffect(() => {
    const anterior = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    janela.current?.focus();
    const teclado = (evento) => {
      if (evento.key === 'Escape') { evento.preventDefault(); aoFechar(); }
      if (evento.key !== 'Tab') return;
      const botoes = [...janela.current.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')];
      const primeiro = botoes[0]; const ultimo = botoes.at(-1);
      if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === janela.current)) {
        evento.preventDefault(); ultimo?.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro?.focus(); }
    };
    document.addEventListener('keydown', teclado);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', teclado); anterior?.focus(); };
  }, [aoFechar]);
  return <div className={css.overlay} onClick={(e) => { if (e.target === e.currentTarget) aoFechar(); }}>
    <section ref={janela} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="titulo-solicitacao" className={css.janela}>
      <header className={css.janelaCabecalho}>
        <div className={css.janelaIdentificacao}>
          <span>Requisição de materiais</span>
          <div className={css.janelaTitulo}><h2 id="titulo-solicitacao">Solicitação #{String(solicitacao.id).padStart(4, '0')}</h2><span className={css.janelaStatus} data-etapa={obterEtapaSolicitacao(solicitacao.status).chave}>{acompanhamentoSolicitacao(solicitacao).rotulo}</span></div>
          <p className={css.janelaMetadados}><span><UserRound size={13} aria-hidden="true" />{solicitacao.tecnico}</span><span><CalendarDays size={13} aria-hidden="true" /><time dateTime={solicitacao.dataSolicitacao}>{formatarData(solicitacao.dataSolicitacao)}</time></span></p>
        </div>
        <button type="button" aria-label="Fechar solicitação" onClick={aoFechar}><X size={21} /></button>
      </header>
      <div className={css.janelaConteudo}>{children}</div>
    </section>
  </div>;
}

export function TelaAtividades({ solicitacoes: recebidas, todasSolicitacoes: todasRecebidas = recebidas, tecnicos = [], equipamentos = [], obras = [], termoBusca = '', erroApi, buscarObraPorId, statusDecisao = 'Pendente', perfil, aoSalvarPlano, aoNovaSolicitacao, aoAprovar, aoRejeitar, aoEditar, aoExportarRomaneio, aoExportarAuditoria }) {
  const solicitacoes = pedidosDoPerfil(recebidas, perfil);
  const todasSolicitacoes = pedidosDoPerfil(todasRecebidas, perfil);
  const colunasKanban = COLUNAS_ACOMPANHAMENTO.filter((c) => perfil !== 'FINANCEIRO' || c.id !== 'gerencia');
  const filtrosEtapa = [{ id: 'todas', rotulo: 'Todas' }, ...colunasKanban.map((c) => ({ id: c.id, rotulo: c.rotulo }))];
  const [tecnicoAberto, definirTecnicoAberto] = useState(null);
  const [visualizacao, definirVisualizacao] = useState(obterVisualizacaoInicial);
  const [dataInicial, definirDataInicial] = useState('');
  const [dataFinal, definirDataFinal] = useState('');
  const [obraFiltro, definirObraFiltro] = useState('todas');
  const [etapaFiltro, definirEtapaFiltro] = useState('todas');
  const [selecionadaId, selecionar] = useState(null);
  const [processando, definirProcessando] = useState(false);
  const [planejando, definirPlanejando] = useState(false);
  const [erro, definirErro] = useState('');
  const emProcessamento = useRef(false);
  const [fechar] = useState(() => () => selecionar(null));
  const selecionada = todasSolicitacoes.find(({ id }) => id === selecionadaId);
  const nomes = [...new Set([...(perfil === 'FINANCEIRO' ? [] : tecnicos), ...todasSolicitacoes.map(({ tecnico }) => tecnico)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const termo = normalizarPesquisa(termoBusca);
  const obrasDisponiveis = [...new Map(todasSolicitacoes.flatMap((pedido) => locaisDoPedido(pedido).map((id) => [id, {id,nome:id === 'deposito' ? 'Depósito central' : buscarObraPorId(Number(id))?.nome || `Obra #${id}`}])))
    .values()].sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const solicitacoesDaDataEObra = filtrarSolicitacoes(solicitacoes, {inicio:dataInicial, fim:dataFinal, obra:obraFiltro});
  const solicitacoesPorTecnico = solicitacoesDaDataEObra.filter((s) => etapaFiltro === 'todas' || acompanhamentoSolicitacao(s).grupo === etapaFiltro);
  const filtrosLocaisAtivos = Boolean(dataInicial || dataFinal || obraFiltro !== 'todas' || etapaFiltro !== 'todas');
  const grupos = nomes.map((nome) => ({ nome, pedidos: solicitacoesPorTecnico.filter(({ tecnico }) => tecnico === nome).sort(compararMaisRecentesPrimeiro) }))
    .filter(({ nome, pedidos }) => pedidos.length || (!filtrosLocaisAtivos && (!termo || normalizarPesquisa(nome).includes(termo))));
  const quantidadePorEtapa = (etapa) => etapa === 'todas'
    ? solicitacoesDaDataEObra.length
    : solicitacoesDaDataEObra.filter((s) => acompanhamentoSolicitacao(s).grupo === etapa).length;
  const limparFiltros = () => { definirDataInicial(''); definirDataFinal(''); definirObraFiltro('todas'); definirEtapaFiltro('todas'); };
  const alterarVisualizacao = (modo) => {
    definirVisualizacao(modo);
    try { localStorage.setItem(CHAVE_VISUALIZACAO, modo); } catch { /* Preferência não persistida. */ }
  };
  const decidir = async (acao, id) => {
    if (emProcessamento.current) return;
    emProcessamento.current = true; definirProcessando(true); definirErro('');
    try {
      if (await acao(id)) selecionar((atual) => atual === id ? null : atual);
      else definirErro('Não foi possível atualizar a solicitação. Confira a conexão e tente novamente.');
    } catch (e) { definirErro(e.message || 'Não foi possível atualizar a solicitação.'); }
    finally { emProcessamento.current = false; definirProcessando(false); }
  };
  const nomeObra = (pedido) => pedido.obraDestinoId != null ? buscarObraPorId(pedido.obraDestinoId)?.nome || 'Obra não disponível' : 'Depósito central';
  const abrirSolicitacao = (id) => { definirErro(''); selecionar(id); };
  const pedidosOrdenados = (etapa) => solicitacoesPorTecnico.filter((pedido) => acompanhamentoSolicitacao(pedido).grupo === etapa)
    .sort(compararMaisRecentesPrimeiro);
  return <section className={css.painel} aria-label="Solicitações">
    <header className={css.cabecalho}>
      <div><h2>Solicitações</h2><p>{visualizacao === 'kanban' ? 'Acompanhe os pedidos por etapa do fluxo.' : 'Selecione um técnico. Os pedidos mais recentes aparecem primeiro.'}</p></div>
      <div className={css.cabecalhoAcoes}>
        {aoNovaSolicitacao && <button type="button" className={css.novoPedido} onClick={aoNovaSolicitacao}><Plus size={16} />Nova solicitação</button>}
        <span className={css.total}>{solicitacoesPorTecnico.length} {solicitacoesPorTecnico.length === 1 ? 'solicitação' : 'solicitações'}</span>
        <div className={css.alternador} role="group" aria-label="Forma de visualizar as solicitações">
          <button type="button" aria-pressed={visualizacao === 'tecnicos'} className={visualizacao === 'tecnicos' ? css.alternadorAtivo : ''} onClick={() => alterarVisualizacao('tecnicos')}><List size={15} /><span>Por técnico</span></button>
          <button type="button" aria-pressed={visualizacao === 'kanban'} className={visualizacao === 'kanban' ? css.alternadorAtivo : ''} onClick={() => alterarVisualizacao('kanban')}><Columns3 size={15} /><span>Kanban</span></button>
        </div>
      </div>
    </header>
      <section className={css.filtrosTecnicos} aria-label="Filtros das solicitações">
        <div className={css.camposFiltro}>
          <label><span><CalendarDays size={14} /> De</span><input type="date" aria-label="Data inicial do pedido" value={dataInicial} max={dataFinal || undefined} onChange={(evento) => definirDataInicial(evento.target.value)} /></label>
          <label><span><CalendarDays size={14} /> Até</span><input type="date" aria-label="Data final do pedido" value={dataFinal} min={dataInicial || undefined} onChange={(evento) => definirDataFinal(evento.target.value)} /></label>
          <label><span><Building2 size={14} /> Obra (origem ou destino)</span><select value={obraFiltro} onChange={(evento) => definirObraFiltro(evento.target.value)}><option value="todas">Todas as obras</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>
        </div>
        <div className={css.filtrosEtapa} role="group" aria-label="Mostrar solicitações por situação">
          {filtrosEtapa.map((filtro) => <button type="button" key={filtro.id} aria-pressed={etapaFiltro === filtro.id} className={etapaFiltro === filtro.id ? css.filtroEtapaAtivo : ''} onClick={() => definirEtapaFiltro(filtro.id)}><span>{filtro.rotulo}</span><b>{quantidadePorEtapa(filtro.id)}</b></button>)}
        </div>
        {filtrosLocaisAtivos && <button type="button" className={css.limparFiltros} onClick={limparFiltros}><RotateCcw size={14} /> Limpar filtros</button>}
      </section>
      {dataInicial && dataFinal && dataFinal < dataInicial && <p className={css.erro} role="alert">A data final deve ser igual ou posterior à data inicial.</p>}
    {visualizacao === 'tecnicos' ? <>
      <div className={css.tecnicos}>{grupos.map(({ nome, pedidos }, indice) => {
      const aberto = tecnicoAberto === nome;
      const pendentes = pedidos.filter(({ status }) => status === statusDecisao).length;
      const painelId = `pedidos-tecnico-${indice}`;
      return <section key={nome} className={css.tecnico}>
        <button type="button" className={css.tecnicoBotao} aria-expanded={aberto} aria-controls={painelId} onClick={() => definirTecnicoAberto(aberto ? null : nome)}>
          <span className={css.avatar}><UserRound size={20} /></span><span className={css.tecnicoNome}><strong>{nome}</strong><small>{pedidos.length} {pedidos.length === 1 ? 'solicitação' : 'solicitações'}</small></span>
          {pendentes > 0 && <span className={css.pendentes}>{pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}</span>}<ChevronDown size={19} className={aberto ? css.expandido : ''} />
        </button>
        {aberto && <div id={painelId} className={css.lista} role="region" aria-label={`Solicitações de ${nome}`} tabIndex={0}>
          {pedidos.length ? <><div className={css.colunas} aria-hidden="true"><span>Solicitação / data</span><span>Obra</span><span>Status</span><span /></div>
            {pedidos.map((pedido) => <button key={pedido.id} type="button" className={css.pedido} onClick={() => abrirSolicitacao(pedido.id)} aria-label={`Abrir solicitação ${pedido.id}, ${formatarData(pedido.dataSolicitacao)}, ${nomeObra(pedido)}, ${acompanhamentoSolicitacao(pedido).rotulo}`}>
              <span className={css.identificador}><strong>#{String(pedido.id).padStart(4, '0')}</strong><small>{formatarData(pedido.dataSolicitacao)}</small>{pedido.solicitacaoPaiId != null && <small>Pedido original #{String(pedido.solicitacaoPaiId).padStart(4, '0')}</small>}</span>
              <span className={css.obra}><strong>{nomeObra(pedido)}</strong><small>{pedido.obraDestinoId ? 'Entrega na obra' : 'Retirada para o depósito'}</small></span>
              <span className={css.status} data-etapa={obterEtapaSolicitacao(pedido.status).chave}>{acompanhamentoSolicitacao(pedido).rotulo}</span><ChevronRight size={16} />
            </button>)}
          </> : <div className={css.vazio}><ClipboardList size={24} /><p>Nenhuma solicitação deste técnico{termo ? ' para esta busca' : ''}.</p></div>}
        </div>}
      </section>;
    })}{!grupos.length && <div className={css.vazio}><ClipboardList size={28} /><p>{termo || filtrosLocaisAtivos ? 'Nenhuma solicitação encontrada com os filtros selecionados.' : 'Nenhum técnico cadastrado ou solicitação recebida.'}</p></div>}</div></> :
      <div className={css.kanban} aria-label="Kanban de solicitações">
        {colunasKanban.map((coluna) => {
          const pedidos = pedidosOrdenados(coluna.id);
          return <section key={coluna.id} className={css.kanbanColuna} data-etapa={coluna.id} aria-labelledby={`kanban-${coluna.id}`}>
            <header className={css.kanbanCabecalho}>
              <span className={css.kanbanIndicador} aria-hidden="true" />
              <div><h3 id={`kanban-${coluna.id}`}>{coluna.titulo}</h3><p>{coluna.descricao}</p></div>
              <b aria-label={`${pedidos.length} solicitações`}>{pedidos.length}</b>
            </header>
            <div className={css.kanbanCartoes}>
              {pedidos.map((pedido) => <button key={pedido.id} type="button" className={css.kanbanCartao} onClick={() => abrirSolicitacao(pedido.id)} aria-label={`Abrir solicitação ${pedido.id}, ${nomeObra(pedido)}, ${acompanhamentoSolicitacao(pedido).rotulo}`}>
                <span className={css.kanbanCartaoTopo}><strong>#{String(pedido.id).padStart(4, '0')}</strong><time dateTime={pedido.dataSolicitacao}><CalendarDays size={13} />{formatarData(pedido.dataSolicitacao)}</time></span>
                <span className={css.kanbanObra}>{nomeObra(pedido)}</span>
                <span className={css.kanbanTecnico}><UserRound size={14} />{pedido.tecnico}</span>
                <span className={css.status} data-etapa={obterEtapaSolicitacao(pedido.status).chave}>{acompanhamentoSolicitacao(pedido).rotulo}</span>
                {acompanhamentoSolicitacao(pedido).parcial && <small className={css.kanbanParcial}>Atendimento parcial · pedido original #{pedido.solicitacaoPaiId || pedido.id}</small>}
                <span className={css.kanbanRodape}><span><Package2 size={14} />{pedido.materiais.length} {pedido.materiais.length === 1 ? 'material' : 'materiais'}</span><ChevronRight size={16} /></span>
              </button>)}
              {!pedidos.length && <div className={css.kanbanVazio}><ClipboardList size={20} /><span>Nenhuma solicitação</span></div>}
            </div>
          </section>;
        })}
      </div>}
    {selecionada && !planejando && <JanelaSolicitacao solicitacao={selecionada} aoFechar={fechar}>
      {erro && <p role="alert" className={css.erro}>{erroApi || erro}</p>}{processando && <p role="status" className={css.processando}>Atualizando solicitação...</p>}
      <DetalhesSolicitacao solicitacao={selecionada} buscarObraPorId={buscarObraPorId} equipamentos={equipamentos} statusDecisao={statusDecisao} perfil={perfil} processando={processando} aoPlanejar={aoSalvarPlano ? () => definirPlanejando(true) : undefined}
        aoAprovar={(id) => decidir(aoAprovar, id)} aoRejeitar={(id) => decidir(aoRejeitar, id)} aoEditar={(pedido) => { selecionar(null); aoEditar(pedido); }} aoExportarRomaneio={aoExportarRomaneio} aoExportarAuditoria={aoExportarAuditoria} />
    </JanelaSolicitacao>}
    {selecionada && planejando && <SepararEquipamentosModal key={selecionada.id} solicitacao={selecionada} obras={obras} equipamentos={equipamentos} aoFechar={() => definirPlanejando(false)} aoSalvarPlano={async (id,dados) => { const salvo = await aoSalvarPlano(id,dados); if (salvo) definirPlanejando(false); return salvo; }} />}
  </section>;
}
