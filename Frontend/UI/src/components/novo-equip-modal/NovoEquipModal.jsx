import { useState } from "react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { tiposEquipamento } from '../../data/constantesDominio';
import { ferramentaManual } from '../../utils/identificacaoEquipamento';
import { obterDataAtual } from '../../utils/datas';
import styles from "./NovoEquipModal.module.css";

const NOVA_CATEGORIA = '__nova_categoria__';

export function ModalNovoEquipamento({ equipamento = null, obras, tecnicosCadastrados, seriesCadastradas, tiposDisponiveis = tiposEquipamento, aoFechar, aoSalvar, aoArquivar }) {
  const editando = Boolean(equipamento);
  const [form, setForm] = useState({
    tipo: equipamento?.tipo || "OTDR",
    modelo: equipamento?.modelo || "",
    serie: equipamento?.serie || "",
    status: equipamento?.status || "Em estoque",
    obraId: equipamento?.obraId || "",
    tecnico: equipamento?.tecnico || "",
    data: equipamento?.dataEntrada || equipamento?.data || obterDataAtual(),
  });
  const [novaCategoria, definirNovaCategoria] = useState('');
  const [adicionandoCategoria, definirAdicionandoCategoria] = useState(false);
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false);
  const [excluindo, definirExcluindo] = useState(false);
  const [erroExclusao, definirErroExclusao] = useState('');
  const serieNormalizada = form.serie.trim().toLocaleLowerCase('pt-BR');
  const serieOriginalNormalizada = String(equipamento?.serie || '').trim().toLocaleLowerCase('pt-BR');
  const serieJaCadastrada = Boolean(serieNormalizada) && seriesCadastradas.some((serie) =>
    String(serie || '').trim().toLocaleLowerCase('pt-BR') === serieNormalizada) && serieNormalizada !== serieOriginalNormalizada;
  const tipoSelecionado = adicionandoCategoria ? novaCategoria.trim() : form.tipo.trim();
  const tipoSemSerie = ferramentaManual(tipoSelecionado);
  const categoriaJaCadastrada = adicionandoCategoria && tiposDisponiveis.some((tipo) =>
    tipo.toLocaleLowerCase('pt-BR') === novaCategoria.trim().toLocaleLowerCase('pt-BR'));
  const tecnicosDisponiveis = equipamento?.tecnico && !tecnicosCadastrados.includes(equipamento.tecnico)
    ? [equipamento.tecnico, ...tecnicosCadastrados]
    : tecnicosCadastrados;
  const obrasDisponiveis = obras.filter(({ id, status }) =>
    status !== 'Concluída' || String(id) === String(equipamento?.obraId));
  const canSave = tipoSelecionado && form.modelo.trim() && form.data && !serieJaCadastrada && !categoriaJaCadastrada;
  const excluirRegistro = async () => {
    definirExcluindo(true);
    definirErroExclusao('');
    const resultado = await aoArquivar(!equipamento.arquivado);
    if (!resultado.sucesso) definirErroExclusao(resultado.mensagem || 'Não foi possível alterar o arquivamento.');
    definirExcluindo(false);
  };

  return (
    <EstruturaModal
      titulo={editando ? 'Editar equipamento' : 'Novo equipamento'}
      subtitulo={editando ? 'Atualize os dados do equipamento' : 'Cadastre um instrumento na frota'}
      aoFechar={aoFechar}
    >
      <div className={styles.form}>
        <CampoFormulario rotulo="Tipo">
          <select
            className={styles.input}
            value={form.tipo}
            onChange={(e) => {
              const tipo = e.target.value;
              definirAdicionandoCategoria(tipo === NOVA_CATEGORIA);
              if (tipo !== NOVA_CATEGORIA) definirNovaCategoria('');
              setForm((dadosAtuais) => ({ ...dadosAtuais, tipo }));
            }}
            aria-controls="campo-nova-categoria"
            aria-expanded={adicionandoCategoria}
          >
            {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
            <option value={NOVA_CATEGORIA}>Adicionar nova categoria</option>
          </select>
        </CampoFormulario>
        {adicionandoCategoria && <div id="campo-nova-categoria" className={styles.novaCategoria}>
          <CampoFormulario rotulo="Nome da nova categoria" dica="A categoria será registrada ao adicionar o primeiro equipamento.">
            <input
              className={styles.input}
              autoFocus
              maxLength={40}
              placeholder="Ex.: Power meter"
              value={novaCategoria}
              onChange={(e) => definirNovaCategoria(e.target.value)}
              required
            />
            {categoriaJaCadastrada && <small className={styles.erro}>Essa categoria já existe. Selecione-a na lista acima.</small>}
          </CampoFormulario>
        </div>}
        <CampoFormulario rotulo="Nome do equipamento">
          <input
            className={styles.input}
            placeholder="Ex.: OTDR EXFO FTB-1v2"
            value={form.modelo}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
            required
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
          <CampoFormulario rotulo="Localização" dica={editando ? 'Para alterar a localização, use a ação “Mover” e acompanhe aprovação, separação e recebimento.' : null}>
            <select
              className={styles.input}
              value={form.obraId}
              disabled={editando}
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
              {obrasDisponiveis.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </CampoFormulario>
          <CampoFormulario rotulo="Técnico responsável (opcional)" dica={editando ? 'O responsável acompanha a movimentação do equipamento.' : form.obraId ? 'Você pode definir o responsável agora ou posteriormente.' : 'Disponível quando o equipamento estiver localizado em uma obra.'}>
            <select
              className={styles.input}
              value={form.tecnico}
              onChange={(e) => setForm({ ...form, tecnico: e.target.value })}
              disabled={editando || !form.obraId}
            >
              <option value="">Sem técnico responsável</option>
              {tecnicosDisponiveis.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </select>
          </CampoFormulario>
        </div>

        <CampoFormulario rotulo="Data de entrada">
          <input
            type="date"
            className={styles.input}
            value={form.data}
            max={obterDataAtual()}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
            required
          />
        </CampoFormulario>

        {editando && confirmandoExclusao && <div className={styles.confirmacaoExclusao} role="alertdialog" aria-label="Confirmar arquivamento do equipamento">
          <div><strong>{equipamento.arquivado?'Restaurar registro?':'Arquivar registro?'}</strong><span>O histórico será preservado. Ferramentas arquivadas não aparecem nos fluxos operacionais.</span></div>
          {erroExclusao && <p>{erroExclusao}</p>}
          <div><button type="button" onClick={() => { definirConfirmandoExclusao(false); definirErroExclusao(''); }} disabled={excluindo}>Cancelar</button><button type="button" onClick={excluirRegistro} disabled={excluindo}>{excluindo ? 'Salvando...' : equipamento.arquivado?'Restaurar':'Arquivar'}</button></div>
        </div>}

        <div className={styles.actions}>
          {editando && !confirmandoExclusao && <button type="button" onClick={() => definirConfirmandoExclusao(true)} className={styles.delete}>{equipamento.arquivado?'Restaurar registro':'Arquivar registro'}</button>}
          <span className={styles.actionsSpacer} />
          <button onClick={aoFechar} className={styles.cancel}>
            Cancelar
          </button>
          <button
            disabled={!canSave||equipamento?.arquivado}
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
            {editando ? 'Salvar alterações' : 'Adicionar equipamento'}
          </button>
        </div>
      </div>
    </EstruturaModal>
  );
}
