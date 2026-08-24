import { useState } from 'react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from '../nova-obra-modal/NovaObraModal.module.css';

export function ModalNovoFuncionario({ funcionariosCadastrados, aoFechar, aoSalvar }) {
  const [formulario, definirFormulario] = useState({
    nome: '', cargo: '', email: '', telefone: '',
  });
  const emailNormalizado = formulario.email.trim().toLocaleLowerCase('pt-BR');
  const nomeNormalizado = formulario.nome.trim().toLocaleLowerCase('pt-BR');
  const funcionarioJaCadastrado = funcionariosCadastrados.some(({ email, nome }) =>
    email.trim().toLocaleLowerCase('pt-BR') === emailNormalizado ||
    nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado);
  const podeSalvar = formulario.nome.trim() && formulario.cargo.trim() &&
    emailNormalizado && formulario.telefone.trim() && !funcionarioJaCadastrado;
  const atualizarCampo = (campo, valor) =>
    definirFormulario((dadosAtuais) => ({ ...dadosAtuais, [campo]: valor }));

  return <EstruturaModal titulo="Novo funcionário" subtitulo="Cadastre um integrante da equipe" aoFechar={aoFechar}>
    <div className={styles.form}>
      <CampoFormulario rotulo="Nome completo"><input autoFocus className={styles.input} value={formulario.nome} onChange={(evento) => atualizarCampo('nome', evento.target.value)} /></CampoFormulario>
      <CampoFormulario rotulo="Cargo ou função"><input className={styles.input} placeholder="Ex.: Técnico de campo" value={formulario.cargo} onChange={(evento) => atualizarCampo('cargo', evento.target.value)} /></CampoFormulario>
      <div className={styles.grid2}>
        <CampoFormulario rotulo="E-mail"><input type="email" className={styles.input} value={formulario.email} onChange={(evento) => atualizarCampo('email', evento.target.value)} /></CampoFormulario>
        <CampoFormulario rotulo="Telefone"><input type="tel" className={styles.input} placeholder="(92) 99999-9999" value={formulario.telefone} onChange={(evento) => atualizarCampo('telefone', evento.target.value)} /></CampoFormulario>
      </div>
      {funcionarioJaCadastrado && <p role="alert">Já existe um funcionário com este nome ou e-mail.</p>}
      <div className={styles.actions}>
        <button onClick={aoFechar} className={styles.cancel}>Cancelar</button>
        <button disabled={!podeSalvar} onClick={() => aoSalvar(formulario)} className={styles.submit}>Adicionar funcionário</button>
      </div>
    </div>
  </EstruturaModal>;
}
