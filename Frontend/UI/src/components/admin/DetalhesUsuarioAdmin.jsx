import { KeyRound, Pencil, Power, ShieldCheck } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { contaBloqueada, formatarInstanteAdmin, PERFIS_USUARIO, perfilDeCampo } from '../../utils/administracaoUsuarios';
import css from './PainelAdmin.module.css';

export function DetalhesUsuarioAdmin({ usuario, funcionario, propriaConta, ultimoAdmin, aoFechar, aoEditar, aoSenha, aoStatus }) {
  const motivo=propriaConta?'Sua própria conta não pode ser desativada.':ultimoAdmin?'O último administrador ativo não pode ser desativado.':'';
  return <EstruturaModal titulo={usuario.nome} subtitulo={`Acesso #${usuario.id} · ${usuario.login}`} aoFechar={aoFechar}>
    <div className={css.detalhes}>
      <section><h3><ShieldCheck size={16}/>Perfil e permissões</h3><strong>{PERFIS_USUARIO[usuario.perfil]?.nome||usuario.perfil}</strong><p>{PERFIS_USUARIO[usuario.perfil]?.descricao}</p></section>
      <dl className={css.ficha}>
        <div><dt>Conta</dt><dd><span className={css.selo} data-tom={usuario.ativo?'ativo':'inativo'}>{usuario.ativo?'Ativa':'Inativa'}</span></dd></div>
        <div><dt>Senha</dt><dd>{usuario.deveAlterarSenha?'Troca obrigatória no próximo acesso':'Sem troca obrigatória pendente'}</dd></div>
        <div className={css.linhaInteira}><dt>Funcionário vinculado</dt><dd>{funcionario?`${funcionario.nome} · ${funcionario.cargo} · ${funcionario.arquivado?'Arquivado':funcionario.status}`:perfilDeCampo(usuario.perfil)?'Vínculo obrigatório ausente. Revise este usuário.':'Não exigido para este perfil.'}</dd></div>
        <div><dt>Criado em</dt><dd>{formatarInstanteAdmin(usuario.criadoEm)}</dd></div>
        <div><dt>Último login</dt><dd>{formatarInstanteAdmin(usuario.ultimoLogin)}</dd></div>
        <div><dt>Última troca de senha registrada</dt><dd>{formatarInstanteAdmin(usuario.senhaAlteradaEm)}</dd></div>
        <div><dt>Bloqueio temporário</dt><dd>{contaBloqueada(usuario)?`Até ${formatarInstanteAdmin(usuario.bloqueadoAte)}`:'Sem bloqueio vigente'}</dd></div>
      </dl>
      <small className={css.muted}>Horários de Manaus. “Sem registro” indica que a informação não foi armazenada; não significa que nunca houve acesso.</small>
      {propriaConta&&<p className={css.aviso}>Ao editar ou redefinir a senha da sua conta, será necessário entrar novamente.</p>}
      <div className={css.acoesDetalhes}>
        <button type="button" onClick={aoEditar}><Pencil size={16}/>Editar usuário</button>
        <button type="button" onClick={aoSenha}><KeyRound size={16}/>Redefinir senha</button>
        <button type="button" className={usuario.ativo?css.perigo:css.reativar} disabled={usuario.ativo&&!!motivo} onClick={aoStatus}><Power size={16}/>{usuario.ativo?'Desativar acesso':'Reativar acesso'}</button>
      </div>
      {motivo&&<small className={css.muted}>{motivo}</small>}
    </div>
  </EstruturaModal>;
}
