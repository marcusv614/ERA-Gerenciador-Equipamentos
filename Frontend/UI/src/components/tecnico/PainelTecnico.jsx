import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Box, Building2, Check, ChevronRight, ClipboardList, Clock3, Download, History, LogOut, MapPin, Minus, Moon, PackageCheck, Plus, Search, Send, ShieldCheck, Sun, Truck, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiCautelas, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { obterDataAtual } from '../../utils/datas';
import { imprimirCautelaEmitida } from '../../services/documentosEquipamentos';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelTecnico.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';

const identificadorLocal = (equipamento) => String(equipamento.id);
const localizacaoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const rotuloStatus = (solicitacao) => {
  if (solicitacao.status === 'Aprovada') return solicitacao.materiais.every(({ identificacao }) => identificacao) ? 'Pronta para envio' : 'Aguardando separação no estoque';
  return { Pendente: 'Aguardando análise', 'Aguardando coleta': 'Aguardando retirada pelo estoque', 'Em trânsito': 'Enviada — confirme ao receber', Concluída: 'Recebimento confirmado', Rejeitada: 'Rejeitada' }[solicitacao.status] || solicitacao.status;
};
const descricaoStatus = (solicitacao) => ({
  Pendente: 'O gerente ainda precisa analisar esta solicitação.',
  Aprovada: solicitacao.materiais.every(({ identificacao }) => identificacao) ? 'O estoque já separou os itens e ainda precisa confirmar o envio.' : 'O gerente autorizou o pedido; o estoque ainda precisa separar os itens.',
  'Aguardando coleta': 'A retirada foi autorizada e aguarda a confirmação do estoque.',
  'Em trânsito': 'O estoque confirmou o envio. Confirme o recebimento somente quando o material chegar à obra.',
  Concluída: 'O recebimento foi confirmado e o inventário da obra foi atualizado.',
  Rejeitada: 'A solicitação não foi autorizada pelo gerente.',
}[solicitacao.status]);

export function PainelTecnico({ modoAdministrador = false }) {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [catalogoMateriais, definirCatalogoMateriais] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [cautelas, definirCautelas] = useState([]);
  const [origem, definirOrigem] = useState('');
  const [destino, definirDestino] = useState('');
  const [busca, definirBusca] = useState('');
  const [itens, definirItens] = useState([]);
  const [observacao, definirObservacao] = useState('');
  const [aba, definirAba] = useState('materiais');
  const [obraInventarioId, definirObraInventarioId] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [enviando, definirEnviando] = useState(false);
  const [mensagem, definirMensagem] = useState(null);
  const [operacao, definirOperacao] = useState('');
  const [etapaMovimentacao, definirEtapaMovimentacao] = useState(1);
  const [mostrarObservacao, definirMostrarObservacao] = useState(false);
  const [temaEscuro, definirTemaEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('era-tema-tecnico');
    return temaSalvo ? temaSalvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  const alternarTema = () => definirTemaEscuro((temaAtual) => {
    const novoTema = !temaAtual;
    localStorage.setItem('era-tema-tecnico', novoTema ? 'escuro' : 'claro');
    return novoTema;
  });

  useEffect(() => {
    let componenteAtivo = true;
    Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiEquipamentos.listarCatalogo(), apiAtividades.listar(), apiCautelas.listar()])
      .then(([obrasRecebidas, equipamentosRecebidos, catalogoRecebido, solicitacoesRecebidas, cautelasRecebidas]) => {
        if (!componenteAtivo) return;
        definirObras(obrasRecebidas);
        definirEquipamentos(equipamentosRecebidos);
        definirCatalogoMateriais(catalogoRecebido);
        definirSolicitacoes(solicitacoesRecebidas);
        definirCautelas(cautelasRecebidas);
        const obraDoTecnico = obrasRecebidas.find(({ responsaveis }) => responsaveis?.some((nome) => nome.toLocaleLowerCase('pt-BR') === usuario.nome.toLocaleLowerCase('pt-BR')));
        definirObraInventarioId(String(obraDoTecnico?.id || obrasRecebidas[0]?.id || ''));
      })
      .catch((erro) => { if (componenteAtivo) definirMensagem({ tipo: 'erro', texto: erro.message }); })
      .finally(() => { if (componenteAtivo) definirCarregando(false); });
    return () => { componenteAtivo = false; };
  }, [usuario.nome]);

  useEffect(() => {
    let componenteAtivo = true;
    const atualizarMovimentacoes = async () => {
      try {
        const [solicitacoesRecebidas, cautelasRecebidas] = await Promise.all([apiAtividades.listar(), apiCautelas.listar()]);
        if (!componenteAtivo) return;
        definirSolicitacoes(solicitacoesRecebidas);
        definirCautelas(cautelasRecebidas);
      } catch {
        // A carga inicial já informa falhas; a sincronização silenciosa tenta novamente no próximo ciclo.
      }
    };
    const aoRetomarPainel = () => { if (document.visibilityState === 'visible') atualizarMovimentacoes(); };
    const intervalo = window.setInterval(atualizarMovimentacoes, 10_000);
    window.addEventListener('focus', atualizarMovimentacoes);
    document.addEventListener('visibilitychange', aoRetomarPainel);
    return () => {
      componenteAtivo = false;
      window.clearInterval(intervalo);
      window.removeEventListener('focus', atualizarMovimentacoes);
      document.removeEventListener('visibilitychange', aoRetomarPainel);
    };
  }, []);

  const obrasAtivas = useMemo(() => obras.filter(({ status }) => status !== 'Concluída'), [obras]);
  const equipamentosDaOrigem = useMemo(() => equipamentos.filter((equipamento) => {
    if (!origem || localizacaoEquipamento(equipamento) !== origem) return false;
    const texto = `${equipamento.modelo} ${equipamento.tipo} ${equipamento.serie} ${equipamento.medida || ''}`.toLocaleLowerCase('pt-BR');
    return texto.includes(busca.trim().toLocaleLowerCase('pt-BR')) && (equipamento.quantidadeDisponivel ?? 1) > 0;
  }), [equipamentos, origem, busca]);
  const materiaisDoCatalogo = useMemo(() => catalogoMateriais.filter((material) => {
    const texto = `${material.modelo} ${material.tipo} ${material.medida || ''}`.toLocaleLowerCase('pt-BR');
    return texto.includes(busca.trim().toLocaleLowerCase('pt-BR'));
  }).map((material) => ({ ...material, id: `catalogo-${material.tipo}-${material.modelo}-${material.medida || 'sem-medida'}`, serie: null })), [catalogoMateriais, busca]);
  const materiaisParaSelecionar = operacao === 'receber' ? materiaisDoCatalogo : equipamentosDaOrigem;

  const nomeLocal = (valor) => valor === 'deposito' ? 'Depósito central' : obras.find(({ id }) => String(id) === String(valor))?.nome || 'Selecione';
  const pendentes = solicitacoes.filter(({ status }) => status === 'Pendente').length;
  const aprovadas = solicitacoes.filter(({ status }) => status === 'Aprovada').length;
  const recebimentosPendentes = solicitacoes.filter(({ status, obraDestinoId }) => status === 'Em trânsito' && obraDestinoId).length;
  const quantidadeTotal = itens.reduce((total, item) => total + item.quantidade, 0);
  const podeEnviar = ((operacao === 'receber' && destino) || (operacao === 'devolver' && origem)) && itens.length > 0 && !enviando;
  const obraInventario = obras.find(({ id }) => String(id) === obraInventarioId);
  const materiaisAtuaisDaObra = equipamentos.filter(({ obraId }) => String(obraId) === obraInventarioId);
  const materiaisQuePassaramNaObra = equipamentos.filter((equipamento) => String(equipamento.obraId) !== obraInventarioId && equipamento.historico?.some(({ origemObraId, destinoObraId }) => String(origemObraId) === obraInventarioId || String(destinoObraId) === obraInventarioId));

  const adicionarItem = (equipamento) => definirItens((atuais) => {
    const id = identificadorLocal(equipamento);
    if (atuais.some((item) => item.id === id)) return atuais;
    return [...atuais, { id, equipamento, quantidade: 1 }];
  });

  const alterarQuantidade = (id, diferenca) => definirItens((atuais) => atuais
    .map((item) => {
      if (item.id !== id) return item;
      const limite = operacao === 'receber' ? Number.MAX_SAFE_INTEGER : (item.equipamento.quantidadeDisponivel ?? 1);
      return { ...item, quantidade: Math.max(0, Math.min(item.quantidade + diferenca, limite)) };
    })
    .filter(({ quantidade }) => quantidade > 0));
  const removerItem = (id) => definirItens((atuais) => atuais.filter((item) => item.id !== id));

  const trocarOrigem = (valor) => {
    definirOrigem(valor);
    definirItens([]);
    if (valor === destino) definirDestino('');
  };
  const selecionarOperacao = (novaOperacao) => {
    definirOperacao(novaOperacao); definirItens([]); definirBusca('');
    if (novaOperacao === 'receber') { definirOrigem('deposito'); definirDestino(''); }
    else if (novaOperacao === 'devolver') { definirOrigem(''); definirDestino('deposito'); }
    definirEtapaMovimentacao(2);
  };
  const avancarSolicitacao = async (solicitacao, acao) => {
    definirMensagem(null);
    try {
      const atualizada = acao === 'transito' ? await apiAtividades.iniciarTransito(solicitacao.id) : await apiAtividades.concluir(solicitacao.id);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      const [equipamentosAtualizados,cautelasAtualizadas]=await Promise.all([apiEquipamentos.listar(),apiCautelas.listar()]);definirEquipamentos(equipamentosAtualizados);definirCautelas(cautelasAtualizadas);
      definirMensagem({ tipo: 'sucesso', texto: acao === 'transito' ? 'Retirada confirmada. Material em trânsito.' : 'Recebimento confirmado. Estoque atualizado.' });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const enviarSolicitacao = async () => {
    if (!podeEnviar) return;
    definirEnviando(true);
    definirMensagem(null);
    try {
      const criada = await apiAtividades.cadastrar({
        solicitante: usuario.nome,
        tecnico: usuario.nome,
        obraOrigemId: operacao === 'devolver' ? Number(origem) : null,
        obraDestinoId: operacao === 'receber' ? Number(destino) : null,
        dataSolicitacao: obterDataAtual(),
        observacao: observacao.trim() || null,
        materiais: itens.map(({ equipamento, quantidade }) => ({ nome: equipamento.modelo, quantidade, identificacao: equipamento.serie || null, catalogoChave: equipamento.catalogoChave || null })),
      });
      definirSolicitacoes((atuais) => [criada, ...atuais]);
      definirEquipamentos((atuais) => atuais.map((equipamento) => {
        const item = itens.find(({ equipamento: selecionado }) => selecionado.id === equipamento.id);
        return item ? { ...equipamento, quantidadeReservada: (equipamento.quantidadeReservada || 0) + item.quantidade, quantidadeDisponivel: equipamento.quantidadeDisponivel - item.quantidade } : equipamento;
      }));
      definirItens([]); definirObservacao(''); definirBusca(''); definirOperacao(''); definirEtapaMovimentacao(1); definirMostrarObservacao(false);
      definirMensagem({ tipo: 'sucesso', texto: 'Solicitação enviada para análise do gerente.' });
      definirAba('acompanhar');
    } catch (erro) {
      definirMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      definirEnviando(false);
    }
  };

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'}>
    <header className={estilos.cabecalho}>
      <div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>campo</span></div>
      <div className={estilos.usuario}>
        <div><small>Olá, técnico</small><strong>{usuario.nome}</strong></div>
        <button type="button" className={estilos.botaoTema} onClick={alternarTema} aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={temaEscuro ? 'Tema claro' : 'Tema escuro'}>{temaEscuro ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" onClick={encerrarSessao} aria-label="Sair"><LogOut size={19} /></button>
      </div>
    </header>

    <main className={estilos.conteudo}>
      <nav className={estilos.abas} aria-label="Navegação do técnico">
        <button className={aba === 'materiais' ? estilos.abaAtiva : ''} onClick={() => definirAba('materiais')}><Building2 size={18} /> Minha obra</button>
        {!modoAdministrador && <button className={aba === 'solicitar' ? estilos.abaAtiva : ''} onClick={() => definirAba('solicitar')}><ArrowRight size={18} /> Movimentar</button>}
        <button className={aba === 'acompanhar' ? estilos.abaAtiva : ''} onClick={() => definirAba('acompanhar')}><ClipboardList size={18} /> Movimentações {pendentes + recebimentosPendentes > 0 && <span>{pendentes + recebimentosPendentes}</span>}</button>
      </nav>

      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}><span>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}</span>{mensagem.texto}<button onClick={() => definirMensagem(null)}><X size={16} /></button></div>}
      {carregando && <div className={estilos.carregando}><i /><span>Sincronizando o campo...</span></div>}

      {!carregando && aba === 'solicitar' && <div className={`${estilos.gradePrincipal} ${etapaMovimentacao === 4 ? estilos.gradeRevisao : ''}`}>
        {etapaMovimentacao < 4 && <section className={estilos.formulario}>
          {etapaMovimentacao === 1 && <div className={estilos.operacoes}><span className={estilos.selo}>Movimentar material</span><h2>O que você precisa fazer?</h2>{obrasAtivas.length ? <><button onClick={() => selecionarOperacao('receber')}><PackageCheck /><span><strong>Solicitar material</strong><small>Diga o que precisa. O gerente decide de onde virá.</small></span><ChevronRight /></button><button onClick={() => selecionarOperacao('devolver')}><Box /><span><strong>Retirar material</strong><small>Solicite a retirada de um material da sua obra.</small></span><ChevronRight /></button></> : <div className={estilos.semObraSimples}><Building2 /><strong>Nenhuma obra atribuída</strong><span>Peça ao gerente para vincular uma obra ao seu usuário.</span></div>}</div>}
          {etapaMovimentacao === 2 && <div className={estilos.escolhaObra}><span className={estilos.selo}>Escolha sua obra</span><h2>{operacao === 'receber' ? 'Destino do material:' : 'De onde o material deve ser retirado?'}</h2><div className={estilos.listaObrasEscolha}>{obrasAtivas.map((obra) => {
            const selecionada = String(obra.id) === (operacao === 'receber' ? destino : origem);
            return <button type="button" key={obra.id} className={selecionada ? estilos.obraSelecionada : ''} aria-pressed={selecionada} onClick={() => { if (operacao === 'receber') definirDestino(String(obra.id)); else trocarOrigem(String(obra.id)); }}><Building2 /><span><strong>{obra.nome}</strong><small>{obra.cidade}</small></span>{selecionada ? <Check /> : <ChevronRight />}</button>;
          })}</div><div className={estilos.acoesEtapa}><button onClick={() => definirEtapaMovimentacao(1)}>Voltar</button><button disabled={operacao === 'receber' ? !destino : !origem} onClick={() => definirEtapaMovimentacao(3)}>Continuar <ChevronRight /></button></div></div>}

          {etapaMovimentacao === 3 && <><div className={estilos.tituloSimples}><span className={estilos.selo}>Escolha os materiais</span><h2>{operacao === 'receber' ? 'O que você precisa?' : 'O que deve ser retirado?'}</h2><p>{operacao === 'receber' ? 'Você não precisa saber onde o material está.' : `Mostrando apenas materiais de ${nomeLocal(origem)}.`}</p></div><div className={estilos.busca}><Search size={19} /><input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar material" /></div>
            <div className={estilos.listaMateriais}>{materiaisParaSelecionar.length ? materiaisParaSelecionar.map((equipamento) => {
              const selecionado = itens.some(({ id }) => id === identificadorLocal(equipamento));
              return <button type="button" key={equipamento.id} className={`${estilos.material} ${selecionado ? estilos.materialSelecionado : ''}`} onClick={() => selecionado ? removerItem(identificadorLocal(equipamento)) : adicionarItem(equipamento)}>
                <span className={estilos.iconeMaterial}>{selecionado ? <Check /> : <Box />}</span><span className={estilos.dadosMaterial}><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : equipamento.medida ? ` · ${equipamento.medida}` : ''}</small></span>{operacao === 'devolver' && <span className={estilos.disponivel}><b>{equipamento.quantidadeDisponivel ?? 1}</b><small>na obra</small></span>}
              </button>;
            }) : <div className={estilos.vazioMateriais}><PackageCheck /><strong>Nenhum material encontrado</strong><span>Tente buscar por outro nome.</span></div>}</div><div className={estilos.acoesEtapa}><button onClick={() => definirEtapaMovimentacao(2)}>Voltar</button><button disabled={!itens.length} onClick={() => definirEtapaMovimentacao(4)}>Revisar {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} <ChevronRight /></button></div></>}
        </section>}

        {etapaMovimentacao === 4 && <aside className={estilos.resumoPedido} aria-label="Resumo da movimentação">
          <div className={estilos.resumoTopo}><span><ClipboardList /></span><div><small>Sua movimentação</small><strong>{quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}</strong></div></div>
          <div className={estilos.miniRota}><span><MapPin />{operacao === 'receber' ? `Entregar em ${nomeLocal(destino)}` : `Retirar de ${nomeLocal(origem)}`}</span></div>
          <div className={estilos.itensResumo}>{itens.map(({ id, equipamento, quantidade }) => <div key={id} className={estilos.itemResumo}><div><strong>{equipamento.modelo}</strong>{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <small>{equipamento.serie}</small>}</div><div className={estilos.quantidade}><button onClick={() => alterarQuantidade(id, -1)}><Minus /></button><b>{quantidade}</b><button onClick={() => alterarQuantidade(id, 1)} disabled={operacao !== 'receber' && quantidade >= (equipamento.quantidadeDisponivel ?? 1)}><Plus /></button></div></div>)}</div>
          {!itens.length && <div className={estilos.carrinhoVazio}><Box /><span>Os materiais selecionados aparecerão aqui.</span></div>}
          {!mostrarObservacao ? <button className={estilos.adicionarObservacao} onClick={() => definirMostrarObservacao(true)}><Plus /> Adicionar observação</button> : <label className={estilos.observacao}><span>Observação <small>opcional</small></span><textarea autoFocus value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} placeholder="Ex.: entregar com o responsável da obra..." maxLength={500} /></label>}
          <button className={estilos.enviar} disabled={!podeEnviar} onClick={enviarSolicitacao}>{enviando ? 'Enviando...' : <><Send /> Enviar ao gerente <ChevronRight /></>}</button>
          <p className={estilos.seguranca}><ShieldCheck /> O gerente revisará tudo antes da movimentação.</p>
          <button className={estilos.voltarRevisao} onClick={() => definirEtapaMovimentacao(3)}>Voltar e corrigir</button>
        </aside>}
      </div>}

      {!carregando && aba === 'acompanhar' && <section className={estilos.acompanhamento}>
        <div className={estilos.cabecalhoHistorico}><div><span className={estilos.selo}>Minhas solicitações</span><h2>Acompanhe cada movimentação</h2><p>Atualizações do gerente aparecem aqui.</p></div><div className={estilos.metricas}><span><b>{pendentes}</b> aguardando</span><span><b>{aprovadas}</b> aprovadas</span></div></div>
        <div className={estilos.listaSolicitacoes}>{solicitacoes.length ? solicitacoes.map((solicitacao) => <article key={solicitacao.id} className={estilos.cartaoSolicitacao} data-status={solicitacao.status}>
          <div className={estilos.statusSolicitacao}><span>{['Pendente', 'Aguardando coleta'].includes(solicitacao.status) ? <Clock3 /> : solicitacao.status === 'Em trânsito' ? <Truck /> : solicitacao.status === 'Rejeitada' ? <X /> : <Check />}</span><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><strong>{rotuloStatus(solicitacao)}</strong></div><time>{new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR')}</time></div>
          <div className={estilos.trajetoCartao}><span>{solicitacao.obraDestinoId ? `Entrega solicitada para ${nomeLocal(solicitacao.obraDestinoId)}` : 'Retirada solicitada da sua obra'}</span></div>
          <p className={estilos.fluxoSolicitacao}>{descricaoStatus(solicitacao)}</p>
          <div className={estilos.materiaisCartao}>{solicitacao.materiais.map((material) => <span key={`${material.identificacao}-${material.id}`}><b>{material.quantidade}×</b> {material.nome}<small>{material.identificacao}</small></span>)}</div>
          {solicitacao.observacao && <p className={estilos.notaCartao}>“{solicitacao.observacao}”</p>}
          {cautelas.filter(({ solicitacaoId }) => solicitacaoId === solicitacao.id).map((cautela) => <button key={cautela.id} className={estilos.acaoMovimentacao} onClick={() => imprimirCautelaEmitida(cautela)}><Download /> Cautela</button>)}
          {solicitacao.status === 'Aguardando coleta' && <span>Aguardando o estoque confirmar a retirada.</span>}
          {!modoAdministrador && solicitacao.status === 'Em trânsito' && solicitacao.obraDestinoId && <button className={estilos.acaoMovimentacao} onClick={() => avancarSolicitacao(solicitacao, 'concluir')}><PackageCheck /> Confirmar recebimento na obra</button>}
        </article>) : <div className={estilos.semSolicitacoes}><ClipboardList /><h3>Nenhuma solicitação ainda</h3><p>Sua primeira movimentação aparecerá aqui.</p><button onClick={() => definirAba('solicitar')}>Criar solicitação</button></div>}</div>
      </section>}

      {!carregando && aba === 'materiais' && <section className={estilos.inventarioObra}>
        <div className={estilos.topoInventario}>
          <div><span className={estilos.selo}>Visão do campo</span><h2>Minha obra</h2><p>Consulte os materiais atuais e o histórico da obra.</p></div>
          <label><span>Qual obra?</span><select value={obraInventarioId} onChange={(evento) => definirObraInventarioId(evento.target.value)}>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>
        </div>
        {obraInventario && <div className={estilos.faixaObra}><div className={estilos.iconeObra}><Building2 /></div><div><small>Obra escolhida</small><strong>{obraInventario.nome}</strong><span><MapPin /> {obraInventario.cidade} · {obraInventario.cliente}</span></div></div>}
        <div className={estilos.blocosInventario}>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.agora}><PackageCheck /></span><div><h3>Está na obra agora</h3><p>{materiaisAtuaisDaObra.length} {materiaisAtuaisDaObra.length === 1 ? 'material' : 'materiais'}</p></div></div><div className={estilos.tabelaMateriais}>{materiaisAtuaisDaObra.length ? materiaisAtuaisDaObra.map((equipamento) => <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><Box /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · Série ${equipamento.serie}` : ''}</small></div><span className={estilos.quantidadeMaterial}><b>{equipamento.quantidade || 1}</b><small>unid.</small></span></div>) : <div className={estilos.listaVazia}><PackageCheck /><strong>Nenhum material nesta obra</strong><span>Materiais aprovados aparecerão aqui.</span></div>}</div></div>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.passado}><History /></span><div><h3>Já passou por esta obra</h3><p>Materiais que já saíram daqui</p></div></div><div className={estilos.tabelaMateriais}>{materiaisQuePassaramNaObra.length ? materiaisQuePassaramNaObra.map((equipamento) => { const ultima = equipamento.historico.filter(({ origemObraId, destinoObraId }) => String(origemObraId) === obraInventarioId || String(destinoObraId) === obraInventarioId).at(-1); const dataRegistro = ultima?.dataMovimentacao || ultima?.dataSaida || ultima?.dataEntrada; return <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><History /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · Série ${equipamento.serie}` : ''}</small>{dataRegistro && <em>Último registro: {new Date(`${dataRegistro}T12:00:00`).toLocaleDateString('pt-BR')}</em>}</div><span className={estilos.statusSaiu}>Já saiu</span></div>; }) : <div className={estilos.listaVazia}><History /><strong>Nenhum material anterior</strong><span>O histórico desta obra ainda está vazio.</span></div>}</div></div>
        </div>
      </section>}
    </main>
  </div>;
}
