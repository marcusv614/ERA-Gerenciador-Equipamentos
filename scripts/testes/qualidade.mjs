// Contratos reais e regressão dos bugs de QA, somente na stack descartável.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Cliente, configuracaoTeste, hoje } from './cliente.mjs';

const config=configuracaoTeste();
const conta=config.contas.find(c=>c.perfil==='ADMIN');
const admin=await new Cliente(config).entrar(conta.login,conta.senha);
const resultados=[];
let funcionario,obra;
async function caso(nome,executar){
  await test(nome,async()=>{
    const inicio=performance.now();
    try {await executar();resultados.push({nome,resultado:'APROVADO',duracaoMs:performance.now()-inicio});}
    catch(erro){resultados.push({nome,resultado:'REPROVADO',duracaoMs:performance.now()-inicio,erro:erro.message});throw erro;}
  });
}

await caso('QA-API-01: categoria com campo nulo retorna 400 e não persiste',async()=>{
  const antes=await admin.req('GET','/categorias-equipamento');
  await admin.req('POST','/categorias-equipamento',{nome:'QA nula',campos:[null]},400);
  assert.deepEqual(await admin.req('GET','/categorias-equipamento'),antes);
});
await caso('QA-API-02: categoria válida persiste configuração e impede nome duplicado',async()=>{
  const dados={nome:'QA Medição',campos:[{chave:'marca',rotulo:'Marca',tipo:'text'}]};
  const categoria=await admin.req('POST','/categorias-equipamento',dados,201);
  assert.equal(categoria.slug,'qa-medicao');assert.equal(categoria.campos[0].chave,'marca');
  assert.ok((await admin.req('GET','/categorias-equipamento')).some(c=>c.id===categoria.id));
  await admin.req('POST','/categorias-equipamento',dados,409);
});
await caso('QA-API-03: chaves e tipos de categoria inválidos não persistem',async()=>{
  const antes=await admin.req('GET','/categorias-equipamento');
  await admin.req('POST','/categorias-equipamento',{nome:'QA chave inválida',campos:[{chave:'senhaHash',rotulo:'Não permitido',tipo:'text'}]},409);
  await admin.req('POST','/categorias-equipamento',{nome:'QA tipo inválido',campos:[{chave:'marca',rotulo:'Marca',tipo:'script'}]},409);
  assert.deepEqual(await admin.req('GET','/categorias-equipamento'),antes);
});
await caso('QA-API-04: PostgreSQL preserva nome com vírgula no inventário histórico',async()=>{
  funcionario=await admin.req('POST','/funcionarios',{nome:'QA Silva, João',cargo:'TST',status:'Ativo'},201);
  obra=await admin.req('POST','/obras',{nome:'QA inventário persistente',cliente:'Cliente fictício',cidade:'Manaus',inicio:hoje(),status:'Em andamento',responsaveis:[funcionario.nome]},201);
  const historico=await admin.req('GET',`/obras/${obra.id}/inventario-historico?data=${hoje()}`);
  assert.deepEqual(historico.responsaveisTecnicos,[funcionario.nome]);assert.equal(historico.obraNome,obra.nome);
});
await caso('QA-API-05: novo snapshot preserva aspas e lê o último estado persistido',async()=>{
  funcionario=await admin.req('PATCH',`/funcionarios/${funcionario.id}`,{nome:'QA Ana "Medição"',cargo:'TST',status:'Ativo'});
  obra=await admin.req('PATCH',`/obras/${obra.id}`,{...obra,responsaveis:[funcionario.nome]});
  const historico=await admin.req('GET',`/obras/${obra.id}/inventario-historico?data=${hoje()}`);
  assert.deepEqual(historico.responsaveisTecnicos,[funcionario.nome]);
});
await caso('QA-API-06: inventário recusa futuro e parâmetros inválidos',async()=>{
  const futuro=new Date(`${hoje()}T12:00:00Z`);futuro.setUTCDate(futuro.getUTCDate()+2);
  await admin.req('GET',`/obras/${obra.id}/inventario-historico?data=${futuro.toISOString().slice(0,10)}`,undefined,409);
  await admin.req('GET',`/obras/${obra.id}/inventario-historico?data=invalida`,undefined,400);
  await admin.req('GET',`/obras/${obra.id}/inventario-historico`,undefined,400);
});
await caso('QA-API-07: arquivamento exige conclusão, persiste e permite restauração',async()=>{
  await admin.req('PATCH',`/obras/${obra.id}/arquivamento`,{arquivado:true},409);
  obra=await admin.req('PATCH',`/obras/${obra.id}`,{...obra,status:'Concluída'});
  const arquivada=await admin.req('PATCH',`/obras/${obra.id}/arquivamento`,{arquivado:true});
  assert.equal(arquivada.arquivado,true);
  assert.equal((await admin.req('GET','/obras')).find(o=>o.id===obra.id).arquivado,true);
  assert.equal((await admin.req('PATCH',`/obras/${obra.id}/arquivamento`,{arquivado:false})).arquivado,false);
});
const amostras=[];
await caso('QA-API-08: amostragem controlada de dez leituras sequenciais',async()=>{
  for(let i=0;i<10;i++){
    const inicio=performance.now();const categorias=await admin.req('GET','/categorias-equipamento');
    amostras.push(performance.now()-inicio);assert.ok(categorias.some(c=>c.nome==='QA Medição'));
  }
});
const ordenadas=[...amostras].sort((a,b)=>a-b);
const desempenho={amostrasMs:amostras,p50Ms:ordenadas[Math.ceil(ordenadas.length*.5)-1],p95Ms:ordenadas[Math.ceil(ordenadas.length*.95)-1],escopo:'10 GET sequenciais; API e PostgreSQL descartáveis, sem teste de carga ou SLA'};
mkdirSync('test-results/quality-assurance',{recursive:true});
writeFileSync('test-results/quality-assurance/qualidade-api.json',JSON.stringify({resultados,requisicoes:admin.verificacoes,desempenho},null,2));
console.log(`QA HTTP real: ${resultados.filter(r=>r.resultado==='APROVADO').length}/${resultados.length} casos aprovados; ${admin.verificacoes} requisições.`);
