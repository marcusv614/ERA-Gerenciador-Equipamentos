import { BellRing, Building2, Check, CircleDollarSign, FileText, History, MapPin, MessageSquareText, Package2, Pencil, UserRound, X } from 'lucide-react';
import css from './DetalhesSolicitacao.module.css';
import { AndamentoSolicitacao } from './AndamentoSolicitacao';

const formatarInstante = (valor) => valor ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Manaus' }) : 'Não registrado';

export function DetalhesSolicitacao({ solicitacao, processando, buscarObraPorId, equipamentos = [], statusDecisao = 'Pendente', perfil, aoPlanejar, aoAprovar, aoRejeitar, aoEditar, aoExportarRomaneio, aoExportarAuditoria }) {
  const origem = solicitacao.obraOrigemId ? buscarObraPorId(solicitacao.obraOrigemId)?.nome || 'Obra não disponível' : 'Depósito central';
  const destino = solicitacao.obraDestinoId ? buscarObraPorId(solicitacao.obraDestinoId)?.nome || 'Obra não disponível' : 'Depósito central';
  const pendente = solicitacao.status === statusDecisao;
  const podeEditar = pendente && Boolean(aoEditar);
  const separado = solicitacao.materiais.every(({ identificacao }) => identificacao);
  const total = solicitacao.materiais.reduce((quantidade, material) => quantidade + material.quantidade, 0);
  const eventosFinanceiros = solicitacao.eventosFinanceiros || [];
  const alteracoesFinanceiras = eventosFinanceiros.filter(({ tipo }) => tipo === 'ALTERACAO');
  const compras = (solicitacao.compras?.length ? solicitacao.compras : solicitacao.materiais).filter(({ quantidadeCompra }) => quantidadeCompra > 0);
  const financeiro = perfil === 'FINANCEIRO' && ['Aguardando financeiro', 'Aprovada'].includes(solicitacao.status);
  const plano = solicitacao.planoFinanceiro || [];
  const disponibilidade = (material) => {
    const elegiveis = equipamentos.filter((equipamento) => !equipamento.arquivado && equipamento.catalogoChave === material.catalogoChave && Number(equipamento.quantidadeDisponivel || 0) > 0 &&
      (solicitacao.obraDestinoId == null || String(equipamento.obraId ?? 'deposito') !== String(solicitacao.obraDestinoId)));
    const locais = new Map();
    elegiveis.forEach((equipamento) => {
      const nome = equipamento.obraId == null ? 'Depósito central' : buscarObraPorId(equipamento.obraId)?.nome || `Obra #${equipamento.obraId}`;
      locais.set(nome, (locais.get(nome) || 0) + Number(equipamento.quantidadeDisponivel || 0));
    });
    const disponivel = [...locais.values()].reduce((soma, quantidade) => soma + quantidade, 0);
    return { disponivel, faltante: Math.max(0, Number(material.quantidade || 0) - disponivel), locais: [...locais.entries()] };
  };
  const localizacao = (material) => {
    if (!material.identificacao) return plano.length ? 'Transporte e compra definidos no plano financeiro' : 'Aguardando definição pelo Financeiro';
    if (solicitacao.status === 'Concluída') return `Recebido em ${destino}`;
    if (solicitacao.status === 'Em trânsito') return `Em transporte: ${origem} → ${destino}`;
    if (solicitacao.status === 'Rejeitada') return `Origem informada: ${origem}`;
    return `Coleta em ${origem}`;
  };

  return <article className={css.detalhes} aria-label="Conteúdo da solicitação">
    <div className={css.conteudo}>
      <AndamentoSolicitacao solicitacao={solicitacao} />
      <section className={css.destino} aria-label="Destino do pedido">
        <span className={css.iconeDestino}><Building2 size={22} aria-hidden="true" /></span>
        <div><h3>{solicitacao.obraDestinoId ? 'Obra de destino' : 'Destino da retirada'}</h3><p>{destino}</p></div>
      </section>

      {plano.length > 0 && <section className={css.historico} aria-label="Plano financeiro de transporte e compra"><h3><CircleDollarSign size={16} /> Instruções do Financeiro</h3>{plano.map((item) => <article key={`plano-${item.materialId}`}><strong>{item.nome}</strong>{item.origens.map((origem,indice) => <span key={`${origem.equipamentoId}-${indice}`}>Transportar {origem.quantidade} un. de {origem.obraOrigemId == null ? 'Depósito central' : buscarObraPorId(origem.obraOrigemId)?.nome || `Obra #${origem.obraOrigemId}`} · {origem.identificacao}</span>)}<span>Comprar: {item.quantidadeCompra} un.</span>{item.justificativa && <small>Justificativa: {item.justificativa}</small>}</article>)}</section>}
      {solicitacao.materiaisOriginais?.length > 0 && <section className={css.historico} aria-label="Pedido original antes dos envios parciais"><h3><Package2 size={16} /> Pedido original preservado</h3>{solicitacao.materiaisOriginais.map((m, i) => <article key={`${m.catalogoChave}-${i}`}><strong>{m.nome}</strong><span>{m.quantidade} unidades no pedido original</span></article>)}<p>Este atendimento contém apenas a parte indicada abaixo. Consulte os atendimentos vinculados e o histórico para acompanhar o restante.</p></section>}
      {solicitacao.solicitante && solicitacao.solicitante !== solicitacao.tecnico && <p className={css.solicitante}><UserRound size={14} aria-hidden="true" /> Pedido por <strong>{solicitacao.solicitante}</strong></p>}
      {alteracoesFinanceiras.length > 0 && perfil !== 'FINANCEIRO' && <section className={css.alertaFinanceiro} role="status"><BellRing size={19} aria-hidden="true" /><div><strong>O Financeiro alterou este pedido</strong><p>{alteracoesFinanceiras.at(-1).descricao}</p><small>{formatarInstante(alteracoesFinanceiras.at(-1).registradoEm)} · {alteracoesFinanceiras.at(-1).autorNome}</small></div></section>}

      <section className={css.materiais} aria-labelledby="titulo-materiais-pedido">
        <header className={css.tituloSecao}><h3 id="titulo-materiais-pedido"><Package2 size={17} aria-hidden="true" /> Materiais solicitados</h3><span>{total} {total === 1 ? 'unidade' : 'unidades'}</span></header>
        <div className={css.tabela}>
          <div className={css.colunas} aria-hidden="true"><span>Material / localização</span><span>Quantidade</span></div>
          <ul>{solicitacao.materiais.map((material) => <li key={material.id} className={css.material}>
            <div className={css.materialDados}>
              <strong>{material.nome}</strong>
              {material.identificacao && <span className={css.serie}>Identificação: {material.identificacao}</span>}
              <span className={css.localizacao}><MapPin size={13} aria-hidden="true" />{localizacao(material)}</span>
            </div>
            <span className={css.quantidade} aria-label={`${material.quantidade} unidades`}><strong>{material.quantidade}</strong><small>un.</small></span>
          </li>)}</ul>
        </div>
      </section>

      {solicitacao.status === 'Aguardando financeiro' && <section className={css.disponibilidade} aria-labelledby="titulo-disponibilidade-pedido">
        <header className={css.tituloSecao}><h3 id="titulo-disponibilidade-pedido"><CircleDollarSign size={17} aria-hidden="true" /> Disponibilidade para atendimento</h3><span>Depósito e obras</span></header>
        <div className={css.disponibilidadeLista}>{solicitacao.materiais.map((material) => {
          const saldo = disponibilidade(material);
          return <article key={`saldo-${material.id}`}><div><strong>{material.nome}</strong><span>{saldo.locais.length ? saldo.locais.map(([local, quantidade]) => `${local}: ${quantidade}`).join(' · ') : 'Sem saldo disponível no sistema'}</span></div><div><b>{saldo.disponivel} disponível(is)</b><small className={saldo.faltante ? css.faltante : ''}>{saldo.faltante ? `${saldo.faltante} para comprar` : 'Saldo suficiente'}</small></div></article>;
        })}</div>
      </section>}

      {solicitacao.observacao && <section className={css.observacao} aria-labelledby="titulo-observacao-pedido"><h3 id="titulo-observacao-pedido"><MessageSquareText size={16} aria-hidden="true" /> Observação do pedido</h3><p>{solicitacao.observacao}</p></section>}

      {compras.length > 0 && <section className={css.historico} aria-labelledby="titulo-compras-pedido"><h3 id="titulo-compras-pedido"><CircleDollarSign size={16} aria-hidden="true" /> Compras e entradas</h3>{compras.map((material) => <article key={`compra-${material.id}-${material.catalogoChave}`}><strong>{material.nome}</strong><span>Compra solicitada: {material.quantidadeCompra} · Adquirida: {material.quantidadeAdquirida || 0} · Entrada no estoque: {material.quantidadeEntradaEstoque || 0}</span><small>Solicitada em {formatarInstante(material.compraSolicitadaEm)}{material.adquiridaEm ? ` · adquirida em ${formatarInstante(material.adquiridaEm)}` : ''}</small></article>)}</section>}

      {(eventosFinanceiros.length > 0 || solicitacao.transitoEm || solicitacao.concluidaEm) && <section className={css.historico} aria-labelledby="titulo-historico-pedido"><h3 id="titulo-historico-pedido"><History size={16} aria-hidden="true" /> Histórico do atendimento</h3>{eventosFinanceiros.map((evento, indice) => <article key={`${evento.tipo}-${evento.registradoEm}-${indice}`}><strong>{({ APROVACAO_INICIAL: 'Primeira aprovação (Gerência/RH)', INICIO_ATENDIMENTO: 'Compra ou providências iniciadas', ALTERACAO: 'Alteração financeira', APROVACAO: 'Aprovação financeira', REJEICAO: 'Rejeição financeira', REVISAO_PLANO: 'Revisão do atendimento', ATENDIMENTO_PARCIAL: 'Atendimento parcial', AJUSTE_ESTOQUE: 'Ajuste pelo estoque' })[evento.tipo] || 'Alteração do atendimento'}</strong><span>{evento.descricao}</span><small>{formatarInstante(evento.registradoEm)} · {evento.autorNome} ({evento.autorLogin})</small></article>)}{solicitacao.transitoEm && <article><strong>Materiais enviados</strong><small>{formatarInstante(solicitacao.transitoEm)}</small></article>}{solicitacao.concluidaEm && <article><strong>Recebimento confirmado</strong><small>{formatarInstante(solicitacao.concluidaEm)}</small></article>}</section>}
    </div>

    {(podeEditar || aoExportarAuditoria || (financeiro && aoPlanejar) || (solicitacao.status === 'Aprovada' && separado)) && <footer className={css.acoes}>
      <div className={css.acoesSecundarias}>
        {aoExportarAuditoria && <button type="button" disabled={processando} onClick={() => aoExportarAuditoria(solicitacao)} className={css.editar}><FileText size={15} />Vistoria</button>}
        {podeEditar && <button type="button" disabled={processando} onClick={() => aoEditar(solicitacao)} className={css.editar}><Pencil size={15} />Editar</button>}
        {financeiro && !separado && aoPlanejar && <button type="button" disabled={processando} onClick={aoPlanejar} className={css.editar}><CircleDollarSign size={15} />{solicitacao.status === 'Aprovada' ? 'Editar atendimento aprovado' : plano.length ? 'Revisar plano' : 'Definir transporte e compra'}</button>}
        {solicitacao.status === 'Aprovada' && separado && <button type="button" disabled={processando} onClick={() => aoExportarRomaneio(solicitacao)} className={css.editar}><FileText size={15} />Romaneio</button>}
      </div>
      {pendente && <div className={css.acoesDecisao}>
        <button type="button" disabled={processando} onClick={() => aoRejeitar(solicitacao.id)} className={css.rejeitar}><X size={16} />Rejeitar</button>
        <button type="button" disabled={processando || (financeiro && !separado && !plano.length)} onClick={() => aoAprovar(solicitacao.id)} className={css.aceitar}><Check size={16} />{financeiro ? 'Aprovar plano e enviar ao estoque' : 'Aceitar pedido'}</button>
      </div>}
    </footer>}
  </article>;
}
