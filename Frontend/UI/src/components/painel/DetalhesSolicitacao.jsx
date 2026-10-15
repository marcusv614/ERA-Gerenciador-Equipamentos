import {
  Check,
  Download,
  FileText,
  Pencil,
  Route,
  X,
} from "lucide-react";
import { formatarData } from "../../utils/datas";

const CONFIGURACAO_STATUS = [
  {
    status: "Pendente",
    titulo: "Solicitações pendentes",
    descricao: "Aguardando sua análise e decisão.",
    classe: "atividadeStatusPendente",
  },
  {
    status: "Aprovada",
    titulo: "Em preparação pelo estoque",
    descricao: "Solicitações autorizadas que ainda precisam ser separadas e enviadas.",
    classe: "atividadeStatusAprovada",
  },
  {
    status: "Aguardando coleta",
    titulo: "Aguardando coleta",
    descricao: "Retiradas autorizadas aguardando confirmação do estoque.",
    classe: "atividadeStatusPendente",
  },
  {
    status: "Em trânsito",
    titulo: "Em trânsito",
    descricao: "Materiais enviados aguardando confirmação de recebimento.",
    classe: "atividadeStatusPendente",
  },
  {
    status: "Concluída",
    titulo: "Movimentações concluídas",
    descricao: "Recebimento confirmado e estoque atualizado.",
    classe: "atividadeStatusAprovada",
  },
  {
    status: "Rejeitada",
    titulo: "Solicitações rejeitadas",
    descricao: "Pedidos que não foram autorizados.",
    classe: "atividadeStatusRejeitada",
  },
];

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
    const rotuloStatus = solicitacao.status === "Aprovada"
      ? (aguardandoDefinicao ? "Aguardando separação" : "Pronta para envio")
      : solicitacao.status;

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
                {rotuloStatus}
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
                  <Check size={15} /> Aprovar
                </button>
              </>
            )}
          </div>
        </footer>
      </article>
    );
  };

  const configuracao = CONFIGURACAO_STATUS.find(({ status }) => status === solicitacao.status);
  return renderizarSolicitacao(solicitacao, configuracao?.classe || "atividadeStatusPendente");
}
