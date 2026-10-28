import { useRef, useState } from 'react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from '../nova-obra-modal/NovaObraModal.module.css';

export function ModalNovoFuncionario({ funcionariosCadastrados, aoFechar, aoSalvar, erroApi }) {
  const [formulario, definirFormulario] = useState({
    nome: '', cargo: '', email: '', telefone: '',
  });
  const emailNormalizado = formulario.email.trim().toLocaleLowerCase('pt-BR');
  const nomeNormalizado = formulario.nome.trim().toLocaleLowerCase('pt-BR');
  const funcionarioJaCadastrado = funcionariosCadastrados.some(({ email, nome }) =>
    (emailNormalizado && email?.trim().toLocaleLowerCase('pt-BR') === emailNormalizado) ||
    nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado);
  const podeSalvar = formulario.nome.trim() && formulario.cargo.trim() && !funcionarioJaCadastrado;
  const atualizarCampo = (campo, valor) =>
    definirFormulario((dadosAtuais) => ({ ...dadosAtuais, [campo]: valor }));

  const envioEmCurso = useRef(false);
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const salvar = async () => {
    if (!podeSalvar || envioEmCurso.current) return;
    envioEmCurso.current = true;
    definirSalvando(true);
    definirErro('');
    try {
      const sucesso = await aoSalvar(formulario);
      if (sucesso === false) definirErro('Não foi possível salvar. Confira os dados e tente novamente.');
    } catch (excecao) { definirErro(excecao.message || 'Não foi possível salvar. Tente novamente.'); }
    finally { envioEmCurso.current = false; definirSalvando(false); }
  };

  return <EstruturaModal titulo="Novo funcionário" subtitulo="Cadastre um integrante da equipe" aoFechar={() => { if (!envioEmCurso.current) aoFechar(); }}>
    <form className={styles.form} onSubmit={(evento) => { evento.preventDefault(); salvar(); }}>
      <CampoFormulario rotulo="Nome completo"><input autoFocus className={styles.input} value={formulario.nome} onChange={(evento) => atualizarCampo('nome', evento.target.value)} /></CampoFormulario>
      <CampoFormulario rotulo="Cargo ou função"><input className={styles.input} placeholder="Ex.: Técnico de campo" value={formulario.cargo} onChange={(evento) => atualizarCampo('cargo', evento.target.value)} /></CampoFormulario>
      <div className={styles.grid2}>
        <CampoFormulario rotulo="E-mail (opcional)"><input type="email" className={styles.input} value={formulario.email} onChange={(evento) => atualizarCampo('email', evento.target.value)} /></CampoFormulario>
        <CampoFormulario rotulo="Telefone (opcional)"><input type="tel" className={styles.input} placeholder="(92) 99999-9999" value={formulario.telefone} onChange={(evento) => atualizarCampo('telefone', evento.target.value)} /></CampoFormulario>
      </div>
      {funcionarioJaCadastrado && <p role="alert">Já existe um funcionário com este nome ou e-mail.</p>}
      {erro && <p role="alert">{erroApi || erro}</p>}
      <div className={styles.actions}>
        <button type="button" disabled={salvando} onClick={aoFechar} className={styles.cancel}>Cancelar</button>
        <button type="submit" disabled={!podeSalvar || salvando} className={styles.submit}>{salvando ? 'Salvando...' : 'Adicionar funcionário'}</button>
      </div>
    </form>
  </EstruturaModal>;
}
