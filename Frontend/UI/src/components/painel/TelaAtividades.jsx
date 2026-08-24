import { ArrowRight, Check, Clock3, FileDown, Pencil, Route, X } from 'lucide-react';
import { formatarData } from '../../utils/datas';

const CONFIGURACAO_STATUS = [
  { status: 'Pendente', titulo: 'Solicitações pendentes', descricao: 'Aguardando sua análise e decisão.', classe: 'atividadeStatusPendente' },
  { status: 'Aprovada', titulo: 'Solicitações aprovadas', descricao: 'Autorizações concedidas para as equipes.', classe: 'atividadeStatusAprovada' },
  { status: 'Rejeitada', titulo: 'Solicitações rejeitadas', descricao: 'Pedidos que não foram autorizados.', classe: 'atividadeStatusRejeitada' },
];

export function TelaAtividades({ solicitacoes, buscarObraPorId, aoAprovar, aoRejeitar, aoEditar, aoExportarCautela, estilos }) {
  const contarPorStatus = (status) => solicitacoes.filter((solicitacao) => solicitacao.status === status).length;

  const renderizarSolicitacao = (solicitacao, classeStatus) => {
    const obraOrigem = solicitacao.obraOrigemId ? buscarObraPorId(solicitacao.obraOrigemId) : null;
    const obraDestino = solicitacao.obraDestinoId ? buscarObraPorId(solicitacao.obraDestinoId) : null;
    const pendente = solicitacao.status === 'Pendente';
    const podeEditar = solicitacao.status !== 'Rejeitada';

    return <article key={solicitacao.id} className={estilos.atividadeCard}>
      <header className={estilos.atividadeCabecalho}>
        <div className={estilos.atividadeIcone}><Route size={19} /></div>
        <div className={estilos.atividadeTitulo}>
          <div><h2>{solicitacao.tipo} de material</h2><span className={`${estilos.atividadeStatus} ${estilos[classeStatus]}`}>{solicitacao.status}</span></div>
          <p>Solicitada por <strong>{solicitacao.solicitante || solicitacao.tecnico}</strong> em {formatarData(solicitacao.dataSolicitacao)}</p>
        </div>
      </header>

      <div className={estilos.atividadeRota}>
        <div><span>Origem</span><strong>{obraOrigem?.nome || 'Depósito central'}</strong></div>
        <ArrowRight size={18} aria-hidden="true" />
        <div><span>Destino</span><strong>{obraDestino?.nome || 'Depósito central'}</strong></div>
      </div>

      <div className={estilos.atividadeMateriais}>
        <h3>Materiais solicitados</h3>
        <ul>{solicitacao.materiais.map((material) => <li key={material.id}><span className={estilos.materialQuantidade}>{material.quantidade}x</span><span>{material.nome}{material.identificacao && <small>{material.identificacao}</small>}</span></li>)}</ul>
      </div>

      {solicitacao.observacao && <p className={estilos.atividadeObservacao}>{solicitacao.observacao}</p>}

      <footer className={estilos.atividadeAcoes}>
        <div className={estilos.atividadeAcoesDocumento}>
          <button type="button" onClick={() => aoExportarCautela(solicitacao)} className={estilos.atividadeCautela}><FileDown size={15} /> Exportar cautela</button>
          <button type="button" onClick={() => aoEditar(solicitacao)} disabled={!podeEditar} className={estilos.atividadeEditar}><Pencil size={15} /> Editar</button>
        </div>
        <div className={estilos.atividadeAcoesDecisao}>
          <button type="button" onClick={() => aoRejeitar(solicitacao.id)} disabled={!pendente} className={estilos.atividadeRejeitar}><X size={15} /> Rejeitar</button>
          <button type="button" onClick={() => aoAprovar(solicitacao.id)} disabled={!pendente} className={estilos.atividadeAprovar}><Check size={15} /> Aprovar</button>
        </div>
      </footer>
    </article>;
  };

  return <section className={estilos.atividadesTela}>
    <div className={estilos.atividadesResumo} aria-label="Resumo das solicitações">
      <div><Clock3 size={17} /><span><strong>{contarPorStatus('Pendente')}</strong> pendentes</span></div>
      <div><Check size={17} /><span><strong>{contarPorStatus('Aprovada')}</strong> aprovadas</span></div>
      <div><X size={17} /><span><strong>{contarPorStatus('Rejeitada')}</strong> rejeitadas</span></div>
    </div>

    <div className={estilos.atividadesGrupos}>
      {CONFIGURACAO_STATUS.map((grupo) => {
        const solicitacoesDoGrupo = solicitacoes.filter(({ status }) => status === grupo.status);
        return <section key={grupo.status} className={estilos.atividadeGrupo}>
          <header className={estilos.atividadeGrupoCabecalho}>
            <div><h2>{grupo.titulo}</h2><p>{grupo.descricao}</p></div>
            <span>{solicitacoesDoGrupo.length}</span>
          </header>
          {solicitacoesDoGrupo.length > 0
            ? <div className={estilos.atividadesLista}>{solicitacoesDoGrupo.map((solicitacao) => renderizarSolicitacao(solicitacao, grupo.classe))}</div>
            : <div className={estilos.atividadeGrupoVazio}>Nenhuma solicitação nesta categoria.</div>}
        </section>;
      })}
    </div>
  </section>;
}
