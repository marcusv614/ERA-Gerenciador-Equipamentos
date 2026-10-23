import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { alterarSenha, entrar, obterSessao, sair } from '../services/api/servicoAutenticacaoApi';
import { apiRecuperacao } from '../services/api/servicoRecuperacaoApi';

async function completarSessao(sessao) {
  if (sessao.perfil !== 'ADMIN' || sessao.deveAlterarSenha) return sessao;
  try { return { ...sessao, recuperacao: await apiRecuperacao.configuracao() }; }
  catch (erro) { if (erro.status === 401) throw erro; return { ...sessao, recuperacao: { erro: true } }; }
}

const ContextoAutenticacao = createContext(null);
export function ProvedorAutenticacao({ children }) {
  const [usuario, definirUsuario] = useState(null); const [verificando, definirVerificando] = useState(true);
  useEffect(() => { obterSessao().then(completarSessao).then(definirUsuario).catch(() => definirUsuario(null)).finally(() => definirVerificando(false)); }, []);
  useEffect(() => { const expirar=()=>definirUsuario(null); window.addEventListener('era:sessao-expirada',expirar); return()=>window.removeEventListener('era:sessao-expirada',expirar); }, []);
  const autenticar = useCallback(async (credenciais) => { const sessao = await completarSessao(await entrar(credenciais)); definirUsuario(sessao); return sessao; }, []);
  const encerrarSessao = useCallback(async () => { try { await sair(); } finally { definirUsuario(null); } }, []);
  const atualizarSessao = useCallback(async () => { const sessao = await completarSessao(await obterSessao()); definirUsuario(sessao); return sessao; }, []);
  const trocarSenha = useCallback(async (dados) => { await alterarSenha(dados); await atualizarSessao(); }, [atualizarSessao]);
  const valor = useMemo(() => ({
    usuario, verificando, autenticar, encerrarSessao, trocarSenha, atualizarSessao,
    ehAdmin: usuario?.perfil === 'ADMIN',
    podeGerenciarCadastros: ['ADMIN', 'GERENTE'].includes(usuario?.perfil),
  }), [usuario, verificando, autenticar, encerrarSessao, trocarSenha, atualizarSessao]);
  return <ContextoAutenticacao.Provider value={valor}>{children}</ContextoAutenticacao.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAutenticacao() { return useContext(ContextoAutenticacao); }
