import { useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { tiposEquipamento, iconePorTipoEquipamento } from '../../data/mockData';
import { Wrench } from 'lucide-react';
import styles from "./NovoEquipModal.module.css";

export function ModalNovoEquipamento({ obras, tecnicosCadastrados, seriesCadastradas, tiposDisponiveis = tiposEquipamento, aoFechar, aoSalvar }) {
  const [form, setForm] = useState({
    tipo: "OTDR",
    modelo: "",
    serie: "",
    status: "Em estoque",
    obraId: "",
    tecnico: "",
    data: "",
  });
  const serieNormalizada = form.serie.trim().toLocaleLowerCase('pt-BR');
  const serieJaCadastrada = seriesCadastradas.some((serie) =>
    serie.trim().toLocaleLowerCase('pt-BR') === serieNormalizada);
  const canSave = form.modelo.trim() && serieNormalizada && !serieJaCadastrada &&
    (!form.obraId || form.tecnico.trim());

  return (
    <EstruturaModal
      titulo="Novo equipamento"
      subtitulo="Cadastre um instrumento na frota"
      aoFechar={aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Tipo">
          <div className={styles.typeRow}>
            {tiposDisponiveis.map((t) => {
              const Icon = iconePorTipoEquipamento[t] || Wrench;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm({ ...form, tipo: t })}
                  className={`${styles.typeBtn} ${form.tipo === t ? styles.typeBtnActive : ""}`}
                >
                  <Icon size={13} />
                  {t === "Outro" ? "Outro" : t}
                </button>
              );
            })}
          </div>
        </CampoFormulario>
        <CampoFormulario rotulo="Modelo">
          <input
            className={styles.input}
            placeholder="Ex.: EXFO FTB-1v2"
            value={form.modelo}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
          />
        </CampoFormulario>
        {serieJaCadastrada && <p role="alert">Já existe um equipamento com este número de série.</p>}

        <CampoFormulario rotulo="Número de série">
          <input
            className={`${styles.input} ${styles.mono}`}
            placeholder="Ex.: FTB-88213"
            value={form.serie}
            onChange={(e) => setForm({ ...form, serie: e.target.value })}
          />
        </CampoFormulario>

        <div className={styles.grid2}>
          <CampoFormulario rotulo="Localização">
            <select
              className={styles.input}
              value={form.obraId}
              onChange={(e) =>
                setForm({
                  ...form,
                  obraId: e.target.value,
                  status: e.target.value ? "Em campo" : "Em estoque",
                  tecnico: e.target.value ? form.tecnico : '',
                })
              }
            >
              <option value="">Depósito central</option>
              {obras.filter(({ status }) => status !== 'Concluída').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </CampoFormulario>
          <CampoFormulario rotulo="Técnico responsável">
            <select
              className={styles.input}
              value={form.tecnico}
              onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
              disabled={!form.obraId}
            >
              <option value="">Selecione um funcionário</option>
              {tecnicosCadastrados.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </select>
          </CampoFormulario>
        </div>

        <CampoFormulario rotulo="Data de entrada (opcional)">
          <input
            type="date"
            className={styles.input}
            value={form.data}
            max={new Date().toLocaleDateString('sv-SE')}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
        </CampoFormulario>

        <div className={styles.actions}>
          <button onClick={aoFechar} className={styles.cancel}>
            Cancelar
          </button>
          <button
            disabled={!canSave}
            onClick={() =>
              aoSalvar({
                ...form,
                obraId: form.obraId || null,
                tecnico: form.tecnico || null,
                data: form.data || null,
              })
            }
            className={styles.submit}
          >
            Adicionar equipamento
          </button>
        </div>
      </div>
    </EstruturaModal>
  );
}
