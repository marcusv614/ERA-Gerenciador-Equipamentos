// Executar somente contra a API temporária criada por validar-fluxo-requisicoes.ps1.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { criarPedidoMovimentacao } from '../Frontend/UI/src/utils/pedidoMovimentacao.js';

const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
assert.match(config.container, /^era-auditoria-smoke-\d{14}$/);
assert.match(config.database, /^era_auditoria_smoke_\d{14}$/);
assert.match(config.url, /^http:\/\/127\.0\.0\.1:\d+$/);
let verificacoes = 0;
const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
class Cliente {
  cookies = new Map();
  csrf = '';
  async requisicao(method, path, body, status = 200) {
    const headers = { 'Content-Type': 'application/json', Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ') };
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = this.csrf;
    const r = await fetch(`${config.url}/api${path}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
    for (const c of r.headers.getSetCookie()) {
      const par = c.split(';')[0], pos = par.indexOf('=');
      this.cookies.set(par.slice(0, pos), par.slice(pos + 1));
    }
    const texto = await r.text(), dados = texto ? JSON.parse(texto) : null;
    assert.ok((Array.isArray(status) ? status : [status]).includes(r.status), `${method} ${path}: esperado ${status}, recebido ${r.status}: ${dados?.mensagem || ''}`);
    if (r.status >= 400) {
      assert.ok(dados.mensagem);
      for (const campo of ['trace', 'stackTrace', 'exception']) assert.ok(!(campo in dados));
    }
    verificacoes++;
    return Array.isArray(status) ? { status: r.status, dados } : dados;
  }
  async entrar(login, senha = 'TempUser#578943') {
    this.csrf = (await this.requisicao('GET', '/auth/csrf')).token;
    await this.requisicao('POST', '/auth/login', { login, senha });
    this.csrf = (await this.requisicao('GET', '/auth/csrf')).token;
    await this.requisicao('POST', '/auth/alterar-senha', { novaSenha: 'ChangedUser#578943' }, 204);
    return this;
  }
}
for (let n = 0; ; n++) {
  try { if ((await fetch(`${config.url}/api/actuator/health`)).ok) break; } catch { /* aguardar inicialização */ }
  if (n >= 50) throw Error('API temporária não iniciou');
  await new Promise(r => setTimeout(r, 1000));
}
const admin = await new Cliente().entrar('audit-smoke-admin', 'TempCheck#578943');
const funcionario = nome => admin.requisicao('POST', '/funcionarios', { nome, cargo: 'Tecnico', email: `${nome.toLowerCase()}@teste.invalid`, status: 'Ativo' }, 201);
const t1 = await funcionario('TecnicoA'), t2 = await funcionario('TecnicoB');
async function usuario(nome, perfil, funcionarioId) {
  await admin.requisicao('POST', '/usuarios', { nome, login: nome, perfil, funcionarioId, senhaTemporaria: 'TempUser#578943' }, 201);
  return new Cliente().entrar(nome.toLowerCase());
}
const tecnicoA = await usuario('tecnico-a', 'TECNICO', t1.id);
const tecnicoB = await usuario('tecnico-b', 'TECNICO', t2.id);
const estoque = await usuario('estoque', 'ESTOQUE');
const gerente = await usuario('gerente', 'GERENTE');
const obra = async (nome, tecnico) => admin.requisicao('POST', '/obras', { nome, cliente: 'Cliente teste', cidade: 'Manaus', inicio: hoje, status: 'Em andamento', responsaveis: [tecnico.nome] }, 201);
const a = await obra('Obra A', t1), b = await obra('Obra B', t2);
const encerrada = await admin.requisicao('POST', '/obras', { nome: 'Obra encerrada', cliente: 'Cliente teste', cidade: 'Manaus', inicio: hoje, status: 'Concluída', responsaveis: [t2.nome] }, 201);
const cadastro = (modelo, serie, quantidade, obraId = null, tecnico = null, auditavel = true) => ({ tipo: 'Ferramentas', modelo, serie, quantidade, obraId, tecnico, auditavel, status: obraId ? 'Em campo' : 'Em estoque', controleQuantidade: quantidade > 1 ? 'LOTE' : 'INDIVIDUAL', data: hoje });
const novo = dados => admin.requisicao('POST', '/equipamentos', dados, 201);
const deposito = await novo(cadastro('Alicate', 'DEP-1', 5));
const campo = await novo(cadastro('Alicate', 'OBRA-A-1', 4, a.id, t1.nome));
const consumo = await novo(cadastro('Consumo', 'CONSUMO-1', 10, a.id, t1.nome, false));
await admin.requisicao('POST', '/equipamentos', cadastro('Alicate', 'dep-1', 1), 409);
await admin.requisicao('POST', '/equipamentos', cadastro('Invalido', 'ZERO', 0), 400);
await tecnicoA.requisicao('POST', '/equipamentos', cadastro('Proibido', 'X', 1), 403);
await admin.requisicao('PATCH', `/equipamentos/${deposito.id}`, { ...cadastro('Alicate', deposito.serie, 5), obraId: a.id }, 409);
console.log('Cadastro: catálogo, série duplicada, quantidades e permissões OK');
await new Cliente().requisicao('GET', '/equipamentos', null, 401);
await admin.requisicao('GET', '/equipamentos/inexistente/historico', null, 400);
await admin.requisicao('GET', '/equipamentos/999999999/historico', null, 404);
await admin.requisicao('POST', '/equipamentos', { ...cadastro('Invalido', 'DECIMAL', 1), quantidade: 1.5 }, 400);

const material = (e, quantidade, separado = false) => ({ nome: e.modelo, quantidade, catalogoChave: e.catalogoChave, identificacao: separado ? e.serie : null });
const pedido = (destino, itens, tecnico = t2.nome) => ({ tecnico, obraDestinoId: destino, dataSolicitacao: hoje, materiais: itens, observacao: 'Verificação integrada' });
await tecnicoB.requisicao('POST', '/atividades', pedido(encerrada.id, [material(deposito, 1)]), 409);
await tecnicoA.requisicao('POST', '/atividades', pedido(b.id, [material(deposito, 1)]), 409);
await tecnicoB.requisicao('POST', '/atividades', pedido(b.id, [{ nome: 'Inventado', quantidade: 1, catalogoChave: 'x|inventado|' }]), 409);
await tecnicoB.requisicao('POST', '/atividades', pedido(b.id, [material(deposito, 1, true)]), 409);
let ordem = await tecnicoB.requisicao('POST', '/atividades', pedido(b.id, [material(deposito, 12)]), 201);
assert.equal(ordem.status, 'Pendente');
assert.equal(ordem.solicitanteLogin, 'tecnico-b');
await gerente.requisicao('PATCH', `/atividades/${ordem.id}`, { obraDestinoId: encerrada.id, tecnico: t2.nome, materiais: [material(deposito, 12)] }, 409);
ordem = await gerente.requisicao('PATCH', `/atividades/${ordem.id}`, { obraDestinoId: b.id, tecnico: t2.nome, materiais: [material(deposito, 12)], observacao: 'Observação revisada' });
assert.equal(ordem.observacao, 'Observação revisada');
await estoque.requisicao('POST', `/atividades/${ordem.id}/transito`, {}, 409);
await estoque.requisicao('POST', `/atividades/${ordem.id}/materiais/${ordem.materiais[0].id}/compra`, { quantidade: 3 }, 409);
await tecnicoB.requisicao('POST', `/atividades/${ordem.id}/aprovacao`, {}, 403);
ordem = await gerente.requisicao('POST', `/atividades/${ordem.id}/aprovacao`, {});
await gerente.requisicao('POST', `/atividades/${ordem.id}/aprovacao`, {}, 409);
await gerente.requisicao('POST', `/atividades/${ordem.id}/rejeicao`, {}, 409);
console.log('Pedido e aprovação: catálogo obrigatório, obra autorizada, quantidade acima do saldo e decisão única OK');

const mid = ordem.materiais[0].id, rotaCompra = `/atividades/${ordem.id}/materiais/${mid}`;
await estoque.requisicao('POST', `${rotaCompra}/compra`, { quantidade: 13 }, 409);
await estoque.requisicao('POST', `${rotaCompra}/compra`, { quantidade: 3 });
await gerente.requisicao('PATCH', `/atividades/${ordem.id}`, { obraDestinoId: b.id, tecnico: t2.nome, materiais: [material(deposito, 1)] }, 409);
await estoque.requisicao('POST', `${rotaCompra}/aquisicao`, { quantidade: 2, numeroNota: 'NF-1', identificacao: 'COMPRA-1' });
await estoque.requisicao('POST', `/atividades/${ordem.id}/distribuicao`, { atendimentos: [{ obraOrigemId: null, materiais: [material(deposito, 12, true)] }] }, 409);
await estoque.requisicao('POST', `${rotaCompra}/aquisicao`, { quantidade: 2, numeroNota: 'NF-2', identificacao: 'COMPRA-2' }, 409);
await estoque.requisicao('POST', `${rotaCompra}/aquisicao`, { quantidade: 1, numeroNota: 'NF-2', identificacao: 'COMPRA-2' });
await estoque.requisicao('POST', `${rotaCompra}/aquisicao`, { quantidade: 1, numeroNota: 'NF-3' }, 409);
let equipamentos = await admin.requisicao('GET', '/equipamentos');
const compras = equipamentos.filter(e => e.serie.startsWith('COMPRA-'));
assert.equal(compras.reduce((n, e) => n + e.quantidade, 0), 3);
assert.ok(compras.every(e => e.auditavel && e.notaFiscal));
const distribuir = (id, atendimentos, status = 200) => estoque.requisicao('POST', `/atividades/${id}/distribuicao`, { atendimentos }, status);
await distribuir(ordem.id, [{ obraOrigemId: null, materiais: [material(deposito, 12, true)] }], 409);
assert.equal((await admin.requisicao('GET', '/equipamentos')).find(e => e.id === deposito.id).quantidadeReservada, 0);
const atendimentos = await distribuir(ordem.id, [
  { obraOrigemId: a.id, materiais: [material(campo, 4, true)] },
  { obraOrigemId: null, materiais: [material(deposito, 5, true), ...compras.map(e => material(e, e.quantidade, true))] },
]);
assert.equal(atendimentos.length, 2);
assert.equal(atendimentos[1].solicitacaoPaiId, ordem.id);
assert.equal(atendimentos.flatMap(p => p.compras).reduce((n, m) => n + m.quantidadeEntradaEstoque, 0), 3, 'A separação precisa preservar o histórico de compras');
assert.ok(atendimentos.every(p => p.materiais.every(m => m.id != null)));
await admin.requisicao('PATCH', `/equipamentos/${deposito.id}`, { ...cadastro('Alicate', 'SERIE-ALTERADA', 5) }, 409);
await admin.requisicao('DELETE', `/equipamentos/${deposito.id}`, null, 405);
await admin.requisicao('PATCH', `/equipamentos/${deposito.id}/arquivamento`, { arquivado: true }, 409);
const emergencia = await gerente.requisicao('POST', '/atividades', { ...pedido(b.id, [material(deposito, 1)]), solicitante: 'Nome forjado' }, 201);
assert.equal(emergencia.status, 'Aprovada'); assert.equal(emergencia.solicitanteLogin, 'gerente'); assert.equal(emergencia.solicitante, 'gerente');
await distribuir(emergencia.id, [{ obraOrigemId: null, materiais: [material(deposito, 1, true)] }], 409);
console.log('Compras e separação: entradas parciais, várias origens, conservação das reservas e autoria do gerente OK');

const rotaAuditoria = t => `/funcionarios/${t.id}/auditorias`;
let antes = await gerente.requisicao('POST', rotaAuditoria(t1), { equipamentoIds: [campo.id] }, 201);
await estoque.requisicao('POST', `/atividades/${atendimentos[0].id}/transito`, {});
assert.equal((await gerente.requisicao('GET', `${rotaAuditoria(t1)}/materiais`)).length, 0, 'Material em transporte não pode entrar em nova vistoria');
await tecnicoA.requisicao('POST', `/atividades/${atendimentos[0].id}/conclusao`, {}, 409);
await admin.requisicao('POST', `/atividades/${atendimentos[0].id}/conclusao`, {}, 409);
await tecnicoB.requisicao('POST', `/atividades/${atendimentos[0].id}/transito`, {}, 409);
await tecnicoB.requisicao('POST', `/atividades/${atendimentos[0].id}/conclusao`, {});
await tecnicoB.requisicao('POST', `/atividades/${atendimentos[0].id}/conclusao`, {}, 409);
await estoque.requisicao('POST', `/atividades/${atendimentos[1].id}/transito`, {});
await tecnicoB.requisicao('POST', `/atividades/${atendimentos[1].id}/conclusao`, {});
equipamentos = await admin.requisicao('GET', '/equipamentos');
assert.equal(equipamentos.filter(e => e.modelo === 'Alicate').reduce((n, e) => n + e.quantidade, 0), 12);
assert.equal(equipamentos.filter(e => e.modelo === 'Alicate' && e.obraId === b.id).reduce((n, e) => n + e.quantidade, 0), 12);
assert.ok(equipamentos.every(e => e.quantidadeReservada === 0));
assert.ok(equipamentos.find(e => e.id === campo.id).historico.some(h => h.solicitacaoId === ordem.id && h.quantidade === 4 && h.saidaEm && h.entradaEm));
assert.equal((await gerente.requisicao('GET', '/atividades')).find(p => p.id === ordem.id).compras[0].quantidadeEntradaEstoque, 3);
assert.equal((await gerente.requisicao('GET', `${rotaAuditoria(t1)}/${antes.id}`)).itens[0].local, a.nome);
console.log('Entrega: transporte, confirmação exclusiva pelo destinatário, estoque e histórico entre obras OK');

const ficha = await gerente.requisicao('POST', rotaAuditoria(t2), { equipamentoIds: [campo.id, deposito.id] }, 201);
await gerente.requisicao('POST', rotaAuditoria(t2), { equipamentoIds: [consumo.id] }, 409);
await tecnicoB.requisicao('GET', '/auditorias', null, 403);
await estoque.requisicao('POST', rotaAuditoria(t2), { equipamentoIds: [campo.id] }, 403);
let registro = { versao: ficha.versao, dataVistoria: hoje, fiscal: 'Fiscal de teste', concluir: false, observacoes: 'Vistoria integrada', itens: ficha.itens.map(i => ({ equipamentoId: i.equipamentoId, bom: 0, avaria: 0, quebrado: 0 })) };
await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, { ...registro, itens: registro.itens.map(i => ({ ...i, bom: 2147483647, avaria: 2147483647 })) }, 409);
let salva = await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, registro);
await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, registro, 409);
registro = { ...registro, versao: salva.versao, concluir: true };
await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, registro, 409);
registro.itens = ficha.itens.map(i => ({ equipamentoId: i.equipamentoId, bom: i.quantidade - 1, avaria: 1, quebrado: 0 }));
salva = await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, registro);
assert.equal(salva.status, 'CONCLUIDA'); assert.equal(salva.registradoPorLogin, 'gerente');
await gerente.requisicao('PATCH', `${rotaAuditoria(t2)}/${ficha.id}`, { ...registro, versao: salva.versao }, 409);

// Devolução parcial: cria lote derivado e mantém os números da vistoria anterior.
const retorno = await tecnicoB.requisicao('POST', '/atividades', { tecnico: t2.nome, obraOrigemId: b.id, dataSolicitacao: hoje, materiais: [material(campo, 1, true)] }, 201);
assert.equal((await admin.requisicao('GET', '/equipamentos')).find(e => e.id === campo.id).quantidadeReservada, 1);
await gerente.requisicao('POST', `/atividades/${retorno.id}/aprovacao`, {});
await estoque.requisicao('POST', `/atividades/${retorno.id}/transito`, {});
await tecnicoB.requisicao('POST', `/atividades/${retorno.id}/conclusao`, {}, 409);
await estoque.requisicao('POST', `/atividades/${retorno.id}/conclusao`, {});
equipamentos = await admin.requisicao('GET', '/equipamentos');
assert.equal(equipamentos.find(e => e.id === campo.id).quantidade, 3);
assert.ok(equipamentos.some(e => e.serie.startsWith(`${campo.serie}-M`) && e.quantidade === 1 && e.obraId == null && e.auditavel));
assert.equal(equipamentos.filter(e => e.modelo === 'Alicate').reduce((n, e) => n + e.quantidade, 0), 12);
assert.equal((await gerente.requisicao('GET', `${rotaAuditoria(t2)}/${ficha.id}`)).itens.find(i => i.equipamentoId === campo.id).quantidade, 4);
const rejeitada = await tecnicoB.requisicao('POST', '/atividades', { tecnico: t2.nome, obraOrigemId: b.id, dataSolicitacao: hoje, materiais: [material(campo, 1, true)] }, 201);
await gerente.requisicao('POST', `/atividades/${rejeitada.id}/rejeicao`, {});
assert.equal((await admin.requisicao('GET', '/equipamentos')).find(e => e.id === campo.id).quantidadeReservada, 0);
await gerente.requisicao('POST', rotaAuditoria(t2), { equipamentoIds: [campo.id] }, 201);
assert.equal((await gerente.requisicao('GET', '/auditorias')).length, 3);
// A identificação aceita no cadastro também deve funcionar em divisões parciais.
const longo = await novo(cadastro('Serie longa', 'S'.repeat(120), 3, b.id, t2.nome));
const parcial = await tecnicoB.requisicao('POST', '/atividades', { tecnico: t2.nome, obraOrigemId: b.id, dataSolicitacao: hoje, materiais: [material(longo, 1, true)] }, 201);
await gerente.requisicao('POST', `/atividades/${parcial.id}/aprovacao`, {});
await estoque.requisicao('POST', `/atividades/${parcial.id}/transito`, {});
await estoque.requisicao('POST', `/atividades/${parcial.id}/conclusao`, {});
assert.ok((await admin.requisicao('GET', '/equipamentos')).some(e => e.modelo === longo.modelo && e.obraId == null && e.serie.length <= 120 && e.quantidade === 1));
// Duas separações concorrentes não podem reservar as mesmas unidades.
const disputado = await novo(cadastro('Estoque disputado', 'CONCORRENCIA-1', 2));
const concorrentes = await Promise.all([1, 2].map(() => gerente.requisicao('POST', '/atividades', pedido(b.id, [material(disputado, 2)]), 201)));
const resultados = await Promise.all(concorrentes.map(p => distribuir(p.id, [{ obraOrigemId: null, materiais: [material(disputado, 2, true)] }], [200, 409])));
assert.deepEqual(resultados.map(r => r.status).sort(), [200, 409]);
assert.equal((await admin.requisicao('GET', '/equipamentos')).find(e => e.id === disputado.id).quantidadeReservada, 2);
console.log('Auditoria e devolução: quantidades limitadas, versão concorrente, conclusão imutável, fotografia histórica e nova vistoria OK');
// Manutenção parcial: bloqueia unidades sem mudar local, responsável ou quantidade física.
const reparavel = await novo(cadastro('Escada para manutencao', 'MANUT-1', 10, a.id, t1.nome));
const rotaManutencao = `/equipamentos/${reparavel.id}/manutencoes`;
await tecnicoA.requisicao('POST', rotaManutencao, { quantidade: 1, motivo: 'Avaria' }, 403);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 0, motivo: 'Avaria' }, 400);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 1.5, motivo: 'Avaria' }, 400);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 1, motivo: ' ' }, 400);
let emReparo = await gerente.requisicao('POST', rotaManutencao, { quantidade: 2, motivo: 'Degrau danificado' });
const reparo1 = emReparo.manutencoes[0];
assert.equal(emReparo.quantidadeManutencao, 2); assert.equal(emReparo.quantidadeDisponivel, 8);
assert.equal(emReparo.obraId, a.id); assert.equal(emReparo.tecnico, t1.nome); assert.equal(emReparo.status, 'Em campo');
assert.equal(reparo1.abertaPorLogin, 'gerente'); assert.ok(reparo1.abertaEm);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 9, motivo: 'Excedente' }, 409);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 1, motivo: 'Revisao preventiva' });
emReparo = await admin.requisicao('POST', rotaManutencao, { quantidade: 1, motivo: 'Inspecao de seguranca' });
assert.equal(emReparo.quantidadeManutencao, 4);
await admin.requisicao('PATCH', `/equipamentos/${reparavel.id}/arquivamento`, { arquivado: true }, 409);
await admin.requisicao('PATCH', `/equipamentos/${reparavel.id}`, cadastro(reparavel.modelo, 'TROCADA', 10, a.id, t1.nome), 409);
await admin.requisicao('PATCH', `/equipamentos/${reparavel.id}`, cadastro(reparavel.modelo, reparavel.serie, 3, a.id, t1.nome), 409);
const moverDisponiveis = await gerente.requisicao('POST', '/atividades', pedido(b.id, [material(reparavel, 7)]), 201);
await distribuir(moverDisponiveis.id, [{ obraOrigemId: a.id, materiais: [material(reparavel, 7, true)] }], 409);
await gerente.requisicao('PATCH', `/atividades/${moverDisponiveis.id}`, { obraDestinoId: b.id, tecnico: t2.nome, materiais: [material(reparavel, 5)] });
await distribuir(moverDisponiveis.id, [{ obraOrigemId: a.id, materiais: [material(reparavel, 5, true)] }]);
await estoque.requisicao('POST', rotaManutencao, { quantidade: 2, motivo: 'Nao pode usar reserva' }, 409);
await estoque.requisicao('POST', `/atividades/${moverDisponiveis.id}/transito`, {});
emReparo = await estoque.requisicao('POST', rotaManutencao, { quantidade: 1, motivo: 'Ultima unidade presente com avaria' });
assert.equal(emReparo.quantidadeManutencao, 5); assert.equal(emReparo.quantidadeDisponivel, 0);
await tecnicoB.requisicao('POST', `/atividades/${moverDisponiveis.id}/conclusao`, {});
equipamentos = await admin.requisicao('GET', '/equipamentos');
emReparo = equipamentos.find(e => e.id === reparavel.id);
assert.equal(emReparo.quantidade, 5); assert.equal(emReparo.status, 'Em manutenção'); assert.equal(emReparo.obraId, a.id);
const recebidoSemReparo = equipamentos.find(e => e.modelo === reparavel.modelo && e.obraId === b.id);
assert.equal(recebidoSemReparo.quantidade, 5); assert.equal(recebidoSemReparo.quantidadeManutencao, 0); assert.equal(recebidoSemReparo.manutencoes.length, 0);
assert.equal((await gerente.requisicao('GET', `${rotaAuditoria(t1)}/materiais`)).find(e => e.equipamentoId === reparavel.id).quantidade, 5);
await estoque.requisicao('POST', `${rotaManutencao}/${reparo1.id}/conclusao`, { observacao: ' ' }, 400);
await tecnicoA.requisicao('POST', `${rotaManutencao}/${reparo1.id}/conclusao`, { observacao: 'Sem permissao' }, 403);
await estoque.requisicao('POST', `/equipamentos/${recebidoSemReparo.id}/manutencoes/${reparo1.id}/conclusao`, { observacao: 'Outro equipamento' }, 404);
emReparo = await estoque.requisicao('POST', `${rotaManutencao}/${reparo1.id}/conclusao`, { observacao: 'Degrau substituido e ensaio aprovado' });
assert.equal(emReparo.quantidadeManutencao, 3); assert.equal(emReparo.quantidadeDisponivel, 2); assert.equal(emReparo.status, 'Em campo');
assert.equal(emReparo.manutencoes.find(m => m.id === reparo1.id).concluidaPorLogin, 'estoque');
await estoque.requisicao('POST', `${rotaManutencao}/${reparo1.id}/conclusao`, { observacao: 'Repetida' }, 409);
for (const m of emReparo.manutencoes.filter(m => m.status === 'ABERTA')) await gerente.requisicao('POST', `${rotaManutencao}/${m.id}/conclusao`, { observacao: 'Revisao e teste aprovados' });
emReparo = (await admin.requisicao('GET', '/equipamentos')).find(e => e.id === reparavel.id);
assert.equal(emReparo.quantidadeManutencao, 0); assert.equal(emReparo.quantidadeDisponivel, 5); assert.equal(emReparo.manutencoes.length, 4);
// Reserva e manutenção disputam o mesmo saldo sob o bloqueio do equipamento.
const concorrenciaReparo = await novo(cadastro('Disputa manutencao', 'MANUT-CONCORRENTE', 2));
const pedidoConcorrente = await gerente.requisicao('POST', '/atividades', pedido(b.id, [material(concorrenciaReparo, 2)]), 201);
const disputa = await Promise.all([
  estoque.requisicao('POST', `/equipamentos/${concorrenciaReparo.id}/manutencoes`, { quantidade: 2, motivo: 'Revisao' }, [200, 409]),
  distribuir(pedidoConcorrente.id, [{ obraOrigemId: null, materiais: [material(concorrenciaReparo, 2, true)] }], [200, 409]),
]);
assert.deepEqual(disputa.map(r => r.status).sort(), [200, 409]);
const saldoDisputado = (await admin.requisicao('GET', '/equipamentos')).find(e => e.id === concorrenciaReparo.id);
assert.equal(saldoDisputado.quantidadeDisponivel, 0); assert.equal(saldoDisputado.quantidadeReservada + saldoDisputado.quantidadeManutencao, 2);
console.log('Manutencao: permissao, validacao, bloqueio parcial, transporte das unidades livres, historico persistido, conclusao unica e concorrencia com reservas OK');
// Regressão: escolher o depósito apagava o técnico e fazia o POST retornar 400.
const chaveRetorno = await novo(cadastro('Chave Phillips PH0', 'REGRESSAO-RETORNO', 2, a.id, t1.nome));
const dadosRetorno = criarPedidoMovimentacao(chaveRetorno, { obraId:null, tecnico:null, quantidade:1, dataMovimentacao:hoje });
const invalido = await gerente.requisicao('POST', '/atividades', { ...dadosRetorno, tecnico:null }, 400);
assert.ok(invalido.detalhes.tecnico);
const retiradaGerente = await gerente.requisicao('POST', '/atividades', dadosRetorno, 201);
assert.equal(retiradaGerente.status, 'Aguardando coleta');
assert.equal(retiradaGerente.tecnico, t1.nome); assert.equal(retiradaGerente.solicitanteLogin, 'gerente');
assert.equal(retiradaGerente.obraOrigemId, a.id); assert.equal(retiradaGerente.obraDestinoId, null);
await estoque.requisicao('POST', `/atividades/${retiradaGerente.id}/transito`, {});
await tecnicoA.requisicao('POST', `/atividades/${retiradaGerente.id}/conclusao`, {}, 409);
assert.equal((await estoque.requisicao('POST', `/atividades/${retiradaGerente.id}/conclusao`, {})).status, 'Concluída');
const aposRetorno = await admin.requisicao('GET', '/equipamentos');
assert.equal(aposRetorno.find(e => e.id === chaveRetorno.id).quantidade, 1);
assert.equal(aposRetorno.find(e => e.modelo === chaveRetorno.modelo && e.obraId == null).quantidade, 1);
console.log('Retorno solicitado pelo gerente: técnico de origem preservado, autoria autenticada e confirmação pelo estoque OK');

// Calibracao individual: coleta real, laboratorio, datas do certificado e historico.
const fluke = await novo({...cadastro('DSX-5000', 'FLUKE-CAL-1', 1, a.id, t1.nome), tipo:'Fluke'});
const rotaCal = '/equipamentos/'+fluke.id+'/calibracoes';
await tecnicoA.requisicao('POST', rotaCal, {}, 403);
let calibrado = await gerente.requisicao('POST', rotaCal, {laboratorio:'Laboratorio A', observacao:'Calibracao periodica'});
let cal = calibrado.calibracoes.find(c=>c.status==='AGUARDANDO_RETIRADA');
assert.ok(cal);assert.equal(calibrado.obraId,a.id);assert.equal(calibrado.tecnico,t1.nome);assert.equal(calibrado.quantidadeDisponivel,0);
await gerente.requisicao('POST', rotaCal, {}, 409);
await gerente.requisicao('POST', '/equipamentos/'+fluke.id+'/manutencoes', {quantidade:1,motivo:'Reparo'}, 409);
await admin.requisicao('PATCH', '/equipamentos/'+fluke.id+'/arquivamento', {arquivado:true}, 409);
await gerente.requisicao('POST', rotaCal+'/'+cal.id+'/retirada', {dataRetirada:hoje}, 403);
await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/envio', {laboratorio:'Lab',dataEnvio:hoje}, 409);
calibrado=await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/retirada', {dataRetirada:hoje});
assert.equal(calibrado.obraId,null);assert.equal(calibrado.tecnico,null);assert.equal(calibrado.status,'Aguardando calibração');
await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/retirada', {dataRetirada:hoje}, 409);
calibrado=await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/envio', {laboratorio:'Laboratorio A',dataEnvio:hoje,previsaoRetorno:hoje});
assert.equal(calibrado.status,'Em calibração');assert.equal(calibrado.quantidadeDisponivel,0);
await gerente.requisicao('POST', rotaCal+'/'+cal.id+'/cancelamento', {motivo:'Cancelar'}, 409);
await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/retorno', {dataRetorno:hoje}, 400);
const vencimento = new Date(hoje+'T12:00:00Z');vencimento.setUTCMonth(vencimento.getUTCMonth()+9);
const retornoCal={dataRetorno:hoje,dataCalibracao:hoje,validade:vencimento.toISOString().slice(0,10),certificado:'CAL-2026-01',observacao:'Certificado conferido'};
await gerente.requisicao('POST', rotaCal+'/'+cal.id+'/retorno', retornoCal, 403);
calibrado=await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/retorno', retornoCal);
assert.equal(calibrado.status,'Em estoque');assert.equal(calibrado.quantidadeDisponivel,1);
cal=calibrado.calibracoes.find(c=>c.id===cal.id);assert.equal(cal.validade,retornoCal.validade);assert.equal(cal.localOrigem,a.nome);assert.equal(cal.tecnicoOrigem,t1.nome);
assert.equal(cal.eventos[0].autorLogin,'gerente');assert.equal(cal.eventos.at(-1).autorLogin,'estoque');
await estoque.requisicao('POST', rotaCal+'/'+cal.id+'/retorno', retornoCal, 409);
const recarregado=(await admin.requisicao('GET','/equipamentos')).find(e=>e.id===fluke.id);
assert.equal(recarregado.calibracoes[0].certificado,'CAL-2026-01');
assert.ok(!(await gerente.requisicao('GET',rotaAuditoria(t1)+'/materiais')).some(e=>e.equipamentoId===fluke.id));
await gerente.requisicao('POST', rotaCal+'/certificados', {laboratorio:'Lab historico',dataCalibracao:'2025-01-01',validade:'2025-12-31',certificado:'ANT-2025'});
const disputaCal = await Promise.all([1,2].map(()=>gerente.requisicao('POST',rotaCal,{},[200,409])));
assert.deepEqual(disputaCal.map(r=>r.status).sort(),[200,409]);
console.log('Calibracao: origem e autoria preservadas, retirada e envio exclusivos do estoque, certificado com validade, bloqueios e concorrencia OK');

// Ataques executados apenas no banco e nos usuários temporários deste teste.
const atacante = new Cliente();
atacante.csrf = (await atacante.requisicao('GET', '/auth/csrf')).token;
await atacante.requisicao('POST', '/auth/login', {login: "' OR '1'='1' --", senha: 'QualquerSenha#123'}, 401);
await atacante.requisicao('GET', '/usuarios', null, 401);
const semCsrf = new Cliente();
await semCsrf.requisicao('POST', '/auth/login', {login: 'audit-smoke-admin', senha: 'ChangedUser#578943'}, 403);
const csrfAntesLogin = atacante.csrf;
await atacante.requisicao('POST', '/auth/login', {login: 'gerente', senha: 'ChangedUser#578943'});
await atacante.requisicao('GET', '/auth/me');
await atacante.requisicao('POST', '/auth/alterar-senha', {novaSenha:'SenhaRecusada#123'}, 403);
atacante.csrf = (await atacante.requisicao('GET', '/auth/csrf')).token;
assert.notEqual(atacante.csrf, csrfAntesLogin);
await gerente.requisicao('GET', '/auth/me', null, 401); // segundo login revoga o primeiro
const semCsrfAutenticado = new Cliente();semCsrfAutenticado.cookies = new Map(atacante.cookies);
await semCsrfAutenticado.requisicao('POST', '/auth/logout', null, 403);

await tecnicoA.requisicao('GET', `/obras/${b.id}/historico`, null, 404);
await tecnicoA.requisicao('GET', '/usuarios', null, 403);
await tecnicoA.requisicao('GET', '/auditorias', null, 403);
await tecnicoA.requisicao('POST', '/usuarios', {nome:'Ataque',login:'ataque',perfil:'ADMIN',senhaTemporaria:'Senha#123'}, 403);
await admin.requisicao('GET', '/equipamentos/1%20OR%201=1/historico', null, 400);
const sqlLiteral = await novo(cadastro("SQL literal '); DROP TABLE equipamentos; --", 'SQL-LITERAL', 1));
assert.ok((await admin.requisicao('GET','/equipamentos')).some(e => e.id === sqlLiteral.id));

const conta = await admin.requisicao('POST','/usuarios',{nome:'Conta de seguranca',login:'seguranca',perfil:'GERENTE',senhaTemporaria:'TempUser#578943'},201);
const sessaoAntiga = await new Cliente().entrar('seguranca');
await admin.requisicao('POST',`/usuarios/${conta.id}/redefinicao-senha`,{senhaTemporaria:'ResetAcesso#578943'});
await sessaoAntiga.requisicao('POST','/auth/alterar-senha',{novaSenha:'Invasor#578943'},401);
const sessaoNova = await new Cliente().entrar('seguranca','ResetAcesso#578943');
await admin.requisicao('PUT',`/usuarios/${conta.id}`,{nome:conta.nome,login:conta.login,perfil:'ESTOQUE'});
await sessaoNova.requisicao('GET','/equipamentos',null,401);
const novoPerfil = new Cliente();novoPerfil.csrf = (await novoPerfil.requisicao('GET','/auth/csrf')).token;
await novoPerfil.requisicao('POST','/auth/login',{login:'seguranca',senha:'ChangedUser#578943'});
novoPerfil.csrf = (await novoPerfil.requisicao('GET','/auth/csrf')).token;
await novoPerfil.requisicao('GET','/usuarios',null,403);
await admin.requisicao('PATCH',`/usuarios/${conta.id}/status`,{ativo:false});
await admin.requisicao('PATCH',`/usuarios/${conta.id}/status`,{ativo:true});
await novoPerfil.requisicao('GET','/auth/me',null,401);
const bloqueado = new Cliente();bloqueado.csrf = (await bloqueado.requisicao('GET','/auth/csrf')).token;
await Promise.all(Array.from({length:5},()=>bloqueado.requisicao('POST','/auth/login',{login:'seguranca',senha:'SenhaErrada#123'},401)));
await bloqueado.requisicao('POST','/auth/login',{login:'seguranca',senha:'ChangedUser#578943'},401);
assert.equal((await admin.requisicao('GET','/usuarios')).some(u => 'senhaHash' in u || 'senhaTemporaria' in u),false);
console.log('Seguranca: SQL injection, CSRF e rotacao de token, isolamento de dados, revogacao apos reset/perfil/status, sessoes concorrentes e bloqueio de login OK');
console.log(`${verificacoes} requisições HTTP verificadas com sessões independentes de administrador, gerente, estoque e dois técnicos.`);
