import { useEffect, useState } from 'react';
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
import { ModalNovoFuncionario } from '../novo-funcionario-modal/NovoFuncionarioModal';
import { ModalEditarFuncionario } from '../editar-funcionario-modal/EditarFuncionarioModal';
import { apiCautelas } from '../../services/api/servicoAtivosApi';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { ModalEditarSolicitacao } from '../editar-solicitacao-modal/EditarSolicitacaoModal';
import { useControleAtivos } from '../../hooks/useControleAtivos';
import { useFiltrosPainel } from '../../hooks/useFiltrosPainel';
import { imprimirCautelaEmitida, imprimirCautelaObra, imprimirRomaneioSeparacao, imprimirHistoricoEquipamento, imprimirHistoricoObra } from '../../services/documentosEquipamentos';
import estilos from '../fibra-track/FibraTrack.module.css';

export function PainelControleAtivos({ temaEscuro: temaControlado, aoAlternarTema } = {}) {
  const { ehAdmin, encerrarSessao } = useAutenticacao();
  const controleAtivos = useControleAtivos();
  const filtros = useFiltrosPainel(controleAtivos);
  const [telaAtual, definirTelaAtual] = useState('equipamentos');
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
  const [equipamentoComHistoricoAberto, definirEquipamentoComHistoricoAberto] = useState(null);
  const [solicitacaoEmEdicao, definirSolicitacaoEmEdicao] = useState(null);
  const [cautelas, definirCautelas] = useState([]);
  useEffect(() => { apiCautelas.listar().then(definirCautelas).catch(() => definirCautelas([])); }, [controleAtivos.solicitacoes]);

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
  const excluirEquipamento = async () => {
    const resultado = await controleAtivos.excluirEquipamento(equipamentoEmEdicao.id);
    if (resultado.sucesso) definirEquipamentoEmEdicao(null);
    return resultado;
  };
  const movimentarEquipamento = async (identificador, movimentacao) => {
    if (await controleAtivos.movimentarEquipamento(identificador, movimentacao)) definirEquipamentoParaMover(null);
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
    if (await controleAtivos.editarSolicitacao(identificador, dadosAtualizados)) definirSolicitacaoEmEdicao(null);
  };
  const totalAtividadesPendentes = controleAtivos.solicitacoes.filter(({ status }) => status === 'Pendente').length;
  const termoAtividades = filtros.termoBusca.trim().toLocaleLowerCase('pt-BR');
  const solicitacoesFiltradas = termoAtividades
    ? controleAtivos.solicitacoes.filter((solicitacao) => {
      const origem = solicitacao.obraOrigemId ? controleAtivos.buscarObraPorId(solicitacao.obraOrigemId)?.nome : '';
      const destino = solicitacao.obraDestinoId ? controleAtivos.buscarObraPorId(solicitacao.obraDestinoId)?.nome : '';
      return [solicitacao.solicitante, solicitacao.tecnico, solicitacao.tipo, solicitacao.status, origem, destino, ...solicitacao.materiais.map(({ nome, identificacao }) => `${nome} ${identificacao || ''}`)]
        .join(' ').toLocaleLowerCase('pt-BR').includes(termoAtividades);
    })
    : controleAtivos.solicitacoes;
  const tiposEquipamentoDisponiveis = [...new Set(controleAtivos.equipamentos.map(({ tipo }) => tipo).filter(Boolean))]
    .sort((primeiro, segundo) => primeiro.localeCompare(segundo, 'pt-BR'));
  const resultadosPorTela = {
    equipamentos: filtros.equipamentosFiltrados.length,
    obras: filtros.obrasFiltradas.length,
    funcionarios: filtros.funcionariosFiltrados.length,
    atividades: solicitacoesFiltradas.length,
    deposito: filtros.equipamentosDoDeposito.length,
  };
  const buscaAtiva = Boolean(filtros.termoBusca.trim());
  const quantidadeResultados = resultadosPorTela[telaAtual];

  return <div className={estilos.root} data-theme={modoEscuro ? 'dark' : 'light'}>
    <MenuLateral aberto={menuLateralAberto} telaAtual={telaAtual} tipoSelecionado={filtros.tipoSelecionado} tiposEquipamento={tiposEquipamentoDisponiveis} obras={controleAtivos.obras} funcionarios={controleAtivos.funcionarios} totalAtividadesPendentes={totalAtividadesPendentes} aoFechar={() => definirMenuLateralAberto(false)} aoSelecionarTela={selecionarTela} aoSelecionarTipo={selecionarTipoNoMenu} aoSelecionarBusca={filtros.definirTermoBusca} estilos={estilos} />
    <button type="button" onClick={() => definirMenuLateralAberto((aberto) => !aberto)} className={`${estilos.sidebarEdgeToggle} ${menuLateralAberto ? estilos.sidebarEdgeToggleOpen : ''}`} aria-label={menuLateralAberto ? 'Recolher menu lateral' : 'Expandir menu lateral'}>
      {menuLateralAberto ? <ChevronLeft size={18} strokeWidth={2.2} /> : <ChevronRight size={18} strokeWidth={2.2} />}
    </button>
    <main className={estilos.main}>
      <BarraSuperior telaAtual={telaAtual} recolhida={barraSuperiorRecolhida} modoEscuro={modoEscuro} termoBusca={filtros.termoBusca} resultadoBusca={resultadosPorTela[telaAtual]} ehAdmin={ehAdmin} aoSair={encerrarSessao} aoAlternarRecolhimento={() => definirBarraSuperiorRecolhida((recolhida) => !recolhida)} aoAlternarTema={alternarTema} aoBuscar={filtros.definirTermoBusca} aoAbrirNovoEquipamento={() => definirModalNovoEquipamentoAberto(true)} aoAbrirNovaObra={() => definirModalNovaObraAberto(true)} aoAbrirNovoFuncionario={() => definirModalNovoFuncionarioAberto(true)} estilos={estilos} />
      <div className={estilos.content}>
        {controleAtivos.carregandoDados && <div className={estilos.apiFeedback}>Sincronizando dados com a API...</div>}
        {controleAtivos.erroApi && <div className={`${estilos.apiFeedback} ${estilos.apiFeedbackErro}`} role="alert">Falha na comunicação com a API: {controleAtivos.erroApi}</div>}
        {buscaAtiva && <div className={`${estilos.searchFeedback} ${quantidadeResultados === 0 ? estilos.searchFeedbackEmpty : ''}`} role="status" aria-live="polite"><span>Pesquisa por <strong>“{filtros.termoBusca.trim()}”</strong></span><b>{quantidadeResultados} {quantidadeResultados === 1 ? 'resultado encontrado' : 'resultados encontrados'}</b><button type="button" onClick={() => filtros.definirTermoBusca('')}>Limpar pesquisa</button></div>}
        {telaAtual === 'deposito' && <ResumoEquipamentos resumo={controleAtivos.resumoEquipamentos} estilos={estilos} />}
        {telaAtual === 'equipamentos' && <TelaEquipamentos equipamentos={filtros.equipamentosFiltrados} tiposDisponiveis={tiposEquipamentoDisponiveis} buscarObraPorId={controleAtivos.buscarObraPorId} tipoSelecionado={filtros.tipoSelecionado} statusSelecionado={filtros.statusSelecionado} podeEditar={ehAdmin} aoSelecionarTipo={filtros.definirTipoSelecionado} aoSelecionarStatus={filtros.definirStatusSelecionado} aoAbrirHistorico={definirEquipamentoComHistoricoAberto} aoImprimirHistorico={imprimirHistoricoDoEquipamento} aoEditar={definirEquipamentoEmEdicao} aoMover={definirEquipamentoParaMover} estilos={estilos} />}
        {telaAtual === 'obras' && <TelaObras obras={filtros.obrasFiltradas} equipamentos={controleAtivos.equipamentos} podeEditarStatus={ehAdmin} aoAlterarStatus={controleAtivos.atualizarStatusObra} aoMoverEquipamento={definirEquipamentoParaMover} aoImprimirCautela={(obra) => imprimirCautelaObra(obra, controleAtivos.equipamentos)} aoImprimirHistorico={(obra) => imprimirHistoricoObra(obra, controleAtivos.equipamentos)} estilos={estilos} />}
        {telaAtual === 'funcionarios' && <TelaFuncionarios funcionarios={filtros.funcionariosFiltrados} obras={controleAtivos.obras} equipamentos={controleAtivos.equipamentos} podeEditar={ehAdmin} aoEditarFuncionario={definirFuncionarioEmEdicao} estilos={estilos} />}
        {telaAtual === 'atividades' && <TelaAtividades solicitacoes={solicitacoesFiltradas} cautelas={cautelas} buscarObraPorId={controleAtivos.buscarObraPorId} aoAprovar={(identificador) => controleAtivos.definirStatusSolicitacao(identificador, 'Aprovada')} aoRejeitar={(identificador) => controleAtivos.definirStatusSolicitacao(identificador, 'Rejeitada')} aoIniciarTransito={(identificador) => controleAtivos.avancarMovimentacao(identificador, 'transito')} aoConcluir={(identificador) => controleAtivos.avancarMovimentacao(identificador, 'concluir')} aoEditar={definirSolicitacaoEmEdicao} aoExportarRomaneio={(solicitacao) => imprimirRomaneioSeparacao(solicitacao, controleAtivos.buscarObraPorId)} aoExportarCautela={imprimirCautelaEmitida} estilos={estilos} />}
        {telaAtual === 'deposito' && <CartaoDeposito equipamentos={filtros.equipamentosDoDeposito} obras={controleAtivos.obras} podeEditar={ehAdmin} aoEditar={definirEquipamentoEmEdicao} />}
      </div>
    </main>
    <NavegacaoInferior telaAtual={telaAtual} totalAtividadesPendentes={totalAtividadesPendentes} aoSelecionarTela={selecionarTela} estilos={estilos} />
    {modalNovaObraAberto && <ModalNovaObra tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirModalNovaObraAberto(false)} aoSalvar={cadastrarObra} />}
    {modalNovoEquipamentoAberto && <ModalNovoEquipamento obras={controleAtivos.obras} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis} aoFechar={() => definirModalNovoEquipamentoAberto(false)} aoSalvar={cadastrarEquipamento} />}
    {equipamentoEmEdicao && <ModalNovoEquipamento equipamento={equipamentoEmEdicao} obras={controleAtivos.obras} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} seriesCadastradas={controleAtivos.equipamentos.map(({ serie }) => serie)} tiposDisponiveis={tiposEquipamentoDisponiveis} aoFechar={() => definirEquipamentoEmEdicao(null)} aoSalvar={salvarEdicaoEquipamento} aoExcluir={excluirEquipamento} />}
    {equipamentoParaMover && <ModalMovimentarEquipamento equipamento={equipamentoParaMover} obras={controleAtivos.obras} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirEquipamentoParaMover(null)} aoSalvar={movimentarEquipamento} />}
    {modalNovoFuncionarioAberto && <ModalNovoFuncionario funcionariosCadastrados={controleAtivos.funcionarios} aoFechar={() => definirModalNovoFuncionarioAberto(false)} aoSalvar={cadastrarFuncionario} />}
    {funcionarioEmEdicao && <ModalEditarFuncionario funcionario={funcionarioEmEdicao} funcionarios={controleAtivos.funcionarios} obras={controleAtivos.obras} aoFechar={() => definirFuncionarioEmEdicao(null)} aoSalvar={salvarFuncionario} />}
    {solicitacaoEmEdicao && <ModalEditarSolicitacao solicitacao={solicitacaoEmEdicao} obras={controleAtivos.obras} equipamentos={controleAtivos.equipamentos} tecnicosCadastrados={controleAtivos.tecnicosCadastrados} aoFechar={() => definirSolicitacaoEmEdicao(null)} aoSalvar={salvarEdicaoSolicitacao} />}
    <ModalHistoricoEquipamento equipamento={equipamentoComHistoricoAberto} historico={equipamentoComHistoricoAberto ? controleAtivos.consultarHistorico(equipamentoComHistoricoAberto) : []} buscarObraPorId={controleAtivos.buscarObraPorId} aoFechar={() => definirEquipamentoComHistoricoAberto(null)} aoImprimir={() => imprimirHistoricoDoEquipamento(equipamentoComHistoricoAberto)} estilos={estilos} />
  </div>;
}
