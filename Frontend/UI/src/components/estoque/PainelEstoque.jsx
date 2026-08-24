import { useEffect, useMemo, useState } from 'react';
import { Box, Check, ChevronRight, ClipboardList, FileDown, LogOut, Moon, PackageCheck, Sun, Truck, Warehouse, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { imprimirCautelaSolicitacao } from '../../services/documentosEquipamentos';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelEstoque.module.css';

const localEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const possuiSeries = (solicitacao) => solicitacao.materiais.every(({ identificacao }) => identificacao);

export function PainelEstoque() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [carregando, definirCarregando] = useState(true);
  const [mensagem, definirMensagem] = useState(null);
  const [configurando, definirConfigurando] = useState(null);
  const [origem, definirOrigem] = useState('deposito');
  const [selecoes, definirSelecoes] = useState({});
  const [temaEscuro, definirTemaEscuro] = useState(() => localStorage.getItem('era-tema-estoque') === 'escuro');

  const carregar = async () => {
    const [obrasRecebidas, equipamentosRecebidos, solicitacoesRecebidas] = await Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiAtividades.listar()]);
    definirObras(obrasRecebidas); definirEquipamentos(equipamentosRecebidos); definirSolicitacoes(solicitacoesRecebidas);
  };

  useEffect(() => { carregar().catch((erro) => definirMensagem({ tipo: 'erro', texto: erro.message })).finally(() => definirCarregando(false)); }, []);
  const buscarObra = (id) => obras.find((obra) => String(obra.id) === String(id));
  const nomeLocal = (id) => id == null || id === 'deposito' ? 'Depósito central' : buscarObra(id)?.nome || 'Obra';
  const pendencias = useMemo(() => solicitacoes.filter(({ status }) => ['Aprovada', 'Aguardando coleta', 'Em trânsito'].includes(status)), [solicitacoes]);
  const concluidas = useMemo(() => solicitacoes.filter(({ status }) => ['Concluída', 'Rejeitada'].includes(status)), [solicitacoes]);

  const alternarTema = () => definirTemaEscuro((atual) => { localStorage.setItem('era-tema-estoque', atual ? 'claro' : 'escuro'); return !atual; });
  const abrirConfiguracao = (solicitacao) => { definirConfigurando(solicitacao); definirOrigem(solicitacao.obraOrigemId ? String(solicitacao.obraOrigemId) : 'deposito'); definirSelecoes({}); };
  const alternarEquipamento = (materialId, equipamentoId) => definirSelecoes((atuais) => ({ ...atuais, [materialId]: (atuais[materialId] || []).includes(equipamentoId) ? atuais[materialId].filter((id) => id !== equipamentoId) : [...(atuais[materialId] || []), equipamentoId] }));
  const candidatos = (material) => equipamentos.filter((equipamento) => localEquipamento(equipamento) === origem && (equipamento.quantidadeDisponivel ?? 1) > 0 && `${equipamento.modelo} ${equipamento.tipo}`.toLocaleLowerCase('pt-BR').includes(material.nome.toLocaleLowerCase('pt-BR')));
  const quantidadeSelecionada = (material) => (selecoes[material.id] || []).reduce((total, id) => total + (equipamentos.find((item) => item.id === id)?.quantidadeDisponivel ?? 0), 0);
  const configuracaoValida = configurando?.materiais.every((material) => quantidadeSelecionada(material) >= material.quantidade);

  const salvarAtendimento = async () => {
    try {
      const materiais = configurando.materiais.flatMap((material) => {
        let restante = material.quantidade;
        return (selecoes[material.id] || []).map((id) => equipamentos.find((item) => item.id === id)).filter(Boolean).map((equipamento) => { const quantidade = Math.min(restante, equipamento.quantidadeDisponivel ?? 1); restante -= quantidade; return { nome: material.nome, quantidade, identificacao: equipamento.serie }; }).filter(({ quantidade }) => quantidade > 0);
      });
      const atualizada = await apiAtividades.atualizar(configurando.id, { tecnico: configurando.tecnico, obraOrigemId: origem === 'deposito' ? null : Number(origem), obraDestinoId: configurando.obraDestinoId, observacao: configurando.observacao, materiais });
      definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item)); definirConfigurando(null); definirMensagem({ tipo: 'sucesso', texto: 'Equipamentos reservados. A cautela já pode ser gerada.' });
    } catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const avancar = async (solicitacao, acao) => {
    try { const atualizada = acao === 'enviar' ? await apiAtividades.iniciarTransito(solicitacao.id) : await apiAtividades.concluir(solicitacao.id); definirSolicitacoes((atuais) => atuais.map((item) => item.id === atualizada.id ? atualizada : item)); definirEquipamentos(await apiEquipamentos.listar()); definirMensagem({ tipo: 'sucesso', texto: acao === 'enviar' ? 'Envio registrado como em trânsito.' : 'Retorno confirmado no estoque.' }); }
    catch (erro) { definirMensagem({ tipo: 'erro', texto: erro.message }); }
  };

  const renderizarCard = (solicitacao) => {
    const entradaNaObra = Boolean(solicitacao.obraDestinoId);
    return <article className={estilos.card} key={solicitacao.id}>
      <header><span className={estilos.icone}><PackageCheck /></span><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><h2>{entradaNaObra ? 'Envio para obra' : 'Retirada da obra'}</h2></div><b data-status={solicitacao.status}>{solicitacao.status}</b></header>
      <div className={estilos.rota}><span>{entradaNaObra ? nomeLocal(solicitacao.obraOrigemId) : nomeLocal(solicitacao.obraOrigemId)}</span><ChevronRight /><span>{entradaNaObra ? nomeLocal(solicitacao.obraDestinoId) : 'Depósito central'}</span></div>
      <p>Solicitado por <strong>{solicitacao.tecnico}</strong></p>
      <ul>{solicitacao.materiais.map((material) => <li key={material.id}><span>{material.quantidade}×</span><div><strong>{material.nome}</strong>{material.identificacao && <small>Série {material.identificacao}</small>}</div></li>)}</ul>
      <footer>
        {solicitacao.status !== 'Rejeitada' && possuiSeries(solicitacao) && <button onClick={() => imprimirCautelaSolicitacao(solicitacao, buscarObra)}><FileDown /> Cautela da portaria</button>}
        {solicitacao.status === 'Aprovada' && !possuiSeries(solicitacao) && <button className={estilos.primario} onClick={() => abrirConfiguracao(solicitacao)}><Box /> Definir equipamentos</button>}
        {solicitacao.status === 'Aprovada' && possuiSeries(solicitacao) && <button className={estilos.primario} onClick={() => avancar(solicitacao, 'enviar')}><Truck /> Confirmar envio</button>}
        {solicitacao.status === 'Aguardando coleta' && <span className={estilos.aviso}>Aguardando o técnico confirmar a saída da obra.</span>}
        {solicitacao.status === 'Em trânsito' && !entradaNaObra && <button className={estilos.primario} onClick={() => avancar(solicitacao, 'receber')}><Warehouse /> Confirmar no estoque</button>}
        {solicitacao.status === 'Em trânsito' && entradaNaObra && <span className={estilos.aviso}>Aguardando recebimento na obra.</span>}
      </footer>
    </article>;
  };

  return <div className={estilos.pagina} data-theme={temaEscuro ? 'dark' : 'light'}>
    <header className={estilos.cabecalho}><div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>Estoque</span></div><div className={estilos.usuario}><div><small>Operação de materiais</small><strong>{usuario.nome}</strong></div><button onClick={alternarTema} aria-label="Alternar tema">{temaEscuro ? <Sun /> : <Moon />}</button><button onClick={encerrarSessao} aria-label="Sair"><LogOut /></button></div></header>
    <main className={estilos.conteudo}><section className={estilos.titulo}><div><span><Warehouse /> Central de estoque</span><h1>Movimentações</h1><p>Prepare envios e confirme retornos sem interferir nas decisões do gerente.</p></div><aside><strong>{pendencias.length}</strong><small>ações pendentes</small></aside></section>
      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}{mensagem.texto}<button onClick={() => definirMensagem(null)}><X /></button></div>}
      {carregando ? <div className={estilos.carregando}>Carregando estoque...</div> : <><section className={estilos.secao}><div className={estilos.tituloSecao}><Truck /><div><h2>Fila operacional</h2><p>Somente tarefas que precisam de uma ação do estoque.</p></div></div><div className={estilos.grade}>{pendencias.length ? pendencias.map(renderizarCard) : <div className={estilos.vazio}><Check /><strong>Tudo em dia</strong><span>Não há movimentações aguardando o estoque.</span></div>}</div></section><section className={estilos.secao}><div className={estilos.tituloSecao}><ClipboardList /><div><h2>Histórico recente</h2><p>Movimentações finalizadas ou rejeitadas.</p></div></div><div className={estilos.grade}>{concluidas.slice(0, 12).map(renderizarCard)}</div></section></>}
    </main>
    {configurando && <div className={estilos.fundoModal} onMouseDown={(evento) => evento.target === evento.currentTarget && definirConfigurando(null)}><section className={estilos.modal}><header><div><small>Atender solicitação #{configurando.id}</small><h2>Defina os equipamentos</h2></div><button onClick={() => definirConfigurando(null)}><X /></button></header><label className={estilos.origem}><span>De onde os materiais sairão?</span><select value={origem} onChange={(evento) => { definirOrigem(evento.target.value); definirSelecoes({}); }}><option value="deposito">Depósito central</option>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>{configurando.materiais.map((material) => <div className={estilos.grupoMaterial} key={material.id}><div><strong>{material.nome}</strong><span>Selecione {material.quantidade} unidade(s) · {quantidadeSelecionada(material)} selecionada(s)</span></div><div className={estilos.candidatos}>{candidatos(material).map((equipamento) => <button key={equipamento.id} className={(selecoes[material.id] || []).includes(equipamento.id) ? estilos.selecionado : ''} onClick={() => alternarEquipamento(material.id, equipamento.id)}><Box /><span><strong>{equipamento.modelo}</strong><small>{equipamento.serie} · {equipamento.quantidadeDisponivel ?? 1} un.</small></span>{(selecoes[material.id] || []).includes(equipamento.id) && <Check />}</button>)}</div></div>)}<footer><button onClick={() => definirConfigurando(null)}>Cancelar</button><button className={estilos.primario} disabled={!configuracaoValida} onClick={salvarAtendimento}>Reservar equipamentos</button></footer></section></div>}
  </div>;
}
