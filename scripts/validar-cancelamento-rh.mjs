// Somente contra a cópia descartável local, nunca contra o banco principal.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:18089/api';
assert.ok(process.argv.includes('--banco-descartavel'));
const {contas}=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
let verificacoes=0;
class Cliente {
  cookies=new Map();csrf='';
  async req(method,path,body,status=200){
    const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),'X-XSRF-TOKEN':this.csrf},body:body==null?undefined:JSON.stringify(body)});
    for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');this.cookies.set(p.slice(0,i),p.slice(i+1));}
    const text=await r.text(),data=text?JSON.parse(text):null;
    assert.equal(r.status,status,`${method} ${path}: ${data?.mensagem||''}`);verificacoes++;return data;
  }
  async entrar(nome){const c=contas.find(c=>c.login===`demo.${nome}`);this.csrf=(await this.req('GET','/auth/csrf')).token;await this.req('POST','/auth/login',{login:c.login,senha:c.senha});this.csrf=(await this.req('GET','/auth/csrf')).token;return this;}
}
const clientes={};for(const n of ['admin','gerente','rh','financeiro','estoque','tecnico1','tecnico2','tst'])clientes[n]=await new Cliente().entrar(n);
const {admin,gerente,rh,financeiro,estoque,tecnico1,tecnico2,tst}=clientes;
const obras=await admin.req('GET','/obras'),itens=await admin.req('GET','/equipamentos');
const ferramenta=itens.find(e=>e.serie==='DEMO-3'),epi=itens.find(e=>e.serie==='DEMO-8'),destino=obras.find(o=>o.nome==='DEMO Clínica Rio Negro');
const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
const criar=(epi=false)=>clientes[epi?'tst':'tecnico2'].req('POST','/atividades',{tecnico:epi?'DEMO tst':'DEMO tecnico2',obraDestinoId:destino.id,dataSolicitacao:hoje,observacao:'VALIDAÇÃO DESCARTÁVEL DE CANCELAMENTO',materiais:[{nome:(epi?itens.find(e=>e.serie==='DEMO-8'):ferramenta).modelo,catalogoChave:(epi?itens.find(e=>e.serie==='DEMO-8'):ferramenta).catalogoChave,quantidade:2}]},201);
const cancelar=(c,p)=>c.req('POST',`/atividades/${p.id}/cancelamento`,{motivo:'Cliente suspendeu a necessidade'});
const confirmar=(c,p,fisico=false)=>c.req('POST',`/atividades/${p.id}/cancelamento/confirmacao`,{motivo:fisico?'Todos os itens conferidos na origem registrada':'Compras pendentes tratadas com o fornecedor',conferenciaFisica:fisico});
const plano=async(p,compra=0)=>{
  await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{});
  await financeiro.req('POST',`/atividades/${p.id}/plano-financeiro`,{materiais:[{materialId:p.materiais[0].id,quantidadeCompra:compra,justificativa:compra?'Material para compra em teste':'',origens:compra?[]:[{equipamentoId:ferramenta.id,quantidade:2}]}]});
  await financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});
};
let p=await criar();
await rh.req('GET',`/atividades/${p.id}/cancelamento`,null,404);
await tecnico1.req('POST',`/atividades/${p.id}/cancelamento`,{motivo:'Sem permissão'},404);
await tecnico2.req('POST',`/atividades/${p.id}/cancelamento`,{motivo:''},400);
const csrf=tecnico2.csrf;tecnico2.csrf='';await tecnico2.req('POST',`/atividades/${p.id}/cancelamento`,{motivo:'Sem token'},403);tecnico2.csrf=csrf;
assert.equal((await cancelar(tecnico2,p)).status,'Cancelada');await cancelar(tecnico2,p);
await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{},409);
console.log('Cancelamento pendente, escopo, motivo, CSRF e repetição: OK');
p=await criar();await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{});
assert.equal((await cancelar(gerente,p)).status,'Cancelamento solicitado');
await financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{},409);
assert.equal((await confirmar(financeiro,p)).status,'Cancelada');
p=await criar();const antes=(await admin.req('GET','/equipamentos')).find(e=>e.id===ferramenta.id).quantidadeReservada;await plano(p);
assert.equal((await cancelar(financeiro,p)).status,'Cancelada');
assert.equal((await admin.req('GET','/equipamentos')).find(e=>e.id===ferramenta.id).quantidadeReservada,antes);
console.log('Suspensão bloqueia aprovação; cancelamento libera apenas a reserva correspondente: OK');
p=await criar();await plano(p);const envios=await estoque.req('POST',`/atividades/${p.id}/execucao-plano`,{});p=envios[0];
await estoque.req('POST',`/atividades/${p.id}/transito`,{});
assert.equal((await cancelar(financeiro,p)).status,'Cancelamento solicitado');
await tecnico2.req('POST',`/atividades/${p.id}/conclusao`,{},409);
const saldoSuspenso=(await admin.req('GET','/equipamentos')).find(e=>e.id===ferramenta.id).quantidadeReservada;
assert.equal(saldoSuspenso,antes+2);
const simultaneas=await Promise.all([confirmar(estoque,p,true),confirmar(estoque,p,true)]);
assert.ok(simultaneas.every(s=>s.status==='Cancelada'));
assert.equal((await admin.req('GET','/equipamentos')).find(e=>e.id===ferramenta.id).quantidadeReservada,antes);
console.log('Em trânsito: recebimento bloqueado, devolução conferida e confirmação concorrente sem dupla liberação: OK');
p=await criar();await plano(p,2);
await estoque.req('POST',`/atividades/${p.id}/materiais/${p.materiais[0].id}/aquisicao`,{quantidade:2,numeroNota:'NF-TESTE-CANCELAMENTO',identificacao:`TESTE-CANCEL-${p.id}`});
assert.equal((await cancelar(financeiro,p)).status,'Cancelamento solicitado');
await estoque.req('POST',`/atividades/${p.id}/execucao-plano`,{},409);
await confirmar(estoque,p,true);
const comprado=(await admin.req('GET','/equipamentos')).find(e=>e.serie===`TESTE-CANCEL-${p.id}`);
assert.equal(comprado.quantidade,2);assert.equal(comprado.quantidadeReservada,0);assert.equal(comprado.notaFiscal,'NF-TESTE-CANCELAMENTO');
console.log('Compra recebida preserva nota, quantidade e disponibilidade após conferência: OK');
p=await criar();await plano(p,2);
await estoque.req('POST',`/atividades/${p.id}/materiais/${p.materiais[0].id}/aquisicao`,{quantidade:1,numeroNota:'NF-PARCIAL-CANCEL',identificacao:`TESTE-PARCIAL-${p.id}`});
const lote=(await admin.req('GET','/equipamentos')).find(e=>e.serie===`TESTE-PARCIAL-${p.id}`);
const partes=await estoque.req('POST',`/atividades/${p.id}/atendimento-parcial`,{motivo:'Uma unidade disponível, outra pendente',materiais:[{materialId:p.materiais[0].id,origens:[{equipamentoId:lote.id,quantidade:1}]}]});
const enviado=partes.find(a=>a.id===p.id),restante=partes.find(a=>a.id!==p.id);
await estoque.req('POST',`/atividades/${enviado.id}/transito`,{});await tecnico2.req('POST',`/atividades/${enviado.id}/conclusao`,{});
await cancelar(financeiro,restante);const estadoRestante=await estoque.req('GET',`/atividades/${restante.id}/cancelamento`);
if(estadoRestante.podeConferirEstoque)await confirmar(estoque,restante,true);
assert.equal((await tecnico2.req('GET','/atividades')).find(a=>a.id===enviado.id).status,'Concluída');
assert.equal((await tecnico2.req('GET','/atividades')).find(a=>a.id===restante.id).status,'Cancelada');
console.log('Atendimento parcial: cancela somente o saldo pendente, preservando entrega e compra da outra parte: OK');
p=await criar(true);await rh.req('POST',`/atividades/${p.id}/aprovacao`,{});await cancelar(rh,p);await confirmar(financeiro,p);
const pedidosRh=await rh.req('GET','/atividades/pedidos-rh');assert.ok(pedidosRh.length>0);
assert.ok(pedidosRh.every(p=>p.materiais.every(m=>m.catalogoChave.startsWith('epi|'))));
assert.ok(pedidosRh.some(x=>x.id===p.id&&x.status==='Cancelada'));
for(const c of [gerente,financeiro,estoque,tecnico2,tst])await c.req('GET','/atividades/pedidos-rh',null,403);
await rh.req('POST','/equipamentos',{},403);await rh.req('POST','/funcionarios',{},403);
const concl=(await tecnico2.req('GET','/atividades')).find(p=>p.status==='Concluída');
await admin.req('POST',`/atividades/${concl.id}/cancelamento`,{motivo:'Não deve apagar entrega'},403);
const caixa=await rh.req('GET','/notificacoes');assert.ok(caixa.itens.some(n=>n.tipo==='CANCELAMENTO_CONFIRMADO'));
console.log(`RH isolado a EPIs, sem cadastros; notificações e entregas preservadas: OK. ${verificacoes} requisições verificadas.`);
