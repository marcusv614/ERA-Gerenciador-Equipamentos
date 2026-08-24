import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { CampoFormulario } from '../field/Field';
import { statusObra } from '../../data/mockData';
import { obterDataAtual } from '../../utils/datas';
import styles from './NovaObraModal.module.css';

export function ModalNovaObra({ tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [form, setForm] = useState({
    nome: '', cliente: '', cidade: '', responsaveis: [], inicio: '', status: 'Planejada',
  });
  const canSave = form.nome.trim() && form.cliente.trim() && form.cidade.trim() && form.responsaveis.length > 0;
  const alternarResponsavel = (nome) => setForm((dadosAtuais) => ({
    ...dadosAtuais,
    responsaveis: dadosAtuais.responsaveis.includes(nome)
      ? dadosAtuais.responsaveis.filter((responsavel) => responsavel !== nome)
      : [...dadosAtuais.responsaveis, nome],
  }));

  return (
    <EstruturaModal titulo="Nova obra" subtitulo="Cadastre uma nova frente de trabalho" aoFechar={aoFechar}>
      <div className={styles.form}>
        <CampoFormulario rotulo="Nome da obra">
          <input
            autoFocus
            className={styles.input}
            placeholder="Ex.: Expansão FTTH — Zona Norte"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
        </CampoFormulario>

        <div className={styles.grid2}>
          <CampoFormulario rotulo="Cliente">
            <input
              className={styles.input}
              placeholder="Ex.: Claro"
              value={form.cliente}
              onChange={(e) => setForm({ ...form, cliente: e.target.value })}
            />
          </CampoFormulario>
          <CampoFormulario rotulo="Cidade / UF">
            <input
              className={styles.input}
              placeholder="Ex.: Manaus, AM"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </CampoFormulario>
        </div>

        <CampoFormulario rotulo="Técnicos responsáveis">
          <details className={styles.multiSelect}>
            <summary className={styles.multiSelectTrigger}>
              <span>{form.responsaveis.length ? `${form.responsaveis.length} técnico(s) selecionado(s)` : 'Selecionar técnicos'}</span>
              <ChevronDown size={15} />
            </summary>
            <div className={styles.multiSelectMenu}>
              {tecnicosCadastrados.map((nome) => (
                <label key={nome} className={`${styles.multiSelectOption} ${form.responsaveis.includes(nome) ? styles.multiSelectOptionSelected : ''}`}>
                  <input type="checkbox" checked={form.responsaveis.includes(nome)} onChange={() => alternarResponsavel(nome)} />
                  <span className={styles.optionCheck}>{form.responsaveis.includes(nome) && <Check size={12} />}</span>
                  <span>{nome}</span>
                </label>
              ))}
            </div>
          </details>
          {form.responsaveis.length > 0 && <div className={styles.selectedChips}>
            {form.responsaveis.map((nome) => <span key={nome} className={styles.selectedChip}>{nome}<button type="button" onClick={() => alternarResponsavel(nome)} aria-label={`Remover ${nome}`}><X size={11} /></button></span>)}
          </div>}
        </CampoFormulario>

        <CampoFormulario rotulo="Data de início">
          <input
            type="date"
            className={styles.input}
            value={form.inicio}
            onChange={(e) => setForm({ ...form, inicio: e.target.value })}
          />
        </CampoFormulario>

        <CampoFormulario rotulo="Status inicial">
          <div className={styles.statusRow}>
            {statusObra.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={`${styles.statusBtn} ${form.status === s ? styles.statusBtnActive : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </CampoFormulario>

        <div className={styles.actions}>
          <button onClick={aoFechar} className={styles.cancel}>Cancelar</button>
          <button
            disabled={!canSave}
            onClick={() =>
              aoSalvar({ ...form, inicio: form.inicio || obterDataAtual() })
            }
            className={styles.submit}
          >
            Criar obra
          </button>
        </div>
      </div>
    </EstruturaModal>
  );
}
