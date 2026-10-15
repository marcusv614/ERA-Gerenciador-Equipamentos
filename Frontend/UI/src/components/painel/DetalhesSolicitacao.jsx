import {
  Check,
  Download,
  FileText,
  Pencil,
  Route,
  X,
} from "lucide-react";
import { formatarData } from "../../utils/datas";
import { obterEtapaSolicitacao } from "../../utils/statusSolicitacao";

const CLASSE_POR_ETAPA = {
  pendente: "atividadeStatusPendente",
  aceita: "atividadeStatusAprovada",
  finalizada: "atividadeStatusAprovada",
  rejeitada: "atividadeStatusRejeitada",
};

export function DetalhesSolicitacao({
  solicitacao,
  processando,
  cautelas,
  buscarObraPorId,
  aoAprovar,
  aoRejeitar,
  aoEditar,
  aoExportarRomaneio,
  aoExportarCautela,
  estilos,
}) {
  const renderizarSolicitacao = (solicitacao, classeStatus) => {
    const obraOrigem = solicitacao.obraOrigemId
      ? buscarObraPorId(solicitacao.obraOrigemId)
      : null;
    const obraDestino = solicitacao.obraDestinoId
      ? buscarObraPorId(solicitacao.obraDestinoId)
      : null;
    const pendente = solicitacao.status === "Pendente";
    const podeEditar = ["Pendente", "Aprovada"].includes(solicitacao.status);
    const aguardandoDefinicao = solicitacao.materiais.some(
      ({ identificacao }) => !identificacao,
    );
    const cautelasDaSolicitacao = cautelas.filter(
      ({ solicitacaoId }) => solicitacaoId === solicitacao.id,
    );
    const etapa = obterEtapaSolicitacao(solicitacao.status);

    return (
      <article key={solicitacao.id} className={estilos.atividadeCard}>
        <header className={estilos.atividadeCabecalho}>
          <div className={estilos.atividadeIcone}>
            <Route size={19} />
          </div>
          <div className={estilos.atividadeTitulo}>
            <div>
              <h2>{solicitacao.tipo} de material</h2>
              <span
                className={`${estilos.atividadeStatus} ${estilos[classeStatus]}`}
              >
                {etapa.rotulo}
              </span>
            </div>
            <p>
              Solicitada por{" "}
              <strong>{solicitacao.solicitante || solicitacao.tecnico}</strong>{" "}
              em {formatarData(solicitacao.dataSolicitacao)}
            </p>
          </div>
        </header>

        <p className={estilos.atividadeObservacao}>Destino: <strong>{obraDestino?.nome || "Depósito central"}</strong></p>

        <div className={estilos.atividadeMateriais}>
          <h3>Materiais solicitados</h3>
          <ul>
            {solicitacao.materiais.map((material) => (
              <li key={material.id}>
                <span className={estilos.materialQuantidade}>
                  {material.quantidade}x
                </span>
                <span>
                  {material.nome}
                  <small>{!material.identificacao ? 'Equipamento ainda não selecionado' : solicitacao.status === 'Concluída' ? `Recebido em ${obraDestino?.nome || 'Depósito central'}` : solicitacao.status === 'Em trânsito' ? `Em transporte: ${obraOrigem?.nome || 'Depósito central'} → ${obraDestino?.nome || 'Depósito central'}` : `Local de coleta: ${obraOrigem?.nome || 'Depósito central'}`}</small>
                  {material.identificacao && (
                    <small>{material.identificacao}</small>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {solicitacao.observacao && (
          <p className={estilos.atividadeObservacao}>
            {solicitacao.observacao}
          </p>
        )}

        <footer className={estilos.atividadeAcoes}>
          <div className={estilos.atividadeAcoesDocumento}>
            {podeEditar && (
              <button
                disabled={processando}
                type="button"
                onClick={() => aoEditar(solicitacao)}
                className={estilos.atividadeEditar}
              >
                <Pencil size={15} /> Editar solicitação
              </button>
            )}
            {solicitacao.status === "Aprovada" && !aguardandoDefinicao && (
              <button
                disabled={processando}
                type="button"
                onClick={() => aoExportarRomaneio(solicitacao)}
                className={estilos.atividadeEditar}
              >
                <FileText size={15} /> Romaneio
              </button>
            )}
            {cautelasDaSolicitacao.map((cautela) => (
              <button
                disabled={processando}
                type="button"
                key={cautela.id}
                onClick={() => aoExportarCautela(cautela)}
                className={estilos.atividadeEditar}
              >
                <Download size={15} /> Cautela
              </button>
            ))}
          </div>
          <div className={estilos.atividadeAcoesDecisao}>
            {pendente && (
              <>
                <button
                  disabled={processando}
                type="button"
                  onClick={() => aoRejeitar(solicitacao.id)}
                  className={estilos.atividadeRejeitar}
                >
                  <X size={15} /> Rejeitar
                </button>
                <button
                  disabled={processando}
                type="button"
                  onClick={() => aoAprovar(solicitacao.id)}
                  className={estilos.atividadeAprovar}
                >
                  <Check size={15} /> Aceitar
                </button>
              </>
            )}
          </div>
        </footer>
      </article>
    );
  };

  const etapa = obterEtapaSolicitacao(solicitacao.status);
  return renderizarSolicitacao(solicitacao, CLASSE_POR_ETAPA[etapa.chave] || "atividadeStatusPendente");
}
