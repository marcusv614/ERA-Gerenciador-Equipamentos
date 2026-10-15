import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Box, Building2, Check, ChevronRight, ClipboardList, Clock3, History, LogOut, MapPin, Moon, PackageCheck, Plus, Search, Send, ShieldCheck, Sun, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { obterDataAtual } from '../../utils/datas';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelTecnico.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { obterEtapaSolicitacao, pertenceEtapaSolicitacao } from '../../utils/statusSolicitacao';

const identificadorLocal = (equipamento) => String(equipamento.id);
const localizacaoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const rotuloStatus = (solicitacao) => obterEtapaSolicitacao(solicitacao.status).rotulo;
const descricaoStatus = (solicitacao) => ({
  Pendente: 'Aguardando o gerente aceitar ou rejeitar sua solicitação.',
  Aprovada: 'Solicitação aceita. O estoque está verificando onde encontrar cada material.',
  'Aguardando coleta': 'Solicitação aceita. O estoque está buscando os materiais solicitados.',
  'Em trânsito': solicitacao.obraDestinoId ? 'O estoque confirmou a entrega. Confirme abaixo quando receber.' : 'O estoque está concluindo o recebimento dos materiais.',
  Concluída: 'Solicitação finalizada e inventário atualizado.',
  Rejeitada: 'Solicitação rejeitada pelo gerente.',
}[solicitacao.status]);
const iconeEtapa = (status) => {
  const etapa = obterEtapaSolicitacao(status).chave;
  if (etapa === 'pendente') return <Clock3 />;
  if (etapa === 'rejeitada') return <X />;
  if (etapa === 'aceita') return <PackageCheck />;
  return <Check />;
};

export function PainelTecnico({ modoAdministrador = false, temaEscuro: temaControlado, aoAlternarTema } = {}) {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [catalogoMateriais, definirCatalogoMateriais] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
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
  const [temaLocalEscuro, definirTemaLocalEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('era-tema-tecnico');
    return temaSalvo ? temaSalvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const temaEscuro = temaControlado ?? temaLocalEscuro;

  const alternarTema = () => {
    if (aoAlternarTema) {
      aoAlternarTema();
      return;
    }
    definirTemaLocalEscuro((temaAtual) => {
      const novoTema = !temaAtual;
      localStorage.setItem('era-tema-tecnico', novoTema ? 'escuro' : 'claro');
      return novoTema;
    });
  };

  useEffect(() => {
    let componenteAtivo = true;
    Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiEquipamentos.listarCatalogo(), apiAtividades.listar()])
      .then(([obrasRecebidas, equipamentosRecebidos, catalogoRecebido, solicitacoesRecebidas]) => {
        if (!componenteAtivo) return;
        definirObras(obrasRecebidas);
        definirEquipamentos(equipamentosRecebidos);
        definirCatalogoMateriais(catalogoRecebido);
        definirSolicitacoes(solicitacoesRecebidas);
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
        const solicitacoesRecebidas = await apiAtividades.listar();
        if (!componenteAtivo) return;
        definirSolicitacoes(solicitacoesRecebidas);
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
  const aceitas = solicitacoes.filter(({ status }) => pertenceEtapaSolicitacao(status, 'aceita')).length;
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

  const definirQuantidade = (id, valor) => definirItens((atuais) => atuais.map((item) => {
    if (item.id !== id) return item;
    const quantidade = Number(valor);
    const limite = operacao === 'receber' ? 2147483647 : (item.equipamento.quantidadeDisponivel ?? 1);
    return Number.isInteger(quantidade) && quantidade > 0 && quantidade <= limite ? { ...item, quantidade } : item;
  }));
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
  const confirmarRecebimento = async (solicitacao) => {
    definirMensagem(null);
    try {
      const atualizada = await apiAtividades.concluir(solicitacao.id);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      const equipamentosAtualizados = await apiEquipamentos.listar();
      definirEquipamentos(equipamentosAtualizados);
      definirMensagem({ tipo: 'sucesso', texto: 'Recebimento confirmado. Solicitação finalizada.' });
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

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'} data-administrador={modoAdministrador}>
    {!modoAdministrador && <header className={estilos.cabecalho}>
      <div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>campo</span></div>
      <div className={estilos.usuario}>
        <div><small>Olá, técnico</small><strong>{usuario.nome}</strong></div>
        <button type="button" className={estilos.botaoTema} onClick={alternarTema} aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={temaEscuro ? 'Tema claro' : 'Tema escuro'}>{temaEscuro ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" onClick={encerrarSessao} aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={19} /></button>
      </div>
    </header>}

    <main className={estilos.conteudo}>
      <section className={estilos.introducao}>
        <div><span className={estilos.selo}>Área do técnico</span><h1>Trabalho de campo</h1><p>Faça suas solicitações e confirme quando receber os materiais.</p></div>
        {!modoAdministrador && recebimentosPendentes > 0 && <button type="button" onClick={() => definirAba('acompanhar')}><PackageCheck /><span><strong>{recebimentosPendentes} {recebimentosPendentes === 1 ? 'recebimento aguarda' : 'recebimentos aguardam'} confirmação</strong><small>Confirme somente após o material chegar.</small></span><ChevronRight /></button>}
      </section>
      <nav className={estilos.abas} aria-label="Navegação do técnico">
        <button className={aba === 'materiais' ? estilos.abaAtiva : ''} onClick={() => definirAba('materiais')}><Building2 /><span><strong>Minha obra</strong><small>Materiais atuais</small></span></button>
        {!modoAdministrador && <button className={aba === 'solicitar' ? estilos.abaAtiva : ''} onClick={() => definirAba('solicitar')}><ArrowRight /><span><strong>Solicitar</strong><small>Novo pedido</small></span></button>}
        <button className={aba === 'acompanhar' ? estilos.abaAtiva : ''} onClick={() => definirAba('acompanhar')}><ClipboardList /><span><strong>Solicitações</strong><small>Acompanhar pedidos</small></span>{pendentes + recebimentosPendentes > 0 && <b>{pendentes + recebimentosPendentes}</b>}</button>
      </nav>

      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}><span>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}</span>{mensagem.texto}<button onClick={() => definirMensagem(null)}><X size={16} /></button></div>}
      {carregando && <div className={estilos.carregando}><i /><span>Sincronizando o campo...</span></div>}

      {!carregando && aba === 'solicitar' && <div className={`${estilos.gradePrincipal} ${etapaMovimentacao === 4 ? estilos.gradeRevisao : ''}`}>
        {etapaMovimentacao < 4 && <section className={estilos.formulario}>
          {etapaMovimentacao === 1 && <div className={estilos.operacoes}><span className={estilos.selo}>Nova solicitação</span><h2>O que você precisa?</h2>{obrasAtivas.length ? <><button onClick={() => selecionarOperacao('receber')}><PackageCheck /><span><strong>Receber material</strong><small>Informe o que precisa na sua obra.</small></span><ChevronRight /></button><button onClick={() => selecionarOperacao('devolver')}><Box /><span><strong>Devolver material</strong><small>Peça a retirada de um material da sua obra.</small></span><ChevronRight /></button></> : <div className={estilos.semObraSimples}><Building2 /><strong>Nenhuma obra atribuída</strong><span>Peça ao gerente para vincular uma obra ao seu usuário.</span></div>}</div>}
          {etapaMovimentacao === 2 && <div className={estilos.escolhaObra}><span className={estilos.selo}>Escolha sua obra</span><h2>{operacao === 'receber' ? 'Destino do material:' : 'De onde o material deve ser retirado?'}</h2><div className={estilos.listaObrasEscolha}>{obrasAtivas.map((obra) => {
            const selecionada = String(obra.id) === (operacao === 'receber' ? destino : origem);
            return <button type="button" key={obra.id} className={selecionada ? estilos.obraSelecionada : ''} aria-pressed={selecionada} onClick={() => { if (operacao === 'receber') definirDestino(String(obra.id)); else trocarOrigem(String(obra.id)); }}><Building2 /><span><strong>{obra.nome}</strong><small>{obra.cidade}</small></span>{selecionada ? <Check /> : <ChevronRight />}</button>;
          })}</div><div className={estilos.acoesEtapa}><button onClick={() => definirEtapaMovimentacao(1)}>Voltar</button><button disabled={operacao === 'receber' ? !destino : !origem} onClick={() => definirEtapaMovimentacao(3)}>Continuar <ChevronRight /></button></div></div>}

          {etapaMovimentacao === 3 && <><div className={estilos.tituloSimples}><span className={estilos.selo}>Escolha os materiais</span><h2>{operacao === 'receber' ? 'O que você precisa?' : 'O que deve ser retirado?'}</h2><p>{operacao === 'receber' ? 'Você não precisa saber onde o material está.' : `Mostrando apenas materiais de ${nomeLocal(origem)}.`}</p></div><div className={estilos.busca}><Search size={19} /><input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar material" /></div>
            <div className={estilos.listaMateriais}>{materiaisParaSelecionar.length ? materiaisParaSelecionar.map((equipamento) => {
              const id = identificadorLocal(equipamento);
              const quantidade = itens.find((item) => item.id === id)?.quantidade || 0;
              const selecionado = quantidade > 0;
              const limite = operacao === 'receber' ? 2147483647 : (equipamento.quantidadeDisponivel ?? 1);
              return <div key={equipamento.id} className={`${estilos.material} ${selecionado ? estilos.materialSelecionado : ''}`}>
                <button type="button" className={estilos.selecionarMaterial} aria-pressed={selecionado} onClick={() => selecionado ? removerItem(id) : adicionarItem(equipamento)}>
                <span className={estilos.iconeMaterial}>{selecionado ? <Check /> : <Box />}</span><span className={estilos.dadosMaterial}><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : equipamento.medida ? ` · ${equipamento.medida}` : ''}</small></span>{operacao === 'devolver' && <span className={estilos.disponivel}><b>{equipamento.quantidadeDisponivel ?? 1}</b><small>na obra</small></span>}
                </button>
                <div className={estilos.quantidade} role="group" aria-label={`Quantidade de ${equipamento.modelo}`}>
                  <input type="number" aria-label={`Quantidade de ${equipamento.modelo}`} min="0" max={limite} step="1" value={quantidade} onChange={(evento) => {
                    const valor = Number(evento.target.value);
                    if (!Number.isInteger(valor) || valor < 0 || valor > limite) return;
                    if (valor === 0) removerItem(id);
                    else if (selecionado) definirQuantidade(id, valor);
                    else definirItens((atuais) => [...atuais, { id, equipamento, quantidade: valor }]);
                  }} />
                </div>
              </div>;
            }) : <div className={estilos.vazioMateriais}><PackageCheck /><strong>Nenhum material encontrado</strong><span>Tente buscar por outro nome.</span></div>}</div><div className={estilos.acoesEtapa}><button onClick={() => definirEtapaMovimentacao(2)}>Voltar</button><button disabled={!itens.length} onClick={() => definirEtapaMovimentacao(4)}>Revisar {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} <ChevronRight /></button></div></>}
        </section>}

        {etapaMovimentacao === 4 && <aside className={estilos.resumoPedido} aria-label="Resumo da solicitação">
          <div className={estilos.resumoTopo}><span><ClipboardList /></span><div><small>Sua solicitação</small><strong>{quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}</strong></div></div>
          <div className={estilos.miniRota}><span><MapPin />{operacao === 'receber' ? `Entregar em ${nomeLocal(destino)}` : `Retirar de ${nomeLocal(origem)}`}</span></div>
          <div className={estilos.itensResumo}>{itens.map(({ id, equipamento, quantidade }) => <div key={id} className={estilos.itemResumo}><div><strong>{equipamento.modelo}</strong>{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <small>{equipamento.serie}</small>}</div><div className={estilos.quantidade}><input type="number" aria-label={`Quantidade de ${equipamento.modelo}`} min="1" max={operacao === 'receber' ? 2147483647 : (equipamento.quantidadeDisponivel ?? 1)} step="1" value={quantidade} onChange={(evento) => definirQuantidade(id, evento.target.value)} /></div></div>)}</div>
          {!itens.length && <div className={estilos.carrinhoVazio}><Box /><span>Os materiais selecionados aparecerão aqui.</span></div>}
          {!mostrarObservacao ? <button className={estilos.adicionarObservacao} onClick={() => definirMostrarObservacao(true)}><Plus /> Adicionar observação</button> : <label className={estilos.observacao}><span>Observação <small>opcional</small></span><textarea autoFocus value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} placeholder="Ex.: entregar com o responsável da obra..." maxLength={500} /></label>}
          <button className={estilos.enviar} disabled={!podeEnviar} onClick={enviarSolicitacao}>{enviando ? 'Enviando...' : <><Send /> Enviar ao gerente <ChevronRight /></>}</button>
          <p className={estilos.seguranca}><ShieldCheck /> O gerente aceitará ou rejeitará esta solicitação.</p>
          <button className={estilos.voltarRevisao} onClick={() => definirEtapaMovimentacao(3)}>Voltar e corrigir</button>
        </aside>}
      </div>}

      {!carregando && aba === 'acompanhar' && <section className={estilos.acompanhamento}>
        <div className={estilos.cabecalhoHistorico}><div><span className={estilos.selo}>Minhas solicitações</span><h2>Acompanhe seus pedidos</h2><p>Veja se foram aceitos e confirme quando receber.</p></div><div className={estilos.metricas}><span><b>{pendentes}</b> pendentes</span><span><b>{aceitas}</b> aceitas</span></div></div>
        <div className={estilos.listaSolicitacoes}>{solicitacoes.length ? solicitacoes.map((solicitacao) => <article key={solicitacao.id} className={estilos.cartaoSolicitacao} data-etapa={obterEtapaSolicitacao(solicitacao.status).chave}>
          <div className={estilos.statusSolicitacao}><span>{iconeEtapa(solicitacao.status)}</span><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><strong>{rotuloStatus(solicitacao)}</strong></div><time>{new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR')}</time></div>
          <div className={estilos.trajetoCartao}><span>{solicitacao.obraDestinoId ? `Entrega solicitada para ${nomeLocal(solicitacao.obraDestinoId)}` : 'Retirada solicitada da sua obra'}</span></div>
          <p className={estilos.fluxoSolicitacao}>{descricaoStatus(solicitacao)}</p>
          <div className={estilos.materiaisCartao}>{solicitacao.materiais.map((material) => <span key={`${material.identificacao}-${material.id}`}><b>{material.quantidade}×</b> {material.nome}<small>{material.identificacao}</small></span>)}</div>
          {solicitacao.observacao && <p className={estilos.notaCartao}>“{solicitacao.observacao}”</p>}
          {!modoAdministrador && solicitacao.status === 'Em trânsito' && solicitacao.obraDestinoId && <button className={estilos.acaoMovimentacao} onClick={() => confirmarRecebimento(solicitacao)}><PackageCheck /> Confirmar que recebi</button>}
        </article>) : <div className={estilos.semSolicitacoes}><ClipboardList /><h3>Nenhuma solicitação ainda</h3><p>Seu primeiro pedido aparecerá aqui.</p><button onClick={() => definirAba('solicitar')}>Criar solicitação</button></div>}</div>
      </section>}

      {!carregando && aba === 'materiais' && <section className={estilos.inventarioObra}>
        <div className={estilos.topoInventario}>
          <div><span className={estilos.selo}>Visão do campo</span><h2>Minha obra</h2><p>Consulte os materiais atuais e o histórico da obra.</p></div>
          <label><span>Qual obra?</span><select value={obraInventarioId} onChange={(evento) => definirObraInventarioId(evento.target.value)}>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>
        </div>
        {obraInventario && <div className={estilos.faixaObra}><div className={estilos.iconeObra}><Building2 /></div><div><small>Obra escolhida</small><strong>{obraInventario.nome}</strong><span><MapPin /> {obraInventario.cidade} · {obraInventario.cliente}</span></div></div>}
        <div className={estilos.blocosInventario}>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.agora}><PackageCheck /></span><div><h3>Está na obra agora</h3><p>{materiaisAtuaisDaObra.length} {materiaisAtuaisDaObra.length === 1 ? 'material' : 'materiais'}</p></div></div><div className={estilos.tabelaMateriais}>{materiaisAtuaisDaObra.length ? materiaisAtuaisDaObra.map((equipamento) => <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><Box /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · Série ${equipamento.serie}` : ''}</small></div><span className={estilos.quantidadeMaterial}><b>{equipamento.quantidade || 1}</b><small>unid.</small></span></div>) : <div className={estilos.listaVazia}><PackageCheck /><strong>Nenhum material nesta obra</strong><span>Materiais recebidos aparecerão aqui.</span></div>}</div></div>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.passado}><History /></span><div><h3>Já passou por esta obra</h3><p>Materiais que já saíram daqui</p></div></div><div className={estilos.tabelaMateriais}>{materiaisQuePassaramNaObra.length ? materiaisQuePassaramNaObra.map((equipamento) => { const ultima = equipamento.historico.filter(({ origemObraId, destinoObraId }) => String(origemObraId) === obraInventarioId || String(destinoObraId) === obraInventarioId).at(-1); const dataRegistro = ultima?.dataMovimentacao || ultima?.dataSaida || ultima?.dataEntrada; return <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><History /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · Série ${equipamento.serie}` : ''}</small>{dataRegistro && <em>Último registro: {new Date(`${dataRegistro}T12:00:00`).toLocaleDateString('pt-BR')}</em>}</div><span className={estilos.statusSaiu}>Já saiu</span></div>; }) : <div className={estilos.listaVazia}><History /><strong>Nenhum material anterior</strong><span>O histórico desta obra ainda está vazio.</span></div>}</div></div>
        </div>
      </section>}
    </main>
  </div>;
}
