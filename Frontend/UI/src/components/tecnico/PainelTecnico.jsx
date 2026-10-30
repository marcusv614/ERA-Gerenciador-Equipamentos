import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Box, Building2, Check, ChevronRight, ClipboardList, Clock3, LogOut, MapPin, Minus, Moon, PackageCheck, Plus, Search, Send, Sun, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { obterDataAtual } from '../../utils/datas';
import logoEra from '../../assets/ERALTDA.png';
import { CancelamentoPedido } from '../painel/CancelamentoPedido';
import estilos from './PainelTecnico.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { obterEtapaSolicitacao } from '../../utils/statusSolicitacao';
import { IndicadorCalibracao } from '../calibracao-equip-modal/IndicadorCalibracao';
import { SinoNotificacoes } from '../notificacoes/SinoNotificacoes';
import { QuantidadeMaterialTecnico } from './QuantidadeMaterialTecnico';
import { PedidosTecnicoCampo } from './CartaoSolicitacaoTecnico';
import { ConfirmarRecebimentoTecnico } from './ConfirmarRecebimentoTecnico';
import { erroQuantidadeTecnicoCampo } from '../../utils/quantidadeTecnicoCampo';
import campo from './TecnicoCampo.module.css';

const identificadorLocal = (equipamento) => String(equipamento.id);
const localizacaoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const normalizarChave = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
const chaveMaterial = (equipamento) => equipamento.catalogoChave || [equipamento.tipo, equipamento.modelo, equipamento.medida].map(normalizarChave).join('|');
const tipoEpi = (tipo) => ['epi', 'segurança, epi e acesso'].includes(String(tipo || '').trim().toLocaleLowerCase('pt-BR'));
const filtrarPorEscopo = (lista, ehTst) => lista.filter((item) => ehTst ? tipoEpi(item.tipo) : !tipoEpi(item.tipo));
const agruparEquipamentos = (lista, prefixo = 'material') => Object.values(lista.reduce((grupos, equipamento) => {
  const chave = chaveMaterial(equipamento);
  if (!grupos[chave]) grupos[chave] = {
    ...equipamento,
    id: `${prefixo}-${chave}`,
    serie: null,
    quantidade: 0,
    quantidadeDisponivel: 0,
    quantidadeReservada: 0,
    registros: [],
  };
  grupos[chave].quantidade += equipamento.quantidade || 1;
  grupos[chave].quantidadeDisponivel += equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1;
  grupos[chave].quantidadeReservada += equipamento.quantidadeReservada || 0;
  grupos[chave].registros.push(equipamento);
  return grupos;
}, {})).sort((a, b) => a.modelo.localeCompare(b.modelo, 'pt-BR'));
const agruparMateriaisPedido = (materiais) => Object.values(materiais.reduce((grupos, material) => {
  const chave = material.catalogoChave || normalizarChave(material.nome);
  if (!grupos[chave]) grupos[chave] = { chave, nome: material.nome, quantidade: 0 };
  grupos[chave].quantidade += material.quantidade || 0;
  return grupos;
}, {}));
const rotuloStatus = (solicitacao) => ({
  'Aguardando financeiro': 'Em análise financeira',
  Aprovada: 'Aceita',
  Concluída: 'Finalizada',
}[solicitacao.status] || solicitacao.status || 'Atualizando');
const descricaoStatus = (solicitacao, ehTst = false) => ({
  Pendente: `Aguarde o ${ehTst ? 'RH' : 'gerente'}.`,
  'Aguardando financeiro': 'A primeira análise foi aprovada. Aguarde o Financeiro.',
  Aprovada: 'O estoque está preparando.',
  'Aguardando coleta': 'O estoque está preparando.',
  'Em trânsito': solicitacao.obraDestinoId ? 'Recebeu? Confirme abaixo.' : 'O estoque está recebendo.',
  Concluída: 'Finalizado.',
  Rejeitada: 'Não aprovado.',
}[solicitacao.status] || 'Acompanhe a atualização deste pedido.');
const formatarDataSolicitacao = (valor) => {
  if (!valor) return 'Data não informada';
  const data = new Date(`${valor}T12:00:00`);
  return Number.isNaN(data.getTime()) ? 'Data não informada' : data.toLocaleDateString('pt-BR');
};
const iconeEtapa = (status) => {
  const etapa = obterEtapaSolicitacao(status).chave;
  if (etapa === 'pendente') return <Clock3 />;
  if (etapa === 'rejeitada') return <X />;
  if (etapa === 'aceita') return <PackageCheck />;
  return <Check />;
};

export function PainelTecnico({ modoAdministrador = false, perfilVisualizado, temaEscuro: temaControlado, aoAlternarTema } = {}) {
  const { usuario, encerrarSessao } = useAutenticacao();
  const perfilPainel = perfilVisualizado || usuario.perfil;
  const ehTst = perfilPainel === 'TST';
  const ehTecnicoCampo = usuario.perfil === 'TECNICO' && perfilPainel === 'TECNICO' && !modoAdministrador;
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [catalogoMateriais, definirCatalogoMateriais] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [origem, definirOrigem] = useState('');
  const [destino, definirDestino] = useState('');
  const [busca, definirBusca] = useState('');
  const [itens, definirItens] = useState([]);
  const [quantidadesEmEdicao, definirQuantidadesEmEdicao] = useState({});
  const [observacao, definirObservacao] = useState('');
  const [aba, definirAba] = useState(modoAdministrador ? 'acompanhar' : 'solicitar');
  const [pedidoParaAbrir, definirPedidoParaAbrir] = useState(null);
  const pedidoFocado = useRef(null);
  const [carregando, definirCarregando] = useState(true);
  const [enviando, definirEnviando] = useState(false);
  const [confirmandoRecebimentoId, definirConfirmandoRecebimentoId] = useState(null);
  const [recebimentoSelecionadoId, definirRecebimentoSelecionadoId] = useState(null);
  const recebimentoEmAndamento = useRef(false);
  const envioEmAndamento = useRef(false);
  const [tentativaCarga, definirTentativaCarga] = useState(0);
  const pedidoRecebimento = ehTecnicoCampo ? solicitacoes.find(pedido => pedido.id === recebimentoSelecionadoId) : null;
  const [mensagem, definirMensagem] = useState(null);
  const [operacao, definirOperacao] = useState('');
  const [etapaMovimentacao, definirEtapaMovimentacao] = useState(1);
  const [mostrarObservacao, definirMostrarObservacao] = useState(false);
  const pedidoEmAndamento = aba === 'solicitar' && etapaMovimentacao > 1;
  useEffect(() => {
    if (aba === 'solicitar') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [aba, etapaMovimentacao]);
  useEffect(() => {
    if (aba !== 'acompanhar' || carregando || !pedidoParaAbrir || pedidoFocado.current === pedidoParaAbrir) return;
    const cartao = document.getElementById(`pedido-tecnico-${pedidoParaAbrir.id}`);
    if (cartao) { cartao.scrollIntoView({ block: 'start', behavior: 'instant' }); cartao.focus({ preventScroll: true }); pedidoFocado.current = pedidoParaAbrir; }
  }, [aba, carregando, pedidoParaAbrir, solicitacoes]);
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
    Promise.allSettled([apiObras.listar(), apiEquipamentos.listar(), apiEquipamentos.listarCatalogo(), apiAtividades.listar()])
      .then(([resultadoObras, resultadoEquipamentos, resultadoCatalogo, resultadoSolicitacoes]) => {
        if (!componenteAtivo) return;
        if (resultadoObras.status === 'fulfilled') definirObras(resultadoObras.value);
        if (resultadoEquipamentos.status === 'fulfilled') definirEquipamentos(filtrarPorEscopo(resultadoEquipamentos.value, ehTst));
        if (resultadoCatalogo.status === 'fulfilled') definirCatalogoMateriais(filtrarPorEscopo(resultadoCatalogo.value, ehTst));
        if (resultadoSolicitacoes.status === 'fulfilled') definirSolicitacoes(resultadoSolicitacoes.value);
        const falha = [resultadoObras, resultadoEquipamentos, resultadoCatalogo, resultadoSolicitacoes]
          .find((resultado) => resultado.status === 'rejected');
        if (falha) definirMensagem({ tipo: 'erro', texto: falha.reason?.message || 'Não foi possível carregar todos os dados.' });
      })
      .finally(() => { if (componenteAtivo) definirCarregando(false); });
    return () => { componenteAtivo = false; };
  }, [ehTst, usuario.nome, tentativaCarga]);

  useEffect(() => {
    let componenteAtivo = true;
    const atualizarMovimentacoes = async () => {
      const [resultadoSolicitacoes, resultadoEquipamentos, resultadoObras, resultadoCatalogo] = await Promise.allSettled([
        apiAtividades.listar(), apiEquipamentos.listar(), apiObras.listar(), apiEquipamentos.listarCatalogo(),
      ]);
      if (!componenteAtivo) return;
      if (resultadoSolicitacoes.status === 'fulfilled') definirSolicitacoes(resultadoSolicitacoes.value);
      if (resultadoEquipamentos.status === 'fulfilled') definirEquipamentos(filtrarPorEscopo(resultadoEquipamentos.value, ehTst));
      if (resultadoObras.status === 'fulfilled') definirObras(resultadoObras.value);
      if (resultadoCatalogo.status === 'fulfilled') definirCatalogoMateriais(filtrarPorEscopo(resultadoCatalogo.value, ehTst));
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
  }, [ehTst]);

  const obrasAtivas = useMemo(() => obras.filter(({ status, arquivado }) => !arquivado && status !== 'Concluída'), [obras]);
  const equipamentosDaOrigem = useMemo(() => agruparEquipamentos(equipamentos.filter((equipamento) => {
    if (!origem || localizacaoEquipamento(equipamento) !== origem) return false;
    const texto = normalizarChave(`${equipamento.modelo} ${equipamento.tipo} ${equipamento.serie} ${equipamento.medida || ''}`);
    return texto.includes(normalizarChave(busca)) && (equipamento.quantidadeDisponivel ?? 1) > 0;
  }), `obra-${origem}`), [equipamentos, origem, busca]);
  const materiaisDoCatalogo = useMemo(() => catalogoMateriais.filter((material) => {
    const texto = normalizarChave(`${material.modelo} ${material.tipo} ${material.medida || ''}`);
    return texto.includes(normalizarChave(busca));
  }).map((material) => ({ ...material, id: `catalogo-${material.tipo}-${material.modelo}-${material.medida || 'sem-medida'}`, serie: null })), [catalogoMateriais, busca]);
  const materiaisParaSelecionar = operacao === 'receber' ? materiaisDoCatalogo : equipamentosDaOrigem;

  const nomeLocal = (valor) => valor === 'deposito' ? 'Depósito central' : obras.find(({ id }) => String(id) === String(valor))?.nome || 'Selecione';
  const pendentes = solicitacoes.filter(({ status }) => ['Pendente', 'Aguardando financeiro'].includes(status)).length;
  const recebimentosPendentes = solicitacoes.filter(({ status, obraDestinoId }) => status === 'Em trânsito' && obraDestinoId).length;
  const quantidadeTotal = itens.reduce((total, item) => total + item.quantidade, 0);
  const quantidadeEmEdicaoInvalida = Object.entries(quantidadesEmEdicao).some(([id, valor]) => {
    const item = itens.find((atual) => atual.id === id);
    if (!item || !/^\d+$/.test(valor)) return true;
    const quantidade = Number(valor);
    const limite = operacao === 'receber' ? 2147483647 : (item.equipamento.quantidadeDisponivel ?? 1);
    if (ehTecnicoCampo) return Boolean(erroQuantidadeTecnicoCampo(valor, limite));
    return quantidade < 1 || quantidade > limite;
  });
  const podeEnviar = ((operacao === 'receber' && destino) || (operacao === 'devolver' && origem)) && itens.length > 0 && !quantidadeEmEdicaoInvalida && !enviando;
  const obrasComMateriais = obras.filter(({ arquivado }) => !arquivado).map((obra) => ({
    obra,
    materiais: agruparEquipamentos(equipamentos.filter(({ obraId }) => String(obraId) === String(obra.id)), `obra-${obra.id}`),
  }));
  const limparQuantidadeEmEdicao = (id) => definirQuantidadesEmEdicao((atuais) => {
    if (!Object.prototype.hasOwnProperty.call(atuais, id)) return atuais;
    const proximas = { ...atuais };
    delete proximas[id];
    return proximas;
  });
  const adicionarItem = (equipamento) => {
    const id = identificadorLocal(equipamento);
    limparQuantidadeEmEdicao(id);
    definirItens((atuais) => {
      if (atuais.some((item) => item.id === id)) return atuais;
      return [...atuais, { id, equipamento, quantidade: 1 }];
    });
  };

  const definirQuantidade = (id, valor) => definirItens((atuais) => atuais.map((item) => {
    if (item.id !== id) return item;
    const quantidade = Number(valor);
    const limite = operacao === 'receber' ? 2147483647 : (item.equipamento.quantidadeDisponivel ?? 1);
    return Number.isInteger(quantidade) && quantidade > 0 && quantidade <= limite ? { ...item, quantidade } : item;
  }));
  const editarQuantidade = (id, valor, limite) => {
    const valorNumerico = valor.replace(/\D/g, '');
    definirQuantidadesEmEdicao((atuais) => ({ ...atuais, [id]: valorNumerico }));
    if (!valorNumerico) return;
    const quantidade = Number(valorNumerico);
    if (quantidade >= 1 && quantidade <= limite) definirQuantidade(id, quantidade);
  };
  const editarQuantidadeCampo = (equipamento, valor, limite) => {
    const id = identificadorLocal(equipamento);
    definirQuantidadesEmEdicao(atuais => ({ ...atuais, [id]: valor }));
    if (erroQuantidadeTecnicoCampo(valor, limite)) return;
    const quantidade = Number(valor);
    definirItens(atuais => atuais.some(item => item.id === id)
      ? atuais.map(item => item.id === id ? { ...item, quantidade } : item)
      : [...atuais, { id, equipamento, quantidade }]);
  };
  const erroQuantidadeCampo = (id, limite) => Object.prototype.hasOwnProperty.call(quantidadesEmEdicao, id)
    ? erroQuantidadeTecnicoCampo(quantidadesEmEdicao[id], limite) : '';
  const valorQuantidade = (id, quantidade) => Object.prototype.hasOwnProperty.call(quantidadesEmEdicao, id)
    ? quantidadesEmEdicao[id]
    : String(quantidade);
  const removerItem = (id) => {
    limparQuantidadeEmEdicao(id);
    definirItens((atuais) => atuais.filter((item) => item.id !== id));
  };
  const ajustarQuantidade = (id, quantidade) => {
    limparQuantidadeEmEdicao(id);
    if (quantidade < 1) removerItem(id);
    else definirQuantidade(id, quantidade);
  };

  const trocarOrigem = (valor) => {
    definirOrigem(valor);
    definirItens([]);
    definirQuantidadesEmEdicao({});
    if (valor === destino) definirDestino('');
  };
  const selecionarOperacao = (novaOperacao) => {
    definirOperacao(novaOperacao); definirItens([]); definirQuantidadesEmEdicao({}); definirBusca(''); definirObservacao(''); definirMostrarObservacao(false);
    if (novaOperacao === 'receber') { definirOrigem('deposito'); definirDestino(''); }
    else if (novaOperacao === 'devolver') { definirOrigem(''); definirDestino('deposito'); }
    definirEtapaMovimentacao(2);
  };
  const confirmarRecebimento = async (solicitacao) => {
    if (confirmandoRecebimentoId !== null || (ehTecnicoCampo && recebimentoEmAndamento.current)) return;
    if (ehTecnicoCampo && (solicitacao.status !== 'Em trânsito' || !solicitacao.obraDestinoId)) return;
    if (ehTecnicoCampo) recebimentoEmAndamento.current = true;
    definirConfirmandoRecebimentoId(solicitacao.id);
    definirMensagem(null);
    try {
      const atualizada = await apiAtividades.concluir(solicitacao.id);
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item));
      if (ehTecnicoCampo) {
        definirRecebimentoSelecionadoId(null);
        definirPedidoParaAbrir({ id: atualizada.id });
      }
      apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
    finally { recebimentoEmAndamento.current = false; definirConfirmandoRecebimentoId(null); }
  };

  const enviarSolicitacao = async () => {
    if (!podeEnviar || (ehTecnicoCampo && envioEmAndamento.current)) return;
    if (ehTecnicoCampo) envioEmAndamento.current = true;
    definirEnviando(true);
    definirMensagem(null);
    try {
      const materiais = itens.flatMap(({ equipamento, quantidade }) => {
        if (operacao === 'receber') return [{ nome: equipamento.modelo, quantidade, identificacao: null, catalogoChave: equipamento.catalogoChave || null }];
        let restante = quantidade;
        return (equipamento.registros || [equipamento]).flatMap((registro) => {
          if (restante <= 0) return [];
          const quantidadeRegistro = Math.min(restante, registro.quantidadeDisponivel ?? registro.quantidade ?? 1);
          restante -= quantidadeRegistro;
          return quantidadeRegistro > 0 ? [{ nome: registro.modelo, quantidade: quantidadeRegistro, identificacao: registro.serie, catalogoChave: registro.catalogoChave || equipamento.catalogoChave || null }] : [];
        });
      });
      const criada = await apiAtividades.cadastrar({
        solicitante: usuario.nome,
        tecnico: usuario.nome,
        obraOrigemId: operacao === 'devolver' ? Number(origem) : null,
        obraDestinoId: operacao === 'receber' ? Number(destino) : null,
        dataSolicitacao: obterDataAtual(),
        observacao: observacao.trim() || null,
        materiais,
      });
      definirSolicitacoes((atuais) => [criada, ...atuais]);
      definirPedidoParaAbrir({ id: criada.id });
      apiEquipamentos.listar().then(definirEquipamentos).catch(() => {});
      definirItens([]); definirQuantidadesEmEdicao({}); definirObservacao(''); definirBusca(''); definirOperacao(''); definirEtapaMovimentacao(1); definirMostrarObservacao(false);

      definirAba('acompanhar');
    } catch (erro) {
      definirMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      envioEmAndamento.current = false;
      definirEnviando(false);
    }
  };

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'} data-administrador={modoAdministrador} data-tecnico-campo={ehTecnicoCampo}>
    {!modoAdministrador && <header className={estilos.cabecalho}>
      <div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>{ehTecnicoCampo ? 'Técnico de Campo' : 'campo'}</span></div>
      <div className={estilos.usuario}>
        <div><small>Olá, {ehTst ? 'TST' : ehTecnicoCampo ? 'Técnico de Campo' : 'técnico'}</small><strong>{usuario.nome}</strong></div>
        <SinoNotificacoes temaEscuro={temaEscuro} aoVerPedidos={(id) => { definirAba('acompanhar'); definirPedidoParaAbrir({ id }); }} />
        <button type="button" className={estilos.botaoTema} onClick={alternarTema} aria-label={temaEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={temaEscuro ? 'Tema claro' : 'Tema escuro'}>{temaEscuro ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button type="button" onClick={encerrarSessao} aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={19} /></button>
      </div>
    </header>}

    <main className={estilos.conteudo}>
      <section className={`${estilos.introducao} ${pedidoEmAndamento ? estilos.introducaoCompacta : ''}`}>
        <div><span className={estilos.selo}>ERA · {ehTst ? 'Segurança do trabalho' : ehTecnicoCampo ? 'Técnico de Campo' : 'Equipe de campo'}</span><h1>{modoAdministrador ? `Pedidos do ${ehTst ? 'TST' : 'técnico'}` : aba === 'materiais' ? 'Materiais nas obras' : aba === 'acompanhar' ? 'Meus pedidos' : pedidoEmAndamento ? etapaMovimentacao === 4 ? 'Revisar pedido' : operacao === 'devolver' ? 'Devolver materiais' : 'Novo pedido' : 'Vamos fazer seu pedido?'}</h1></div>
        {!modoAdministrador && !pedidoEmAndamento && recebimentosPendentes > 0 && <button type="button" onClick={() => definirAba('acompanhar')}><PackageCheck /><span><strong>{recebimentosPendentes} para confirmar</strong><small>{ehTecnicoCampo ? 'Conferir recebimento' : 'Material entregue'}</small></span><ChevronRight /></button>}
      </section>
      <nav className={estilos.abas} aria-label={`Navegação do ${ehTst ? 'TST' : ehTecnicoCampo ? 'Técnico de Campo' : 'técnico'}`}>
        {!modoAdministrador && <button type="button" className={aba === 'solicitar' ? estilos.abaAtiva : ''} aria-current={aba === 'solicitar' ? 'page' : undefined} onClick={() => definirAba('solicitar')}><ArrowRight /><span><strong>Novo pedido</strong></span></button>}
        <button type="button" className={aba === 'materiais' ? estilos.abaAtiva : ''} aria-current={aba === 'materiais' ? 'page' : undefined} onClick={() => definirAba('materiais')}><Box /><span><strong>Materiais</strong></span></button>
        <button type="button" className={aba === 'acompanhar' ? estilos.abaAtiva : ''} aria-current={aba === 'acompanhar' ? 'page' : undefined} onClick={() => definirAba('acompanhar')}><ClipboardList /><span><strong>Meus pedidos</strong></span>{pendentes + recebimentosPendentes > 0 && <b>{pendentes + recebimentosPendentes}</b>}</button>
      </nav>

      {mensagem && !(ehTecnicoCampo && pedidoRecebimento) && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`} role={mensagem.tipo === 'erro' ? 'alert' : 'status'}><span>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}</span>{mensagem.texto}{ehTecnicoCampo && mensagem.tipo === 'erro' && !enviando && <button type="button" className={campo.tentarNovamente} onClick={() => { definirCarregando(true); definirMensagem(null); definirTentativaCarga(atual => atual + 1); }}>Atualizar dados</button>}<button type="button" aria-label="Fechar mensagem" onClick={() => definirMensagem(null)}><X size={16} /></button></div>}
      {carregando && <div className={estilos.carregando} role="status" aria-live="polite"><i /><span>Sincronizando o campo...</span></div>}

      {!carregando && aba === 'solicitar' && <div className={`${estilos.gradePrincipal} ${etapaMovimentacao === 4 ? estilos.gradeRevisao : ''}`}>
        <ol className={estilos.progresso} aria-label="Etapas do pedido">{['Pedido', 'Obra', 'Materiais', 'Revisão'].map((rotulo, indice) => <li key={rotulo} aria-current={etapaMovimentacao === indice + 1 ? 'step' : undefined} data-concluida={etapaMovimentacao > indice + 1}><span>{etapaMovimentacao > indice + 1 ? <Check size={14} /> : indice + 1}</span>{rotulo}</li>)}</ol>
        {etapaMovimentacao < 4 && <section className={estilos.formulario}>
          {etapaMovimentacao === 1 && <div className={estilos.operacoes}>{obrasAtivas.length ? <><button type="button" onClick={() => selecionarOperacao('receber')}><PackageCheck /><span><strong>Pedir {ehTst ? 'EPI' : 'material'}</strong><small>Receber na obra</small></span><ChevronRight /></button><button type="button" onClick={() => selecionarOperacao('devolver')}><Box /><span><strong>Devolver {ehTst ? 'EPI' : 'material'}</strong><small>Retirar da obra</small></span><ChevronRight /></button></> : <div className={estilos.semObraSimples}><Building2 /><strong>Nenhuma obra atribuída</strong><span>Peça ao {ehTst ? 'RH' : 'gerente'} para vincular uma obra ao seu usuário.</span></div>}</div>}
          {etapaMovimentacao === 2 && <div className={estilos.escolhaObra}><span className={estilos.selo}>Escolha sua obra</span><h2>{operacao === 'receber' ? 'Destino do material:' : 'De onde o material deve ser retirado?'}</h2><div className={estilos.listaObrasEscolha}>{obrasAtivas.map((obra) => {
            const selecionada = String(obra.id) === (operacao === 'receber' ? destino : origem);
            return <button type="button" key={obra.id} className={selecionada ? estilos.obraSelecionada : ''} aria-pressed={selecionada} onClick={() => { if (operacao === 'receber') definirDestino(String(obra.id)); else trocarOrigem(String(obra.id)); }}><Building2 /><span><strong>{obra.nome}</strong><small>{obra.cidade}</small></span>{selecionada ? <Check /> : <ChevronRight />}</button>;
          })}</div><div className={estilos.acoesEtapa}><button type="button" onClick={() => definirEtapaMovimentacao(1)}>Voltar</button><button type="button" disabled={operacao === 'receber' ? !destino : !origem} onClick={() => definirEtapaMovimentacao(3)}>Continuar <ChevronRight /></button></div></div>}

          {etapaMovimentacao === 3 && <><div className={estilos.tituloSimples}><h2>{operacao === 'receber' ? 'O que você precisa?' : 'O que deve ser retirado?'}</h2><p><MapPin size={15} />{nomeLocal(operacao === 'receber' ? destino : origem)}<button type="button" onClick={() => definirEtapaMovimentacao(2)}>Alterar obra</button></p></div><div className={estilos.busca}><Search size={19} /><input type="search" aria-label="Buscar material" value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar material" /></div>
            <div className={estilos.listaMateriais}>{materiaisParaSelecionar.length ? materiaisParaSelecionar.map((equipamento) => {
              const id = identificadorLocal(equipamento);
              const quantidade = itens.find((item) => item.id === id)?.quantidade || 0;
              const selecionado = quantidade > 0;
              const limite = operacao === 'receber' ? 2147483647 : (equipamento.quantidadeDisponivel ?? 1);
              const alternarSelecao = () => selecionado ? removerItem(id) : adicionarItem(equipamento);
              return <div key={equipamento.id} className={`${estilos.material} ${selecionado ? estilos.materialSelecionado : ''}`} onClick={(evento) => {
                if (!window.matchMedia?.('(max-width: 640px)').matches || evento.target.closest('button, input, [data-controle-quantidade]')) return;
                alternarSelecao();
              }}>
                <button type="button" className={estilos.selecionarMaterial} aria-pressed={selecionado} aria-label={`${selecionado ? 'Desmarcar' : 'Selecionar'} ${equipamento.modelo}`} onClick={alternarSelecao}>
                <span className={estilos.iconeMaterial}>{selecionado ? <Check /> : <Box />}</span><span className={estilos.dadosMaterial}><strong>{equipamento.modelo}</strong><small>{equipamento.tipo}{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : equipamento.medida ? ` · ${equipamento.medida}` : ''}</small>{ehTecnicoCampo && selecionado && <span className={campo.selecionado}><Check size={14} aria-hidden="true" />Selecionado</span>}</span>{operacao === 'devolver' && <span className={estilos.disponivel}><b>{equipamento.quantidadeDisponivel ?? 1}</b><small>na obra</small></span>}
                </button>
                {ehTecnicoCampo ? <QuantidadeMaterialTecnico nome={equipamento.modelo} quantidade={quantidade} valor={valorQuantidade(id, quantidade)} limite={limite} erro={erroQuantidadeCampo(id, limite)}
                  aoEditar={valor => editarQuantidadeCampo(equipamento, valor, limite)} aoAjustar={valor => selecionado ? ajustarQuantidade(id, valor) : adicionarItem(equipamento)} /> : (
                <div className={estilos.quantidade} role="group" aria-label={`Quantidade de ${equipamento.modelo}`} data-controle-quantidade>
                  <span className={estilos.rotuloQuantidade}>Quantidade</span>
                  <button type="button" className={estilos.ajusteQuantidade} disabled={!selecionado} aria-label={`Diminuir quantidade de ${equipamento.modelo}`} onClick={() => ajustarQuantidade(id, quantidade - 1)}><Minus /></button>
                  <input type="text" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" aria-label={`Quantidade de ${equipamento.modelo}`} value={valorQuantidade(id, quantidade)} onFocus={(evento) => evento.currentTarget.select()} onClick={(evento) => evento.currentTarget.select()} onKeyDown={(evento) => { if (evento.key === 'Enter') evento.currentTarget.blur(); }} onChange={(evento) => editarQuantidade(id, evento.target.value, limite)} onBlur={() => limparQuantidadeEmEdicao(id)} />
                  <button type="button" className={estilos.ajusteQuantidade} disabled={selecionado && quantidade >= limite} aria-label={`Aumentar quantidade de ${equipamento.modelo}`} onClick={() => selecionado ? ajustarQuantidade(id, quantidade + 1) : adicionarItem(equipamento)}><Plus /></button>
                </div>)}

              </div>;
            }) : <div className={estilos.vazioMateriais}><PackageCheck /><strong>Nenhum material encontrado</strong><span>{!ehTecnicoCampo || busca.trim() ? 'Tente buscar por outro nome.' : operacao === 'devolver' ? 'Não há materiais disponíveis para devolver nesta obra.' : 'Fale com o responsável pelo estoque.'}</span></div>}</div><div className={estilos.acoesEtapa}><button type="button" onClick={() => definirEtapaMovimentacao(2)}>Voltar</button><button type="button" disabled={!itens.length || quantidadeEmEdicaoInvalida} onClick={() => definirEtapaMovimentacao(4)}>Revisar {quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'} <ChevronRight /></button></div></>}
        </section>}

        {etapaMovimentacao === 4 && <aside className={estilos.resumoPedido} aria-label="Resumo da solicitação">
          <div className={estilos.resumoTopo}><span><ClipboardList /></span><div><small>Sua solicitação</small><strong>{quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}</strong></div></div>
          <div className={estilos.miniRota}><span><MapPin />{operacao === 'receber' ? `Entregar em ${nomeLocal(destino)}` : `Retirar de ${nomeLocal(origem)}`}</span></div>
          <div className={estilos.itensResumo}>{itens.map(({ id, equipamento, quantidade }) => {
            const limite = operacao === 'receber' ? 2147483647 : (equipamento.quantidadeDisponivel ?? 1);
            return <div key={id} className={estilos.itemResumo}><div><strong>{equipamento.modelo}</strong>{equipamento.medida && <small>{equipamento.medida}</small>}{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <small>{equipamento.serie}</small>}</div>{ehTecnicoCampo ? <QuantidadeMaterialTecnico nome={equipamento.modelo} quantidade={quantidade} valor={valorQuantidade(id, quantidade)} limite={limite} erro={erroQuantidadeCampo(id, limite)}
              aoEditar={valor => editarQuantidadeCampo(equipamento, valor, limite)} aoAjustar={valor => ajustarQuantidade(id, valor)} /> : (<div className={estilos.quantidade}><input type="text" inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" aria-label={`Quantidade de ${equipamento.modelo}`} value={valorQuantidade(id, quantidade)} onFocus={(evento) => evento.currentTarget.select()} onClick={(evento) => evento.currentTarget.select()} onKeyDown={(evento) => { if (evento.key === 'Enter') evento.currentTarget.blur(); }} onChange={(evento) => editarQuantidade(id, evento.target.value, limite)} onBlur={() => limparQuantidadeEmEdicao(id)} /></div>)}</div>;
          })}</div>
          {!itens.length && <div className={estilos.carrinhoVazio}><Box /><span>Os materiais selecionados aparecerão aqui.</span></div>}
          {!mostrarObservacao ? <button type="button" className={estilos.adicionarObservacao} onClick={() => definirMostrarObservacao(true)}><Plus /> Adicionar observação</button> : <label className={estilos.observacao}><span>Observação <small>opcional</small></span><textarea autoFocus value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} placeholder="Ex.: entregar com o responsável da obra..." maxLength={500} /></label>}
          <button type="button" className={estilos.enviar} disabled={!podeEnviar} aria-busy={enviando} onClick={enviarSolicitacao}>{enviando ? 'Enviando...' : <><Send /> Enviar ao {ehTst ? 'RH' : 'gerente'} <ChevronRight /></>}</button>

          <button type="button" className={estilos.voltarRevisao} onClick={() => definirEtapaMovimentacao(3)}>Voltar e corrigir</button>
        </aside>}
      </div>}

      {!carregando && aba === 'acompanhar' && ehTecnicoCampo && <PedidosTecnicoCampo pedidos={solicitacoes} agruparMateriais={agruparMateriaisPedido} nomeLocal={nomeLocal} formatarData={formatarDataSolicitacao}
        aoReceber={id => { definirMensagem(null); definirRecebimentoSelecionadoId(id); }} processando={confirmandoRecebimentoId !== null} aoNovoPedido={() => definirAba('solicitar')} />}
      {!carregando && aba === 'acompanhar' && !ehTecnicoCampo && <section className={estilos.acompanhamento}>

        <div className={estilos.listaSolicitacoes}>{solicitacoes.length ? solicitacoes.map((solicitacao) => {
          const materiais = agruparMateriaisPedido(solicitacao.materiais);
          const totalMateriais = materiais.reduce((total, material) => total + material.quantidade, 0);
          const possuiDestino = Boolean(solicitacao.obraDestinoId);
          const localPedido = possuiDestino ? nomeLocal(solicitacao.obraDestinoId) : solicitacao.obraOrigemId ? nomeLocal(solicitacao.obraOrigemId) : 'Local não disponível';
          return <article key={solicitacao.id} id={`pedido-tecnico-${solicitacao.id}`} tabIndex={-1} className={estilos.cartaoSolicitacao} data-etapa={obterEtapaSolicitacao(solicitacao.status).chave}>
            <header className={estilos.topoCartaoSolicitacao}>
              <div className={estilos.identificacaoSolicitacao}><span>{iconeEtapa(solicitacao.status)}</span><div><small>{solicitacao.solicitacaoPaiId ? `Parte do pedido #${solicitacao.solicitacaoPaiId}` : 'Pedido'}</small><strong>#{String(solicitacao.id).padStart(4, '0')}</strong></div></div>
              <span className={estilos.statusSolicitacao}>{rotuloStatus(solicitacao)}</span>
            </header>
            <div className={estilos.detalhesSolicitacao}>
              <div className={estilos.destinoSolicitacao}><MapPin /><span><small>{possuiDestino ? 'Destino' : 'Origem'}</small><strong>{localPedido}</strong></span></div>
              <time dateTime={solicitacao.dataSolicitacao || undefined}><small>Solicitado em</small>{formatarDataSolicitacao(solicitacao.dataSolicitacao)}</time>
            </div>
            {!modoAdministrador&&<CancelamentoPedido pedidoId={solicitacao.id}/>}
            <p className={estilos.fluxoSolicitacao}>{descricaoStatus(solicitacao, ehTst)}</p>{(solicitacao.eventosFinanceiros||[]).filter(e=>['REJEICAO','REJEICAO_INICIAL'].includes(e.tipo)).map((e,i)=><p className={estilos.fluxoSolicitacao} key={i}>{e.descricao} · {e.autorNome}</p>)}
            <section className={estilos.materiaisCartao} aria-label="Materiais do pedido">
              <header><span>Materiais</span><b>{totalMateriais} {totalMateriais === 1 ? 'item' : 'itens'}</b></header>
              <ul>{materiais.map((material) => <li key={material.chave}><span>{material.nome}</span><b>{material.quantidade}</b></li>)}</ul>
            </section>
            {!modoAdministrador && solicitacao.status === 'Em trânsito' && solicitacao.obraDestinoId && <button type="button" className={estilos.acaoMovimentacao} disabled={confirmandoRecebimentoId !== null} aria-busy={confirmandoRecebimentoId === solicitacao.id} onClick={() => confirmarRecebimento(solicitacao)}><PackageCheck /> {confirmandoRecebimentoId === solicitacao.id ? 'Confirmando...' : 'Confirmar recebimento'}</button>}
          </article>;
        }) : <div className={estilos.semSolicitacoes}><ClipboardList /><h3>Nenhuma solicitação ainda</h3>{!modoAdministrador && <button type="button" onClick={() => definirAba('solicitar')}>Criar solicitação</button>}</div>}</div>
      </section>}

      {!carregando && aba === 'materiais' && <section className={estilos.materiaisObras}>

        <div className={estilos.listaObrasMateriais}>{obrasComMateriais.length ? obrasComMateriais.map(({ obra, materiais }) => <article key={obra.id} className={estilos.obraMateriais}>
          <header><span><Building2 /></span><strong>{obra.nome}</strong><b>{materiais.reduce((total, material) => total + (material.quantidade || 1), 0)}</b></header>
          {materiais.length ? <ul>{materiais.map((material) => <li key={material.id}><div><strong>{material.modelo}</strong>{material.medida && <small>{material.medida}</small>}<IndicadorCalibracao equipamento={material}/></div><b>{material.quantidade || 1}</b></li>)}</ul> : <p>Nenhum material nesta obra.</p>}
        </article>) : <div className={estilos.semObraSimples}><Building2 /><strong>Nenhuma obra vinculada</strong><span>Fale com o {ehTst ? 'RH' : 'gerente'}.</span></div>}</div>
      </section>}
    </main>
    {pedidoRecebimento && <ConfirmarRecebimentoTecnico pedido={pedidoRecebimento} materiais={agruparMateriaisPedido(pedidoRecebimento.materiais)} local={nomeLocal(pedidoRecebimento.obraDestinoId)}
      ocupado={confirmandoRecebimentoId !== null} erro={mensagem?.tipo === 'erro' ? mensagem.texto : null} aoFechar={() => definirRecebimentoSelecionadoId(null)} aoConfirmar={() => confirmarRecebimento(pedidoRecebimento)} />}
  </div>;
}
