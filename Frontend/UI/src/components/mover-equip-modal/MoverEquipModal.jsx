import { useRef, useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { obterDataAtual } from '../../utils/datas';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import styles from "./MoverEquipModal.module.css";

export function ModalMovimentarEquipamento({ equipamento, obras, tecnicosCadastrados, erroApi, aoFechar, aoSalvar }) {
  const [obraId, definirObraId] = useState(equipamento.obraId || "");
  const [tecnico, definirTecnico] = useState(equipamento.tecnico || "");
  const [dataMovimentacao, definirDataMovimentacao] = useState(obterDataAtual());
  const [quantidade, definirQuantidade] = useState(1);
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const emEnvio = useRef(false);
  const tecnicoNaOrigem = equipamento.tecnico?.trim() || '';
  const tecnicoResponsavel = !obraId && tecnicoNaOrigem ? tecnicoNaOrigem : tecnico;
  const quantidadeDisponivel = equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1;
  const controlaLote = equipamento.controleQuantidade === 'LOTE' || quantidadeDisponivel > 1;
  const destinoAtual = equipamento.obraId == null ? '' : String(equipamento.obraId);
  const destinoInalterado = String(obraId) === destinoAtual;
  const valido = !destinoInalterado && dataMovimentacao && Number.isInteger(quantidade)
    && quantidade >= 1 && quantidade <= quantidadeDisponivel && Boolean(tecnicoResponsavel.trim());
  const salvar = async () => {
    if (!valido || emEnvio.current) return;
    emEnvio.current = true; definirSalvando(true); definirErro('');
    try {
      const sucesso = await aoSalvar(equipamento.id, {
        obraId: obraId ? Number(obraId) : null,
        tecnico: tecnicoResponsavel,
        dataMovimentacao,
        quantidade,
      });
      if (sucesso === false) definirErro('Não foi possível solicitar a movimentação. Tente novamente.');
    } catch (e) { definirErro(e.message || 'Não foi possível solicitar a movimentação.'); }
    finally { emEnvio.current = false; definirSalvando(false); }
  };

  return (
    <EstruturaModal
      titulo="Solicitar movimentação"
      subtitulo={`${equipamento.modelo}${identificacaoVisivel(equipamento.serie, equipamento.tipo) ? ` · ${equipamento.serie}` : ''}`}
      aoFechar={salvando ? () => {} : aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Novo destino" dica={destinoInalterado ? 'Escolha um local diferente da localização atual.' : null}>
          <select
            disabled={salvando}
            className={styles.input}
            value={obraId}
            onChange={(e) => {
              const novoDestino = e.target.value;
              definirObraId(novoDestino);
              definirTecnico(novoDestino ? '' : tecnicoNaOrigem);
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
            disabled={salvando}
            type="date"
            className={styles.input}
            value={dataMovimentacao}
            max={obterDataAtual()}
            onChange={(e) => definirDataMovimentacao(e.target.value)}
          />
        </CampoFormulario>

        {controlaLote && <CampoFormulario rotulo="Quantidade">
          <input
            disabled={salvando}
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

        <CampoFormulario rotulo={obraId ? 'Técnico responsável pelo recebimento' : 'Técnico responsável pela retirada'}>
          {!obraId && tecnicoNaOrigem ? <p className={styles.responsavel}>{tecnicoNaOrigem}</p> : <select
            className={styles.input}
            value={tecnico}
            onChange={(e) => definirTecnico(e.target.value)}
            disabled={salvando}
          >
            <option value="">Selecione um funcionário</option>
            {tecnicosCadastrados.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
          </select>}
          {!obraId && <small>O técnico de origem permanece vinculado à retirada. O estoque confirma a chegada ao depósito.</small>}
        </CampoFormulario>

        {erro && <p role="alert" className={styles.erro}>{erroApi || erro}</p>}
        <div className={styles.actions}>
          <button disabled={salvando} onClick={aoFechar} className={styles.cancel}>Cancelar</button>
          <button
            disabled={!valido || salvando}
            onClick={salvar}
            className={styles.submit}
          >
            {salvando ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </div>
      </div>
    </EstruturaModal>
  );
}
