import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { alterarSenha, entrar, obterSessao, sair } from '../services/api/servicoAutenticacaoApi';

const ContextoAutenticacao = createContext(null);
export function ProvedorAutenticacao({ children }) {
  const [usuario, definirUsuario] = useState(null); const [verificando, definirVerificando] = useState(true);
  useEffect(() => { obterSessao().then(definirUsuario).catch(() => definirUsuario(null)).finally(() => definirVerificando(false)); }, []);
  useEffect(() => { const expirar=()=>definirUsuario(null); window.addEventListener('era:sessao-expirada',expirar); return()=>window.removeEventListener('era:sessao-expirada',expirar); }, []);
  const autenticar = async (credenciais) => { const sessao = await entrar(credenciais); definirUsuario(sessao); return sessao; };
  const encerrarSessao = async () => { try { await sair(); } finally { definirUsuario(null); } };
  const trocarSenha = async (dados) => { await alterarSenha(dados); definirUsuario(atual=>({...atual,deveAlterarSenha:false})); };
  const valor = useMemo(() => ({ usuario, verificando, autenticar, encerrarSessao, trocarSenha, ehAdmin: usuario?.perfil === 'ADMIN' }), [usuario, verificando]);
  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAutenticacao() { return useContext(ContextoAutenticacao); }
