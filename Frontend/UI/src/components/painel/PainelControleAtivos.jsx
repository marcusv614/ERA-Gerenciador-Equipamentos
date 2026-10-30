import { ContextoEscopoAuditoria } from '../../contexto/ContextoEscopoAuditoria';
import { TelaAuditorias } from '../auditorias-tecnico/TelaAuditorias';
import { AuditoriasTecnicoModal } from '../auditorias-tecnico/AuditoriasTecnicoModal';
import { pesquisarSolicitacoes } from '../../utils/pesquisaSolicitacoes';
import { pesquisarPedidosFinanceiros } from '../../utils/pedidosFinanceiros';
import { pedidosDoPerfil } from '../../utils/acompanhamentoSolicitacao';
import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BarraSuperior } from './BarraSuperior';
import { MenuLateral } from './MenuLateral';
import { NavegacaoInferior } from './NavegacaoInferior';
import { ModalHistoricoEquipamento } from './ModalHistoricoEquipamento';
import { ResumoEquipamentos } from './ResumoEquipamentos';
import { TelaEquipamentos } from './TelaEquipamentos';
import { TelaObras } from './TelaObras';
import { TelaFuncionarios } from './TelaFuncionarios';
import { TelaAtividades } from './TelaAtividades';
import { CartaoDeposito } from '../deposito-card/DepositoCard';
import { ModalNovaObra } from '../nova-obra-modal/NovaObraModal';
import { ModalNovoEquipamento } from '../novo-equip-modal/NovoEquipModal';
import { ModalMovimentarEquipamento } from '../mover-equip-modal/MoverEquipModal';
import { ModalCalibracaoEquipamento } from '../calibracao-equip-modal/CalibracaoEquipModal';
import { ModalManutencaoEquipamento } from '../manutencao-equip-modal/ManutencaoEquipModal';
import { ModalNovoFuncionario } from '../novo-funcionario-modal/NovoFuncionarioModal';
import { ModalEditarFuncionario } from '../editar-funcionario-modal/EditarFuncionarioModal';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { ModalEditarSolicitacao } from '../editar-solicitacao-modal/EditarSolicitacaoModal';
import { useControleAtivos } from '../../hooks/useControleAtivos';
import { useFiltrosPainel } from '../../hooks/useFiltrosPainel';
import { imprimirPedidosFinanceiros, imprimirRelatorioAuditoriaSolicitacao, imprimirInventarioObra, imprimirRomaneioSeparacao, imprimirHistoricoEquipamento, imprimirHistoricoObra } from '../../services/documentosEquipamentos';
import estilos from '../fibra-track/FibraTrack.module.css';

export function PainelControleAtivos({ temaEscuro: temaControlado, aoAlternarTema, incorporado = false, perfilVisualizado } = {}) {
  const { usuario, podeGerenciarCadastros, encerrarSessao } = useAutenticacao();
  const perfilPainel = perfilVisualizado || usuario.perfil;
  const usuarioPainel = perfilVisualizado ? { ...usuario, perfil: perfilVisualizado } : usuario;
  const podeGerenciarCadastrosNoPainel = podeGerenciarCadastros && !['RH', 'FINANCEIRO'].includes(perfilPainel);
  const ehRh = perfilPainel === 'RH';
  const ehFinanceiro = perfilPainel === 'FINANCEIRO';
  const ehResumo = ehFinanceiro || ehRh;
  const controleAtivos = useControleAtivos(perfilPainel);
  const filtros = useFiltrosPainel(controleAtivos);
  const conteudo = useRef(null);
  const [telaAtual, definirTelaAtual] = useState(() => ['FINANCEIRO','RH'].includes(perfilPainel) ? 'atividades' : 'equipamentos');
  useLayoutEffect(() => {
    conteudo.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [telaAtual]);
  const [menuLateralAberto, definirMenuLateralAberto] = useState(() => !window.matchMedia?.('(max-width: 768px)').matches);
  const [temaLocalEscuro, definirTemaLocalEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('era-tema-gerente');
    return temaSalvo ? temaSalvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const modoEscuro = temaControlado ?? temaLocalEscuro;
  const alternarTema = () => {
    if (aoAlternarTema) {
      aoAlternarTema();
      return;
    }
    definirTemaLocalEscuro((escuro) => {
      const novoTema = !escuro;
      localStorage.setItem('era-tema-gerente', novoTema ? 'escuro' : 'claro');
      return novoTema;
    });
  };
  const [barraSuperiorRecolhida, definirBarraSuperiorRecolhida] = useState(false);
  const [modalNovaObraAberto, definirModalNovaObraAberto] = useState(false);
  const [modalNovoEquipamentoAberto, definirModalNovoEquipamentoAberto] = useState(false);
  const [modalNovoFuncionarioAberto, definirModalNovoFuncionarioAberto] = useState(false);
  const [funcionarioEmEdicao, definirFuncionarioEmEdicao] = useState(null);
  const [equipamentoEmEdicao, definirEquipamentoEmEdicao] = useState(null);
  const [equipamentoParaMover, definirEquipamentoParaMover] = useState(null);
  const [equipamentoParaManutencao, definirEquipamentoParaManutencao] = useState(null);
  const [equipamentoParaCalibracao, definirEquipamentoParaCalibracao] = useState(null);
  const [equipamentoComHistoricoAberto, definirEquipamentoComHistoricoAberto] = useState(null);
  const [solicitacaoEmEdicao, definirSolicitacaoEmEdicao] = useState(null);
  const [novaSolicitacaoAberta, definirNovaSolicitacaoAberta] = useState(false);
  const [tecnicoEmAuditoria, definirTecnicoEmAuditoria] = useState(null);
  const [totalAuditoriasBusca, definirTotalAuditoriasBusca] = useState(0);
  const cadastrarSolicitacao = async (dados) => {
    const sucesso = await controleAtivos.cadastrarSolicitacao(dados);
    if (sucesso) { definirNovaSolicitacaoAberta(false); filtros.definirTermoBusca(''); }
    return sucesso;
  };
  const imprimirHistoricoDoEquipamento = (equipamento) => imprimirHistoricoEquipamento(equipamento, controleAtivos.consultarHistorico(equipamento), controleAtivos.buscarObraPorId);
  const cadastrarObra = async (novaObra) => {
    const sucesso = await controleAtivos.cadastrarObra(novaObra);
    if (sucesso) definirModalNovaObraAberto(false);
    return sucesso;
  };
  const cadastrarEquipamento = async (novoEquipamento) => {
    const sucesso = await controleAtivos.cadastrarEquipamento(novoEquipamento);
    if (sucesso) definirModalNovoEquipamentoAberto(false);
    return sucesso;
  };
  const salvarEdicaoEquipamento = async (dadosAtualizados) => {
    const sucesso = await controleAtivos.atualizarEquipamento(equipamentoEmEdicao.id, dadosAtualizados);
    if (sucesso) definirEquipamentoEmEdicao(null);
    return sucesso;
  };
  const arquivarEquipamento = async (arquivado) => {
    const resultado = await controleAtivos.arquivarEquipamento(equipamentoEmEdicao.id,arquivado);
    if (resultado.sucesso) definirEquipamentoEmEdicao(null);
    return resultado;
  };
  const movimentarEquipamento = async (identificador, movimentacao) => {
    const sucesso = await controleAtivos.movimentarEquipamento(identificador, movimentacao);
    if (sucesso) definirEquipamentoParaMover(null);
    return sucesso;
  };
  const cadastrarFuncionario = async (novoFuncionario) => {
    const sucesso = await controleAtivos.cadastrarFuncionario(novoFuncionario);
    if (sucesso) definirModalNovoFuncionarioAberto(false);
    return sucesso;
  };
  const salvarFuncionario = async (funcionario, dadosAtualizados, obrasIds) => {
    const sucesso = await controleAtivos.atualizarFuncionario(funcionario, dadosAtualizados, obrasIds);
    if (sucesso) definirFuncionarioEmEdicao(null);
    return sucesso;
  };
  const selecionarTela = (tela) => {
    if(ehFinanceiro && tela === 'equipamentos')return;
    definirTelaAtual(tela);
    filtros.definirTermoBusca('');
    if (window.matchMedia?.('(max-width: 768px)').matches) definirMenuLateralAberto(false);
    if (tela === 'equipamentos') {
      filtros.definirTipoSelecionado('Todos');
      filtros.definirStatusSelecionado('Todos');
    }
  };
  const selecionarTipoNoMenu = (tipo) => {
    selecionarTela('equipamentos');
    filtros.definirTipoSelecionado(tipo);
  };
  const salvarEdicaoSolicitacao = async (identificador, dadosAtualizados) => {
    const sucesso = await controleAtivos.editarSolicitacao(identificador, dadosAtualizados);
    if (sucesso) definirSolicitacaoEmEdicao(null);
    return sucesso;
  };
  const statusDecisao = ehFinanceiro ? 'Aguardando financeiro' : 'Pendente';
  const equipamentosParaSolicitacao = controleAtivos.equipamentos.filter(e=>perfilPainel!=='GERENTE'||!['epi','segurança, epi e acesso'].includes(String(e.tipo).trim().toLocaleLowerCase('pt-BR')));
  const solicitacoesDoPerfil = pedidosDoPerfil(controleAtivos.solicitacoes, perfilPainel);
  const totalAtividadesPendentes = solicitacoesDoPerfil.filter(({ status }) => status === statusDecisao).length;
  const solicitacoesFiltradas = ehResumo ? pesquisarPedidosFinanceiros(solicitacoesDoPerfil,filtros.termoBusca,controleAtivos.buscarObraPorId) : pesquisarSolicitacoes(solicitacoesDoPerfil, filtros.termoBusca, controleAtivos.buscarObraPorId);
  const exportarPedidosFinanceiros=(pedidos,titulo)=>imprimirPedidosFinanceiros(pedidos,controleAtivos.buscarObraPorId,titulo);
  const verPedidosFinanceiros=(termo)=>{selecionarTela('atividades');filtros.definirTermoBusca(termo);};
  const nomesCategoriasCadastradas = controleAtivos.categoriasEquipamento.filter(({ nome }) => !ehRh || ['EPI', 'Segurança, EPI e acesso'].includes(nome)).map(({ nome }) => nome);
  const categoriasHistoricas = controleAtivos.equipamentos
    .filter(({ arquivado }) => !arquivado)
    .map(({ tipo }) => tipo)
    .filter((tipo) => tipo && !nomesCategoriasCadastradas.includes(tipo))
    .sort((primeiro, segundo) => primeiro.localeCompare(segundo, 'pt-BR'));
  const tiposEquipamentoDisponiveis = [...nomesCategoriasCadastradas, ...new Set(categoriasHistoricas)];
  const resultadosPorTela = {
    equipamentos: filtros.equipamentosFiltrados.length,
    obras: filtros.obrasFiltradas.length,
    funcionarios: filtros.funcionariosFiltrados.length,
    atividades: solicitacoesFiltradas.length,
    auditorias: totalAuditoriasBusca,
    deposito: ehFinanceiro ? solicitacoesFiltradas.filter(p=>p.obraDestinoId==null).length : filtros.equipamentosDoDeposito.length,
  };
  const buscaAtiva = Boolean(filtros.termoBusca.trim());
  const quantidadeResultados = resultadosPorTela[telaAtual];

  return <ContextoEscopoAuditoria.Provider value={perfilPainel}><div className={estilos.root} data-incorporado={incorporado} data-financeiro={ehResumo} data-theme={modoEscuro ? 'dark' : 'light'}>
    <MenuLateral aberto={menuLateralAberto} telaAtual={telaAtual} tipoSelecionado={filtros.tipoSelecionado} tiposEquipamento={tiposEquipamentoDisponiveis} obras={controleAtivos.obras} funcionarios={controleAtivos.funcionarios} totalAtividadesPendentes={totalAtividadesPendentes} usuario={usuarioPainel} ocultarVistorias={ehResumo} ocultarEquipamentos={ehResumo} aoFechar={() => definirMenuLateralAberto(false)} aoSelecionarTela={selecionarTela} aoSelecionarTipo={selecionarTipoNoMenu} aoSelecionarBusca={filtros.definirTermoBusca} estilos={estilos} />
    <button type="button" onClick={() => definirMenuLateralAberto((aberto) => !aberto)} className={`${estilos.sidebarEdgeToggle} ${menuLateralAberto ? estilos.sidebarEdgeToggleOpen : ''}`} aria-expanded={menuLateralAberto} aria-label={menuLateralAberto ? 'Recolher menu lateral' : 'Expandir menu lateral'}>
      {menuLateralAberto ? <ChevronLeft size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.2} />}
    </button>
    <main className={estilos.main}>
      <BarraSuperior aoVerPedidos={(id)=>verPedidosFinanceiros(`#${id}`)} financeiro={ehResumo} mostrarNotificacoes={!incorporado} telaAtual={telaAtual} recolhida={barraSuperiorRecolhida} modoEscuro={modoEscuro} termoBusca={filtros.termoBusca} resultadoBusca={resultadosPorTela[telaAtual]} ehAdmin={podeGerenciarCadastrosNoPainel} aoSair={encerrarSessao} aoAlternarRecolhimento={() => definirBarraSuperiorRecolhida((recolhida) => !recolhida)} aoAlternarTema={alternarTema} aoBuscar={filtros.definirTermoBusca} aoAbrirNovoEquipamento={() => definirModalNovoEquipamentoAberto(true)} aoAbrirNovaObra={() => definirModalNovaObraAberto(true)} aoAbrirNovoFuncionario={() => definirModalNovoFuncionarioAberto(true)} estilos={estilos} />
      <div ref={conteudo} className={estilos.content}>
        {controleAtivos.carregandoDados && <div className={estilos.apiFeedback}>Sincronizando dados com a API...</div>}
        {controleAtivos.erroApi && <div className={`${estilos.apiFeedback} ${estilos.apiFeedbackErro}`} role="alert">Falha na comunicação com a API: {controleAtivos.erroApi}</div>}
        {buscaAtiva && <div className={`${estilos.searchFeedback} ${quantidadeResultados === 0 ? estilos.searchFeedbackEmpty : ''}`} role="status" aria-live="polite"><span>Pesquisa por <strong>“{filtros.termoBusca.trim()}”</strong></span><b>{quantidadeResultados} {quantidadeResultados === 1 ? 'resultado encontrado' : 'resultados encontrados'}</b><button type="button" onClick={() => filtros.definirTermoBusca('')}>Limpar pesquisa</button></div>}
        {!ehResumo && telaAtual === 'auditorias' && <TelaAuditorias funcionarios={controleAtivos.funcionarios} termoBusca={filtros.termoBusca} aoResultados={definirTotalAuditoriasBusca} />}
        {!ehResumo && telaAtual === 'equipamentos' && <ResumoEquipamentos resumo={controleAtivos.resumoEquipamentos} estilos={estilos} />}
        {!ehResumo && telaAtual === 'equipamentos' && <TelaEquipamentos equipamentos={filtros.equipamentosFiltrados} tiposDisponiveis={tiposEquipamentoDisponiveis} buscarObraPorId={controleAtivos.buscarObraPorId} tipoSelecionado={filtros.tipoSelecionado} statusSelecionado={filtros.statusSelecionado} podeEditar={podeGerenciarCadastrosNoPainel} aoSelecionarTipo={filtros.definirTipoSelecionado} aoSelecionarStatus={filtros.definirStatusSelecionado} aoAbrirHistorico={definirEquipamentoComHistoricoAberto} aoImprimirHistorico={imprimirHistoricoDoEquipamento} aoEditar={definirEquipamentoEmEdicao} aoMover={ehFinanceiro ? undefined : definirEquipamentoParaMover} aoManutencao={ehFinanceiro ? undefined : definirEquipamentoParaManutencao} aoCalibracao={ehRh || ehFinanceiro ? undefined : definirEquipamentoParaCalibracao} estilos={estilos} />}
        {telaAtual === 'obras' && <TelaObras pedidosFinanceiros={ehResumo?controleAtivos.solicitacoes:undefined} aoExportarPedidos={exportarPedidosFinanceiros} aoVerPedidos={verPedidosFinanceiros} obras={filtros.obrasFiltradas} equipamentos={controleAtivos.equipamentos} podeEditarStatus={podeGerenciarCadastrosNoPainel} podeConsultarHistorico={!ehResumo} aoAlterarStatus={controleAtivos.atualizarStatusObra} aoArquivar={controleAtivos.arquivarObra} aoMoverEquipamento={ehFinanceiro ? undefined : definirEquipamentoParaMover} aoImprimirInventario={(obra) => imprimirInventarioObra(obra, controleAtivos.equipamentos, controleAtivos.buscarObraPorId)} aoImprimirHistorico={(obra) => imprimirHistoricoObra(obra, controleAtivos.equipamentos)} estilos={estilos} />}
        {telaAtual === 'funcionarios' && <TelaFuncionarios pedidosFinanceiros={ehResumo?controleAtivos.solicitacoes:undefined} aoExportarPedidos={exportarPedidosFinanceiros} aoVerPedidos={verPedidosFinanceiros} aoAuditarFuncionario={ehResumo ? undefined : definirTecnicoEmAuditoria} funcionarios={filtros.funcionariosFiltrados} obras={controleAtivos.obras} equipamentos={controleAtivos.equipamentos} podeEditar={podeGerenciarCadastrosNoPainel} aoEditarFuncionario={definirFuncionarioEmEdicao} estilos={estilos} />}
        {(telaAtual === 'atividades' || (ehResumo && telaAtual === 'deposito')) && <TelaAtividades aoExportarPedidos={ehResumo?exportarPedidosFinanceiros:undefined} obras={controleAtivos.obras} aoSalvarPlano={ehFinanceiro ? controleAtivos.salvarPlanoFinanceiro : undefined} aoNovaSolicitacao={ehResumo ? undefined : () => definirNovaSolicitacaoAberta(true)} erroApi={controleAtivos.erroApi} solicitacoes={telaAtual==='deposito'?solicitacoesFiltradas.filter(p=>p.obraDestinoId==null):solicitacoesFiltradas} todasSolicitacoes={telaAtual==='deposito'?solicitacoesDoPerfil.filter(p=>p.obraDestinoId==null):solicitacoesDoPerfil} tecnicos={controleAtivos.tecnicosCadastrados} termoBusca={filtros.termoBusca} buscarObraPorId={controleAtivos.buscarObraPorId} equipamentos={controleAtivos.equipamentos} statusDecisao={statusDecisao} perfil={perfilPainel} aoAprovar={(identificador) => controleAtivos.definirStatusSolicitacao(identificador, 'Aprovada')} aoRejeitar={(identificador, motivo) => controleAtivos.definirStatusSolicitacao(identificador, 'Rejeitada', motivo)} aoEditar={definirSolicitacaoEmEdicao} aoExportarAuditoria={ehResumo ? (pedido)=>exportarPedidosFinanceiros([pedido]) : (solicitacao) => imprimirRelatorioAuditoriaSolicitacao(solicitacao, controleAtivos.buscarObraPorId)} aoExportarRomaneio={(solicitacao) => imprimirRomaneioSeparacao(solicitacao, controleAtivos.buscarObraPorId)} estilos={estilos} />}
        {!ehResumo && telaAtual === 'deposito' && <CartaoDeposito equipamentos={filtros.equipamentosDoDeposito} obras={controleAtivos.obras} podeEditar={podeGerenciarCadastrosNoPainel} aoEditar={definirEquipamentoEmEdicao} />}
      </div>
    </main>
    <NavegacaoInferior telaAtual={telaAtual} totalAtividadesPendentes={totalAtividadesPendentes} ocultarVistorias={ehResumo} ocultarEquipamentos={ehResumo} aoSelecionarTela={selecionarTela} estilos={estilos} />
    {modalNovaObraAberto && <ModalNovaObra erroApi={controleAtivos.erroApi} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirModalNovaObraAberto(false)} aoSalvar={cadastrarObra} />}
    {podeGerenciarCadastrosNoPainel && modalNovoEquipamentoAberto && <ModalNovoEquipamento erroApi={controleAtivos.erroApi} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis} categoriasDisponiveis={controleAtivos.categoriasEquipamento} aoCriarCategoria={controleAtivos.cadastrarCategoriaEquipamento} aoFechar={() => definirModalNovoEquipamentoAberto(false)} aoSalvar={cadastrarEquipamento} />}
    {podeGerenciarCadastrosNoPainel && equipamentoEmEdicao && <ModalNovoEquipamento erroApi={controleAtivos.erroApi} equipamento={equipamentoEmEdicao} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis.includes(equipamentoEmEdicao.tipo)?tiposEquipamentoDisponiveis:[equipamentoEmEdicao.tipo,...tiposEquipamentoDisponiveis]} categoriasDisponiveis={controleAtivos.categoriasEquipamento} aoCriarCategoria={controleAtivos.cadastrarCategoriaEquipamento} aoFechar={() => definirEquipamentoEmEdicao(null)} aoSalvar={salvarEdicaoEquipamento} aoArquivar={arquivarEquipamento} />}
    {equipamentoParaCalibracao && <ModalCalibracaoEquipamento equipamento={equipamentoParaCalibracao} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={()=>definirEquipamentoParaCalibracao(null)} aoAtualizar={controleAtivos.receberEquipamentoAtualizado} />}
    {equipamentoParaManutencao && <ModalManutencaoEquipamento equipamento={equipamentoParaManutencao} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={() => definirEquipamentoParaManutencao(null)} aoAtualizar={controleAtivos.receberEquipamentoAtualizado} />}
    {equipamentoParaMover && <ModalMovimentarEquipamento erroApi={controleAtivos.erroApi} equipamento={equipamentoParaMover} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirEquipamentoParaMover(null)} aoSalvar={movimentarEquipamento} />}
    {podeGerenciarCadastrosNoPainel && modalNovoFuncionarioAberto && <ModalNovoFuncionario erroApi={controleAtivos.erroApi} funcionariosCadastrados={controleAtivos.funcionarios} aoFechar={() => definirModalNovoFuncionarioAberto(false)} aoSalvar={cadastrarFuncionario} />}
    {podeGerenciarCadastrosNoPainel && funcionarioEmEdicao && <ModalEditarFuncionario funcionario={funcionarioEmEdicao} funcionarios={controleAtivos.funcionarios} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} aoFechar={() => definirFuncionarioEmEdicao(null)} aoSalvar={salvarFuncionario} aoArquivar={controleAtivos.arquivarFuncionario} />}
    {solicitacaoEmEdicao && <ModalEditarSolicitacao financeiro={ehFinanceiro} obras={controleAtivos.obras} erroApi={controleAtivos.erroApi} solicitacao={solicitacaoEmEdicao} equipamentos={equipamentosParaSolicitacao} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirSolicitacaoEmEdicao(null)} aoSalvar={salvarEdicaoSolicitacao} />}
    {novaSolicitacaoAberta && <ModalEditarSolicitacao nova solicitante={usuario.nome} funcionarios={controleAtivos.funcionarios} obras={controleAtivos.obras} erroApi={controleAtivos.erroApi} equipamentos={equipamentosParaSolicitacao} aoFechar={() => definirNovaSolicitacaoAberta(false)} aoSalvar={cadastrarSolicitacao} />}
    {tecnicoEmAuditoria && <AuditoriasTecnicoModal funcionario={tecnicoEmAuditoria} aoFechar={() => definirTecnicoEmAuditoria(null)} />}
    <ModalHistoricoEquipamento equipamento={equipamentoComHistoricoAberto} historico={equipamentoComHistoricoAberto ? controleAtivos.consultarHistorico(equipamentoComHistoricoAberto) : []} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={() => definirEquipamentoComHistoricoAberto(null)} aoImprimir={() => imprimirHistoricoDoEquipamento(equipamentoComHistoricoAberto)} estilos={estilos} />
  </div></ContextoEscopoAuditoria.Provider>;
}
