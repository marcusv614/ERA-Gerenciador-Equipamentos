// Executa todas as suítes descartáveis e registra saída e código para o fechamento.
import {spawn,execFileSync} from 'node:child_process';
import {openSync,closeSync,writeFileSync,readFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../',import.meta.url)));
mkdirSync('test-results/quality-assurance/piloto',{recursive:true});
const chromium=process.env.ERA_TEST_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':null);
const pasta='test-results/quality-assurance/piloto';
const fontesNoInicio=JSON.parse(readFileSync(`${pasta}/fontes-iniciais.json`,'utf8'));
for(const [arquivo,hash] of Object.entries(fontesNoInicio))assert.equal(createHash('sha256').update(readFileSync(arquivo)).digest('hex'),hash,`Fonte alterado antes da integração: ${arquivo}`);
const inicio=new Date(),log=`${pasta}/integracao.log`,fd=openSync(log,'w',0o600);
const args=['scripts/testar-integracao.mjs'];
const filho=spawn(process.execPath,args,{env:{...process.env,...(chromium?{ERA_TEST_CHROMIUM:chromium}:{})},stdio:['ignore',fd,fd]});
const timer=setTimeout(()=>filho.kill('SIGTERM'),30*60*1000);
filho.once('close',(codigo,sinal)=>{
 clearTimeout(timer);closeSync(fd);
 const imagensTestadas={};let erroIdentificacaoImagens=null;
 if(codigo===0)try{
  for(const nome of ['api','ui'])imagensTestadas[nome]=execFileSync('docker',['image','inspect',`era-tests-${nome}:local`,'--format','{{.Id}}'],{encoding:'utf8'}).trim();
 }catch(erro){erroIdentificacaoImagens=erro.message;}
 writeFileSync(`${pasta}/integracao-execucao.json`,JSON.stringify({inicio:inicio.toISOString(),fim:new Date().toISOString(),comando:[process.execPath,...args],env:chromium?{ERA_TEST_CHROMIUM:chromium}:{},codigo,sinal,log,fontesNoInicio,imagensTestadas,erroIdentificacaoImagens},null,2)+'\n');
 process.exitCode=codigo??1;
});
