// Recebe somente a configuração de uma API/banco descartáveis criados pelo roteiro PowerShell.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^\uFEFF/, ''));
assert.match(config.container, /^era-auditoria-smoke-\d{14}$/);assert.match(config.database, /^era_auditoria_smoke_\d{14}$/);assert.match(config.url, /^http:\/\/127\.0\.0\.1:\d+$/);
let verificacoes = 0;
class Cliente {
  cookies = new Map(); csrf = '';
  async req(method, rota, body, status = 200) {
    const headers = { 'Content-Type': 'application/json', Cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ') };
    if (method !== 'GET') headers['X-XSRF-TOKEN'] = this.csrf;
    const r = await fetch(`${config.url}/api${rota}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
    for (const c of r.headers.getSetCookie()) { const p = c.split(';')[0], n = p.indexOf('='); this.cookies.set(p.slice(0,n),p.slice(n+1)); }
    const texto = await r.text(), dados = texto ? JSON.parse(texto) : null;
    assert.ok((Array.isArray(status) ? status : [status]).includes(r.status), `${method} ${rota}: esperado ${status}, recebido ${r.status}: ${dados?.mensagem || ''}`);
    if (r.status >= 400) { assert.ok(dados.mensagem);for (const campo of ['trace','stackTrace','exception']) assert.ok(!(campo in dados)); }
    verificacoes++;return dados;
  }
  async entrar(login, senha = 'TempUser#578943') {
    this.csrf = (await this.req('GET','/auth/csrf')).token;
    await this.req('POST','/auth/login',{ login,senha });
    this.csrf = (await this.req('GET','/auth/csrf')).token;
    await this.req('POST','/auth/alterar-senha',{ novaSenha:'ChangedUser#578943' },204);
    return this;
  }
}
for (let n=0;;n++) { try { if ((await fetch(`${config.url}/api/actuator/health`)).ok) break; } catch { /* inicialização */ } if(n>=60)throw Error('API temporária não iniciou');await new Promise(r=>setTimeout(r,1000)); }
const hoje = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/Manaus' }).format(new Date());
const admin = await new Cliente().entrar('audit-smoke-admin','TempCheck#578943');
const funcionario = nome => admin.req('POST','/funcionarios',{ nome,cargo:'Técnico',status:'Ativo' },201);
const a = await funcionario('Tecnico A'), b = await funcionario('Tecnico B'), t = await funcionario('TST EPI');
const conta = async(login,perfil,funcionarioId) => { await admin.req('POST','/usuarios',{ nome:login,login,perfil,funcionarioId,senhaTemporaria:'TempUser#578943' },201);return new Cliente().entrar(login); };
const tecnicoA = await conta('tecnico-a','TECNICO',a.id), tecnicoB = await conta('tecnico-b','TECNICO',b.id);
const estoque = await conta('estoque','ESTOQUE'), financeiro = await conta('financeiro','FINANCEIRO'), gerente = await conta('gerente','GERENTE'), rh = await conta('rh','RH'), tst = await conta('tst','TST',t.id);
const obra = (nome,tecnico) => admin.req('POST','/obras',{ nome,cliente:'Teste',cidade:'Manaus',status:'Em andamento',inicio:hoje,responsaveis:[tecnico.nome] },201);
const oa = await obra('Obra A',a), ob = await obra('Obra B',b), oe = await obra('Obra EPIs',t);
const equipamento = await admin.req('POST','/equipamentos',{ tipo:'Ferramentas',modelo:'Alicate',serie:'OBRA-A',quantidade:5,controleQuantidade:'LOTE',obraId:oa.id,tecnico:a.nome,status:'Em campo',data:hoje,auditavel:true },201);
const novoPedido = async(q,e= equipamento,tecnico=b,destino=ob,operador=gerente) => operador.req('POST','/atividades',{ tecnico:tecnico.nome,obraDestinoId:destino.id,dataSolicitacao:hoje,materiais:[{ nome:e.modelo,catalogoChave:e.catalogoChave,quantidade:q }],observacao:'Teste de atendimento parcial' },201);
const plano = (p,compra,origens=[],motivoRevisao) => ({ materiais:[{ materialId:p.materiais[0].id,quantidadeCompra:compra,justificativa:'Preservar o equipamento em uso na obra.',origens }],...(motivoRevisao?{motivoRevisao}:{}) });
const partial = (p,equipamentoId,quantidade) => ({ motivo:'Fornecedor não tinha a quantidade total. Manter o restante pendente.',materiais:[{ materialId:p.materiais[0].id,origens:[{ equipamentoId,quantidade }] }] });
const pedidos = async(c=financeiro) => c.req('GET','/atividades');
const localizar = async(id,c=financeiro) => (await pedidos(c)).find(p=>p.id===id);
const comprar = async(p,q,serie) => estoque.req('POST',`/atividades/${p.id}/materiais/${p.materiais[0].id}/aquisicao`,{ quantidade:q,numeroNota:`NF-${serie}`,identificacao:serie });

let principal = await novoPedido(10);
assert.equal(principal.status,'Aguardando financeiro');
await financeiro.req('POST',`/atividades/${principal.id}/plano-financeiro`,plano(principal,10));
principal = await financeiro.req('POST',`/atividades/${principal.id}/aprovacao`,{});
let original = (await admin.req('GET','/equipamentos')).find(e=>e.id===equipamento.id);
assert.equal(original.obraId,oa.id);assert.equal(original.quantidadeDisponivel,5);assert.equal(original.quantidadeReservada,0);
principal = await comprar(principal,6,'COMPRA-SEIS');
const compraSeis = principal.entradasCompra[0].equipamentoId;
await financeiro.req('POST',`/atividades/${principal.id}/plano-financeiro`,plano(principal,5,[{equipamentoId:equipamento.id,quantidade:5}],'Tentativa inválida: seis já recebidas.'),409);
assert.equal((await admin.req('GET','/equipamentos')).find(e=>e.id===compraSeis).quantidadeReservada,6, 'Rollback preserva reservas após revisão recusada');
assert.equal((await localizar(principal.id)).materiais[0].quantidadeCompra,10);
await estoque.req('POST',`/atividades/${principal.id}/execucao-plano`,{},409);
for (const operador of [financeiro,gerente,rh,tecnicoA,tecnicoB,tst]) await operador.req('POST',`/atividades/${principal.id}/atendimento-parcial`,partial(principal,compraSeis,6),403);
const csrf = estoque.csrf;estoque.csrf='';await estoque.req('POST',`/atividades/${principal.id}/atendimento-parcial`,partial(principal,compraSeis,6),403);estoque.csrf=csrf;
await estoque.req('POST',`/atividades/${principal.id}/atendimento-parcial`,partial(principal,compraSeis,7),409);
await estoque.req('POST',`/atividades/${principal.id}/atendimento-parcial`,partial(principal,equipamento.id,1),409);
await estoque.req('POST',`/atividades/${principal.id}/atendimento-parcial`,{ ...partial(principal,compraSeis,6),motivo:'' },400);
await estoque.req('POST',`/atividades/${principal.id}/plano-financeiro`,plano(principal,10),403);
assert.equal((await localizar(principal.id)).materiais[0].quantidade,10);
let resultado = await estoque.req('POST',`/atividades/${principal.id}/atendimento-parcial`,partial(principal,compraSeis,6));
const envioSeis = resultado.find(p=>p.id===principal.id);let pendente = resultado.find(p=>p.id!==principal.id);
assert.equal(envioSeis.materiais[0].quantidade,6);assert.equal(envioSeis.compras[0].quantidadeCompra,6);assert.equal(envioSeis.compras[0].quantidadeEntradaEstoque,6);
assert.equal(pendente.materiais[0].quantidade,4);assert.equal(pendente.materiais[0].quantidadeCompra,4);assert.equal(pendente.materiais[0].quantidadeEntradaEstoque,0);assert.equal(pendente.solicitacaoPaiId,principal.id);
assert.ok(resultado.every(p=>p.materiaisOriginais[0].quantidade===10));assert.ok(pendente.eventosFinanceiros.some(e=>e.tipo==='ATENDIMENTO_PARCIAL'&&e.autorLogin==='estoque'));
await estoque.req('POST',`/atividades/${envioSeis.id}/atendimento-parcial`,partial(envioSeis,compraSeis,1),409);
await estoque.req('POST',`/atividades/${envioSeis.id}/transito`,{});
await tecnicoA.req('POST',`/atividades/${envioSeis.id}/conclusao`,{},[403,404,409]);
await tecnicoB.req('POST',`/atividades/${envioSeis.id}/conclusao`,{});
console.log('Compra opcional com saldo em outra obra, separação de 6/10, saldo pendente, permissões e CSRF: OK');

await financeiro.req('POST',`/atividades/${pendente.id}/plano-financeiro`,plano(pendente,4,[],'Procurar as quatro unidades restantes em outro fornecedor.'));
pendente = await comprar(pendente,2,'COMPRA-DOIS');
const compradoDois = pendente.entradasCompra[0].equipamentoId;
resultado = await estoque.req('POST',`/atividades/${pendente.id}/atendimento-parcial`,partial(pendente,compradoDois,1));
const envioUm = resultado.find(p=>p.id===pendente.id);let ultimo = resultado.find(p=>p.id!==pendente.id);
assert.equal(envioUm.compras[0].quantidadeCompra,1);assert.equal(ultimo.materiais[0].quantidade,3);assert.equal(ultimo.materiais[0].quantidadeEntradaEstoque,1);assert.equal(ultimo.solicitacaoPaiId,principal.id);
await estoque.req('POST',`/atividades/${envioUm.id}/transito`,{});await tecnicoB.req('POST',`/atividades/${envioUm.id}/conclusao`,{});
ultimo = await comprar(ultimo,2,'COMPRA-ULTIMOS');
const finais = await estoque.req('POST',`/atividades/${ultimo.id}/execucao-plano`,{});
assert.equal(finais.flatMap(p=>p.materiais).reduce((s,m)=>s+m.quantidade,0),3);
for (const p of finais) { await estoque.req('POST',`/atividades/${p.id}/transito`,{});await tecnicoB.req('POST',`/atividades/${p.id}/conclusao`,{}); }
const inventario = await admin.req('GET','/equipamentos');
assert.equal(inventario.filter(e=>e.obraId===ob.id&&e.catalogoChave===equipamento.catalogoChave).reduce((s,e)=>s+e.quantidade,0),10);
assert.ok(inventario.filter(e=>e.catalogoChave===equipamento.catalogoChave).every(e=>e.quantidadeReservada===0));
assert.equal(inventario.find(e=>e.id===equipamento.id).quantidade,5);assert.equal(inventario.find(e=>e.id===equipamento.id).obraId,oa.id);
console.log('Atendimentos sucessivos 6 + 1 + 3, compras sem duplicação e recebimento obrigatório: OK');

let revisao = await novoPedido(3);
await financeiro.req('POST',`/atividades/${revisao.id}/plano-financeiro`,plano(revisao,0,[{ equipamentoId:equipamento.id,quantidade:3 }]));
revisao = await financeiro.req('POST',`/atividades/${revisao.id}/aprovacao`,{});
await financeiro.req('POST',`/atividades/${revisao.id}/plano-financeiro`,plano(revisao,3),409);
revisao = await financeiro.req('POST',`/atividades/${revisao.id}/plano-financeiro`,plano(revisao,3,[],'Manter o equipamento no local de origem.'));
original = (await admin.req('GET','/equipamentos')).find(e=>e.id===equipamento.id);assert.equal(original.quantidadeReservada,0);assert.equal(original.obraId,oa.id);assert.equal(revisao.status,'Aprovada');
assert.ok(revisao.eventosFinanceiros.some(e=>e.tipo==='REVISAO_PLANO'&&e.autorLogin==='financeiro'));

const epi = await admin.req('POST','/equipamentos',{ tipo:'EPI',modelo:'Capacete',serie:'EPI-ORIG',quantidade:3,controleQuantidade:'LOTE',status:'Em estoque',data:hoje,auditavel:true },201);
let epiPedido = await novoPedido(3,epi,t,oe,tst);assert.equal(epiPedido.status,'Pendente');
epiPedido = await rh.req('POST',`/atividades/${epiPedido.id}/aprovacao`,{});
await financeiro.req('POST',`/atividades/${epiPedido.id}/plano-financeiro`,plano(epiPedido,3));
epiPedido = await financeiro.req('POST',`/atividades/${epiPedido.id}/aprovacao`,{});epiPedido = await comprar(epiPedido,1,'EPI-COMPRA');
const epis = await estoque.req('POST',`/atividades/${epiPedido.id}/atendimento-parcial`,partial(epiPedido,epiPedido.entradasCompra[0].equipamentoId,1));
assert.equal(epis.length,2);assert.ok(epis.every(p=>p.materiaisOriginais[0].quantidade===3));
await estoque.req('POST',`/atividades/${epiPedido.id}/transito`,{});await tecnicoB.req('POST',`/atividades/${epiPedido.id}/conclusao`,{},[403,404,409]);await tst.req('POST',`/atividades/${epiPedido.id}/conclusao`,{});
console.log('Revisão de aprovação, liberação de reservas e atendimento parcial de EPI/TST: OK');
console.log(`${verificacoes} requisições HTTP verificadas; banco e API descartáveis.`);
