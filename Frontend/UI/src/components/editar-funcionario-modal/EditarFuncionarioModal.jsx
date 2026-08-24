import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from '../nova-obra-modal/NovaObraModal.module.css';

export function ModalEditarFuncionario({ funcionario, funcionarios, obras, aoFechar, aoSalvar }) {
  const obrasAtuais = useMemo(() => obras
    .filter(({ responsaveis }) => responsaveis?.includes(funcionario.nome))
    .map(({ id }) => String(id)), [funcionario.nome, obras]);
  const [formulario, definirFormulario] = useState({
    nome: funcionario.nome,
    cargo: funcionario.cargo,
    email: funcionario.email,
    telefone: funcionario.telefone || '',
    status: funcionario.status || 'Ativo',
    obrasIds: obrasAtuais,
  });
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const emailNormalizado = formulario.email.trim().toLocaleLowerCase('pt-BR');
  const duplicado = funcionarios.some(({ id, email, nome }) => id !== funcionario.id && (
    email.trim().toLocaleLowerCase('pt-BR') === emailNormalizado ||
    nome.trim().toLocaleLowerCase('pt-BR') === formulario.nome.trim().toLocaleLowerCase('pt-BR')));
  const podeSalvar = formulario.nome.trim() && formulario.cargo.trim() && emailNormalizado && formulario.telefone.trim() && !duplicado && !salvando;
  const atualizarCampo = (campo, valor) => definirFormulario((atual) => ({ ...atual, [campo]: valor }));
  const alternarObra = (obraId) => definirFormulario((atual) => ({
    ...atual,
    obrasIds: atual.obrasIds.includes(String(obraId))
      ? atual.obrasIds.filter((id) => id !== String(obraId))
      : [...atual.obrasIds, String(obraId)],
  }));
  const salvar = async () => {
    if (!podeSalvar) return;
    definirSalvando(true);
    definirErro('');
    try {
      const sucesso = await aoSalvar(funcionario, {
        nome: formulario.nome.trim(), cargo: formulario.cargo.trim(), email: emailNormalizado,
        telefone: formulario.telefone.trim(), status: formulario.status,
      }, formulario.obrasIds);
      if (!sucesso) definirErro('Não foi possível salvar. Confira os dados e tente novamente.');
    } catch (excecao) { definirErro(excecao.message); }
    finally { definirSalvando(false); }
  };

  return <EstruturaModal titulo="Editar funcionário" subtitulo="Atualize os dados e as obras sob responsabilidade" aoFechar={aoFechar}>
    <div className={styles.form}>
      <CampoFormulario rotulo="Nome completo"><input autoFocus className={styles.input} value={formulario.nome} onChange={(evento) => atualizarCampo('nome', evento.target.value)} /></CampoFormulario>
      <CampoFormulario rotulo="Cargo ou função"><input className={styles.input} value={formulario.cargo} onChange={(evento) => atualizarCampo('cargo', evento.target.value)} /></CampoFormulario>
      <div className={styles.grid2}>
        <CampoFormulario rotulo="E-mail"><input type="email" className={styles.input} value={formulario.email} onChange={(evento) => atualizarCampo('email', evento.target.value)} /></CampoFormulario>
        <CampoFormulario rotulo="Telefone"><input type="tel" className={styles.input} value={formulario.telefone} onChange={(evento) => atualizarCampo('telefone', evento.target.value)} /></CampoFormulario>
      </div>
      <CampoFormulario rotulo="Situação"><div className={styles.statusRow}>{['Ativo', 'Inativo'].map((status) => <button type="button" key={status} className={`${styles.statusBtn} ${formulario.status === status ? styles.statusBtnActive : ''}`} onClick={() => atualizarCampo('status', status)}>{status}</button>)}</div></CampoFormulario>
      <CampoFormulario rotulo="Obras sob responsabilidade">
        <div className={styles.multiSelectMenu}>{obras.map((obra) => { const selecionada = formulario.obrasIds.includes(String(obra.id)); return <label key={obra.id} className={`${styles.multiSelectOption} ${selecionada ? styles.multiSelectOptionSelected : ''}`}><input type="checkbox" checked={selecionada} onChange={() => alternarObra(obra.id)} /><span className={styles.optionCheck}>{selecionada && <Check size={12} />}</span><span>{obra.nome}</span></label>; })}</div>
        {!obras.length && <small>Nenhuma obra cadastrada.</small>}
      </CampoFormulario>
      {duplicado && <p role="alert">Já existe outro funcionário com este nome ou e-mail.</p>}
      {erro && <p role="alert">{erro}</p>}
      <div className={styles.actions}><button type="button" onClick={aoFechar} className={styles.cancel}>Cancelar</button><button type="button" disabled={!podeSalvar} onClick={salvar} className={styles.submit}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button></div>
    </div>
  </EstruturaModal>;
}
