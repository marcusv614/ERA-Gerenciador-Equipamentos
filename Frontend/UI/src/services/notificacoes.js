export const DURACAO_NOTIFICACAO = 6000;
let avisos = [];
let sequencia = 0;
const ouvintes = new Set();
const publicar = () => ouvintes.forEach((ouvinte) => ouvinte());

export function observarNotificacoes(ouvinte) { ouvintes.add(ouvinte); return () => ouvintes.delete(ouvinte); }
export function obterNotificacoes() { return avisos; }
export function fecharNotificacao(id) { avisos = avisos.filter((aviso) => aviso.id !== id); publicar(); }
export function notificarSucesso(mensagem) {
  const id = ++sequencia;
  avisos = [...avisos, { id, mensagem, duracao: DURACAO_NOTIFICACAO }];
  publicar();
  return id;
}
export async function avisarAposSucesso(operacao, mensagem) {
  const resultado = await operacao;
  notificarSucesso(typeof mensagem === 'function' ? mensagem(resultado) : mensagem);
  return resultado;
}
export function tempoRestante(restante, decorrido, pausado) { return pausado ? restante : Math.max(0, restante - Math.max(0, decorrido)); }
