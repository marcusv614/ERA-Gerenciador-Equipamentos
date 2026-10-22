import { locaisDoPedido, pesquisarSolicitacoes } from '../../utils/pesquisaSolicitacoes';
import { acompanhamentoSolicitacao } from '../../utils/acompanhamentoSolicitacao';
import { AtendimentoParcialModal } from './AtendimentoParcialModal';
import { useEffect, useMemo, useState } from 'react';
import { Box, Building2, CalendarDays, Check, ClipboardList, FileDown, FileText, LogOut, Moon, PackageCheck, PackagePlus, Search, ShoppingCart, Sun, Truck, Warehouse, Wrench, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { imprimirListaComprasGeral, imprimirListaComprasSolicitacao, imprimirRomaneioSeparacao, imprimirRelatorioAuditoriaSolicitacao, imprimirOrdemAtendimento } from '../../services/documentosEquipamentos';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelEstoque.module.css';
import { tipoSemNumeroSerie } from '../../utils/identificacaoEquipamento';
import { obterEtapaSolicitacao } from '../../utils/statusSolicitacao';
import { ModalCalibracaoEquipamento } from '../calibracao-equip-modal/CalibracaoEquipModal';
import { FilaCalibracoes } from '../calibracao-equip-modal/FilaCalibracoes';
import { IndicadorCalibracao } from '../calibracao-equip-modal/IndicadorCalibracao';
import { calibracaoAberta, ehFluke } from '../../utils/calibracoes';
import { descreverLocalizacao } from '../../utils/localizacaoEquipamentos';
import { ModalManutencaoEquipamento } from '../manutencao-equip-modal/ManutencaoEquipModal';
import { SinoNotificacoes } from '../notificacoes/SinoNotificacoes';

const possuiSeries = (solicitacao) => solicitacao.materiais.every(({ identificacao }) => identificacao);
const rotuloOperacional = (solicitacao) => obterEtapaSolicitacao(solicitacao.status).rotulo;
const agruparMateriaisPedido = (materiais) => Object.values(materiais.reduce((grupos, material) => {
  const chave = material.catalogoChave || String(material.nome || '').trim().toLocaleLowerCase('pt-BR');
  if (!grupos[chave]) grupos[chave] = { chave, nome: material.nome, quantidade: 0, quantidadeCompra: 0 };
  grupos[chave].quantidade += material.quantidade || 0;
  grupos[chave].quantidadeCompra += material.quantidadeCompra || 0;
  return grupos;
}, {}));

export function PainelEstoque({ temaEscuro: temaControlado, aoAlternarTema, incorporado = false } = {}) {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [carregando, definirCarregando] = useState(true);
  const [mensagem, definirMensagem] = useState(null);
  const [separandoId, definirSeparandoId] = useState(null);
  const [iniciandoId, definirIniciandoId] = useState(null);
  const iniciarProvidencias = async (pedido) => {
    if (iniciandoId !== null) return;
    definirIniciandoId(pedido.id);
    try {
      const atualizado = await apiAtividades.iniciarAtendimento(pedido.id);
      definirSolicitacoes((atuais) => atuais.map((s) => s.id === atualizado.id ? atualizado : s));
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
    finally { definirIniciandoId(null); }
  };
  const [busca, definirBusca] = useState('');
  const [obraFiltrada, definirObraFiltrada] = useState('todas');
  const [aba, definirAba] = useState('atividades');
  const [equipamentoParaManutencao, definirEquipamentoParaManutencao] = useState(null);
  const [equipamentoParaCalibracao, definirEquipamentoParaCalibracao] = useState(null);
  const [quantidadesRecebidas, definirQuantidadesRecebidas] = useState({});
  const [notasFiscaisRecebidas, definirNotasFiscaisRecebidas] = useState({});
  const [identificacoesRecebidas, definirIdentificacoesRecebidas] = useState({});
  const [editandoAtendimento, definirEditandoAtendimento] = useState(null);
  const ajustarAtendimento = async (id, dados) => {
    const atualizadas = await apiAtividades.atenderParcialmente(id, dados);
    definirSolicitacoes((atuais) => [...atuais.filter((item) => !atualizadas.some((novo) => novo.id === item.id)), ...atualizadas]);
    definirEditandoAtendimento(null);
    apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
  };
  const [temaLocalEscuro, definirTemaLocalEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('era-tema-estoque');
    return temaSalvo ? temaSalvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const temaEscuro = temaControlado ?? temaLocalEscuro;

  useEffect(() => {
    let ativo = true;
    Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiAtividades.listar()])
      .then(([obrasRecebidas, equipamentosRecebidos, solicitacoesRecebidas]) => {
        if (!ativo) return;
        definirObras(obrasRecebidas); definirEquipamentos(equipamentosRecebidos); definirSolicitacoes(solicitacoesRecebidas);
      })
      .catch((erro) => { if (ativo) definirMensagem({ tipo: 'erro', texto: erro.message }); })
      .finally(() => { if (ativo) definirCarregando(false); });
    return () => { ativo = false; };
  }, []);
  const buscarObra = (id) => obras.find((obra) => String(obra.id) === String(id));

  useEffect(() => {
    let ativo = true;
    let atualizando = false;
    const atualizar = async () => {
      if (document.visibilityState === 'hidden' || atualizando) return;
      atualizando = true;
      try {
        const [pedidos, itens] = await Promise.all([apiAtividades.listar(), apiEquipamentos.listar()]);
        if (ativo) { definirSolicitacoes(pedidos); definirEquipamentos(itens); }
      } catch {
        // A próxima atualização tenta novamente sem interromper a separação.
      } finally { atualizando = false; }
    };
    const intervalo = window.setInterval(atualizar, 10000);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => { ativo = false; window.clearInterval(intervalo); window.removeEventListener('focus', atualizar); document.removeEventListener('visibilitychange', atualizar); };
  }, []);
  const nomeLocal = (id) => id == null || id === 'deposito' ? 'Depósito central' : buscarObra(id)?.nome || 'Obra';
  const equipamentosParaManutencao = equipamentos.filter(e => !e.arquivado && (obraFiltrada === 'todas' || String(e.obraId) === obraFiltrada) && (!busca.trim() || [e.modelo, e.serie, nomeLocal(e.obraId), e.tecnico].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))));
  const calibracoesFiltradas = equipamentos.filter(e=>{const c=calibracaoAberta(e);return c && !e.arquivado && (obraFiltrada === 'todas' || String(c.obraOrigemId)===obraFiltrada || String(e.obraId)===obraFiltrada) && (!busca.trim() || [c.id,e.modelo,e.serie,c.localOrigem,c.tecnicoOrigem,c.laboratorio].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR')));});
  const pendencias = useMemo(() => solicitacoes.filter(({ status }) => ['Aprovada', 'Aguardando coleta', 'Em trânsito'].includes(status)), [solicitacoes]);
  const concluidas = useMemo(() => solicitacoes.filter(({ status }) => ['Concluída', 'Rejeitada'].includes(status)), [solicitacoes]);
  const correspondeAosFiltros = (solicitacao) => (obraFiltrada === 'todas' || locaisDoPedido(solicitacao).includes(obraFiltrada))
    && pesquisarSolicitacoes([solicitacao], busca, buscarObra).length > 0;
  const pendenciasFiltradas = pendencias.filter(correspondeAosFiltros);
  const concluidasFiltradas = concluidas.filter(correspondeAosFiltros);
  const aquisicoes = useMemo(() => solicitacoes.flatMap((solicitacao) => (solicitacao.compras?.length ? solicitacao.compras : solicitacao.materiais)
    .filter((material) => material.quantidadeCompra > 0)
    .map((material) => ({ solicitacao, material, pendente: Math.max(0, material.quantidadeCompra - (material.quantidadeAdquirida || 0)), pendenteEntrada: Math.max(0, material.quantidadeCompra - (material.quantidadeEntradaEstoque || 0)) }))), [solicitacoes]);
  const comprasPendentes = aquisicoes.filter(({ pendenteEntrada }) => pendenteEntrada > 0).length;
  const aquisicoesFiltradas = aquisicoes.filter(({ solicitacao, material }) => {
    const obraId = solicitacao.obraDestinoId || solicitacao.obraOrigemId;
    if (obraFiltrada !== 'todas' && String(obraId) !== obraFiltrada) return false;
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return !termo || [solicitacao.id, solicitacao.tecnico, material.nome, nomeLocal(obraId)].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(termo);
  });
  const aquisicoesPorSolicitacao = Object.values(aquisicoesFiltradas.reduce((grupos, item) => {
    (grupos[item.solicitacao.id] ||= { solicitacao: item.solicitacao, itens: [] }).itens.push(item);
    return grupos;
  }, {}));
  const alternarTema = () => {
    if (aoAlternarTema) {
      aoAlternarTema();
      return;
    }
    definirTemaLocalEscuro((atual) => {
      localStorage.setItem('era-tema-estoque', atual ? 'claro' : 'escuro');
      return !atual;
    });
  };
  const executarPlano = async (solicitacao) => {
    if (separandoId !== null) return;
    definirSeparandoId(solicitacao.id);
    try {
      const atualizadas = await apiAtividades.executarPlano(solicitacao.id);
      definirSolicitacoes((atuais) => [...atuais.filter((item) => item.id !== solicitacao.id), ...atualizadas]);
      apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
    finally { definirSeparandoId(null); }
  };

  const registrarAquisicao = async (solicitacao, material, pendenteEntrada) => {
    const chave = `${solicitacao.id}-${material.id}`;
    const materialSemSerie = tipoSemNumeroSerie(material.catalogoChave?.split('|')[0]);
    const quantidade = Number(quantidadesRecebidas[chave] ?? 1);
    const numeroNota = String(notasFiscaisRecebidas[chave] || '').trim();
    const identificacao = String(identificacoesRecebidas[chave] || '').trim();
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > pendenteEntrada) {
      definirMensagem({ tipo: 'erro', texto: `Informe uma quantidade entre 1 e ${pendenteEntrada}.` }); return;
    }
    if (!numeroNota) {
      definirMensagem({ tipo: 'erro', texto: 'Informe o número da nota fiscal.' }); return;
    }
    if (!materialSemSerie && !identificacao) {
      definirMensagem({ tipo: 'erro', texto: `Informe o número de série de ${material.nome}.` }); return;
    }
    try {
      const atualizada = await apiAtividades.registrarAquisicao(solicitacao.id, material.id, quantidade, numeroNota, identificacao);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
      definirQuantidadesRecebidas((atuais) => { const novas = { ...atuais }; delete novas[chave]; return novas; });
      definirNotasFiscaisRecebidas((atuais) => { const novas = { ...atuais }; delete novas[chave]; return novas; });
      definirIdentificacoesRecebidas((atuais) => { const novas = { ...atuais }; delete novas[chave]; return novas; });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const confirmarAtendimento = async (solicitacao) => {
    try {
      let atualizada = solicitacao;
      if (atualizada.status !== 'Em trânsito') atualizada = await apiAtividades.iniciarTransito(atualizada.id, Boolean(atualizada.obraDestinoId));
      if (!atualizada.obraDestinoId) atualizada = await apiAtividades.concluir(atualizada.id);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
    }
    catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const renderizarCard = (solicitacao) => {
    const entradaNaObra = Boolean(solicitacao.obraDestinoId);
    const separado = possuiSeries(solicitacao);
    const andamento = acompanhamentoSolicitacao(solicitacao);
    const tarefa = solicitacao.status === 'Concluída' ? 'Finalizado'
      : solicitacao.status === 'Rejeitada' ? 'Sem ação necessária'
      : solicitacao.status === 'Em trânsito' ? (entradaNaObra ? `Aguardando confirmação de ${solicitacao.tecnico}` : 'Confirme o recebimento')
      : !separado ? 'Execute as origens e compras autorizadas pelo Financeiro'
      : 'Confirme a entrega';
    return <article className={estilos.card} key={solicitacao.id}>
      <header><span className={estilos.icone}><PackageCheck /></span><div><small>Pedido #{String(solicitacao.id).padStart(4, '0')}</small><h2>{nomeLocal(solicitacao.obraDestinoId || solicitacao.obraOrigemId)}</h2></div><b data-etapa={obterEtapaSolicitacao(solicitacao.status).chave}>{rotuloOperacional(solicitacao)}</b></header>
      <p className={estilos.instrucaoEntrega}>{tarefa}</p>
      {!separado && <p className={estilos.instrucaoEntrega}><strong>{andamento.rotulo}</strong></p>}
      {solicitacao.solicitacaoPaiId && <p className={estilos.autorPedido}>Atendimento vinculado ao pedido #{solicitacao.solicitacaoPaiId}</p>}
      {solicitacao.materiaisOriginais?.length > 0 && <p className={estilos.autorPedido}>Pedido original preservado · {solicitacao.materiaisOriginais.reduce((soma, m) => soma + m.quantidade, 0)} unidades</p>}
      <div className={estilos.metadados}><p><strong>{solicitacao.tecnico}</strong></p><time dateTime={solicitacao.dataSolicitacao}><CalendarDays /> {new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR')}</time></div>
      {solicitacao.solicitante && solicitacao.solicitante !== solicitacao.tecnico && <p className={estilos.autorPedido}>Solicitado por <strong>{solicitacao.solicitante}</strong></p>}
      {separado && <p className={estilos.instrucaoEntrega}>Coletar em <strong>{nomeLocal(solicitacao.obraOrigemId)}</strong> e entregar em <strong>{nomeLocal(solicitacao.obraDestinoId)}</strong>.</p>}
      <ul>{agruparMateriaisPedido(solicitacao.materiais).map((material) => <li key={material.chave}>
        <span>{material.quantidade}×</span>
        <div className={estilos.detalhesMaterial}>
          <strong>{material.nome}</strong>
          {material.quantidadeCompra > 0 && <div className={estilos.compraAnexada}>
            <ShoppingCart aria-hidden="true" />
            <span><b>{material.quantidadeCompra} para compra</b></span>
          </div>}
        </div>
      </li>)}</ul>
      {!separado && solicitacao.planoFinanceiro?.length > 0 && <div className={estilos.planoFinanceiro}><strong>Instruções do Financeiro</strong>{solicitacao.planoFinanceiro.map((item) => <section key={item.materialId}><strong>{item.nome}</strong>{item.origens.map((origem,indice) => <p key={`${origem.equipamentoId}-${indice}`}>Buscar {origem.quantidade} un. em {nomeLocal(origem.obraOrigemId)} · {origem.identificacao}</p>)}{item.quantidadeCompra > 0 && <p>Comprar {item.quantidadeCompra} un. e registrar a entrada na aba Compras.</p>}{item.justificativa && <small>{item.justificativa}</small>}</section>)}</div>}
      <footer>
        {solicitacao.status === 'Aprovada' && !separado && solicitacao.planoFinanceiro?.length > 0 && !andamento.inicio && <button type="button" disabled={iniciandoId !== null || separandoId !== null} onClick={() => iniciarProvidencias(solicitacao)}>{iniciandoId === solicitacao.id ? 'Registrando...' : andamento.compra > 0 ? 'Iniciar compra / providências' : 'Iniciar providências'}</button>}
        {solicitacao.status === 'Aprovada' && !separado && solicitacao.planoFinanceiro?.length > 0 && <button type="button" onClick={() => definirEditandoAtendimento(solicitacao)}>Editar solicitação / envio parcial</button>}
        <button type="button" onClick={() => imprimirOrdemAtendimento(solicitacao, buscarObra)}><FileDown /> Ordem de atendimento</button>
        <button type="button" onClick={() => imprimirRelatorioAuditoriaSolicitacao(solicitacao, buscarObra)}><FileText /> Rastreabilidade PDF</button>
        {solicitacao.status === 'Aprovada' && possuiSeries(solicitacao) && <button onClick={() => imprimirRomaneioSeparacao(solicitacao, buscarObra)}><FileDown /> Romaneio da separação</button>}
        {solicitacao.status === 'Aprovada' && !separado && <button className={estilos.primario} disabled={separandoId !== null || !solicitacao.planoFinanceiro?.length || solicitacao.materiais.some((material) => material.quantidadeCompra > (material.quantidadeEntradaEstoque || 0))} onClick={() => executarPlano(solicitacao)}><Box />{separandoId === solicitacao.id ? 'Confirmando...' : 'Confirmar separação do plano'}</button>}
        {solicitacao.status === 'Aprovada' && possuiSeries(solicitacao) && <button className={estilos.primario} onClick={() => confirmarAtendimento(solicitacao)}><Truck /> Confirmar entrega</button>}
        {solicitacao.status === 'Aguardando coleta' && <button className={estilos.primario} onClick={() => confirmarAtendimento(solicitacao)}><Warehouse /> Confirmar recebimento no estoque</button>}
        {solicitacao.status === 'Em trânsito' && !entradaNaObra && <button className={estilos.primario} onClick={() => confirmarAtendimento(solicitacao)}><Warehouse /> Confirmar recebimento no estoque</button>}
        {solicitacao.status === 'Em trânsito' && entradaNaObra && <span className={estilos.aviso}>Entrega confirmada · aguardando o técnico</span>}
      </footer>
    </article>;
  };

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'} data-incorporado={incorporado}>
    {!incorporado && <header className={estilos.cabecalho}><div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>Estoque</span></div><div className={estilos.usuario}><div><small>Operação de materiais</small><strong>{usuario.nome}</strong></div><SinoNotificacoes temaEscuro={temaEscuro} /><button type="button" onClick={alternarTema} aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={temaEscuro ? 'Tema claro' : 'Tema escuro'}>{temaEscuro ? <Sun /> : <Moon />}</button><button type="button" onClick={encerrarSessao} aria-label="Sair do sistema" title="Sair do sistema"><LogOut /></button></div></header>}
    <main className={estilos.conteudo}><section className={estilos.titulo}><div><span><Warehouse /> Operação</span><h1>Estoque</h1></div></section>
      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}{mensagem.texto}<button onClick={() => definirMensagem(null)}><X /></button></div>}
      <nav className={estilos.abas} aria-label="Áreas do estoque">
        <button className={aba === 'atividades' ? estilos.abaAtiva : ''} onClick={() => definirAba('atividades')}><Truck /><span>Pedidos</span><b>{pendencias.length+equipamentos.filter(e=>!e.arquivado&&calibracaoAberta(e)).length}</b></button>
        <button className={aba === 'aquisicoes' ? estilos.abaAtiva : ''} onClick={() => definirAba('aquisicoes')}><ShoppingCart /><span>Compras</span><b>{comprasPendentes}</b></button>
        <button className={aba === 'registros' ? estilos.abaAtiva : ''} onClick={() => definirAba('registros')}><ClipboardList /><span>Histórico</span><b>{concluidas.length}</b></button>
        <button className={aba === 'manutencoes' ? estilos.abaAtiva : ''} onClick={() => definirAba('manutencoes')}><Wrench /><span>Manutenção</span></button>
      </nav>
      {!carregando && <section className={estilos.filtros} aria-label={aba === 'manutencoes' ? 'Pesquisa de equipamentos' : 'Pesquisa de movimentações'}><label><Search /><input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder={aba === 'manutencoes' ? 'Buscar equipamento, série, técnico ou obra...' : 'Buscar número, técnico, material, série ou data...'} /></label><label><Building2 /><select value={obraFiltrada} onChange={(evento) => definirObraFiltrada(evento.target.value)}><option value="todas">Todas as obras</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label></section>}
      {carregando ? <div className={estilos.carregando}>Carregando estoque...</div> : <>
        {aba === 'atividades' && <FilaCalibracoes equipamentos={calibracoesFiltradas} aoAbrir={definirEquipamentoParaCalibracao} estilos={estilos}/>}
        {aba === 'manutencoes' && <section className={estilos.secao} aria-label="Manutenção dos equipamentos">{!equipamentosParaManutencao.length && <div className={estilos.vazio}><Wrench /><strong>Nenhum equipamento encontrado</strong></div>}<div className={estilos.grade}>{equipamentosParaManutencao.map(e => <article key={e.id} className={estilos.card}><header><span className={estilos.icone}><Wrench /></span><div><h2>{e.modelo}</h2><small>{e.serie} · {descreverLocalizacao(e,buscarObra)}</small></div></header><p className={estilos.resumoManutencao}>{e.quantidadeDisponivel} disponível(is) · {e.quantidadeManutencao || 0} em manutenção</p><div className={estilos.resumoManutencao}><IndicadorCalibracao equipamento={e}/></div><footer>{(ehFluke(e)||e.calibracoes?.length)&&<button type="button" onClick={()=>definirEquipamentoParaCalibracao(e)}>Calibração</button>}<button type="button" onClick={() => definirEquipamentoParaManutencao(e)}><Wrench />Gerenciar manutenção</button></footer></article>)}</div></section>}
        {aba === 'atividades' && <section className={estilos.secao}>{pendenciasFiltradas.length ? <div className={estilos.grade}>{pendenciasFiltradas.map(renderizarCard)}</div> : <div className={estilos.vazio}><Check /><strong>Nenhum pedido para atender</strong></div>}</section>}
        {aba === 'registros' && <section className={estilos.secao}>{concluidasFiltradas.length ? <div className={estilos.grade}>{concluidasFiltradas.map(renderizarCard)}</div> : <div className={estilos.vazio}><ClipboardList /><strong>Nenhum registro encontrado</strong></div>}</section>}
        {aba === 'aquisicoes' && <section className={estilos.secao}>
          <div className={`${estilos.tituloSecao} ${estilos.tituloAquisicoes}`}><PackagePlus /><div><h2>Compras</h2><p>Registre cada entrega separadamente.</p></div><button type="button" disabled={!aquisicoes.some(({ pendente }) => pendente > 0)} onClick={() => imprimirListaComprasGeral(aquisicoes, buscarObra)}><FileDown /> Lista de compras</button></div>
          <div className={estilos.gradeAquisicoes}>{aquisicoesPorSolicitacao.length ? aquisicoesPorSolicitacao.map(({ solicitacao, itens }) => {
            const possuiPendencia = itens.some(({ pendenteEntrada }) => pendenteEntrada > 0);
            return <article className={estilos.aquisicao} key={solicitacao.id} data-concluida={!possuiPendencia}>
              <header><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><h3>{nomeLocal(solicitacao.obraDestinoId || solicitacao.obraOrigemId)}</h3></div><b>{possuiPendencia ? 'Pendente' : 'Adquirido'}</b></header>
              <div className={estilos.aquisicaoItens}>{itens.map(({ material, pendenteEntrada }) => {
                const chave = `${solicitacao.id}-${material.id}`;
                const materialSemSerie = tipoSemNumeroSerie(material.catalogoChave?.split('|')[0]);
                const quantidadeEntrada = quantidadesRecebidas[chave] ?? '1';
                return <section key={chave} className={estilos.aquisicaoItem}>
                  <div className={estilos.aquisicaoItemTitulo}><strong>{material.nome}</strong><small>Faltam {pendenteEntrada}</small></div>
                  <dl><div><dt>Pedido</dt><dd>{material.quantidadeCompra}</dd></div><div><dt>Recebido</dt><dd>{material.quantidadeEntradaEstoque || 0}</dd></div><div><dt>Falta</dt><dd>{pendenteEntrada}</dd></div></dl>
                  {pendenteEntrada > 0 ? <footer className={estilos.entradaAquisicao}>
                    <p><strong>Registrar uma entrega</strong><span>Pode ser apenas parte do pedido e ter uma nota diferente.</span></p>
                    <label>Quantidade<div className={estilos.campoQuantidadeCompra}><input type="number" inputMode="numeric" min="1" max={pendenteEntrada} step="1" placeholder="0" value={quantidadeEntrada} onChange={(evento) => definirQuantidadesRecebidas((atuais) => ({ ...atuais, [chave]: evento.target.value }))} /><button type="button" onClick={() => definirQuantidadesRecebidas((atuais) => ({ ...atuais, [chave]: String(pendenteEntrada) }))}>Tudo</button></div></label>
                    <label>Nota fiscal<input type="text" maxLength="120" placeholder="Ex.: NF-12345" value={notasFiscaisRecebidas[chave] ?? ''} onChange={(evento) => definirNotasFiscaisRecebidas((atuais) => ({ ...atuais, [chave]: evento.target.value }))} /></label>
                    {!materialSemSerie && <label>Número de série<input type="text" maxLength="120" placeholder="Ex.: SN-123456" value={identificacoesRecebidas[chave] ?? ''} onChange={(evento) => definirIdentificacoesRecebidas((atuais) => ({ ...atuais, [chave]: evento.target.value }))} /></label>}
                    <button onClick={() => registrarAquisicao(solicitacao, material, pendenteEntrada)} disabled={!Number.isInteger(Number(quantidadeEntrada)) || Number(quantidadeEntrada) < 1 || Number(quantidadeEntrada) > pendenteEntrada || !String(notasFiscaisRecebidas[chave] || '').trim() || (!materialSemSerie && !String(identificacoesRecebidas[chave] || '').trim())}><Check /> Registrar entrada</button>
                  </footer> : <div className={estilos.aquisicaoConcluida}><Check /> Compra recebida</div>}
                </section>;
              })}</div>
              <button type="button" className={estilos.exportarSolicitacao} disabled={!possuiPendencia} onClick={() => imprimirListaComprasSolicitacao(solicitacao, itens, buscarObra)}><FileDown /> Lista de compras da solicitação</button>
            </article>;
          }) : <div className={estilos.vazio}><ShoppingCart /><strong>Nenhuma aquisição encontrada</strong><span>As compras solicitadas aparecerão aqui.</span></div>}</div>
        </section>}
      </>}
    </main>
    {equipamentoParaCalibracao && <div className={estilos.temaManutencao}><ModalCalibracaoEquipamento equipamento={equipamentoParaCalibracao} buscarObraPorId={buscarObra} aoFechar={()=>definirEquipamentoParaCalibracao(null)} aoAtualizar={atualizado=>definirEquipamentos(atuais=>atuais.map(e=>e.id===atualizado.id?atualizado:e))}/></div>}
    {editandoAtendimento && <div className={estilos.temaManutencao}><AtendimentoParcialModal solicitacao={editandoAtendimento} obras={obras} aoFechar={() => definirEditandoAtendimento(null)} aoSalvar={ajustarAtendimento} /></div>}
    {equipamentoParaManutencao && <div className={estilos.temaManutencao}><ModalManutencaoEquipamento equipamento={equipamentoParaManutencao} buscarObraPorId={buscarObra} aoFechar={() => definirEquipamentoParaManutencao(null)} aoAtualizar={e => definirEquipamentos(atuais => atuais.map(item => item.id === e.id ? e : item))} /></div>}
  </div>;
}
