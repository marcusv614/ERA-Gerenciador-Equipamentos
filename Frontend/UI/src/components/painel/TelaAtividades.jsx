import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, UserRound, X } from 'lucide-react';
import { formatarData } from '../../utils/datas';
import { DetalhesSolicitacao } from './DetalhesSolicitacao';
import css from './TelaAtividades.module.css';

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
      <header className={css.janelaCabecalho}><div><span>Detalhes do pedido</span><h2 id="titulo-solicitacao">Solicitação #{solicitacao.id}</h2><p>{solicitacao.tecnico} · {formatarData(solicitacao.dataSolicitacao)}</p></div><button type="button" aria-label="Fechar solicitação" onClick={aoFechar}><X size={21} /></button></header>
      <div className={css.janelaConteudo}>{children}</div>
    </section>
  </div>;
}

export function TelaAtividades({ solicitacoes, todasSolicitacoes = solicitacoes, tecnicos = [], termoBusca = '', erroApi, cautelas, buscarObraPorId, aoAprovar, aoRejeitar, aoEditar, aoExportarRomaneio, aoExportarCautela, estilos }) {
  const [tecnicoAberto, definirTecnicoAberto] = useState(null);
  const [selecionadaId, selecionar] = useState(null);
  const [processando, definirProcessando] = useState(false);
  const [erro, definirErro] = useState('');
  const emProcessamento = useRef(false);
  const [fechar] = useState(() => () => selecionar(null));
  const selecionada = todasSolicitacoes.find(({ id }) => id === selecionadaId);
  const nomes = [...new Set([...tecnicos, ...todasSolicitacoes.map(({ tecnico }) => tecnico)].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const termo = termoBusca.trim().toLocaleLowerCase('pt-BR');
  const grupos = nomes.map((nome) => ({ nome, pedidos: solicitacoes.filter(({ tecnico }) => tecnico === nome).sort((a, b) => String(b.dataSolicitacao).localeCompare(String(a.dataSolicitacao)) || b.id - a.id) }))
    .filter(({ nome, pedidos }) => !termo || pedidos.length || nome.toLocaleLowerCase('pt-BR').includes(termo));
  const decidir = async (acao, id) => {
    if (emProcessamento.current) return;
    emProcessamento.current = true; definirProcessando(true); definirErro('');
    try {
      if (await acao(id)) selecionar((atual) => atual === id ? null : atual);
      else definirErro('Não foi possível atualizar a solicitação. Confira a conexão e tente novamente.');
    } catch (e) { definirErro(e.message || 'Não foi possível atualizar a solicitação.'); }
    finally { emProcessamento.current = false; definirProcessando(false); }
  };
  const nomeObra = (pedido) => buscarObraPorId(pedido.obraDestinoId || pedido.obraOrigemId)?.nome || 'Obra não disponível';
  return <section className={css.painel} aria-label="Solicitações por técnico">
    <header className={css.cabecalho}><div><h2>Solicitações por técnico</h2><p>Selecione um técnico para consultar e analisar seus pedidos.</p></div><span>{solicitacoes.length} solicitações</span></header>
    <div className={css.tecnicos}>{grupos.map(({ nome, pedidos }, indice) => {
      const aberto = tecnicoAberto === nome;
      const pendentes = pedidos.filter(({ status }) => status === 'Pendente').length;
      const painelId = `pedidos-tecnico-${indice}`;
      return <section key={nome} className={css.tecnico}>
        <button type="button" className={css.tecnicoBotao} aria-expanded={aberto} aria-controls={painelId} onClick={() => definirTecnicoAberto(aberto ? null : nome)}>
          <span className={css.avatar}><UserRound size={20} /></span><span className={css.tecnicoNome}><strong>{nome}</strong><small>{pedidos.length} {pedidos.length === 1 ? 'solicitação' : 'solicitações'}</small></span>
          {pendentes > 0 && <span className={css.pendentes}>{pendentes} {pendentes === 1 ? 'pendente' : 'pendentes'}</span>}<ChevronDown size={19} className={aberto ? css.expandido : ''} />
        </button>
        {aberto && <div id={painelId} className={css.lista} role="region" aria-label={`Solicitações de ${nome}`} tabIndex={0}>
          {pedidos.length ? <><div className={css.colunas} aria-hidden="true"><span>Solicitação / data</span><span>Obra</span><span>Status</span><span /></div>
            {pedidos.map((pedido) => <button key={pedido.id} type="button" className={css.pedido} onClick={() => { definirErro(''); selecionar(pedido.id); }} aria-label={`Abrir solicitação ${pedido.id}, ${formatarData(pedido.dataSolicitacao)}, ${nomeObra(pedido)}, ${pedido.status}`}>
              <span className={css.identificador}><strong>#{String(pedido.id).padStart(4, '0')}</strong><small>{formatarData(pedido.dataSolicitacao)}</small></span>
              <span className={css.obra}><strong>{nomeObra(pedido)}</strong><small>{pedido.obraDestinoId ? 'Entrega na obra' : 'Retirada para o depósito'}</small></span>
              <span className={css.status} data-status={pedido.status}>{pedido.status === 'Aprovada' ? 'Em preparação' : pedido.status}</span><ChevronRight size={16} />
            </button>)}
          </> : <div className={css.vazio}><ClipboardList size={24} /><p>Nenhuma solicitação deste técnico{termo ? ' para esta busca' : ''}.</p></div>}
        </div>}
      </section>;
    })}{!grupos.length && <div className={css.vazio}><ClipboardList size={28} /><p>{termo ? 'Nenhum técnico ou pedido encontrado para esta busca.' : 'Nenhum técnico cadastrado ou solicitação recebida.'}</p></div>}</div>
    {selecionada && <JanelaSolicitacao solicitacao={selecionada} aoFechar={fechar}>
      {erro && <p role="alert" className={css.erro}>{erroApi || erro}</p>}{processando && <p role="status" className={css.processando}>Atualizando solicitação...</p>}
      <DetalhesSolicitacao solicitacao={selecionada} cautelas={cautelas} buscarObraPorId={buscarObraPorId} estilos={estilos} processando={processando}
        aoAprovar={(id) => decidir(aoAprovar, id)} aoRejeitar={(id) => decidir(aoRejeitar, id)} aoEditar={(pedido) => { selecionar(null); aoEditar(pedido); }} aoExportarRomaneio={aoExportarRomaneio} aoExportarCautela={aoExportarCautela} />
    </JanelaSolicitacao>}
  </section>;
}
