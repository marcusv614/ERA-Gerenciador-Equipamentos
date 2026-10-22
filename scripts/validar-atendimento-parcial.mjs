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
const limiteInicializacao=Date.now()+180000;
for (;;) { try { if ((await fetch(`${config.url}/api/actuator/health`,{signal:AbortSignal.timeout(2000)})).ok) break; } catch { /* inicialização */ } if(Date.now()>=limiteInicializacao)throw Error('API temporária não iniciou em três minutos; consulte o log de inicialização.');await new Promise(r=>setTimeout(r,1000)); }
const hoje = new Intl.DateTimeFormat('en-CA',{ timeZone:'America/Manaus' }).format(new Date());
const admin = await new Cliente().entrar('audit-smoke-admin','TempCheck#578943');
const funcionario = nome => admin.req('POST','/funcionarios',{ nome,cargo:'Técnico',status:'Ativo' },201);
const a = await funcionario('Tecnico A'), b = await funcionario('Tecnico B'), t = await funcionario('TST EPI');
const conta = async(login,perfil,funcionarioId) => { await admin.req('POST','/usuarios',{ nome:login,login,perfil,funcionarioId,senhaTemporaria:'TempUser#578943' },201);return new Cliente().entrar(login); };
const tecnicoA = await conta('tecnico-a','TECNICO',a.id), tecnicoB = await conta('tecnico-b','TECNICO',b.id);
const estoque = await conta('estoque','ESTOQUE'), financeiro = await conta('financeiro','FINANCEIRO'), gerente = await conta('gerente','GERENTE'), rh = await conta('rh','RH'), tst = await conta('tst','TST',t.id);
const obra = (nome,tecnico) => admin.req('POST','/obras',{ nome,cliente:'Teste',cidade:'Manaus',status:'Em andamento',inicio:hoje,responsaveis:[tecnico.nome] },201);
const oa = await obra('Obra A',a), ob = await obra('Obra B',b), oe = await obra('Obra EPIs',t);
const c=await funcionario('Colega responsavel da Obra B');
const colega=await conta('colega-obra-b','TECNICO',c.id);
const atualizarObra=(o,responsaveis)=>admin.req('PATCH',`/obras/${o.id}`,{nome:o.nome,cliente:'Teste',cidade:'Manaus',status:'Em andamento',inicio:hoje,responsaveis});
await atualizarObra(ob,[b.nome,c.nome,t.nome]);
await atualizarObra(oe,[t.nome,c.nome]);
for(const u of [tecnicoA,tecnicoB,colega,tst])assert.equal((await u.req('GET','/notificacoes')).naoLidas,0);
await new Cliente().req('GET','/notificacoes',null,401);
for(const u of [admin,gerente,financeiro,estoque,rh])assert.equal((await u.req('GET','/notificacoes')).naoLidas,0);
const equipamento = await admin.req('POST','/equipamentos',{ tipo:'Ferramentas',modelo:'Alicate',serie:'OBRA-A',quantidade:5,controleQuantidade:'LOTE',obraId:oa.id,tecnico:a.nome,status:'Em campo',data:hoje,auditavel:true },201);
const novoPedido = async(q,e= equipamento,tecnico=b,destino=ob,operador=gerente) => operador.req('POST','/atividades',{ tecnico:tecnico.nome,obraDestinoId:destino.id,dataSolicitacao:hoje,materiais:[{ nome:e.modelo,catalogoChave:e.catalogoChave,quantidade:q }],observacao:'Teste de atendimento parcial' },201);
const plano = (p,compra,origens=[],motivoRevisao) => ({ materiais:[{ materialId:p.materiais[0].id,quantidadeCompra:compra,justificativa:'Preservar o equipamento em uso na obra.',origens }],...(motivoRevisao?{motivoRevisao}:{}) });
const partial = (p,equipamentoId,quantidade) => ({ motivo:'Fornecedor não tinha a quantidade total. Manter o restante pendente.',materiais:[{ materialId:p.materiais[0].id,origens:[{ equipamentoId,quantidade }] }] });
const pedidos = async(c=financeiro) => c.req('GET','/atividades');
const localizar = async(id,c=financeiro) => (await pedidos(c)).find(p=>p.id===id);
const comprar = async(p,q,serie) => estoque.req('POST',`/atividades/${p.id}/materiais/${p.materiais[0].id}/aquisicao`,{ quantidade:q,numeroNota:`NF-${serie}`,identificacao:serie });

let primeiraAnalise=await novoPedido(2,equipamento,b,ob,tecnicoB);
assert.equal(primeiraAnalise.status,'Pendente');
assert.ok(!(await pedidos()).some(p=>p.id===primeiraAnalise.id),'Financeiro não recebe pedido antes da Gerência');
assert.equal((await financeiro.req('GET','/painel/resumo')).totalSolicitacoes,(await pedidos()).length,'Contador financeiro exclui os pedidos ainda não aprovados');
await tecnicoB.req('GET','/painel/resumo',null,403);
await financeiro.req('POST',`/atividades/${primeiraAnalise.id}/aprovacao`,{},403);
await financeiro.req('POST',`/atividades/${primeiraAnalise.id}/plano-financeiro`,plano(primeiraAnalise,2),409);
await estoque.req('POST',`/atividades/${primeiraAnalise.id}/inicio-atendimento`,{},409);
primeiraAnalise=await gerente.req('POST',`/atividades/${primeiraAnalise.id}/aprovacao`,{});
assert.ok((await pedidos()).some(p=>p.id===primeiraAnalise.id));
assert.equal((await financeiro.req('GET','/painel/resumo')).totalSolicitacoes,(await pedidos()).length);
assert.ok(primeiraAnalise.eventosFinanceiros.some(e=>e.tipo==='APROVACAO_INICIAL'&&e.autorLogin==='gerente'));
assert.ok(!(await pedidos(estoque)).some(p=>p.id===primeiraAnalise.id));
await financeiro.req('POST',`/atividades/${primeiraAnalise.id}/plano-financeiro`,plano(primeiraAnalise,2));
await financeiro.req('POST',`/atividades/${primeiraAnalise.id}/aprovacao`,{});
await financeiro.req('POST',`/atividades/${primeiraAnalise.id}/inicio-atendimento`,{},403);
await gerente.req('POST',`/atividades/${primeiraAnalise.id}/inicio-atendimento`,{},403);
await estoque.req('POST',`/atividades/${primeiraAnalise.id}/inicio-atendimento`,{});
await estoque.req('POST',`/atividades/${primeiraAnalise.id}/inicio-atendimento`,{});
const acompanhado=await localizar(primeiraAnalise.id,gerente);
assert.equal(acompanhado.eventosFinanceiros.filter(e=>e.tipo==='INICIO_ATENDIMENTO').length,1);
assert.ok(acompanhado.eventosFinanceiros.some(e=>e.tipo==='INICIO_ATENDIMENTO'&&e.autorLogin==='estoque'));
console.log('Financeiro só recebe após aprovação inicial; Gerência acompanha o início real da compra: OK');

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
assert.equal((await colega.req('GET','/notificacoes')).naoLidas,0,'Aprovação e separação não antecipam o aviso de envio');
await estoque.req('POST',`/atividades/${envioSeis.id}/transito`,{});
let caixaB=await tecnicoB.req('GET','/notificacoes'),caixaC=await colega.req('GET','/notificacoes');
assert.equal(caixaB.naoLidas,1);assert.equal(caixaC.naoLidas,1);
for(const u of [admin,gerente,financeiro,estoque]){
  const caixa=await u.req('GET','/notificacoes');assert.equal(caixa.naoLidas,1);assert.equal(caixa.itens[0].destinatario,false);
  await u.req('POST',`/notificacoes/${caixaB.itens[0].id}/leitura`,{},404);
  await u.req('POST',`/notificacoes/${caixa.itens[0].id}/leitura`,{});
  assert.equal((await u.req('GET','/notificacoes')).naoLidas,0);
}
assert.equal((await rh.req('GET','/notificacoes')).itens.length,0,'RH não recebe ferramentas');
assert.equal(caixaB.itens[0].destinatario,true);assert.equal(caixaC.itens[0].destinatario,false);
assert.equal(caixaC.itens[0].obraNome,ob.nome);assert.equal(caixaC.itens[0].materiais[0].quantidade,6);
assert.deepEqual(Object.keys(caixaC.itens[0].materiais[0]).sort(),['nome','quantidade'],'Aviso não divulga origem restrita, dados de compra ou contas');
assert.equal((await tecnicoA.req('GET','/notificacoes')).naoLidas,0);
assert.equal((await tst.req('GET','/notificacoes')).naoLidas,0,'TST da mesma obra não recebe materiais de outro setor');
await colega.req('POST',`/notificacoes/${caixaB.itens[0].id}/leitura`,{},404);
await tecnicoB.req('POST','/notificacoes/999999999/leitura',{},404);
const tokenLeitura=tecnicoB.csrf;tecnicoB.csrf='';await tecnicoB.req('POST',`/notificacoes/${caixaB.itens[0].id}/leitura`,{},403);tecnicoB.csrf=tokenLeitura;
const primeiraLeitura=await tecnicoB.req('POST',`/notificacoes/${caixaB.itens[0].id}/leitura`,{});
assert.ok(primeiraLeitura.lidaEm);assert.equal(Date.parse((await tecnicoB.req('POST',`/notificacoes/${caixaB.itens[0].id}/leitura`,{})).lidaEm),Date.parse(primeiraLeitura.lidaEm));
assert.equal((await tecnicoB.req('GET','/notificacoes')).naoLidas,0);assert.equal((await colega.req('GET','/notificacoes')).naoLidas,1);
await estoque.req('POST',`/atividades/${envioSeis.id}/transito`,{},409);assert.equal((await colega.req('GET','/notificacoes')).itens.length,1,'Envio repetido não duplica aviso');
const leiturasSimultaneas=await Promise.all([colega.req('POST',`/notificacoes/${caixaC.itens[0].id}/leitura`,{}),colega.req('POST',`/notificacoes/${caixaC.itens[0].id}/leitura`,{})]);
assert.equal(Date.parse(leiturasSimultaneas[0].lidaEm),Date.parse(leiturasSimultaneas[1].lidaEm),'Leituras concorrentes preservam o primeiro registro');
await colega.req('POST',`/atividades/${envioSeis.id}/conclusao`,{},[403,404,409]);
await tecnicoA.req('POST',`/atividades/${envioSeis.id}/conclusao`,{},[403,404,409]);
await tecnicoB.req('POST',`/atividades/${envioSeis.id}/conclusao`,{});
assert.equal((await colega.req('GET','/notificacoes')).itens[0].status,'Concluída');
await tecnicoB.req('POST','/auth/logout',{},204);
tecnicoB.csrf=(await tecnicoB.req('GET','/auth/csrf')).token;
await tecnicoB.req('POST','/auth/login',{login:'tecnico-b',senha:'ChangedUser#578943'});
tecnicoB.csrf=(await tecnicoB.req('GET','/auth/csrf')).token;
assert.equal((await tecnicoB.req('GET','/notificacoes')).naoLidas,0,'Estado de leitura permanece após novo login');
await atualizarObra(ob,[b.nome,t.nome]);assert.equal((await colega.req('GET','/notificacoes')).itens.length,0);
await colega.req('POST',`/notificacoes/${caixaC.itens[0].id}/leitura`,{},404);
await atualizarObra(ob,[b.nome,c.nome,t.nome]);
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
const caixaEpi=await tst.req('GET','/notificacoes');assert.equal(caixaEpi.naoLidas,1);assert.equal(caixaEpi.itens[0].obraId,oe.id);
const avisosRh=await rh.req('GET','/notificacoes');assert.equal(avisosRh.itens.length,1);assert.equal(avisosRh.itens[0].obraId,oe.id);assert.equal(avisosRh.itens[0].destinatario,false);
const totalFinanceiroAntes=(await financeiro.req('GET','/notificacoes')).itens.length;
const direto=await gerente.req('POST','/atividades/transporte-direto',{tecnico:b.nome,obraOrigemId:oa.id,obraDestinoId:ob.id,dataSolicitacao:hoje,observacao:'Transporte direto autorizado',materiais:[{nome:equipamento.modelo,catalogoChave:equipamento.catalogoChave,quantidade:1,identificacao:equipamento.serie}]},201);
await estoque.req('POST',`/atividades/${direto.id}/transito`,{});
assert.equal((await financeiro.req('GET','/notificacoes')).itens.length,totalFinanceiroAntes,'Financeiro não recebe movimentação direta');
assert.ok((await gerente.req('GET','/notificacoes')).itens.some(n=>n.solicitacaoId===direto.id));
assert.ok(!(await colega.req('GET','/notificacoes')).itens.some(n=>n.obraId===oe.id),'Colega técnico não recebe EPI destinado ao setor TST');
console.log('Notificações: equipe da obra, setores, leitura persistente, CSRF, isolamento por conta e revogação de vínculo: OK');
console.log('Revisão de aprovação, liberação de reservas e atendimento parcial de EPI/TST: OK');
console.log(`${verificacoes} requisições HTTP verificadas; banco e API descartáveis.`);
