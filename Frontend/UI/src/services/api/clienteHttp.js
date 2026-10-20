import axios from 'axios';
import { mensagemErroApi } from '../../utils/errosApi';

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
    const rota = String(erro.config?.url || '').split('?')[0];
    if (erro.response?.status === 401 && !['/auth/login', '/auth/csrf'].includes(rota)) {
      window.dispatchEvent(new Event('era:sessao-expirada'));
    }
    const mensagem = mensagemErroApi(erro);
    const erroNormalizado = new Error(mensagem);
    erroNormalizado.status = erro.response?.status;
    erroNormalizado.dados = erro.response?.data;
    return Promise.reject(erroNormalizado);
  },
);

export function obterDadosResposta(resposta) {
  return resposta.data?.dados ?? resposta.data;
}
