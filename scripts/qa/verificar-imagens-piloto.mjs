// Varre somente imagens locais de teste, após integração aprovada; sem publicação.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,chmodSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../../',import.meta.url));process.chdir(raiz);
const pasta=path.join(raiz,'test-results/quality-assurance/piloto');mkdirSync(pasta,{recursive:true});
const inicio=new Date().toISOString(),resultados=[];
const alvos=[{nome:'api',tag:'era-tests-api:local'},{nome:'ui',tag:'era-tests-ui:local'}];
const scanner='aquasec/trivy:0.76.1';let scannerId=null,erroInfra=null;
async function executar(args,timeout=660000){
 return new Promise((resolve,reject)=>{
  const p=spawn('docker',args,{stdio:['ignore','pipe','pipe']});let out='',err='';
  const timer=setTimeout(()=>p.kill('SIGTERM'),timeout);
  p.stdout.on('data',b=>out+=b);p.stderr.on('data',b=>err+=b);
  p.once('error',e=>{clearTimeout(timer);reject(e);});
  p.once('close',(code,sinal)=>{clearTimeout(timer);code===0?resolve(out.trim()):reject(new Error(`docker ${args[0]} falhou (${code??sinal}): ${err}`));});
 });
}
try{
 await executar(['info','--format','{{.ServerVersion}}'],10000);
 const execucao=JSON.parse(readFileSync(path.join(pasta,'integracao-execucao.json'),'utf8'));
 assert.equal(execucao.codigo,0,'A integração completa do fechamento deve passar antes da varredura.');
 const fontes=JSON.parse(readFileSync(path.join(pasta,'fontes-iniciais.json'),'utf8'));
 for(const [arquivo,hash] of Object.entries(fontes))assert.equal(createHash('sha256').update(readFileSync(arquivo)).digest('hex'),hash,`Fonte alterado após o início: ${arquivo}`);
 for(const [arquivo,hash] of Object.entries(fontes).filter(([p])=>!p.startsWith('scripts/qa/')&&p!=='README.md'&&p!=='compose.production.yaml'))assert.equal(execucao.fontesNoInicio?.[arquivo],hash,`A integração não validou este candidato: ${arquivo}`);
 await executar(['pull',scanner]);scannerId=await executar(['image','inspect',scanner,'--format','{{.Id}}']);
 const cache=path.join(pasta,'trivy-cache');mkdirSync(cache,{recursive:true});
 for(const alvo of alvos){
  const imageId=await executar(['image','inspect',alvo.tag,'--format','{{.Id}}']);assert.match(imageId,/^sha256:[a-f0-9]{64}$/);
  assert.equal(imageId,execucao.imagensTestadas?.[alvo.nome],'A imagem atual não corresponde à integração concluída.');
  const arquivo=path.join(pasta,`${alvo.nome}-imagem.tar`);
  await executar(['image','save','--output',arquivo,alvo.tag]);chmodSync(arquivo,0o600);
  assert.equal(await executar(['image','inspect',alvo.tag,'--format','{{.Id}}']),imageId,'A tag mudou durante a exportação.');
  const json=await executar(['run','--rm','--mount',`type=bind,src=${arquivo},dst=/entrada/imagem.tar,readonly`,'--mount',`type=bind,src=${cache},dst=/root/.cache/trivy`,scanner,'image','--scanners','vuln','--format','json','--severity','HIGH,CRITICAL','--exit-code','0','--timeout','10m','--input','/entrada/imagem.tar']);
  const dados=JSON.parse(json);assert.equal(dados.SchemaVersion,2);assert.ok(dados.Metadata&&Array.isArray(dados.Results),'Relatório Trivy incompleto.');
  const vulnerabilidades=dados.Results.flatMap(r=>r.Vulnerabilities||[]),altas=vulnerabilidades.filter(v=>v.Severity==='HIGH').length,criticas=vulnerabilidades.filter(v=>v.Severity==='CRITICAL').length;
  const relatorio=path.relative(raiz,path.join(pasta,`trivy-${alvo.nome}.json`));writeFileSync(relatorio,json+'\n',{mode:0o600});
  resultados.push({...alvo,imageId,resultado:altas||criticas?'REPROVADO':'APROVADO',altas,criticas,relatorio,sha256Relatorio:createHash('sha256').update(readFileSync(relatorio)).digest('hex')});
 }
}catch(e){erroInfra=e.message;console.error(erroInfra);}
finally{
 for(const alvo of alvos)if(!resultados.some(r=>r.nome===alvo.nome))resultados.push({...alvo,resultado:'BLOQUEADO',motivo:erroInfra});
 writeFileSync(path.join(pasta,'imagens.json'),JSON.stringify({inicio,fim:new Date().toISOString(),scanner,scannerId,scanners:['vuln'],severidades:['HIGH','CRITICAL'],ignoreUnfixed:false,resultados},null,2)+'\n');
 console.log(JSON.stringify(resultados.map(({nome,resultado,altas,criticas})=>({nome,resultado,altas,criticas})),null,2));
 if(resultados.some(r=>r.resultado!=='APROVADO'))process.exitCode=1;
}
