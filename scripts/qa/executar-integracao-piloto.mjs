// Executa todas as suítes descartáveis e registra saída e código para o fechamento.
import {spawn} from 'node:child_process';
import {openSync,closeSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('../../',import.meta.url)));
mkdirSync('test-results/quality-assurance/piloto',{recursive:true});
const chromium=process.env.ERA_TEST_CHROMIUM||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':null);
const pasta='test-results/quality-assurance/piloto';
const inicio=new Date(),log=`${pasta}/integracao.log`,fd=openSync(log,'w',0o600);
const args=['scripts/testar-integracao.mjs'];
const filho=spawn(process.execPath,args,{env:{...process.env,...(chromium?{ERA_TEST_CHROMIUM:chromium}:{})},stdio:['ignore',fd,fd]});
const timer=setTimeout(()=>filho.kill('SIGTERM'),30*60*1000);
filho.once('close',(codigo,sinal)=>{clearTimeout(timer);closeSync(fd);writeFileSync(`${pasta}/integracao-execucao.json`,JSON.stringify({inicio:inicio.toISOString(),fim:new Date().toISOString(),comando:[process.execPath,...args],env:chromium?{ERA_TEST_CHROMIUM:chromium}:{},codigo,sinal,log},null,2)+'\n');process.exitCode=codigo??1;});
