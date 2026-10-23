import { clienteHttp, obterDadosResposta } from './clienteHttp';
import { prepararCsrf } from './servicoAutenticacaoApi';

async function enviar(rota, dados) {
  const token = await prepararCsrf();
  return obterDadosResposta(await clienteHttp.post(`/auth/recuperacao/${rota}`, dados, {
    headers: { 'X-XSRF-TOKEN': token }, timeout: 20000,
  }));
}
export const apiRecuperacao = {
  configuracao: async () => obterDadosResposta(await clienteHttp.get('/auth/recuperacao/configuracao')),
  cadastrarEmail: dados => enviar('email', dados),
  confirmarEmail: codigo => enviar('confirmar-email', { codigo }),
  solicitar: login => enviar('solicitar', { login }),
  redefinir: dados => enviar('redefinir', dados),
};
