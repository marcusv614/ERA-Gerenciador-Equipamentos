import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './TelaLogin.module.css';
import './VisualizacaoSenha.css';

export function TelaAlterarSenha() {
  const { trocarSenha, encerrarSessao } = useAutenticacao();
  const [senhaAtual, definirSenhaAtual] = useState(''); const [novaSenha, definirNovaSenha] = useState(''); const [confirmacao, definirConfirmacao] = useState('');
  const [senhasVisiveis, definirSenhasVisiveis] = useState(false); const [erro, definirErro] = useState(''); const [enviando, definirEnviando] = useState(false);
  const rotuloVisibilidade = senhasVisiveis ? 'Ocultar senhas' : 'Visualizar senhas';
  const enviar = async (evento) => { evento.preventDefault(); if(novaSenha.length<6){definirErro('A nova senha precisa ter pelo menos 6 caracteres.');return;} if(novaSenha!==confirmacao){definirErro('A confirmação não corresponde à nova senha.');return;} definirEnviando(true);definirErro('');try{await trocarSenha({senhaAtual,novaSenha});}catch(excecao){definirErro(excecao.message);}finally{definirEnviando(false);} };

  return <main className={estilos.pagina}><section className={estilos.cartao}>
    <img src={logoEra} alt="ERA" className={estilos.logo}/><div><p className={estilos.sobretitulo}>Primeiro acesso</p><h1>Crie sua senha</h1><p className={estilos.descricao}>Substitua a senha temporária antes de acessar o painel.</p></div>
    <form onSubmit={enviar} className={estilos.formulario}>
      <label>Senha temporária<div className={estilos.campo}><input type={senhasVisiveis?'text':'password'} autoComplete="current-password" value={senhaAtual} onChange={(evento)=>definirSenhaAtual(evento.target.value)} required/></div></label>
      <label>Nova senha<div className={estilos.campo}><input type={senhasVisiveis?'text':'password'} autoComplete="new-password" value={novaSenha} onChange={(evento)=>definirNovaSenha(evento.target.value)} required/></div></label>
      <label>Confirmar nova senha<div className={estilos.campo}><input type={senhasVisiveis?'text':'password'} autoComplete="new-password" value={confirmacao} onChange={(evento)=>definirConfirmacao(evento.target.value)} required/><button type="button" className={estilos.visualizarSenha} onClick={()=>definirSenhasVisiveis((visivel)=>!visivel)} aria-label={rotuloVisibilidade} title={rotuloVisibilidade}>{senhasVisiveis?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {erro&&<p className={estilos.erro} role="alert">{erro}</p>}<button disabled={enviando}>{enviando?'Salvando...':'Definir nova senha'}</button><button type="button" className={estilos.secundario} onClick={encerrarSessao}>Sair</button>
    </form>
  </section></main>;
}
