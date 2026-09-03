import { useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { tiposEquipamento } from '../../data/constantesDominio';
import { ferramentaManual } from '../../utils/identificacaoEquipamento';
import styles from "./NovoEquipModal.module.css";

const NOVA_CATEGORIA = '__nova_categoria__';

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
  const [novaCategoria, definirNovaCategoria] = useState('');
  const serieNormalizada = form.serie.trim().toLocaleLowerCase('pt-BR');
  const serieJaCadastrada = Boolean(serieNormalizada) && seriesCadastradas.some((serie) =>
    String(serie || '').trim().toLocaleLowerCase('pt-BR') === serieNormalizada);
  const tipoSelecionado = form.tipo === NOVA_CATEGORIA ? novaCategoria.trim() : form.tipo.trim();
  const tipoSemSerie = ferramentaManual(tipoSelecionado);
  const categoriaJaCadastrada = form.tipo === NOVA_CATEGORIA && tiposDisponiveis.some((tipo) =>
    tipo.toLocaleLowerCase('pt-BR') === novaCategoria.trim().toLocaleLowerCase('pt-BR'));
  const canSave = tipoSelecionado && form.modelo.trim() && !serieJaCadastrada && !categoriaJaCadastrada &&
    (!form.obraId || form.tecnico.trim());

  return (
    <EstruturaModal
      titulo="Novo equipamento"
      subtitulo="Cadastre um instrumento na frota"
      aoFechar={aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Tipo">
          <select
            className={styles.input}
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
          >
            {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            <option value={NOVA_CATEGORIA}>Adicionar nova categoria</option>
          </select>
        </CampoFormulario>
        {form.tipo === NOVA_CATEGORIA && <CampoFormulario rotulo="Nova categoria" dica="Ela será adicionada às opções após o cadastro do equipamento.">
          <input
            className={styles.input}
            autoFocus
            maxLength={40}
            placeholder="Ex.: Power meter"
            value={novaCategoria}
            onChange={(e) => definirNovaCategoria(e.target.value)}
          />
          {categoriaJaCadastrada && <small className={styles.erro}>Essa categoria já existe. Selecione-a na lista acima.</small>}
        </CampoFormulario>}
        <CampoFormulario rotulo="Modelo">
          <input
            className={styles.input}
            placeholder="Ex.: EXFO FTB-1v2"
            value={form.modelo}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
          />
        </CampoFormulario>
        {serieJaCadastrada && <p role="alert">Já existe um equipamento com este número de série.</p>}

        {!tipoSemSerie && <CampoFormulario rotulo="Número de série (opcional)" dica="Se ficar vazio, o sistema criará uma identificação interna.">
          <input
            className={`${styles.input} ${styles.mono}`}
            placeholder="Ex.: FTB-88213"
            value={form.serie}
            onChange={(e) => setForm({ ...form, serie: e.target.value })}
          />
        </CampoFormulario>}

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
                tipo: tipoSelecionado,
                modelo: form.modelo.trim(),
                serie: tipoSemSerie ? null : form.serie.trim() || null,
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
