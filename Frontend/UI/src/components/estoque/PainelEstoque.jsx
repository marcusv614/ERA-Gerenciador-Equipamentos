import { useEffect, useMemo, useState } from 'react';
import { Box, Building2, CalendarDays, Check, ChevronRight, ClipboardList, FileDown, FileText, LogOut, Moon, PackageCheck, PackagePlus, Search, ShoppingCart, Sun, Truck, Warehouse, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiCautelas, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { imprimirCautelaEmitida, imprimirRomaneioSeparacao, imprimirRelatorioAuditoriaSolicitacao } from '../../services/documentosEquipamentos';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelEstoque.module.css';
import { SepararEquipamentosModal } from './SepararEquipamentosModal';

const possuiSeries = (solicitacao) => solicitacao.materiais.every(({ identificacao }) => identificacao);
const formatarDataHora = (valor) => valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export function PainelEstoque() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [cautelas, definirCautelas] = useState([]);
  const [carregando, definirCarregando] = useState(true);
  const [mensagem, definirMensagem] = useState(null);
  const [configurando, definirConfigurando] = useState(null);
  const [busca, definirBusca] = useState('');
  const [obraFiltrada, definirObraFiltrada] = useState('todas');
  const [aba, definirAba] = useState('atividades');
  const [quantidadesRecebidas, definirQuantidadesRecebidas] = useState({});
  const [temaEscuro, definirTemaEscuro] = useState(() => localStorage.getItem('era-tema-estoque') === 'escuro');

  useEffect(() => {
    let ativo = true;
    Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiAtividades.listar(), apiCautelas.listar()])
      .then(([obrasRecebidas, equipamentosRecebidos, solicitacoesRecebidas, cautelasRecebidas]) => {
        if (!ativo) return;
        definirObras(obrasRecebidas); definirEquipamentos(equipamentosRecebidos); definirSolicitacoes(solicitacoesRecebidas); definirCautelas(cautelasRecebidas);
      })
      .catch((erro) => { if (ativo) definirMensagem({ tipo: 'erro', texto: erro.message }); })
      .finally(() => { if (ativo) definirCarregando(false); });
    return () => { ativo = false; };
  }, []);
  const buscarObra = (id) => obras.find((obra) => String(obra.id) === String(id));
  const nomeLocal = (id) => id == null || id === 'deposito' ? 'Depósito central' : buscarObra(id)?.nome || 'Obra';
  const pendencias = useMemo(() => solicitacoes.filter(({ status }) => ['Aprovada', 'Aguardando coleta', 'Em trânsito'].includes(status)), [solicitacoes]);
  const concluidas = useMemo(() => solicitacoes.filter(({ status }) => ['Concluída', 'Rejeitada'].includes(status)), [solicitacoes]);
  const correspondeAosFiltros = (solicitacao) => {
    const obraId = solicitacao.obraDestinoId || solicitacao.obraOrigemId;
    if (obraFiltrada !== 'todas' && String(obraId) !== obraFiltrada) return false;
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    if (!termo) return true;
    const data = solicitacao.dataSolicitacao ? new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR') : '';
    return [solicitacao.id, solicitacao.tecnico, solicitacao.solicitante, solicitacao.status, nomeLocal(obraId), data, ...solicitacao.materiais.flatMap(({ nome, identificacao }) => [nome, identificacao])].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(termo);
  };
  const pendenciasFiltradas = pendencias.filter(correspondeAosFiltros);
  const concluidasFiltradas = concluidas.filter(correspondeAosFiltros);
  const aquisicoes = useMemo(() => solicitacoes.flatMap((solicitacao) => solicitacao.materiais
    .filter((material) => material.quantidadeCompra > 0)
    .map((material) => ({ solicitacao, material, pendente: Math.max(0, material.quantidadeCompra - (material.quantidadeAdquirida || 0)) }))), [solicitacoes]);
  const aquisicoesFiltradas = aquisicoes.filter(({ solicitacao, material }) => {
    const obraId = solicitacao.obraDestinoId || solicitacao.obraOrigemId;
    if (obraFiltrada !== 'todas' && String(obraId) !== obraFiltrada) return false;
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return !termo || [solicitacao.id, solicitacao.tecnico, material.nome, nomeLocal(obraId)].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR').includes(termo);
  });
  const agruparPorObra = (lista) => Object.entries(lista.reduce((grupos, solicitacao) => { const obraId = solicitacao.obraDestinoId || solicitacao.obraOrigemId; const chave = String(obraId || 'deposito'); (grupos[chave] ||= []).push(solicitacao); return grupos; }, {})).sort(([obraA], [obraB]) => nomeLocal(obraA).localeCompare(nomeLocal(obraB), 'pt-BR'));

  const alternarTema = () => definirTemaEscuro((atual) => { localStorage.setItem('era-tema-estoque', atual ? 'claro' : 'escuro'); return !atual; });
  const abrirConfiguracao = (solicitacao) => definirConfigurando(solicitacao);

  const solicitarCompra = async (material, faltante) => {
    if (!faltante) return;
    try {
      const atualizada = await apiAtividades.solicitarCompra(configurando.id, material.id, faltante);
      definirConfigurando(atualizada);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      definirMensagem({ tipo: 'sucesso', texto: `Compra de ${faltante} unidade(s) de ${material.nome} registrada.` });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const salvarAtendimento = async (atendimentos) => {
    try {
      const atualizadas = await apiAtividades.distribuir(configurando.id, atendimentos);
      definirSolicitacoes((atuais) => [...atuais.filter((item) => item.id !== configurando.id), ...atualizadas]); definirConfigurando(null); definirMensagem({ tipo: 'sucesso', texto: atualizadas.length > 1 ? `Equipamentos reservados em ${atualizadas.length} rotas de origem.` : 'Equipamentos reservados. A cautela já pode ser gerada.' });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); throw erro; }
  };

  const registrarAquisicao = async (solicitacao, material, pendente) => {
    const chave = `${solicitacao.id}-${material.id}`;
    const quantidade = Number(quantidadesRecebidas[chave] || pendente);
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > pendente) {
      definirMensagem({ tipo: 'erro', texto: `Informe uma quantidade entre 1 e ${pendente}.` }); return;
    }
    try {
      const atualizada = await apiAtividades.registrarAquisicao(solicitacao.id, material.id, quantidade);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      definirQuantidadesRecebidas((atuais) => { const novas = { ...atuais }; delete novas[chave]; return novas; });
      definirMensagem({ tipo: 'sucesso', texto: `${quantidade} unidade(s) de ${material.nome} registrada(s) como adquirida(s).` });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const avancar = async (solicitacao, acao) => {
    try { const atualizada = acao === 'enviar' ? await apiAtividades.iniciarTransito(solicitacao.id) : await apiAtividades.concluir(solicitacao.id); definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item)); const [equipamentosAtualizados,cautelasAtualizadas]=await Promise.all([apiEquipamentos.listar(),apiCautelas.listar()]);definirEquipamentos(equipamentosAtualizados);definirCautelas(cautelasAtualizadas); definirMensagem({ tipo: 'sucesso', texto: acao === 'enviar' ? 'Envio registrado como em trânsito.' : 'Retorno confirmado no estoque.' }); }
    catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const renderizarCard = (solicitacao) => {
    const entradaNaObra = Boolean(solicitacao.obraDestinoId);
    const cautelasDaSolicitacao = cautelas.filter(({ solicitacaoId }) => solicitacaoId === solicitacao.id);
    return <article className={estilos.card} key={solicitacao.id}>
      <header><span className={estilos.icone}><PackageCheck /></span><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><h2>{entradaNaObra ? 'Envio para obra' : 'Retirada da obra'}</h2></div><b data-status={solicitacao.status}>{solicitacao.status}</b></header>
      <div className={estilos.rota}><span>{entradaNaObra ? nomeLocal(solicitacao.obraOrigemId) : nomeLocal(solicitacao.obraOrigemId)}</span><ChevronRight /><span>{entradaNaObra ? nomeLocal(solicitacao.obraDestinoId) : 'Depósito central'}</span></div>
      <div className={estilos.metadados}><p>Solicitado por <strong>{solicitacao.tecnico}</strong></p><time dateTime={solicitacao.dataSolicitacao}><CalendarDays /> {new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR')}{solicitacao.dataDecisao && ` · decisão ${new Date(`${solicitacao.dataDecisao}T12:00:00`).toLocaleDateString('pt-BR')}`}</time></div>
      <ul>{solicitacao.materiais.map((material) => <li key={material.id}>
        <span>{material.quantidade}×</span>
        <div className={estilos.detalhesMaterial}>
          <strong>{material.nome}</strong>
          {material.identificacao && <small>Série {material.identificacao}</small>}
          {material.quantidadeCompra > 0 && <div className={estilos.compraAnexada}>
            <ShoppingCart aria-hidden="true" />
            <span><b>Compra solicitada: {material.quantidadeCompra} unidade(s)</b>{material.compraSolicitadaEm && <small>Registrada em {formatarDataHora(material.compraSolicitadaEm)}</small>}</span>
          </div>}
        </div>
      </li>)}</ul>
      <footer>
        <button onClick={() => imprimirRelatorioAuditoriaSolicitacao(solicitacao, buscarObra)}><FileText /> Relatório PDF</button>
        {solicitacao.status === 'Aprovada' && possuiSeries(solicitacao) && <button onClick={() => imprimirRomaneioSeparacao(solicitacao, buscarObra)}><FileDown /> Romaneio da separação</button>}
        {cautelasDaSolicitacao.map((cautela) => <button key={cautela.id} onClick={() => imprimirCautelaEmitida(cautela)}><FileDown /> Cautela</button>)}
        {solicitacao.status === 'Aprovada' && !possuiSeries(solicitacao) && <button className={estilos.primario} onClick={() => abrirConfiguracao(solicitacao)}><Box /> Definir equipamentos</button>}
        {solicitacao.status === 'Aprovada' && possuiSeries(solicitacao) && <button className={estilos.primario} onClick={() => avancar(solicitacao, 'enviar')}><Truck /> Confirmar envio</button>}
        {solicitacao.status === 'Aguardando coleta' && <button className={estilos.primario} onClick={() => avancar(solicitacao, 'enviar')}><Truck /> Confirmar retirada</button>}
        {solicitacao.status === 'Em trânsito' && !entradaNaObra && <button className={estilos.primario} onClick={() => avancar(solicitacao, 'receber')}><Warehouse /> Confirmar no estoque</button>}
        {solicitacao.status === 'Em trânsito' && entradaNaObra && <span className={estilos.aviso}>Aguardando recebimento na obra.</span>}
      </footer>
    </article>;
  };

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'}>
    <header className={estilos.cabecalho}><div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>Estoque</span></div><div className={estilos.usuario}><div><small>Operação de materiais</small><strong>{usuario.nome}</strong></div><button onClick={alternarTema} aria-label="Alternar tema">{temaEscuro ? <Sun /> : <Moon />}</button><button onClick={encerrarSessao} aria-label="Sair"><LogOut /></button></div></header>
    <main className={estilos.conteudo}><section className={estilos.titulo}><div><span><Warehouse /> Central de estoque</span><h1>Movimentações</h1><p>Prepare envios, acompanhe aquisições e consulte registros para auditoria.</p></div><aside><strong>{pendencias.length}</strong><small>ações pendentes</small></aside></section>
      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}{mensagem.texto}<button onClick={() => definirMensagem(null)}><X /></button></div>}
      <nav className={estilos.abas} aria-label="Áreas do estoque">
        <button className={aba === 'atividades' ? estilos.abaAtiva : ''} onClick={() => definirAba('atividades')}><Truck /> Atividades <b>{pendencias.length}</b></button>
        <button className={aba === 'registros' ? estilos.abaAtiva : ''} onClick={() => definirAba('registros')}><ClipboardList /> Registros <b>{concluidas.length}</b></button>
        <button className={aba === 'aquisicoes' ? estilos.abaAtiva : ''} onClick={() => definirAba('aquisicoes')}><ShoppingCart /> Aquisição de materiais <b>{aquisicoes.filter(({ pendente }) => pendente > 0).length}</b></button>
      </nav>
      {!carregando && <section className={estilos.filtros} aria-label="Pesquisa de movimentações"><label><Search /><input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar número, técnico, material, série ou data..." /></label><label><Building2 /><select value={obraFiltrada} onChange={(evento) => definirObraFiltrada(evento.target.value)}><option value="todas">Todas as obras</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label></section>}
      {carregando ? <div className={estilos.carregando}>Carregando estoque...</div> : <>
        {aba === 'atividades' && <section className={estilos.secao}><div className={estilos.tituloSecao}><Truck /><div><h2>Atividades</h2><p>Tarefas do estoque organizadas pela obra atendida.</p></div></div>{pendenciasFiltradas.length ? agruparPorObra(pendenciasFiltradas).map(([obraId, itens]) => <div className={estilos.grupoObra} key={obraId}><header><Building2 /><div><strong>{nomeLocal(obraId)}</strong><small>{itens.length} {itens.length === 1 ? 'movimentação' : 'movimentações'}</small></div></header><div className={estilos.grade}>{itens.map(renderizarCard)}</div></div>) : <div className={estilos.vazio}><Check /><strong>Nenhuma atividade</strong><span>Não há tarefas correspondentes aos filtros.</span></div>}</section>}
        {aba === 'registros' && <section className={estilos.secao}><div className={estilos.tituloSecao}><ClipboardList /><div><h2>Registros</h2><p>Histórico permanente de movimentações concluídas ou rejeitadas.</p></div></div>{concluidasFiltradas.length ? agruparPorObra(concluidasFiltradas).map(([obraId, itens]) => <div className={estilos.grupoObra} key={obraId}><header><Building2 /><div><strong>{nomeLocal(obraId)}</strong><small>{itens.length} registros</small></div></header><div className={estilos.grade}>{itens.map(renderizarCard)}</div></div>) : <div className={estilos.vazio}><ClipboardList /><strong>Nenhum registro encontrado</strong><span>Altere a pesquisa ou o filtro de obra.</span></div>}</section>}
        {aba === 'aquisicoes' && <section className={estilos.secao}><div className={estilos.tituloSecao}><PackagePlus /><div><h2>Aquisição de materiais</h2><p>Itens solicitados para compra, vinculados às obras e solicitações de origem.</p></div></div><div className={estilos.gradeAquisicoes}>{aquisicoesFiltradas.length ? aquisicoesFiltradas.map(({ solicitacao, material, pendente }) => { const chave = `${solicitacao.id}-${material.id}`; return <article className={estilos.aquisicao} key={chave} data-concluida={!pendente}>
          <header><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><h3>{material.nome}</h3></div><b>{pendente ? 'Pendente' : 'Adquirido'}</b></header>
          <p><Building2 /> {nomeLocal(solicitacao.obraDestinoId || solicitacao.obraOrigemId)}</p>
          <dl><div><dt>Solicitado</dt><dd>{material.quantidadeCompra}</dd></div><div><dt>Adquirido</dt><dd>{material.quantidadeAdquirida || 0}</dd></div><div><dt>Faltante</dt><dd>{pendente}</dd></div></dl>
          <small>Compra registrada em {formatarDataHora(material.compraSolicitadaEm)}</small>
          {pendente > 0 ? <footer><label>Quantidade recebida<input type="number" min="1" max={pendente} value={quantidadesRecebidas[chave] ?? pendente} onChange={(evento) => definirQuantidadesRecebidas((atuais) => ({ ...atuais, [chave]: evento.target.value }))} /></label><button onClick={() => registrarAquisicao(solicitacao, material, pendente)}><Check /> Registrar aquisição</button></footer> : <div className={estilos.aquisicaoConcluida}><Check /> Aquisição concluída em {formatarDataHora(material.adquiridaEm)}</div>}
        </article>; }) : <div className={estilos.vazio}><ShoppingCart /><strong>Nenhuma aquisição encontrada</strong><span>As compras solicitadas aparecerão aqui.</span></div>}</div></section>}
      </>}
    </main>
    {configurando && <SepararEquipamentosModal solicitacao={configurando} obras={obras} equipamentos={equipamentos} aoFechar={() => definirConfigurando(null)} aoConfirmar={salvarAtendimento} aoSolicitarCompra={solicitarCompra} />}
  </div>;
}
