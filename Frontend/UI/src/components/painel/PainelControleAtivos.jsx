import { TelaAuditorias } from '../auditorias-tecnico/TelaAuditorias';
import { AuditoriasTecnicoModal } from '../auditorias-tecnico/AuditoriasTecnicoModal';
import { pesquisarSolicitacoes } from '../../utils/pesquisaSolicitacoes';
import { useState } from 'react';
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
import { imprimirRelatorioAuditoriaSolicitacao, imprimirInventarioObra, imprimirRomaneioSeparacao, imprimirHistoricoEquipamento, imprimirHistoricoObra } from '../../services/documentosEquipamentos';
import estilos from '../fibra-track/FibraTrack.module.css';

export function PainelControleAtivos({ temaEscuro: temaControlado, aoAlternarTema, incorporado = false, perfilVisualizado } = {}) {
  const { usuario, podeGerenciarCadastros, encerrarSessao } = useAutenticacao();
  const perfilPainel = perfilVisualizado || usuario.perfil;
  const usuarioPainel = perfilVisualizado ? { ...usuario, perfil: perfilVisualizado } : usuario;
  const podeGerenciarCadastrosNoPainel = podeGerenciarCadastros && !['RH', 'FINANCEIRO'].includes(perfilPainel);
  const ehRh = perfilPainel === 'RH';
  const ehFinanceiro = perfilPainel === 'FINANCEIRO';
  const controleAtivos = useControleAtivos();
  const filtros = useFiltrosPainel(controleAtivos);
  const [telaAtual, definirTelaAtual] = useState(() => perfilPainel === 'FINANCEIRO' ? 'atividades' : 'equipamentos');
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
    if (await controleAtivos.cadastrarObra(novaObra)) definirModalNovaObraAberto(false);
  };
  const cadastrarEquipamento = async (novoEquipamento) => {
    if (await controleAtivos.cadastrarEquipamento(novoEquipamento)) definirModalNovoEquipamentoAberto(false);
  };
  const salvarEdicaoEquipamento = async (dadosAtualizados) => {
    if (await controleAtivos.atualizarEquipamento(equipamentoEmEdicao.id, dadosAtualizados)) definirEquipamentoEmEdicao(null);
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
    if (await controleAtivos.cadastrarFuncionario(novoFuncionario)) definirModalNovoFuncionarioAberto(false);
  };
  const salvarFuncionario = async (funcionario, dadosAtualizados, obrasIds) => {
    const sucesso = await controleAtivos.atualizarFuncionario(funcionario, dadosAtualizados, obrasIds);
    if (sucesso) definirFuncionarioEmEdicao(null);
    return sucesso;
  };
  const selecionarTela = (tela) => {
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
  const totalAtividadesPendentes = controleAtivos.solicitacoes.filter(({ status }) => status === statusDecisao).length;
  const solicitacoesFiltradas = pesquisarSolicitacoes(controleAtivos.solicitacoes, filtros.termoBusca, controleAtivos.buscarObraPorId);
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
    deposito: filtros.equipamentosDoDeposito.length,
  };
  const buscaAtiva = Boolean(filtros.termoBusca.trim());
  const quantidadeResultados = resultadosPorTela[telaAtual];

  return <div className={estilos.root} data-incorporado={incorporado} data-theme={modoEscuro ? 'dark' : 'light'}>
    <MenuLateral aberto={menuLateralAberto} telaAtual={telaAtual} tipoSelecionado={filtros.tipoSelecionado} tiposEquipamento={tiposEquipamentoDisponiveis} obras={controleAtivos.obras} funcionarios={controleAtivos.funcionarios} totalAtividadesPendentes={totalAtividadesPendentes} usuario={usuarioPainel} ocultarVistorias={ehFinanceiro} aoFechar={() => definirMenuLateralAberto(false)} aoSelecionarTela={selecionarTela} aoSelecionarTipo={selecionarTipoNoMenu} aoSelecionarBusca={filtros.definirTermoBusca} estilos={estilos} />
    <button type="button" onClick={() => definirMenuLateralAberto((aberto) => !aberto)} className={`${estilos.sidebarEdgeToggle} ${menuLateralAberto ? estilos.sidebarEdgeToggleOpen : ''}`} aria-expanded={menuLateralAberto} aria-label={menuLateralAberto ? 'Recolher menu lateral' : 'Expandir menu lateral'}>
      {menuLateralAberto ? <ChevronLeft size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.2} />}
    </button>
    <main className={estilos.main}>
      <BarraSuperior telaAtual={telaAtual} recolhida={barraSuperiorRecolhida} modoEscuro={modoEscuro} termoBusca={filtros.termoBusca} resultadoBusca={resultadosPorTela[telaAtual]} ehAdmin={podeGerenciarCadastrosNoPainel} aoSair={encerrarSessao} aoAlternarRecolhimento={() => definirBarraSuperiorRecolhida((recolhida) => !recolhida)} aoAlternarTema={alternarTema} aoBuscar={filtros.definirTermoBusca} aoAbrirNovoEquipamento={() => definirModalNovoEquipamentoAberto(true)} aoAbrirNovaObra={() => definirModalNovaObraAberto(true)} aoAbrirNovoFuncionario={() => definirModalNovoFuncionarioAberto(true)} estilos={estilos} />
      <div className={estilos.content}>
        {controleAtivos.carregandoDados && <div className={estilos.apiFeedback}>Sincronizando dados com a API...</div>}
        {controleAtivos.erroApi && <div className={`${estilos.apiFeedback} ${estilos.apiFeedbackErro}`} role="alert">Falha na comunicação com a API: {controleAtivos.erroApi}</div>}
        {buscaAtiva && <div className={`${estilos.searchFeedback} ${quantidadeResultados === 0 ? estilos.searchFeedbackEmpty : ''}`} role="status" aria-live="polite"><span>Pesquisa por <strong>“{filtros.termoBusca.trim()}”</strong></span><b>{quantidadeResultados} {quantidadeResultados === 1 ? 'resultado encontrado' : 'resultados encontrados'}</b><button type="button" onClick={() => filtros.definirTermoBusca('')}>Limpar pesquisa</button></div>}
        {telaAtual === 'auditorias' && <TelaAuditorias funcionarios={controleAtivos.funcionarios} termoBusca={filtros.termoBusca} aoResultados={definirTotalAuditoriasBusca} />}
        {telaAtual === 'deposito' && <ResumoEquipamentos resumo={controleAtivos.resumoEquipamentos} estilos={estilos} />}
        {telaAtual === 'equipamentos' && <TelaEquipamentos equipamentos={filtros.equipamentosFiltrados} tiposDisponiveis={tiposEquipamentoDisponiveis} buscarObraPorId={controleAtivos.buscarObraPorId} tipoSelecionado={filtros.tipoSelecionado} statusSelecionado={filtros.statusSelecionado} podeEditar={podeGerenciarCadastrosNoPainel} aoSelecionarTipo={filtros.definirTipoSelecionado} aoSelecionarStatus={filtros.definirStatusSelecionado} aoAbrirHistorico={definirEquipamentoComHistoricoAberto} aoImprimirHistorico={imprimirHistoricoDoEquipamento} aoEditar={definirEquipamentoEmEdicao} aoMover={ehFinanceiro ? undefined : definirEquipamentoParaMover} aoManutencao={ehFinanceiro ? undefined : definirEquipamentoParaManutencao} aoCalibracao={ehRh || ehFinanceiro ? undefined : definirEquipamentoParaCalibracao} estilos={estilos} />}
        {telaAtual === 'obras' && <TelaObras obras={filtros.obrasFiltradas} equipamentos={controleAtivos.equipamentos} podeEditarStatus={podeGerenciarCadastrosNoPainel} podeConsultarHistorico={!ehFinanceiro} aoAlterarStatus={controleAtivos.atualizarStatusObra} aoArquivar={controleAtivos.arquivarObra} aoMoverEquipamento={ehFinanceiro ? undefined : definirEquipamentoParaMover} aoImprimirInventario={(obra) => imprimirInventarioObra(obra, controleAtivos.equipamentos, controleAtivos.buscarObraPorId)} aoImprimirHistorico={(obra) => imprimirHistoricoObra(obra, controleAtivos.equipamentos)} estilos={estilos} />}
        {telaAtual === 'funcionarios' && <TelaFuncionarios aoAuditarFuncionario={ehFinanceiro ? undefined : definirTecnicoEmAuditoria} funcionarios={filtros.funcionariosFiltrados} obras={controleAtivos.obras} equipamentos={controleAtivos.equipamentos} podeEditar={podeGerenciarCadastrosNoPainel} aoEditarFuncionario={definirFuncionarioEmEdicao} estilos={estilos} />}
        {telaAtual === 'atividades' && <TelaAtividades obras={controleAtivos.obras} aoSalvarPlano={ehFinanceiro ? controleAtivos.salvarPlanoFinanceiro : undefined} aoNovaSolicitacao={ehFinanceiro ? undefined : () => definirNovaSolicitacaoAberta(true)} erroApi={controleAtivos.erroApi} solicitacoes={solicitacoesFiltradas} todasSolicitacoes={controleAtivos.solicitacoes} tecnicos={controleAtivos.tecnicosCadastrados} termoBusca={filtros.termoBusca} buscarObraPorId={controleAtivos.buscarObraPorId} equipamentos={controleAtivos.equipamentos} statusDecisao={statusDecisao} perfil={perfilPainel} aoAprovar={(identificador) => controleAtivos.definirStatusSolicitacao(identificador, 'Aprovada')} aoRejeitar={(identificador) => controleAtivos.definirStatusSolicitacao(identificador, 'Rejeitada')} aoEditar={definirSolicitacaoEmEdicao} aoExportarAuditoria={ehFinanceiro ? undefined : (solicitacao) => imprimirRelatorioAuditoriaSolicitacao(solicitacao, controleAtivos.buscarObraPorId)} aoExportarRomaneio={(solicitacao) => imprimirRomaneioSeparacao(solicitacao, controleAtivos.buscarObraPorId)} estilos={estilos} />}
        {telaAtual === 'deposito' && <CartaoDeposito equipamentos={filtros.equipamentosDoDeposito} obras={controleAtivos.obras} podeEditar={podeGerenciarCadastrosNoPainel} aoEditar={definirEquipamentoEmEdicao} />}
      </div>
    </main>
    <NavegacaoInferior telaAtual={telaAtual} totalAtividadesPendentes={totalAtividadesPendentes} ocultarVistorias={ehFinanceiro} aoSelecionarTela={selecionarTela} estilos={estilos} />
    {modalNovaObraAberto && <ModalNovaObra tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirModalNovaObraAberto(false)} aoSalvar={cadastrarObra} />}
    {podeGerenciarCadastrosNoPainel && modalNovoEquipamentoAberto && <ModalNovoEquipamento obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis} categoriasDisponiveis={controleAtivos.categoriasEquipamento} aoCriarCategoria={controleAtivos.cadastrarCategoriaEquipamento} aoFechar={() => definirModalNovoEquipamentoAberto(false)} aoSalvar={cadastrarEquipamento} />}
    {podeGerenciarCadastrosNoPainel && equipamentoEmEdicao && <ModalNovoEquipamento equipamento={equipamentoEmEdicao} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis.includes(equipamentoEmEdicao.tipo)?tiposEquipamentoDisponiveis:[equipamentoEmEdicao.tipo,...tiposEquipamentoDisponiveis]} categoriasDisponiveis={controleAtivos.categoriasEquipamento} aoCriarCategoria={controleAtivos.cadastrarCategoriaEquipamento} aoFechar={() => definirEquipamentoEmEdicao(null)} aoSalvar={salvarEdicaoEquipamento} aoArquivar={arquivarEquipamento} />}
    {equipamentoParaCalibracao && <ModalCalibracaoEquipamento equipamento={equipamentoParaCalibracao} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={()=>definirEquipamentoParaCalibracao(null)} aoAtualizar={controleAtivos.receberEquipamentoAtualizado} />}
    {equipamentoParaManutencao && <ModalManutencaoEquipamento equipamento={equipamentoParaManutencao} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={() => definirEquipamentoParaManutencao(null)} aoAtualizar={controleAtivos.receberEquipamentoAtualizado} />}
    {equipamentoParaMover && <ModalMovimentarEquipamento erroApi={controleAtivos.erroApi} equipamento={equipamentoParaMover} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirEquipamentoParaMover(null)} aoSalvar={movimentarEquipamento} />}
    {podeGerenciarCadastrosNoPainel && modalNovoFuncionarioAberto && <ModalNovoFuncionario funcionariosCadastrados={controleAtivos.funcionarios} aoFechar={() => definirModalNovoFuncionarioAberto(false)} aoSalvar={cadastrarFuncionario} />}
    {podeGerenciarCadastrosNoPainel && funcionarioEmEdicao && <ModalEditarFuncionario funcionario={funcionarioEmEdicao} funcionarios={controleAtivos.funcionarios} obras={controleAtivos.obras.filter(({arquivado})=>!arquivado)} aoFechar={() => definirFuncionarioEmEdicao(null)} aoSalvar={salvarFuncionario} aoArquivar={controleAtivos.arquivarFuncionario} />}
    {solicitacaoEmEdicao && <ModalEditarSolicitacao financeiro={ehFinanceiro} obras={controleAtivos.obras} erroApi={controleAtivos.erroApi} solicitacao={solicitacaoEmEdicao} equipamentos={controleAtivos.equipamentos} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirSolicitacaoEmEdicao(null)} aoSalvar={salvarEdicaoSolicitacao} />}
    {novaSolicitacaoAberta && <ModalEditarSolicitacao nova solicitante={usuario.nome} funcionarios={controleAtivos.funcionarios} obras={controleAtivos.obras} erroApi={controleAtivos.erroApi} equipamentos={controleAtivos.equipamentos} aoFechar={() => definirNovaSolicitacaoAberta(false)} aoSalvar={cadastrarSolicitacao} />}
    {tecnicoEmAuditoria && <AuditoriasTecnicoModal funcionario={tecnicoEmAuditoria} aoFechar={() => definirTecnicoEmAuditoria(null)} />}
    <ModalHistoricoEquipamento equipamento={equipamentoComHistoricoAberto} historico={equipamentoComHistoricoAberto ? controleAtivos.consultarHistorico(equipamentoComHistoricoAberto) : []} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={() => definirEquipamentoComHistoricoAberto(null)} aoImprimir={() => imprimirHistoricoDoEquipamento(equipamentoComHistoricoAberto)} estilos={estilos} />
  </div>;
}
