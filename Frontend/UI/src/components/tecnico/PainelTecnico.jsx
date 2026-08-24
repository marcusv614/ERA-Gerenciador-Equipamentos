import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Box, Building2, Check, ChevronRight, ClipboardList, Clock3, Download, History, LogOut, MapPin, Minus, PackageCheck, Plus, Search, Send, ShieldCheck, X } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiAtividades, apiEquipamentos, apiObras } from '../../services/api/servicoAtivosApi';
import { obterDataAtual } from '../../utils/datas';
import { imprimirCautelaObra } from '../../services/documentosEquipamentos';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './PainelTecnico.module.css';

const identificadorLocal = (equipamento) => String(equipamento.id);
const localizacaoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const rotulosStatus = { Pendente: 'Aguardando análise', Aprovada: 'Aprovada', Rejeitada: 'Rejeitada' };

export function PainelTecnico() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [origem, definirOrigem] = useState('');
  const [destino, definirDestino] = useState('');
  const [busca, definirBusca] = useState('');
  const [itens, definirItens] = useState([]);
  const [observacao, definirObservacao] = useState('');
  const [aba, definirAba] = useState('solicitar');
  const [obraInventarioId, definirObraInventarioId] = useState('');
  const [carregando, definirCarregando] = useState(true);
  const [enviando, definirEnviando] = useState(false);
  const [mensagem, definirMensagem] = useState(null);

  useEffect(() => {
    let componenteAtivo = true;
    Promise.all([apiObras.listar(), apiEquipamentos.listar(), apiAtividades.listar()])
      .then(([obrasRecebidas, equipamentosRecebidos, solicitacoesRecebidas]) => {
        if (!componenteAtivo) return;
        definirObras(obrasRecebidas);
        definirEquipamentos(equipamentosRecebidos);
        definirSolicitacoes(solicitacoesRecebidas);
        const obraDoTecnico = obrasRecebidas.find(({ responsaveis }) => responsaveis?.some((nome) => nome.toLocaleLowerCase('pt-BR') === usuario.nome.toLocaleLowerCase('pt-BR')));
        definirObraInventarioId(String(obraDoTecnico?.id || obrasRecebidas[0]?.id || ''));
      })
      .catch((erro) => { if (componenteAtivo) definirMensagem({ tipo: 'erro', texto: erro.message }); })
      .finally(() => { if (componenteAtivo) definirCarregando(false); });
    return () => { componenteAtivo = false; };
  }, [usuario.nome]);

  const obrasAtivas = useMemo(() => obras.filter(({ status }) => status !== 'Concluída'), [obras]);
  const equipamentosDaOrigem = useMemo(() => equipamentos.filter((equipamento) => {
    if (!origem || localizacaoEquipamento(equipamento) !== origem) return false;
    const texto = `${equipamento.modelo} ${equipamento.tipo} ${equipamento.serie} ${equipamento.medida || ''}`.toLocaleLowerCase('pt-BR');
    return texto.includes(busca.trim().toLocaleLowerCase('pt-BR')) && (equipamento.quantidadeDisponivel ?? 1) > 0;
  }), [equipamentos, origem, busca]);

  const nomeLocal = (valor) => valor === 'deposito' ? 'Depósito central' : obras.find(({ id }) => String(id) === String(valor))?.nome || 'Selecione';
  const pendentes = solicitacoes.filter(({ status }) => status === 'Pendente').length;
  const aprovadas = solicitacoes.filter(({ status }) => status === 'Aprovada').length;
  const quantidadeTotal = itens.reduce((total, item) => total + item.quantidade, 0);
  const podeEnviar = origem && destino && origem !== destino && itens.length > 0 && !enviando;
  const obraInventario = obras.find(({ id }) => String(id) === obraInventarioId);
  const materiaisAtuaisDaObra = equipamentos.filter(({ obraId }) => String(obraId) === obraInventarioId);
  const materiaisQuePassaramNaObra = equipamentos.filter((equipamento) => String(equipamento.obraId) !== obraInventarioId && equipamento.historico?.some(({ origemObraId, destinoObraId }) => String(origemObraId) === obraInventarioId || String(destinoObraId) === obraInventarioId));

  const adicionarItem = (equipamento) => definirItens((atuais) => {
    const id = identificadorLocal(equipamento);
    if (atuais.some((item) => item.id === id)) return atuais;
    return [...atuais, { id, equipamento, quantidade: 1 }];
  });

  const alterarQuantidade = (id, diferenca) => definirItens((atuais) => atuais
    .map((item) => item.id === id ? { ...item, quantidade: Math.max(0, Math.min(item.quantidade + diferenca, item.equipamento.quantidadeDisponivel ?? 1)) } : item)
    .filter(({ quantidade }) => quantidade > 0));

  const trocarOrigem = (valor) => {
    definirOrigem(valor);
    definirItens([]);
    if (valor === destino) definirDestino('');
  };

  const enviarSolicitacao = async () => {
    if (!podeEnviar) return;
    definirEnviando(true);
    definirMensagem(null);
    try {
      const criada = await apiAtividades.cadastrar({
        solicitante: usuario.nome,
        tecnico: usuario.nome,
        obraOrigemId: origem === 'deposito' ? null : Number(origem),
        obraDestinoId: destino === 'deposito' ? null : Number(destino),
        dataSolicitacao: obterDataAtual(),
        observacao: observacao.trim() || null,
        materiais: itens.map(({ equipamento, quantidade }) => ({ nome: equipamento.modelo, quantidade, identificacao: equipamento.serie })),
      });
      definirSolicitacoes((atuais) => [criada, ...atuais]);
      definirEquipamentos((atuais) => atuais.map((equipamento) => {
        const item = itens.find(({ equipamento: selecionado }) => selecionado.id === equipamento.id);
        return item ? { ...equipamento, quantidadeReservada: (equipamento.quantidadeReservada || 0) + item.quantidade, quantidadeDisponivel: equipamento.quantidadeDisponivel - item.quantidade } : equipamento;
      }));
      definirItens([]); definirObservacao(''); definirBusca('');
      definirMensagem({ tipo: 'sucesso', texto: 'Solicitação enviada para análise do gerente.' });
      definirAba('acompanhar');
    } catch (erro) {
      definirMensagem({ tipo: 'erro', texto: erro.message });
    } finally {
      definirEnviando(false);
    }
  };

  return <div className={estilos.pagina}>
    <header className={estilos.cabecalho}>
      <div className={estilos.marca}><img src={logoEra} alt="ERA" /><span>campo</span></div>
      <div className={estilos.usuario}>
        <div><small>Olá, técnico</small><strong>{usuario.nome}</strong></div>
        <button type="button" onClick={encerrarSessao} aria-label="Sair"><LogOut size={19} /></button>
      </div>
    </header>

    <main className={estilos.conteudo}>
      <nav className={estilos.abas} aria-label="Navegação do técnico">
        <button className={aba === 'solicitar' ? estilos.abaAtiva : ''} onClick={() => definirAba('solicitar')}><Plus size={18} /> Nova solicitação</button>
        <button className={aba === 'acompanhar' ? estilos.abaAtiva : ''} onClick={() => definirAba('acompanhar')}><ClipboardList size={18} /> Acompanhar {pendentes > 0 && <span>{pendentes}</span>}</button>
        <button className={aba === 'materiais' ? estilos.abaAtiva : ''} onClick={() => definirAba('materiais')}><Building2 size={18} /> Materiais da obra</button>
      </nav>

      {mensagem && <div className={`${estilos.mensagem} ${estilos[mensagem.tipo]}`}><span>{mensagem.tipo === 'sucesso' ? <Check /> : <X />}</span>{mensagem.texto}<button onClick={() => definirMensagem(null)}><X size={16} /></button></div>}
      {carregando && <div className={estilos.carregando}><i /><span>Sincronizando o campo...</span></div>}

      {!carregando && aba === 'solicitar' && <div className={estilos.gradePrincipal}>
        <section className={estilos.formulario}>
          <div className={estilos.tituloSecao}><span>1</span><div><h2>Sai de onde e vai para onde?</h2><p>Escolha os dois locais. É só tocar e selecionar.</p></div></div>
          <div className={estilos.rota}>
            <label><span>O material está onde?</span><select value={origem} onChange={(evento) => trocarOrigem(evento.target.value)}><option value="">Toque para escolher</option><option value="deposito">Depósito central</option>{obrasAtivas.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>
            <ArrowRight className={estilos.setaRota} />
            <label><span>Para onde vai?</span><select value={destino} onChange={(evento) => definirDestino(evento.target.value)}><option value="">Toque para escolher</option><option value="deposito" disabled={origem === 'deposito'}>Depósito central</option>{obrasAtivas.map((obra) => <option key={obra.id} value={obra.id} disabled={String(obra.id) === origem}>{obra.nome}</option>)}</select></label>
          </div>

          <div className={`${estilos.tituloSecao} ${estilos.segundaEtapa}`}><span>2</span><div><h2>Toque nos materiais que quer levar</h2><p>{origem ? `Mostrando o que está em ${nomeLocal(origem)}` : 'Primeiro escolha onde o material está.'}</p></div></div>
          {origem && <><div className={estilos.busca}><Search size={19} /><input value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar material, tipo ou número de série" /></div>
            <div className={estilos.listaMateriais}>{equipamentosDaOrigem.length ? equipamentosDaOrigem.map((equipamento) => {
              const selecionado = itens.some(({ id }) => id === identificadorLocal(equipamento));
              return <button type="button" key={equipamento.id} className={`${estilos.material} ${selecionado ? estilos.materialSelecionado : ''}`} onClick={() => selecionado ? alterarQuantidade(identificadorLocal(equipamento), -999) : adicionarItem(equipamento)}>
                <span className={estilos.iconeMaterial}>{selecionado ? <Check /> : <Box />}</span><span className={estilos.dadosMaterial}><strong>{equipamento.modelo}</strong><small>{equipamento.tipo} · {equipamento.serie}</small></span><span className={estilos.disponivel}><b>{equipamento.quantidadeDisponivel ?? 1}</b><small>disponível</small></span>
              </button>;
            }) : <div className={estilos.vazioMateriais}><PackageCheck /><strong>Nenhum material disponível</strong><span>Tente outro termo ou selecione outra origem.</span></div>}</div></>}
        </section>

        <aside className={estilos.resumoPedido}>
          <div className={estilos.resumoTopo}><span><ClipboardList /></span><div><small>Sua movimentação</small><strong>{quantidadeTotal} {quantidadeTotal === 1 ? 'item' : 'itens'}</strong></div></div>
          {origem && destino ? <div className={estilos.miniRota}><span><MapPin />{nomeLocal(origem)}</span><i /><span><MapPin />{nomeLocal(destino)}</span></div> : <p className={estilos.dicaResumo}>Selecione origem e destino para visualizar o trajeto.</p>}
          <div className={estilos.itensResumo}>{itens.map(({ id, equipamento, quantidade }) => <div key={id} className={estilos.itemResumo}><div><strong>{equipamento.modelo}</strong><small>{equipamento.serie}</small></div><div className={estilos.quantidade}><button onClick={() => alterarQuantidade(id, -1)}><Minus /></button><b>{quantidade}</b><button onClick={() => alterarQuantidade(id, 1)} disabled={quantidade >= (equipamento.quantidadeDisponivel ?? 1)}><Plus /></button></div></div>)}</div>
          {!itens.length && <div className={estilos.carrinhoVazio}><Box /><span>Os materiais selecionados aparecerão aqui.</span></div>}
          <label className={estilos.observacao}><span>Observação <small>opcional</small></span><textarea value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} placeholder="Ex.: entregar com o responsável da obra..." maxLength={500} /></label>
          <button className={estilos.enviar} disabled={!podeEnviar} onClick={enviarSolicitacao}>{enviando ? 'Enviando...' : <><Send /> Enviar pedido <ChevronRight /></>}</button>
          <p className={estilos.seguranca}><ShieldCheck /> O gerente revisará tudo antes da movimentação.</p>
        </aside>
      </div>}

      {!carregando && aba === 'acompanhar' && <section className={estilos.acompanhamento}>
        <div className={estilos.cabecalhoHistorico}><div><span className={estilos.selo}>Minhas solicitações</span><h2>Acompanhe cada movimentação</h2><p>Atualizações do gerente aparecem aqui.</p></div><div className={estilos.metricas}><span><b>{pendentes}</b> aguardando</span><span><b>{aprovadas}</b> aprovadas</span></div></div>
        <div className={estilos.listaSolicitacoes}>{solicitacoes.length ? solicitacoes.map((solicitacao) => <article key={solicitacao.id} className={estilos.cartaoSolicitacao} data-status={solicitacao.status}>
          <div className={estilos.statusSolicitacao}><span>{solicitacao.status === 'Pendente' ? <Clock3 /> : solicitacao.status === 'Aprovada' ? <Check /> : <X />}</span><div><small>Solicitação #{String(solicitacao.id).padStart(4, '0')}</small><strong>{rotulosStatus[solicitacao.status] || solicitacao.status}</strong></div><time>{new Date(`${solicitacao.dataSolicitacao}T12:00:00`).toLocaleDateString('pt-BR')}</time></div>
          <div className={estilos.trajetoCartao}><span>{nomeLocal(solicitacao.obraOrigemId == null ? 'deposito' : solicitacao.obraOrigemId)}</span><ArrowRight /><span>{nomeLocal(solicitacao.obraDestinoId == null ? 'deposito' : solicitacao.obraDestinoId)}</span></div>
          <div className={estilos.materiaisCartao}>{solicitacao.materiais.map((material) => <span key={`${material.identificacao}-${material.id}`}><b>{material.quantidade}×</b> {material.nome}<small>{material.identificacao}</small></span>)}</div>
          {solicitacao.observacao && <p className={estilos.notaCartao}>“{solicitacao.observacao}”</p>}
        </article>) : <div className={estilos.semSolicitacoes}><ClipboardList /><h3>Nenhuma solicitação ainda</h3><p>Sua primeira movimentação aparecerá aqui.</p><button onClick={() => definirAba('solicitar')}>Criar solicitação</button></div>}</div>
      </section>}

      {!carregando && aba === 'materiais' && <section className={estilos.inventarioObra}>
        <div className={estilos.topoInventario}>
          <div><span className={estilos.selo}>Controle da obra</span><h2>Materiais da obra</h2><p>Veja o que está aqui agora e o que já passou por aqui.</p></div>
          <label><span>Qual obra?</span><select value={obraInventarioId} onChange={(evento) => definirObraInventarioId(evento.target.value)}>{obras.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></label>
        </div>
        {obraInventario && <div className={estilos.faixaObra}><div className={estilos.iconeObra}><Building2 /></div><div><small>Obra escolhida</small><strong>{obraInventario.nome}</strong><span><MapPin /> {obraInventario.cidade} · {obraInventario.cliente}</span></div><button type="button" onClick={() => imprimirCautelaObra(obraInventario, equipamentos)}><Download /> Baixar cautela</button></div>}
        <div className={estilos.blocosInventario}>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.agora}><PackageCheck /></span><div><h3>Está na obra agora</h3><p>{materiaisAtuaisDaObra.length} {materiaisAtuaisDaObra.length === 1 ? 'material' : 'materiais'}</p></div></div><div className={estilos.tabelaMateriais}>{materiaisAtuaisDaObra.length ? materiaisAtuaisDaObra.map((equipamento) => <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><Box /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo} · Série {equipamento.serie}</small></div><span className={estilos.quantidadeMaterial}><b>{equipamento.quantidade || 1}</b><small>unid.</small></span></div>) : <div className={estilos.listaVazia}><PackageCheck /><strong>Nenhum material nesta obra</strong><span>Materiais aprovados aparecerão aqui.</span></div>}</div></div>
          <div className={estilos.blocoInventario}><div className={estilos.tituloInventario}><span className={estilos.passado}><History /></span><div><h3>Já passou por esta obra</h3><p>Materiais que já saíram daqui</p></div></div><div className={estilos.tabelaMateriais}>{materiaisQuePassaramNaObra.length ? materiaisQuePassaramNaObra.map((equipamento) => { const ultima = equipamento.historico.filter(({ origemObraId, destinoObraId }) => String(origemObraId) === obraInventarioId || String(destinoObraId) === obraInventarioId).at(-1); const dataRegistro = ultima?.dataMovimentacao || ultima?.dataSaida || ultima?.dataEntrada; return <div key={equipamento.id} className={estilos.linhaMaterial}><span className={estilos.miniIcone}><History /></span><div><strong>{equipamento.modelo}</strong><small>{equipamento.tipo} · Série {equipamento.serie}</small>{dataRegistro && <em>Último registro: {new Date(`${dataRegistro}T12:00:00`).toLocaleDateString('pt-BR')}</em>}</div><span className={estilos.statusSaiu}>Já saiu</span></div>; }) : <div className={estilos.listaVazia}><History /><strong>Nenhum material anterior</strong><span>O histórico desta obra ainda está vazio.</span></div>}</div></div>
        </div>
      </section>}
    </main>
  </div>;
}
