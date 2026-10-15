import axios from 'axios';

export const clienteHttp = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: Number(import.meta.env.VITE_API_TIMEOUT || 10000),
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

clienteHttp.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    if (erro.response?.status === 401 && !String(erro.config?.url || '').includes('/auth/')) window.dispatchEvent(new Event('era:sessao-expirada'));
    const status = erro.response?.status;
    const mensagem = status >= 500
      ? 'Não foi possível concluir a operação. Tente novamente. Se persistir, contate o suporte.'
      : erro.response?.data?.mensagem || (erro.code === 'ECONNABORTED'
        ? 'O servidor demorou para responder. Confira o pedido antes de tentar novamente.'
        : 'Não foi possível comunicar com a API. Verifique sua conexão e tente novamente.');
    const erroNormalizado = new Error(mensagem);
    erroNormalizado.status = erro.response?.status;
    erroNormalizado.dados = erro.response?.data;
    return Promise.reject(erroNormalizado);
  },
);

export function obterDadosResposta(resposta) {
  return resposta.data?.dados ?? resposta.data;
}
