import { useState } from 'react';
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './TelaLogin.module.css';
import './VisualizacaoSenha.css';

export function TelaLogin() {
  const { autenticar } = useAutenticacao();
  const [login, definirLogin] = useState('');
  const [senha, definirSenha] = useState('');
  const [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [erro, definirErro] = useState('');
  const [enviando, definirEnviando] = useState(false);
  const rotuloVisibilidade = senhaVisivel ? 'Ocultar senha' : 'Visualizar senha';

  const enviar = async (evento) => {
    evento.preventDefault(); definirErro(''); definirEnviando(true);
    try { await autenticar({ login, senha }); }
    catch (excecao) {
      definirErro(excecao.status === 401
        ? 'Login ou senha inválidos. Confira os dados e tente novamente.'
        : 'Não foi possível acessar o servidor. Verifique se a API está atualizada e em execução.');
    }
    finally { definirEnviando(false); }
  };

  return <main className={estilos.pagina}><section className={estilos.cartao} aria-labelledby="titulo-login">
    <img src={logoEra} alt="ERA" className={estilos.logo} />
    <div><p className={estilos.sobretitulo}>Gestão de ativos e obras</p><h1 id="titulo-login">Acesse o painel</h1><p className={estilos.descricao}>Use as credenciais fornecidas pelo administrador.</p></div>
    <form onSubmit={enviar} className={estilos.formulario}>
      <label>Usuário<div className={estilos.campo}><UserRound size={18}/><input autoFocus autoComplete="username" value={login} onChange={(evento)=>definirLogin(evento.target.value)} required /></div></label>
      <label>Senha<div className={estilos.campo}><LockKeyhole size={18}/><input type={senhaVisivel ? 'text' : 'password'} autoComplete="current-password" value={senha} onChange={(evento)=>definirSenha(evento.target.value)} required /><button type="button" className={estilos.visualizarSenha} onClick={()=>definirSenhaVisivel((visivel)=>!visivel)} aria-label={rotuloVisibilidade} title={rotuloVisibilidade}>{senhaVisivel?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {erro&&<p className={estilos.erro} role="alert">{erro}</p>}
      <button disabled={enviando}>{enviando?'Entrando...':'Entrar'}</button>
    </form>
  </section></main>;
}
