import { useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { obterDataAtual } from '../../utils/datas';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import styles from "./MoverEquipModal.module.css";

export function ModalMovimentarEquipamento({ equipamento, obras, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [obraId, definirObraId] = useState(equipamento.obraId || "");
  const [tecnico, definirTecnico] = useState(equipamento.tecnico || "");
  const [dataMovimentacao, definirDataMovimentacao] = useState(obterDataAtual());
  const [quantidade, definirQuantidade] = useState(1);
  const quantidadeDisponivel = equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1;
  const controlaLote = equipamento.controleQuantidade === 'LOTE' || quantidadeDisponivel > 1;
  const destinoAtual = equipamento.obraId == null ? '' : String(equipamento.obraId);
  const destinoInalterado = String(obraId) === destinoAtual;

  return (
    <EstruturaModal
      titulo="Solicitar movimentação"
      subtitulo={`${equipamento.modelo}${identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : ''}`}
      aoFechar={aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Novo destino" dica={destinoInalterado ? 'Escolha um local diferente da localização atual.' : null}>
          <select
            className={styles.input}
            value={obraId}
            onChange={(e) => {
              const novoDestino = e.target.value;
              definirObraId(novoDestino);
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

        <p>O estoque registra o envio e o técnico confirma o recebimento na obra. Para bloquear unidades para reparo, use a ação Manutenção do equipamento.</p>

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
            disabled={destinoInalterado || !dataMovimentacao || quantidade < 1 || quantidade > quantidadeDisponivel || (Boolean(obraId) && !tecnico.trim())}
            onClick={() =>
              aoSalvar(equipamento.id, {
                obraId: obraId || null,
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
