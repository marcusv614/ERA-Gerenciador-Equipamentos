import { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from '../nova-obra-modal/NovaObraModal.module.css';
import { ehFuncionarioEstoquista } from '../../utils/classificacaoFuncionario';

export function ModalEditarFuncionario({ funcionario, funcionarios, obras, aoFechar, aoSalvar, aoArquivar }) {
  const obrasAtuais = useMemo(() => obras
    .filter(({ responsaveis }) => responsaveis?.includes(funcionario.nome))
    .map(({ id }) => String(id)), [funcionario.nome, obras]);
  const [formulario, definirFormulario] = useState({
    nome: funcionario.nome,
    cargo: funcionario.cargo,
    email: funcionario.email || '',
    telefone: funcionario.telefone || '',
    status: funcionario.status || 'Ativo',
    obrasIds: obrasAtuais,
  });
  const envioEmCurso = useRef(false);
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const [arquivando, definirArquivando] = useState(false);
  const estoquista = ehFuncionarioEstoquista(formulario.cargo);
  const emailNormalizado = formulario.email.trim().toLocaleLowerCase('pt-BR');
  const duplicado = funcionarios.some(({ id, email, nome }) => id !== funcionario.id && (
    (emailNormalizado && email?.trim().toLocaleLowerCase('pt-BR') === emailNormalizado) ||
    nome.trim().toLocaleLowerCase('pt-BR') === formulario.nome.trim().toLocaleLowerCase('pt-BR')));
  const podeSalvar = formulario.nome.trim() && formulario.cargo.trim() && !duplicado && !salvando;
  const atualizarCampo = (campo, valor) => definirFormulario((atual) => ({ ...atual, [campo]: valor }));
  const alternarObra = (obraId) => definirFormulario((atual) => ({
    ...atual,
    obrasIds: atual.obrasIds.includes(String(obraId))
      ? atual.obrasIds.filter((id) => id !== String(obraId))
      : [...atual.obrasIds, String(obraId)],
  }));
  const salvar = async () => {
    if (!podeSalvar || arquivando || funcionario.arquivado || envioEmCurso.current) return;
    envioEmCurso.current = true;
    definirSalvando(true);
    definirErro('');
    try {
      const sucesso = await aoSalvar(funcionario, {
        nome: formulario.nome.trim(), cargo: formulario.cargo.trim(), email: emailNormalizado,
        telefone: formulario.telefone.trim(), status: formulario.status,
      }, estoquista ? [] : formulario.obrasIds);
      if (!sucesso) definirErro('Não foi possível salvar. Confira os dados e tente novamente.');
    } catch (excecao) { definirErro(excecao.message); }
    finally { envioEmCurso.current = false; definirSalvando(false); }
  };

  return <EstruturaModal titulo="Editar funcionário" subtitulo={estoquista ? 'Atualize os dados do funcionário' : 'Atualize os dados e as obras sob responsabilidade'} aoFechar={() => { if (!envioEmCurso.current && !arquivando) aoFechar(); }}>
    <form className={styles.form} onSubmit={(evento) => { evento.preventDefault(); salvar(); }}>
      <CampoFormulario rotulo="Nome completo"><input autoFocus className={styles.input} value={formulario.nome} onChange={(evento) => atualizarCampo('nome', evento.target.value)} /></CampoFormulario>
      <CampoFormulario rotulo="Cargo ou função"><input className={styles.input} value={formulario.cargo} onChange={(evento) => atualizarCampo('cargo', evento.target.value)} /></CampoFormulario>
      <div className={styles.grid2}>
        <CampoFormulario rotulo="E-mail (opcional)"><input type="email" className={styles.input} value={formulario.email} onChange={(evento) => atualizarCampo('email', evento.target.value)} /></CampoFormulario>
        <CampoFormulario rotulo="Telefone (opcional)"><input type="tel" className={styles.input} value={formulario.telefone} onChange={(evento) => atualizarCampo('telefone', evento.target.value)} /></CampoFormulario>
      </div>
      <CampoFormulario rotulo="Situação" agrupado><div className={styles.statusRow}>{['Ativo', 'Inativo'].map((status) => <button type="button" key={status} className={`${styles.statusBtn} ${formulario.status === status ? styles.statusBtnActive : ''}`} onClick={() => atualizarCampo('status', status)}>{status}</button>)}</div></CampoFormulario>
      {!estoquista && <CampoFormulario rotulo="Obras sob responsabilidade" agrupado>
        <div className={styles.multiSelectMenu}>{obras.map((obra) => { const selecionada = formulario.obrasIds.includes(String(obra.id)); return <label key={obra.id} className={`${styles.multiSelectOption} ${selecionada ? styles.multiSelectOptionSelected : ''}`}><input type="checkbox" checked={selecionada} onChange={() => alternarObra(obra.id)} /><span className={styles.optionCheck}>{selecionada && <Check size={12} />}</span><span>{obra.nome}</span></label>; })}</div>
        {!obras.length && <small>Nenhuma obra cadastrada.</small>}
      </CampoFormulario>}
      {duplicado && <p role="alert">Já existe outro funcionário com este nome ou e-mail.</p>}
      {erro && <p role="alert">{erro}</p>}
      <div className={styles.actions}><button type="button" className={styles.archive} disabled={arquivando || salvando} onClick={async()=>{if(!window.confirm(`${funcionario.arquivado?'Restaurar':'Arquivar'} “${funcionario.nome}”?`))return;definirArquivando(true);const r=await aoArquivar(funcionario.id,!funcionario.arquivado);if(r.sucesso)aoFechar();else definirErro(r.mensagem);definirArquivando(false);}}>{arquivando?'Salvando...':funcionario.arquivado?'Restaurar registro':'Arquivar registro'}</button><span className={styles.actionsSpacer}/><button type="button" disabled={salvando || arquivando} onClick={aoFechar} className={styles.cancel}>Cancelar</button><button type="submit" disabled={!podeSalvar||funcionario.arquivado||arquivando} className={styles.submit}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button></div>
    </form>
  </EstruturaModal>;
}
