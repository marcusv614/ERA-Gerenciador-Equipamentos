import { useState } from 'react';
import { apiRecuperacao } from '../../services/api/servicoRecuperacaoApi';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { validarNovaSenhaRecuperacao } from '../../utils/recuperacaoConta';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './TelaLogin.module.css';

export function TelaRecuperarSenha({ token = '', aoVoltar }) {
  const { encerrarSessao } = useAutenticacao();
  const [login, definirLogin] = useState('');
  const [senha, definirSenha] = useState('');
  const [confirmacao, definirConfirmacao] = useState('');
  const [erro, definirErro] = useState('');
  const [mensagem, definirMensagem] = useState('');
  const [enviando, definirEnviando] = useState(false);
  const enviar = async evento => {
    evento.preventDefault(); if (enviando) return;
    definirErro('');
    if (token) { const erroSenha = validarNovaSenhaRecuperacao(senha, confirmacao); if (erroSenha) { definirErro(erroSenha); return; } }
    definirEnviando(true);
    try {
      if (token) {
        await apiRecuperacao.redefinir({ token, novaSenha: senha });
        definirSenha(''); definirConfirmacao('');
        try { await encerrarSessao(); } catch { /* A redefinição já revogou as sessões antigas. */ }
        definirMensagem('Senha redefinida. Entre novamente com seu login e a nova senha.');
      } else { const resposta = await apiRecuperacao.solicitar(login.trim()); definirMensagem(resposta.mensagem); }
    } catch (e) { definirErro(e.message); } finally { definirEnviando(false); }
  };
  return <main className={estilos.pagina}><section className={estilos.cartao} aria-labelledby="titulo-recuperacao">
    <img src={logoEra} alt="ERA" className={estilos.logo}/>
    <div><p className={estilos.sobretitulo}>Conta de administrador</p><h1 id="titulo-recuperacao">{token ? 'Crie uma nova senha' : 'Recuperar acesso'}</h1><p className={estilos.descricao}>{token ? 'O link é válido por 15 minutos e só pode ser usado uma vez.' : 'A recuperação por e-mail é exclusiva para administradores. Para outros perfis, procure o administrador do sistema.'}</p></div>
    <form className={estilos.formulario} onSubmit={enviar}>
      {!mensagem && (token ? <>
        <label>Nova senha<div className={estilos.campo}><input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={senha} onChange={e=>definirSenha(e.target.value)} required disabled={enviando}/></div></label>
        <label>Confirmar nova senha<div className={estilos.campo}><input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmacao} onChange={e=>definirConfirmacao(e.target.value)} required disabled={enviando}/></div></label>
      </> : <label>Login do administrador<div className={estilos.campo}><input autoComplete="username" maxLength={120} value={login} onChange={e=>definirLogin(e.target.value)} required disabled={enviando}/></div></label>)}
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      {mensagem ? <p role="status" className={estilos.informacao}>{mensagem}</p> : <button disabled={enviando}>{enviando ? 'Aguarde…' : token ? 'Salvar nova senha' : 'Enviar instruções'}</button>}
      <button type="button" className={estilos.secundario} disabled={enviando} onClick={aoVoltar}>Voltar ao acesso</button>
    </form>
  </section></main>;
}
