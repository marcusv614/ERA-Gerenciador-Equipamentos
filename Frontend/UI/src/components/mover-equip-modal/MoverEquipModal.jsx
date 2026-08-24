import { useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { statusEquipamento } from "../../data/mockData";
import { obterDataAtual } from '../../utils/datas';
import styles from "./MoverEquipModal.module.css";

export function ModalMovimentarEquipamento({ equipamento, obras, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [obraId, definirObraId] = useState(equipamento.obraId || "");
  const [status, definirStatus] = useState(equipamento.status);
  const [tecnico, definirTecnico] = useState(equipamento.tecnico || "");
  const [dataMovimentacao, definirDataMovimentacao] = useState(obterDataAtual());
  const [quantidade, definirQuantidade] = useState(1);
  const quantidadeDisponivel = equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1;
  const controlaLote = equipamento.controleQuantidade === 'LOTE' || quantidadeDisponivel > 1;
  const statusPermitidos = obraId
    ? statusEquipamento.filter((opcao) => ['Em campo', 'Em trânsito'].includes(opcao))
    : statusEquipamento.filter((opcao) => ['Em estoque', 'Em manutenção'].includes(opcao));

  return (
    <EstruturaModal
      titulo="Solicitar movimentação"
      subtitulo={`${equipamento.modelo} · ${equipamento.serie}`}
      aoFechar={aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Novo destino">
          <select
            className={styles.input}
            value={obraId}
            onChange={(e) => {
              const novoDestino = e.target.value;
              definirObraId(novoDestino);
              definirStatus(novoDestino ? 'Em campo' : 'Em estoque');
              if (!novoDestino) definirTecnico('');
            }}
          >
            <option value="">Depósito central</option>
            {obras.filter(({ status: statusObra }) => statusObra !== 'Concluída').map((o) => (
              <option key={o.id} value={o.id}>{o.nome}</option>
            ))}
          </select>
        </CampoFormulario>

        <CampoFormulario rotulo="Data de movimentação">
          <input
            type="date"
            className={styles.input}
            value={dataMovimentacao}
            max={obterDataAtual()}
            onChange={(e) => definirDataMovimentacao(e.target.value)}
          />
        </CampoFormulario>

        {controlaLote && <CampoFormulario rotulo="Quantidade">
          <input
            type="number"
            min="1"
            max={quantidadeDisponivel}
            className={styles.input}
            value={quantidade}
            onChange={(e) => definirQuantidade(Math.max(1, Math.min(quantidadeDisponivel, Number(e.target.value) || 1)))}
          />
          <small>{quantidadeDisponivel} unidades disponíveis</small>
        </CampoFormulario>}

        <CampoFormulario rotulo="Status">
          <div className={styles.statusWrap}>
            {statusPermitidos.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => definirStatus(s)}
                className={`${styles.statusBtn} ${status === s ? styles.statusBtnActive : ""}`}
              >
                {s}
              </button>
            ))}
          </div>
        </CampoFormulario>

        <CampoFormulario rotulo="Técnico responsável">
          <select
            className={styles.input}
            value={tecnico}
            onChange={(e) => definirTecnico(e.target.value)}
            disabled={!obraId}
          >
            <option value="">Selecione um funcionário</option>
            {tecnicosCadastrados.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
          </select>
        </CampoFormulario>

        <div className={styles.actions}>
          <button onClick={aoFechar} className={styles.cancel}>Cancelar</button>
          <button
            disabled={!dataMovimentacao || quantidade < 1 || quantidade > quantidadeDisponivel || (Boolean(obraId) && !tecnico.trim())}
            onClick={() =>
              aoSalvar(equipamento.id, {
                obraId: obraId || null,
                status,
                tecnico: tecnico || null,
                dataMovimentacao,
                quantidade,
              })
            }
            className={styles.submit}
          >
            Enviar solicitação
          </button>
        </div>
      </div>
    </EstruturaModal>
  );
}
