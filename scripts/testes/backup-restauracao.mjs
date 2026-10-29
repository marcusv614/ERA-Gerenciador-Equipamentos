// Ensaio de restauração somente no projeto aleatório e etiquetado do executor.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { Cliente,configuracaoTeste } from './cliente.mjs';
import { bancoDescartavel } from './banco-descartavel.mjs';

const config=configuracaoTeste();
const {sql}=await bancoDescartavel(config);
const compose=['compose','--env-file',config.envVazio,'-f','compose.test.yaml','-p',config.project];
const pasta=config.artefatos;
assert.ok(pasta,'O executor deve fornecer a pasta de artefatos.');
mkdirSync(pasta,{recursive:true});
const evidencia={nome:'QA-BKP-01: dump, restauração integral e retomada da API',resultado:'REPROVADO'};
const inicio=performance.now();
const sha=valor=>createHash('sha256').update(valor).digest('hex');
async function comando(args,entrada){
  return new Promise((resolve,reject)=>{
    const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});let tamanho=0;const saida=[];let erro='';
    const timer=setTimeout(()=>p.kill('SIGTERM'),120000);
    p.stdout.on('data',b=>{tamanho+=b.length;if(tamanho>32*1024*1024)p.kill('SIGTERM');else saida.push(b);});
    p.stderr.on('data',b=>erro+=b);
    p.once('error',e=>{clearTimeout(timer);reject(e);});
    p.once('close',(codigo,sinal)=>{clearTimeout(timer);codigo===0?resolve(Buffer.concat(saida)):reject(new Error(`Docker de teste falhou (${codigo??sinal}): ${erro}`));});
    p.stdin.on('error',()=>{});p.stdin.end(entrada);
  });
}
const docker=async args=>(await comando(args)).toString().trim();
async function manifestar(){
  const tabelas=(await sql("select tablename from pg_tables where schemaname='public' order by tablename;")).split('\n').filter(Boolean);
  assert.ok(tabelas.includes('flyway_schema_history'));
  const linhas=[];
  for(const nome of tabelas){
    assert.match(nome,/^[a-z_][a-z_0-9]*$/);
    const [quantidade,resumo]=(await sql(`select count(*),md5(coalesce(string_agg(to_jsonb(t)::text,E'\\n' order by to_jsonb(t)::text),'')) from public."${nome}" t;`)).split('|');
    linhas.push({tabela:nome,quantidade:Number(quantidade),resumo});
  }
  const nomes=(await sql("select sequencename from pg_sequences where schemaname='public' order by sequencename;")).split('\n').filter(Boolean);
  const sequencias=[];
  for(const nome of nomes){assert.match(nome,/^[a-z_][a-z_0-9]*$/);const [valor,chamada]= (await sql(`select last_value,is_called from public."${nome}";`)).split('|');sequencias.push({nome,valor,chamada});}
  return {tabelas:linhas,sequencias};
}
function canonizar(valor,chave){
  if(Array.isArray(valor)){
    const itens=valor.map(v=>canonizar(v));
    // Responsáveis é um Set no domínio, sem ordenação persistida.
    if(chave==='responsaveis')return itens.sort();
    return itens.every(x=>x&&typeof x==='object'&&'id' in x)?itens.sort((a,b)=>String(a.id).localeCompare(String(b.id))):itens;
  }
  if(valor&&typeof valor==='object')return Object.fromEntries(Object.keys(valor).sort().map(k=>[k,canonizar(valor[k],k)]));
  return valor;
}
const rotas=['/obras','/equipamentos','/funcionarios','/atividades'];
async function leituras(rotulo){
  const conta=config.contas.find(c=>c.login==='demo.gerente');assert.ok(conta);
  const cliente=await new Cliente(config).entrar(conta.login,conta.senha);
  const respostas={};for(const rota of rotas){
    const dados=await cliente.req('GET',rota);
    if(rota==='/obras'&&rotulo)evidencia[rotulo]=dados.map(({id,responsaveis})=>({id,responsaveis}));
    respostas[rota]=sha(JSON.stringify(canonizar(dados)));
  }
  return respostas;
}
let parada=false;
try{
  // Conferir o alvo da parada, além das verificações do bancoDescartavel.
  const api=await docker([...compose,'ps','-q','api']);assert.match(api,/^[a-f0-9]{12,64}$/);
  assert.equal(await docker(['inspect','-f','{{index .Config.Labels "era.test"}}',api]),'true');
  assert.equal(await docker(['inspect','-f','{{index .Config.Labels "com.docker.compose.project"}}',api]),config.project);
  const antesHttp=await leituras('responsaveisAntes');
  await comando([...compose,'stop','--timeout','10','api']);parada=true;
  const antes=await manifestar();
  const dumpInicio=performance.now();
  const dump=await comando([...compose,'exec','-T','database','pg_dump','-U','era_test','-d','era_test','--format=custom','--no-owner','--no-acl']);
  assert.equal(dump.subarray(0,5).toString(),'PGDMP');
  writeFileSync(path.join(pasta,'banco-ficticio.dump'),dump,{mode:0o600});
  const lista=(await comando([...compose,'exec','-T','database','pg_restore','--list'],dump)).toString();
  assert.ok(lista.includes('TABLE DATA public obras'));assert.ok(lista.includes('TABLE DATA public flyway_schema_history'));
  evidencia.backup={bytes:dump.length,sha256:sha(dump),duracaoMs:performance.now()-dumpInicio};
  const obra=config.obras[0];assert.ok(Number.isSafeInteger(obra.id));
  await sql(`update obras set nome='QA ALTERACAO POSTERIOR AO BACKUP' where id=${obra.id};`);
  assert.notDeepEqual((await manifestar()).tabelas,antes.tabelas,'O ensaio precisa modificar dados antes da restauração.');
  const restauracaoInicio=performance.now();
  await comando([...compose,'exec','-T','database','pg_restore','-U','era_test','-d','era_test','--clean','--if-exists','--exit-on-error','--no-owner','--no-acl'],dump);
  const depois=await manifestar();
  assert.deepEqual(depois.tabelas,antes.tabelas,'Contagens e conteúdo de todas as tabelas devem ser restaurados.');
  assert.deepEqual(depois.sequencias,antes.sequencias,'Sequências devem preservar valor e is_called.');
  evidencia.restauracao={duracaoMs:performance.now()-restauracaoInicio,...depois};
  await comando([...compose,'start','api']);parada=false;
  // Uma porta efêmera pode mudar mesmo ao reiniciar o mesmo contêiner.
  const endereco=await docker([...compose,'port','api','8080']);
  assert.match(endereco,/^127\.0\.0\.1:\d+$/);
  const urlAnterior=config.url;config.url=`http://${endereco}`;
  evidencia.portaAlteradaNoReinicio=config.url!==urlAnterior;
  const limite=Date.now()+180000;
  while(true){
    try{if((await fetch(`${config.url}/api/actuator/health`,{signal:AbortSignal.timeout(2000)})).ok)break;}catch{/* aguardar reinício */}
    assert.ok(Date.now()<limite,'API restaurada não voltou a ficar saudável.');await new Promise(r=>setTimeout(r,1000));
  }
  assert.deepEqual(await leituras('responsaveisDepois'),antesHttp,'Novo login e leituras da API devem recuperar o conteúdo anterior.');
  evidencia.leiturasHttp=antesHttp;evidencia.resultado='APROVADO';
}catch(erro){evidencia.erro=erro.message;throw erro;}
finally{
  try{if(parada)await comando([...compose,'start','api']);}
  finally{
    evidencia.duracaoMs=performance.now()-inicio;
    const resultado={resultados:[evidencia],escopo:'Banco fictício PostgreSQL 16 em tmpfs; restauração na mesma versão. Não valida backup externo, retenção, criptografia ou base legada real.'};
    writeFileSync(path.join(pasta,'backup-restauracao.json'),JSON.stringify(resultado,null,2)+'\n',{mode:0o600});
    console.log(JSON.stringify({nome:evidencia.nome,resultado:evidencia.resultado,tabelas:evidencia.restauracao?.tabelas.length,sequencias:evidencia.restauracao?.sequencias.length,duracaoMs:evidencia.duracaoMs}));
  }
}
