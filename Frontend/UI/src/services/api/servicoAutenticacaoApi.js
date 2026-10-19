import { ROTAS_API } from '../../config/rotasApi';
import { clienteHttp, obterDadosResposta } from './clienteHttp';
import { avisarAposSucesso, notificarSucesso } from '../notificacoes';

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
  notificarSucesso('Sua nova senha foi salva.');
}

export const apiUsuarios = {
  listar: async () => obterDadosResposta(await clienteHttp.get(ROTAS_API.usuarios)),
  cadastrar: async (dados) => obterDadosResposta(await avisarAposSucesso(clienteHttp.post(ROTAS_API.usuarios, dados), 'Usuário criado. A senha temporária deverá ser trocada no primeiro acesso.')),
  atualizar: async (id, dados) => obterDadosResposta(await avisarAposSucesso(clienteHttp.put(ROTAS_API.usuario(id), dados), 'Alterações do usuário salvas.')),
  definirStatus: async (id, ativo) => obterDadosResposta(await avisarAposSucesso(clienteHttp.patch(ROTAS_API.statusUsuario(id), { ativo }), ativo ? 'Usuário reativado.' : 'Usuário desativado.')),
  redefinirSenha: async (id, senhaTemporaria) => obterDadosResposta(await avisarAposSucesso(clienteHttp.post(ROTAS_API.redefinirSenhaUsuario(id), { senhaTemporaria }), 'Senha temporária redefinida. A troca será solicitada no próximo acesso.')),
};
