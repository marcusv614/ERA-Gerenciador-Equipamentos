import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from '../nova-obra-modal/NovaObraModal.module.css';

export function ModalNovoUsuario({ funcionarios, aoFechar, aoSalvar }) {
  const [dados, definirDados] = useState({ funcionarioId: '', nome: '', login: '', senhaTemporaria: '', perfil: 'TECNICO' });
  const [senhaVisivel, definirSenhaVisivel] = useState(false); const [erro, definirErro] = useState(''); const [salvando, definirSalvando] = useState(false);
  const alterar = (campo, valor) => definirDados((atual) => ({ ...atual, [campo]: valor }));
  const selecionarFuncionario = (id) => { const funcionario = funcionarios.find((item) => String(item.id) === id); definirDados((atual) => ({ ...atual, funcionarioId: id, nome: funcionario?.nome || atual.nome, login: funcionario?.email || atual.login })); };
  const salvar = async () => { definirErro(''); definirSalvando(true); try { await aoSalvar({ ...dados, funcionarioId: dados.funcionarioId ? Number(dados.funcionarioId) : null, login: dados.login.trim().toLowerCase() }); aoFechar(); } catch (excecao) { definirErro(excecao.message); } finally { definirSalvando(false); } };
  const valido = dados.nome.trim() && dados.login.trim() && dados.senhaTemporaria.length >= 6;
  const rotuloVisibilidade = senhaVisivel ? 'Ocultar senha' : 'Visualizar senha';

  return <EstruturaModal titulo="Novo usuário" subtitulo="Conceda acesso ao painel e defina as permissões" aoFechar={aoFechar}><div className={styles.form}>
    <CampoFormulario rotulo="Funcionário vinculado (opcional)"><select className={styles.input} value={dados.funcionarioId} onChange={(evento) => selecionarFuncionario(evento.target.value)}><option value="">Sem vínculo</option>{funcionarios.map((funcionario) => <option key={funcionario.id} value={funcionario.id}>{funcionario.nome}</option>)}</select></CampoFormulario>
    <CampoFormulario rotulo="Nome exibido"><input className={styles.input} value={dados.nome} onChange={(evento) => alterar('nome', evento.target.value)} /></CampoFormulario>
    <CampoFormulario rotulo="Login"><input autoComplete="off" className={styles.input} value={dados.login} onChange={(evento) => alterar('login', evento.target.value)} /></CampoFormulario>
    <div className={styles.grid2}>
      <CampoFormulario rotulo="Perfil"><select className={styles.input} value={dados.perfil} onChange={(evento) => alterar('perfil', evento.target.value)}><option value="TECNICO">Técnico</option><option value="GERENTE">Gerente</option><option value="ADMIN">Administrador</option></select></CampoFormulario>
      <CampoFormulario rotulo="Senha temporária (mínimo 6)"><div style={{ display: 'flex', alignItems: 'center' }}><input type={senhaVisivel ? 'text' : 'password'} autoComplete="new-password" className={styles.input} value={dados.senhaTemporaria} onChange={(evento) => alterar('senhaTemporaria', evento.target.value)} /><button type="button" onClick={() => definirSenhaVisivel((visivel) => !visivel)} aria-label={rotuloVisibilidade} title={rotuloVisibilidade} style={{ width: 40, height: 40, marginLeft: -44, border: 0, background: 'transparent', cursor: 'pointer' }}>{senhaVisivel ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></CampoFormulario>
    </div>
    {erro && <p role="alert">{erro}</p>}<div className={styles.actions}><button onClick={aoFechar} className={styles.cancel}>Cancelar</button><button disabled={!valido || salvando} onClick={salvar} className={styles.submit}>{salvando ? 'Salvando...' : 'Criar usuário'}</button></div>
  </div></EstruturaModal>;
}
