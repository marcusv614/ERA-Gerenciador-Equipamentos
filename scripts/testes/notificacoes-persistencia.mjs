import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { Cliente,configuracaoTeste,hoje,senhaTemporaria,senhaDefinitiva } from './cliente.mjs';
import { bancoDescartavel } from './banco-descartavel.mjs';

const config=configuracaoTeste();
const {sql,barreira,esperarLocks}=await bancoDescartavel(config);
const clientes={};
for(const perfil of ['ADMIN','GERENTE','FINANCEIRO','TECNICO']) {
  const conta=config.contas.find(c=>c.perfil===perfil);
  clientes[perfil]=await new Cliente(config).entrar(conta.login,conta.senha);
}
const {ADMIN:admin,GERENTE:gerente,FINANCEIRO:financeiro,TECNICO:tecnico}=clientes;
const gerenteId=config.contas.find(c=>c.perfil==='GERENTE').id;
const funcionario=config.funcionarios.tecnico1;
const material=config.equipamentos.find(e=>e.serie==='DEMO-3');
const destinos=config.obras;
const resultados=[];
function gravar() {
  const dados=JSON.stringify({resultados,escopo:'API e PostgreSQL descartáveis; barreiras, falhas e fixtures SQL exclusivas dos testes.'},null,2)+'\n';
  mkdirSync('test-results/quality-assurance',{recursive:true});
  writeFileSync('test-results/quality-assurance/notificacoes-persistencia.json',dados);
  if(config.artefatos){mkdirSync(config.artefatos,{recursive:true});writeFileSync(path.join(config.artefatos,'notificacoes-persistencia.json'),dados);}
}
async function caso(nome,executar) {
  await test(nome,async()=>{
    const evidencia={nome,resultado:'REPROVADO'},inicio=performance.now();
    try{await executar(evidencia);evidencia.resultado='APROVADO';}
    catch(e){evidencia.erro=e.message;throw e;}
    finally{evidencia.duracaoMs=performance.now()-inicio;resultados.push(evidencia);gravar();}
  });
}
async function preparar() {
  let p=await tecnico.req('POST','/atividades',{tecnico:funcionario.nome,obraDestinoId:destinos[0].id,dataSolicitacao:hoje(),materiais:[{nome:material.modelo,catalogoChave:material.catalogoChave,quantidade:1}]},201);
  p=await gerente.req('POST',`/atividades/${p.id}/aprovacao`,{});
  await financeiro.req('POST',`/atividades/${p.id}/plano-financeiro`,{materiais:[{materialId:p.materiais[0].id,quantidadeCompra:1,justificativa:'Compra fictícia para testar avisos',origens:[]}]});
  const aviso=(await gerente.req('GET','/notificacoes')).itens.find(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');
  assert.ok(aviso);return {p,aviso};
}
const avisosDoPedido=id=>sql(`select coalesce(json_agg(n order by id),'[]') from notificacoes_movimentacao n where solicitacao_id=${id};`).then(JSON.parse);
const pedidoNoBanco=id=>sql(`select row_to_json(s) from solicitacoes s where id=${id};`).then(JSON.parse);
const editar=(p,observacao)=>financeiro.resposta('PATCH',`/atividades/${p.id}`,{obraDestinoId:destinos[0].id,observacao});
const revisar=(p,motivo)=>financeiro.resposta('POST',`/atividades/${p.id}/plano-financeiro`,{
  motivoRevisao:motivo,materiais:[{materialId:p.materiais[0].id,quantidadeCompra:1,justificativa:motivo,origens:[]}],
});
async function instalarBarreira(id,condicao) {
  await sql(`create or replace function qa_barreira_aviso() returns trigger language plpgsql as $$
    begin if NEW.id=${id} and (${condicao}) then perform pg_advisory_xact_lock(20261027,952);end if;return NEW;end;$$;
    create trigger qa_barreira_aviso before update on notificacoes_movimentacao for each row execute function qa_barreira_aviso();`);
}
async function limparBarreira(){await sql('drop trigger if exists qa_barreira_aviso on notificacoes_movimentacao;drop function if exists qa_barreira_aviso();');}
async function disputa(e,primeira,segunda) {
  let liberar,pendentes;
  try {
    liberar=await barreira();const a=primeira();pendentes=Promise.allSettled([a]);
    // Confirmar que a primeira operação alcançou o gatilho antes de iniciar a segunda.
    await esperarLocks(1);const b=segunda();pendentes=Promise.allSettled([a,b]);
    e.esperasPostgres=await esperarLocks(2);await liberar();liberar=null;
    const respostas=await pendentes;assert.ok(respostas.every(r=>r.status==='fulfilled'),'Requisições precisam concluir sem timeout.');
    e.statusHttp=respostas.map(r=>r.value.status);assert.deepEqual(e.statusHttp,[200,200]);
    return respostas.map(r=>r.value.dados);
  } finally{if(liberar)await liberar();if(pendentes)await pendentes;await limparBarreira();}
}

await caso('QA-NOT-01: reentrega atualiza resumo e obra sem duplicar aviso',async e=>{
  const {p,aviso}=await preparar();await gerente.req('POST',`/notificacoes/${aviso.id}/leitura`,{});
  await financeiro.req('PATCH',`/atividades/${p.id}`,{obraDestinoId:destinos[1].id,materiais:[{nome:material.modelo,catalogoChave:material.catalogoChave,quantidade:2}]});
  const itens=(await gerente.req('GET','/notificacoes')).itens.filter(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');
  e.aviso=itens[0];assert.equal(itens.length,1);assert.equal(itens[0].id,aviso.id);assert.equal(itens[0].lidaEm,null);
  assert.deepEqual(itens[0].materiais,[{nome:material.modelo,quantidade:2}]);
  assert.equal(itens[0].obraId,destinos[1].id);assert.equal(itens[0].obraNome,destinos[1].nome);
  const persistidos=(await avisosDoPedido(p.id)).filter(n=>n.tipo==='AJUSTE_FINANCEIRO');
  assert.equal(persistidos.length,1);assert.deepEqual(persistidos[0].materiais,itens[0].materiais);
});
await caso('QA-NOT-02: duas leituras simultâneas preservam primeiro horário',async e=>{
  const {aviso}=await preparar();await instalarBarreira(aviso.id,'OLD.lida_em is null and NEW.lida_em is not null');
  const [a,b]=await disputa(e,()=>gerente.resposta('POST',`/notificacoes/${aviso.id}/leitura`,{}),()=>gerente.resposta('POST',`/notificacoes/${aviso.id}/leitura`,{}));
  assert.ok(a.lidaEm);e.horariosHttp=[a.lidaEm,b.lidaEm];
  const persistido=JSON.parse(await sql(`select row_to_json(n) from notificacoes_movimentacao n where id=${aviso.id};`));
  const horarios=[a.lidaEm,b.lidaEm,persistido.lida_em];
  for(const horario of horarios)assert.match(horario,/^\d{4}-\d{2}-\d{2}T[\d:.+\-]+Z?$/);
  // A primeira resposta Java pode ter nanossegundos e offset; o banco armazena microssegundos.
  assert.equal(await sql(`select '${horarios[0]}'::timestamptz='${horarios[1]}'::timestamptz and '${horarios[1]}'::timestamptz='${horarios[2]}'::timestamptz;`),'t');
  e.lidaEm=persistido.lida_em;
});
for(const leituraPrimeiro of [true,false]) await caso(`QA-NOT-0${leituraPrimeiro?3:4}: ${leituraPrimeiro?'leitura seguida de renovação':'renovação seguida de leitura'} concorrentes`,async e=>{
  const {p,aviso}=await preparar();
  await instalarBarreira(aviso.id,leituraPrimeiro?'OLD.lida_em is null and NEW.lida_em is not null':'NEW.criada_em is distinct from OLD.criada_em');
  const ler=()=>gerente.resposta('POST',`/notificacoes/${aviso.id}/leitura`,{});
  const renovar=()=>editar(p,'Renovação concorrente após edição financeira');
  await disputa(e,leituraPrimeiro?ler:renovar,leituraPrimeiro?renovar:ler);
  const persistido=(await avisosDoPedido(p.id)).filter(n=>n.tipo==='AJUSTE_FINANCEIRO');
  assert.equal(persistido.length,1);assert.equal(persistido[0].id,aviso.id);
  e.lidaEm=persistido[0].lida_em;
  if(leituraPrimeiro)assert.equal(e.lidaEm,null,'O novo evento deve reabrir a leitura.');else assert.ok(e.lidaEm,'A leitura após a renovação deve ser preservada.');
  assert.equal((await pedidoNoBanco(p.id)).observacao,'Renovação concorrente após edição financeira');
});
await caso('QA-NOT-05: duas alterações financeiras concorrentes mantêm um aviso',async e=>{
  const {p,aviso}=await preparar();await instalarBarreira(aviso.id,'NEW.criada_em is distinct from OLD.criada_em');
  await disputa(e,()=>editar(p,'Alteração concorrente A'),()=>editar(p,'Alteração concorrente B'));
  const lista=(await avisosDoPedido(p.id)).filter(n=>n.tipo==='AJUSTE_FINANCEIRO');
  assert.equal(lista.length,1);assert.equal(lista[0].id,aviso.id);assert.equal(lista[0].lida_em,null);
  assert.equal((await pedidoNoBanco(p.id)).observacao,'Alteração concorrente B');e.avisosPersistidos=lista.length;
});
await caso('QA-NOT-06: falha de gravação reverte pedido e todos os avisos',async e=>{
  const {p,aviso}=await preparar();
  await financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});
  await gerente.req('POST',`/notificacoes/${aviso.id}/leitura`,{});
  const estoqueId=config.contas.find(c=>c.perfil==='ESTOQUE').id;
  const antesPedido=await pedidoNoBanco(p.id),antesAvisos=await avisosDoPedido(p.id);
  await sql(`create or replace function qa_falhar_aviso() returns trigger language plpgsql as $$
    begin if NEW.usuario_id=${estoqueId} and NEW.solicitacao_id=${p.id} and NEW.tipo='AJUSTE_FINANCEIRO' then raise exception 'QA falha controlada de aviso' using errcode='23514';end if;return NEW;end;$$;
    create trigger qa_falhar_aviso before insert or update on notificacoes_movimentacao for each row execute function qa_falhar_aviso();`);
  try {
    const r=await revisar(p,'Não deve persistir');e.statusHttp=[r.status];assert.equal(r.status,409);
    assert.deepEqual(await pedidoNoBanco(p.id),antesPedido);assert.deepEqual(await avisosDoPedido(p.id),antesAvisos);
  } finally{await sql('drop trigger if exists qa_falhar_aviso on notificacoes_movimentacao;drop function if exists qa_falhar_aviso();');}
  assert.equal((await revisar(p,'Gravação recuperada')).status,200);
  assert.equal((await avisosDoPedido(p.id)).filter(n=>n.tipo==='AJUSTE_FINANCEIRO').length,2);e.rollbackConfirmado=true;e.destinatariosDepoisDaRecuperacao=2;
});
await caso('QA-NOT-07: paginação SQL estável e contador só do titular',async e=>{
  const {p,aviso}=await preparar();
  await sql(`insert into notificacoes_movimentacao(usuario_id,obra_id,solicitacao_id,perfil,obra_nome,destinatario,materiais,criada_em,tipo,mensagem)
    select n.usuario_id,n.obra_id,n.solicitacao_id,n.perfil,n.obra_nome,n.destinatario,n.materiais,'2026-10-27T00:00:00Z','QA_PAGINA_'||g,'Fixture de paginação'
    from notificacoes_movimentacao n cross join generate_series(1,45) g where n.id=${aviso.id};
    delete from notificacoes_movimentacao where usuario_id=${gerenteId} and tipo not like 'QA_PAGINA_%';`);
  const paginas=await Promise.all([0,1,2].map(i=>gerente.req('GET',`/notificacoes?pagina=${i}`)));
  assert.deepEqual(paginas.map(p=>p.itens.length),[20,20,5]);assert.deepEqual(paginas.map(p=>p.temMais),[true,true,false]);
  assert.ok(paginas.every(p=>p.naoLidas===45));
  const ids=paginas.flatMap(p=>p.itens.map(n=>n.id));assert.equal(new Set(ids).size,45);assert.deepEqual(ids,[...ids].sort((a,b)=>b-a));
  assert.deepEqual((await gerente.req('GET','/notificacoes?pagina=-1')).itens,paginas[0].itens);
  const fora=await gerente.req('GET','/notificacoes?pagina=2147483647');assert.equal(fora.itens.length,0);assert.equal(fora.naoLidas,45);assert.equal(fora.temMais,false);
  await financeiro.req('POST',`/notificacoes/${ids[0]}/leitura`,{},404);
  await gerente.req('POST',`/notificacoes/${ids[0]}/leitura`,{});assert.equal((await gerente.req('GET','/notificacoes')).naoLidas,44);
  e.tamanhos=paginas.map(p=>p.itens.length);e.naoLidasAntes=45;e.naoLidasDepois=44;
});
await caso('QA-NOT-08: reentrega para novo perfil elegível continua visível',async e=>{
  const conta=await admin.req('POST','/usuarios',{nome:'QA Destinatário',login:'qa.notificacao.perfil',perfil:'GERENTE',senhaTemporaria},201);
  let cliente=await new Cliente(config).entrar(conta.login,senhaTemporaria,true);
  const {p}=await preparar();
  const anterior=(await cliente.req('GET','/notificacoes')).itens.find(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');assert.ok(anterior);
  await admin.req('PUT',`/usuarios/${conta.id}`,{nome:conta.nome,login:conta.login,perfil:'ESTOQUE',funcionarioId:null});
  cliente=await new Cliente(config).entrar(conta.login,senhaDefinitiva);
  await financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});
  assert.equal((await revisar(p,'Ajuste destinado ao perfil atual')).status,200);
  const atual=(await cliente.req('GET','/notificacoes')).itens.find(n=>n.solicitacaoId===p.id&&n.tipo==='AJUSTE_FINANCEIRO');
  e.avisoVisivel=Boolean(atual);assert.ok(atual,'O novo evento precisa ficar visível ao destinatário elegível no perfil atual.');
  assert.equal(atual.id,anterior.id);assert.equal(atual.lidaEm,null);
  assert.equal(await sql(`select perfil from notificacoes_movimentacao where id=${atual.id};`),'ESTOQUE');
});
