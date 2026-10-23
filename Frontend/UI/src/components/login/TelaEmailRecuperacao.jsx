import { useState } from 'react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiRecuperacao } from '../../services/api/servicoRecuperacaoApi';
import logoEra from '../../assets/ERALTDA.png';
import estilos from './TelaLogin.module.css';

export function FormularioEmailRecuperacao({ aoConcluir }) {
  const { usuario, atualizarSessao } = useAutenticacao();
  const configuracao = usuario.recuperacao || {};
  const [email, definirEmail] = useState(configuracao.emailPendente || '');
  const [senhaAtual, definirSenhaAtual] = useState('');
  const [codigo, definirCodigo] = useState('');
  const [destino, definirDestino] = useState(configuracao.emailPendente || '');
  const [enviando, definirEnviando] = useState(false);
  const [erro, definirErro] = useState('');
  const [mensagem, definirMensagem] = useState('');
  const [editar, definirEditar] = useState(false);

  const enviar = async evento => {
    evento.preventDefault(); if (enviando) return;
    definirEnviando(true); definirErro(''); definirMensagem('');
    try {
      await apiRecuperacao.cadastrarEmail({ email: email.trim(), senhaAtual });
      definirDestino(email.trim()); definirSenhaAtual(''); definirCodigo(''); definirEditar(false);
      definirMensagem('Código enviado. Confira também a pasta de spam. O código expira em 15 minutos.');
    } catch (e) { definirErro(e.message); } finally { definirEnviando(false); }
  };
  const confirmar = async evento => {
    evento.preventDefault(); if (enviando) return;
    definirEnviando(true); definirErro('');
    try {
      await apiRecuperacao.confirmarEmail(codigo);
      await atualizarSessao(); aoConcluir?.();
    } catch (e) { definirErro(e.message); } finally { definirEnviando(false); }
  };
  if (configuracao.erro) return <div className={estilos.formulario}><p className={estilos.erro} role="alert">Não foi possível verificar a configuração de recuperação.</p><button type="button" onClick={atualizarSessao}>Tentar novamente</button></div>;
  if (!configuracao.disponivel) return <p className={estilos.descricao}>O envio de e-mails ainda não foi configurado no servidor. O responsável pela instalação deve configurar o Gmail antes de habilitar este recurso.</p>;
  return <div className={estilos.recuperacao}>
    {configuracao.emailVerificado && <p className={estilos.informacao}>E-mail confirmado: <strong>{configuracao.emailVerificado}</strong>. Ele permanece válido até você confirmar outro endereço.</p>}
    {destino && !editar ? <form className={estilos.formulario} onSubmit={confirmar}>
      <p className={estilos.informacao}>Digite o código de 8 números enviado para <strong>{destino}</strong>.</p>
      <label>Código de confirmação<div className={estilos.campo}><input autoFocus autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} value={codigo} onChange={e=>definirCodigo(e.target.value.replace(/\D/g, ''))} required disabled={enviando}/></div></label>
      {mensagem && <p role="status" className={estilos.informacao}>{mensagem}</p>}
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      <button disabled={enviando || codigo.length !== 8}>{enviando ? 'Confirmando…' : 'Confirmar e-mail'}</button>
      <button type="button" className={estilos.secundario} disabled={enviando} onClick={()=>{definirEditar(true);definirErro('');definirMensagem('');}}>Alterar e-mail ou solicitar outro código</button>
    </form> : <form className={estilos.formulario} onSubmit={enviar}>
      <p className={estilos.informacao}>Cadastre um endereço que só você acessa. Pode ser seu Gmail pessoal. Nunca informe a senha do Google neste formulário.</p>
      <label>E-mail de recuperação<div className={estilos.campo}><input type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>definirEmail(e.target.value)} disabled={enviando} required/></div></label>
      <label>Sua senha atual do sistema ERA<div className={estilos.campo}><input type="password" autoComplete="current-password" maxLength={128} value={senhaAtual} onChange={e=>definirSenhaAtual(e.target.value)} disabled={enviando} required/></div></label>
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      <button disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar código de confirmação'}</button>
      {destino && <button type="button" className={estilos.secundario} disabled={enviando} onClick={()=>{definirEditar(false);definirErro('');}}>Já tenho um código</button>}
    </form>}
  </div>;
}

export function TelaEmailRecuperacao() {
  const { encerrarSessao } = useAutenticacao();
  return <main className={estilos.pagina}><section className={estilos.cartao} aria-labelledby="titulo-email">
    <img src={logoEra} alt="ERA" className={estilos.logo}/>
    <div><p className={estilos.sobretitulo}>Proteção do administrador</p><h1 id="titulo-email">E-mail de recuperação</h1><p className={estilos.descricao}>Confirme seu e-mail antes de acessar o painel. Essa etapa é exclusiva para administradores.</p></div>
    <FormularioEmailRecuperacao/>
    <div className={estilos.formulario}><button type="button" className={estilos.secundario} onClick={encerrarSessao}>Sair</button></div>
  </section></main>;
}
