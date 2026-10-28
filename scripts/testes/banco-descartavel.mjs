// SQL e barreiras somente no banco etiquetado do projeto aleatório de integração.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

export async function bancoDescartavel(config) {
  assert.equal(config.descartavel,true);
  assert.match(config.project,/^era-tests-[a-f0-9]{12}$/);
  assert.equal(config.database,'era_test');
  const compose=['compose','--env-file',config.envVazio,'-f','compose.test.yaml','-p',config.project];
  const psql=[...compose,'exec','-T','database','psql','-X','-U','era_test','-d','era_test','-v','ON_ERROR_STOP=1','-At'];
  async function comando(args,entrada) {
    return new Promise((resolve,reject)=>{
      const p=spawn('docker',args,{stdio:['pipe','pipe','pipe']});
      let saida='',erro='';const timer=setTimeout(()=>p.kill('SIGTERM'),25000);
      p.stdout.on('data',b=>saida+=b);p.stderr.on('data',b=>erro+=b);
      p.once('error',e=>{clearTimeout(timer);reject(e);});
      p.once('close',code=>{clearTimeout(timer);code===0?resolve(saida.trim()):reject(new Error(`Docker/psql falhou (${code}): ${erro}`));});
      p.stdin.end(entrada);
    });
  }
  const id=await comando([...compose,'ps','-q','database']);assert.match(id,/^[a-f0-9]{12,64}$/);
  assert.equal(await comando(['inspect','-f','{{index .Config.Labels "era.test"}}',id]),'true');
  assert.equal(await comando(['inspect','-f','{{index .Config.Labels "com.docker.compose.project"}}',id]),config.project);
  const sql=texto=>comando(psql,`${texto}\n`);
  assert.equal(await sql('select current_database();'),'era_test');
  async function barreira() {
    const p=spawn('docker',psql,{stdio:['pipe','pipe','pipe']});let saida='',erro='';
    const pronto=new Promise((resolve,reject)=>{
      p.stdout.on('data',b=>{saida+=b;if(saida.includes('QA_BARREIRA_PRONTA'))resolve();});
      p.once('error',reject);p.once('close',code=>reject(new Error(`Barreira terminou antes de ficar pronta (${code}): ${erro}`)));
    });
    p.stderr.on('data',b=>erro+=b);
    const fim=new Promise((resolve,reject)=>{
      p.once('error',reject);p.once('close',code=>code===0?resolve():reject(new Error(`Barreira falhou (${code}): ${erro}`)));
    });
    // O servidor encerra a conexão ociosa mesmo se o executor for interrompido.
    p.stdin.write("set idle_session_timeout='15s'; select pg_advisory_lock(20261027,952);\n\\echo QA_BARREIRA_PRONTA\n");
    try{await pronto;}catch(e){p.stdin.end();await fim.catch(()=>{});throw e;}
    return async()=>{p.stdin.end('select pg_advisory_unlock(20261027,952);\n');await fim;};
  }
  async function esperarLocks(quantidade=2) {
    const limite=Date.now()+10000;let eventos=[];
    while(Date.now()<limite) {
      eventos=(await sql("select wait_event from pg_stat_activity where datname='era_test' and application_name='PostgreSQL JDBC Driver' and state='active' and wait_event_type='Lock' order by wait_event;")).split('\n').filter(Boolean);
      if(eventos.length>=quantidade)return eventos;
      await new Promise(r=>setTimeout(r,100));
    }
    assert.fail(`Esperadas ${quantidade} transações bloqueadas; observado ${JSON.stringify(eventos)}.`);
  }
  return {sql,barreira,esperarLocks};
}
