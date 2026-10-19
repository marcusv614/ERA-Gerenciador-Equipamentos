import { Building2, Check, FileText, MapPin, MessageSquareText, Package2, Pencil, UserRound, X } from 'lucide-react';
import css from './DetalhesSolicitacao.module.css';

export function DetalhesSolicitacao({ solicitacao, processando, buscarObraPorId, aoAprovar, aoRejeitar, aoEditar, aoExportarRomaneio }) {
  const origem = solicitacao.obraOrigemId ? buscarObraPorId(solicitacao.obraOrigemId)?.nome || 'Obra não disponível' : 'Depósito central';
  const destino = solicitacao.obraDestinoId ? buscarObraPorId(solicitacao.obraDestinoId)?.nome || 'Obra não disponível' : 'Depósito central';
  const pendente = solicitacao.status === 'Pendente';
  const podeEditar = ['Pendente', 'Aprovada'].includes(solicitacao.status);
  const separado = solicitacao.materiais.every(({ identificacao }) => identificacao);
  const total = solicitacao.materiais.reduce((quantidade, material) => quantidade + material.quantidade, 0);
  const localizacao = (material) => {
    if (!material.identificacao) return 'Aguardando seleção pelo estoque';
    if (solicitacao.status === 'Concluída') return `Recebido em ${destino}`;
    if (solicitacao.status === 'Em trânsito') return `Em transporte: ${origem} → ${destino}`;
    if (solicitacao.status === 'Rejeitada') return `Origem informada: ${origem}`;
    return `Coleta em ${origem}`;
  };

  return <article className={css.detalhes} aria-label="Conteúdo da solicitação">
    <div className={css.conteudo}>
      <section className={css.destino} aria-label="Destino do pedido">
        <span className={css.iconeDestino}><Building2 size={22} aria-hidden="true" /></span>
        <div><h3>{solicitacao.obraDestinoId ? 'Obra de destino' : 'Destino da retirada'}</h3><p>{destino}</p></div>
      </section>
      {solicitacao.solicitante && solicitacao.solicitante !== solicitacao.tecnico && <p className={css.solicitante}><UserRound size={14} aria-hidden="true" /> Pedido por <strong>{solicitacao.solicitante}</strong></p>}

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

      {solicitacao.observacao && <section className={css.observacao} aria-labelledby="titulo-observacao-pedido"><h3 id="titulo-observacao-pedido"><MessageSquareText size={16} aria-hidden="true" /> Observação do pedido</h3><p>{solicitacao.observacao}</p></section>}
    </div>

    {(podeEditar || (solicitacao.status === 'Aprovada' && separado)) && <footer className={css.acoes}>
      <div className={css.acoesSecundarias}>
        {podeEditar && <button type="button" disabled={processando} onClick={() => aoEditar(solicitacao)} className={css.editar}><Pencil size={15} />Editar</button>}
        {solicitacao.status === 'Aprovada' && separado && <button type="button" disabled={processando} onClick={() => aoExportarRomaneio(solicitacao)} className={css.editar}><FileText size={15} />Romaneio</button>}
      </div>
      {pendente && <div className={css.acoesDecisao}>
        <button type="button" disabled={processando} onClick={() => aoRejeitar(solicitacao.id)} className={css.rejeitar}><X size={16} />Rejeitar</button>
        <button type="button" disabled={processando} onClick={() => aoAprovar(solicitacao.id)} className={css.aceitar}><Check size={16} />Aceitar pedido</button>
      </div>}
    </footer>}
  </article>;
}
