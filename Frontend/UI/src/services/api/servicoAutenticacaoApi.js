import { ROTAS_API } from '../../config/rotasApi';
import { clienteHttp, obterDadosResposta } from './clienteHttp';

export async function prepararCsrf() {
  const resposta = await clienteHttp.get(ROTAS_API.csrf);
  return obterDadosResposta(resposta).token;
}
export async function entrar(credenciais) {
  const tokenCsrf = await prepararCsrf();
  return obterDadosResposta(await clienteHttp.post(ROTAS_API.login, credenciais, {
    headers: { 'X-XSRF-TOKEN': tokenCsrf },
  }));
}
export async function obterSessao() { return obterDadosResposta(await clienteHttp.get(ROTAS_API.sessao)); }
export async function sair() {
  const tokenCsrf = await prepararCsrf();
  await clienteHttp.post(ROTAS_API.logout, null, { headers: { 'X-XSRF-TOKEN': tokenCsrf } });
}
export async function alterarSenha(dados) {
  const tokenCsrf = await prepararCsrf();
  await clienteHttp.post(ROTAS_API.alterarSenha, dados, { headers: { 'X-XSRF-TOKEN': tokenCsrf } });
}

export const apiUsuarios = {
  listar: async () => obterDadosResposta(await clienteHttp.get(ROTAS_API.usuarios)),
  cadastrar: async (dados) => obterDadosResposta(await clienteHttp.post(ROTAS_API.usuarios, dados)),
  definirStatus: async (id, ativo) => obterDadosResposta(await clienteHttp.patch(ROTAS_API.statusUsuario(id), { ativo })),
  redefinirSenha: async (id, senhaTemporaria) => obterDadosResposta(await clienteHttp.post(ROTAS_API.redefinirSenhaUsuario(id), { senhaTemporaria })),
};
