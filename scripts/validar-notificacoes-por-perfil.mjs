// Executar somente contra API descartável gerada pelo executor isolado.
import { configuracaoTeste } from './testes/cliente.mjs';
import assert from 'node:assert/strict';
assert.ok(process.argv.includes('--banco-descartavel'));
const config=configuracaoTeste();
const contas=config.contas;
const limite=Date.now()+120000;
for(;;){
  try{if((await fetch(config.url+'/api/actuator/health',{signal:AbortSignal.timeout(2000)})).ok)break;}catch{ /* API temporária em inicialização */ }
  if(Date.now()>limite)throw Error('API temporária não iniciou.');
  await new Promise(r=>setTimeout(r,1000));
}
let verificacoes=0;
class Cliente{
  cookies=new Map();csrf='';
  async req(method,path,body,status=200){
    const r=await fetch(config.url+'/api'+path,{method,headers:{'Content-Type':'application/json',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),'X-XSRF-TOKEN':this.csrf},body:body==null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');this.cookies.set(p.slice(0,i),p.slice(i+1));}
    const text=await r.text(),data=text?JSON.parse(text):null;assert.equal(r.status,status,`${method} ${path}: ${data?.mensagem||''}`);verificacoes++;return data;
  }
  async entrar(nome){const conta=contas.find(c=>c.login===`demo.${nome}`);this.csrf=(await this.req('GET','/auth/csrf')).token;await this.req('POST','/auth/login',{login:conta.login,senha:conta.senha});this.csrf=(await this.req('GET','/auth/csrf')).token;return this;}
}
const clientes={};for(const n of ['admin','gerente','rh','financeiro','estoque','tecnico1','tecnico2','tst'])clientes[n]=await new Cliente().entrar(n);
const {admin,gerente,rh,financeiro,estoque,tecnico2,tst}=clientes;
const obras=await admin.req('GET','/obras'),itens=await admin.req('GET','/equipamentos'),destino=obras.find(o=>o.nome==='DEMO Clínica Rio Negro');
const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
const criar=(epi=false)=>clientes[epi?'tst':'tecnico2'].req('POST','/atividades',{tecnico:epi?'DEMO tst':'DEMO tecnico2',obraDestinoId:destino.id,dataSolicitacao:hoje,observacao:'VALIDAÇÃO DESCARTÁVEL DE NOTIFICAÇÕES',materiais:[{nome:epi?'DEMO Luva':'DEMO Alicate',catalogoChave:epi?'epi|demo luva|':'ferramentas|demo alicate|',quantidade:1}]},201);
const destinatarios=async(p,tipo,esperados)=>{
  const recebidos=[];
  for(const [nome,c]of Object.entries(clientes)){
    const caixa=await c.req('GET','/notificacoes');if(caixa.itens.some(n=>n.solicitacaoId===p.id&&n.tipo===tipo))recebidos.push(nome);
  }
  assert.deepEqual(recebidos.sort(),[...esperados].sort(),tipo);
};
let p=await criar();await destinatarios(p,'NOVO_PEDIDO',['gerente']);
await gerente.req('POST',`/atividades/${p.id}/rejeicao`,{},409);
await gerente.req('POST',`/atividades/${p.id}/rejeicao`,{motivo:'    '},409);
assert.equal((await tecnico2.req('GET','/atividades')).find(a=>a.id===p.id).status,'Pendente');
const gerenteAviso=(await gerente.req('GET','/notificacoes')).itens.find(n=>n.solicitacaoId===p.id&&n.tipo==='NOVO_PEDIDO');
await financeiro.req('POST',`/notificacoes/${gerenteAviso.id}/leitura`,{},404);
await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{});await destinatarios(p,'ANALISE_FINANCEIRA',['financeiro']);
const definir=origens=>financeiro.req('POST',`/atividades/${p.id}/plano-financeiro`,{materiais:[{materialId:p.materiais[0].id,quantidadeCompra:origens?0:1,justificativa:origens?'':'Compra para preservar saldo na obra',origens:origens?[{equipamentoId:itens.find(e=>e.serie==='DEMO-3').id,quantidade:1}]:[]}]});
await definir(true);await destinatarios(p,'AJUSTE_FINANCEIRO',['gerente']);
let ajustes=(await gerente.req('GET','/notificacoes')).itens.filter(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');assert.equal(ajustes.length,1);
await gerente.req('POST',`/notificacoes/${ajustes[0].id}/leitura`,{});
await definir(false);ajustes=(await gerente.req('GET','/notificacoes')).itens.filter(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');assert.equal(ajustes.length,1);assert.equal(ajustes[0].lidaEm,null);
await definir(true);await financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});await destinatarios(p,'ATENDIMENTO_LIBERADO',['estoque']);
const envios=await estoque.req('POST',`/atividades/${p.id}/execucao-plano`,{});p=envios[0];await estoque.req('POST',`/atividades/${p.id}/transito`,{});
await destinatarios(p,'ENVIO',['tecnico1','tecnico2']);
await tecnico2.req('POST',`/atividades/${p.id}/conclusao`,{});await destinatarios(p,'RECEBIMENTO_CONFIRMADO',['gerente','estoque']);
console.log('Ferramentas: Gerência → Financeiro → Estoque → responsáveis da obra; recebimento ao gestor/estoque. Ajustes agrupados e leitura isolada: OK');
p=await criar(true);await destinatarios(p,'NOVO_PEDIDO',['rh']);
assert.ok(!(await gerente.req('GET','/atividades')).some(a=>a.id===p.id));
await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{},403);
await gerente.req('POST',`/atividades/${p.id}/rejeicao`,{},403);
await gerente.req('PATCH',`/atividades/${p.id}`,{obraDestinoId:destino.id,observacao:'Tentativa indevida'},403);
await gerente.req('GET',`/atividades/${p.id}/cancelamento`,null,404);
await gerente.req('POST',`/atividades/${p.id}/cancelamento`,{motivo:'Tentativa indevida'},404);
await gerente.req('POST',`/atividades/${p.id}/cancelamento/confirmacao`,{motivo:'Tentativa indevida',conferenciaFisica:false},404);
assert.equal((await tst.req('GET','/atividades')).find(a=>a.id===p.id).status,'Pendente');
const pedidoEpi={tecnico:'DEMO tst',obraDestinoId:destino.id,dataSolicitacao:hoje,materiais:[{nome:'DEMO Luva',catalogoChave:'epi|demo luva|',quantidade:1}]};
await gerente.req('POST','/atividades',pedidoEpi,403);
await gerente.req('POST','/atividades/transporte-direto',{...pedidoEpi,materiais:[{...pedidoEpi.materiais[0],identificacao:'DEMO-8'}]},403);
await rh.req('POST',`/atividades/${p.id}/aprovacao`,{});await destinatarios(p,'ANALISE_FINANCEIRA',['financeiro']);
await financeiro.req('POST',`/atividades/${p.id}/rejeicao`,{},409);
await financeiro.req('POST',`/atividades/${p.id}/rejeicao`,{motivo:'Material não necessário nesta etapa de teste'});await destinatarios(p,'PEDIDO_REJEITADO',['rh','tst']);
assert.ok((await financeiro.req('GET','/atividades/pedidos-financeiros')).find(a=>a.id===p.id).decisoes.some(d=>d.descricao?.includes('Material não necessário')));
assert.ok((await tst.req('GET','/atividades')).find(a=>a.id===p.id).eventosFinanceiros.some(e=>e.tipo==='REJEICAO'&&e.descricao.includes('Material não necessário')));
console.log('Gerência sem acesso, decisão, edição, criação, transporte direto ou cancelamento de EPI por ID; RH aprova normalmente: OK');
let epiPedido=await criar(true);await rh.req('POST',`/atividades/${epiPedido.id}/aprovacao`,{});
await financeiro.req('POST',`/atividades/${epiPedido.id}/plano-financeiro`,{materiais:[{materialId:epiPedido.materiais[0].id,quantidadeCompra:0,justificativa:'',origens:[{equipamentoId:itens.find(e=>e.serie==='DEMO-8').id,quantidade:1}]}]});
await financeiro.req('POST',`/atividades/${epiPedido.id}/aprovacao`,{});
epiPedido=(await estoque.req('POST',`/atividades/${epiPedido.id}/execucao-plano`,{}))[0];
await estoque.req('POST',`/atividades/${epiPedido.id}/transito`,{});await tst.req('POST',`/atividades/${epiPedido.id}/conclusao`,{});
assert.ok(!(await gerente.req('GET','/atividades')).some(a=>a.id===epiPedido.id));
await destinatarios(epiPedido,'RECEBIMENTO_CONFIRMADO',['rh','estoque']);
console.log('Fluxo EPI completo: TST → RH → Financeiro → Estoque → recebimento TST, sem Gerência: OK');
p=await criar();
await gerente.req('PATCH',`/atividades/${p.id}`,{tecnico:'DEMO tst',obraDestinoId:destino.id,observacao:'Tentativa de converter para EPI',materiais:pedidoEpi.materiais},403);
const preservado=(await tecnico2.req('GET','/atividades')).find(a=>a.id===p.id);
assert.equal(preservado.tecnico,'DEMO tecnico2');assert.ok(preservado.materiais.every(m=>!m.catalogoChave.startsWith('epi|')));
await gerente.req('POST',`/atividades/${p.id}/rejeicao`,{motivo:'Material não necessário nesta etapa de teste'});await destinatarios(p,'PEDIDO_REJEITADO',['tecnico2']);
const e=itens.find(e=>e.serie==='DEMO-1');
p=await gerente.req('POST','/atividades/transporte-direto',{tecnico:'DEMO tecnico2',obraDestinoId:destino.id,dataSolicitacao:hoje,materiais:[{nome:e.modelo,catalogoChave:e.catalogoChave,identificacao:e.serie,quantidade:1}]},201);
await destinatarios(p,'ATENDIMENTO_LIBERADO',['estoque']);await destinatarios(p,'ANALISE_FINANCEIRA',[]);
console.log(`EPIs somente RH/TST; rejeições aos envolvidos; transporte direto sem Financeiro; Admin sem cópias automáticas: OK. ${verificacoes} requisições verificadas.`);
