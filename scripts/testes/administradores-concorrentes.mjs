// Concorrência HTTP real. Gatilho e barreira existem somente no PostgreSQL descartável.
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Cliente, configuracaoTeste, senhaTemporaria, senhaDefinitiva } from './cliente.mjs';

const config = configuracaoTeste();
const compose = ['compose','--env-file',config.envVazio,'-f','compose.test.yaml','-p',config.project];
const psql = [...compose,'exec','-T','database','psql','-X','-U','era_test','-d','era_test','-v','ON_ERROR_STOP=1','-At'];
async function comando(args, entrada) {
  return new Promise((resolve,reject) => {
    const p = spawn('docker',args,{stdio:['pipe','pipe','pipe']});
    let saida='',erro=''; const timer=setTimeout(()=>p.kill('SIGTERM'),25000);
    p.stdout.on('data',b=>saida+=b); p.stderr.on('data',b=>erro+=b);
    p.once('error',e=>{clearTimeout(timer);reject(e);});
    p.once('close',code=>{clearTimeout(timer);code===0?resolve(saida.trim()):reject(new Error(`Docker/psql falhou (${code}): ${erro}`));});
    p.stdin.end(entrada);
  });
}
const container = await comando([...compose,'ps','-q','database']);
assert.match(container,/^[a-f0-9]{12,64}$/);
assert.equal(await comando(['inspect','-f','{{index .Config.Labels "era.test"}}',container]),'true');
assert.equal(await comando(['inspect','-f','{{index .Config.Labels "com.docker.compose.project"}}',container]),config.project);
const sql = texto => comando(psql,`${texto}\n`);
assert.equal(await sql('select current_database();'),'era_test');

// Dois administradores reais, com sessões distintas e senhas já trocadas.
const bootstrap = await new Cliente(config).entrar('audit-smoke-admin','TempCheck#578943',true);
const primeiro = (await bootstrap.req('GET','/usuarios')).find(u=>u.login==='audit-smoke-admin');
const funcionario = await bootstrap.req('POST','/funcionarios',{nome:'QA Administrador vinculado',cargo:'Administrador',status:'Ativo'},201);
const segundo = await bootstrap.req('POST','/usuarios',{nome:'QA Segundo administrador',login:'qa.admin.concorrente',perfil:'ADMIN',funcionarioId:funcionario.id,senhaTemporaria},201);
await new Cliente(config).entrar(segundo.login,senhaTemporaria,true);
assert.ok(Number.isSafeInteger(primeiro.id)&&Number.isSafeInteger(segundo.id));
assert.equal(await sql("select count(*) from usuarios where ativo and perfil='ADMIN';"),'2');
const ids = [primeiro.id,segundo.id];
const resultados = [];
function gravar() {
  const resumo=JSON.stringify({resultados,escopo:'HTTP, Spring transacional e PostgreSQL reais descartáveis; barreira SQL exclusiva do teste.'},null,2)+'\n';
  mkdirSync('test-results/quality-assurance',{recursive:true});
  writeFileSync('test-results/quality-assurance/administradores-concorrentes.json',resumo);
  if(config.artefatos) {
    mkdirSync(config.artefatos,{recursive:true});
    writeFileSync(path.join(config.artefatos,'administradores-concorrentes.json'),resumo);
  }
}
async function restaurar() {
  await sql(`drop trigger if exists qa_barreira_admin on usuarios;
    update funcionarios set arquivado=false,status='Ativo' where id=${funcionario.id};
    update usuarios set perfil='ADMIN',ativo=true,versao_sessao=versao_sessao+1,
      funcionario_id=case when id=${segundo.id} then ${funcionario.id} else null end where id in (${ids.join(',')});`);
}

async function segurarBarreira() {
  const p=spawn('docker',psql,{stdio:['pipe','pipe','pipe']});
  let saida='',erro='';
  const pronto=new Promise((resolve,reject)=>{
    p.stdout.on('data',b=>{saida+=b;if(saida.includes('QA_BARREIRA_PRONTA'))resolve();});
    p.once('error',reject);p.once('close',code=>reject(new Error(`Barreira terminou antes de ficar pronta (${code}): ${erro}`)));
  });
  p.stderr.on('data',b=>erro+=b);
  const fim=new Promise((resolve,reject)=>{
    p.once('error',reject);p.once('close',code=>code===0?resolve():reject(new Error(`Barreira falhou (${code}): ${erro}`)));
  });
  // Também limita a vida da conexão se o processo Node for interrompido.
  p.stdin.write("set idle_session_timeout='15s'; select pg_advisory_lock(20261027,951);\n\\echo QA_BARREIRA_PRONTA\n");
  try { await pronto; }
  catch(erro){p.stdin.end();await fim.catch(()=>{});throw erro;}
  return async()=>{p.stdin.end('select pg_advisory_unlock(20261027,951);\n');await fim;};
}

for(const [nome,operacoes] of [
  ['QA-ADM-01: duas desativações concorrentes',['desativar','desativar']],
  ['QA-ADM-02: dois rebaixamentos concorrentes',['rebaixar','rebaixar']],
  ['QA-ADM-03: desativação e rebaixamento concorrentes',['desativar','rebaixar']],
  ['QA-ADM-04: arquivamento de funcionário e rebaixamento concorrentes',['arquivar','rebaixar']],
]) {
  await test(nome,async()=>{
    const inicio=performance.now(); let liberar,pendentes;
    const evidencia={nome,resultado:'REPROVADO'};
    try {
      await restaurar();
      const clientes=await Promise.all([primeiro,segundo].map(u=>new Cliente(config).entrar(u.login,senhaDefinitiva)));
      const contarEventos=()=>sql(`select count(*) from eventos_seguranca where alvo_id in (${ids.join(',')}) and tipo in ('USUARIO_EDITADO','USUARIO_DESATIVADO');`);
      const eventosAntes=Number(await contarEventos());
      await sql(`create or replace function qa_barreira_admin() returns trigger language plpgsql as $$
        begin
          if OLD.perfil='ADMIN' and OLD.ativo and (NEW.perfil<>'ADMIN' or not NEW.ativo) then
            perform pg_advisory_xact_lock(20261027,951);
          end if;
          return NEW;
        end; $$;
        create trigger qa_barreira_admin before update on usuarios for each row execute function qa_barreira_admin();`);
      liberar=await segurarBarreira();
      const requisicoes=clientes.map((cliente,i)=>{
        const alvo=[segundo,primeiro][i];
        return operacoes[i]==='arquivar'
          ?cliente.resposta('PATCH',`/funcionarios/${funcionario.id}/arquivamento`,{arquivado:true})
          :operacoes[i]==='desativar'
          ?cliente.resposta('PATCH',`/usuarios/${alvo.id}/status`,{ativo:false})
          :cliente.resposta('PUT',`/usuarios/${alvo.id}`,{nome:alvo.nome,login:alvo.login,perfil:'GERENTE',funcionarioId:null});
      });
      pendentes=Promise.allSettled(requisicoes);
      // Antes da correção, ambas aguardam o gatilho depois de contar dois admins.
      // Com serialização, uma aguarda o gatilho e a outra o lock de administradores.
      const limite=Date.now()+10000;
      let esperas=[];
      while(Date.now()<limite) {
        esperas=(await sql("select wait_event from pg_stat_activity where datname='era_test' and application_name='PostgreSQL JDBC Driver' and state='active' and wait_event_type='Lock' order by wait_event;")).split('\n').filter(Boolean);
        if(esperas.length>=2)break;
        await new Promise(r=>setTimeout(r,100));
      }
      evidencia.esperasPostgres=esperas;
      assert.equal(esperas.length,2,'As duas operações precisam estar dentro de transações concorrentes bloqueadas.');
      await liberar();liberar=null;
      const respostas=await pendentes;
      assert.ok(respostas.every(r=>r.status==='fulfilled'),'As requisições devem concluir sem timeout.');
      evidencia.statusHttp=respostas.map(r=>r.value.status).sort((a,b)=>a-b);
      evidencia.mensagens=respostas.map(r=>r.value.dados?.mensagem).filter(Boolean);
      evidencia.administradoresAtivos=Number(await sql("select count(*) from usuarios where ativo and perfil='ADMIN';"));
      evidencia.eventosAdministrativosPersistidos=Number(await contarEventos())-eventosAntes;
      assert.equal(evidencia.administradoresAtivos,1,'Deve permanecer exatamente um administrador ativo.');
      assert.deepEqual(evidencia.statusHttp,[200,409],'Uma alteração conclui e outra é recusada pela regra do último administrador.');
      assert.match(respostas.find(r=>r.value.status===409).value.dados.mensagem,/último administrador ativo/,
        'A recusa precisa ser a regra de negócio, e não um deadlock convertido em 409.');
      const esperado=operacoes.includes('arquivar')&&respostas[0].value.status===200?0:1;
      assert.equal(evidencia.eventosAdministrativosPersistidos,esperado,'A operação recusada não pode persistir um evento administrativo.');
      const sobreviventeId=Number(await sql("select id from usuarios where ativo and perfil='ADMIN';"));
      const sobrevivente=[primeiro,segundo].find(u=>u.id===sobreviventeId);
      const cliente=await new Cliente(config).entrar(sobrevivente.login,senhaDefinitiva);
      const contas=await cliente.req('GET','/usuarios');
      assert.equal(contas.filter(u=>u.ativo&&u.perfil==='ADMIN').length,1);
      evidencia.resultado='APROVADO';
    } catch(erro) {evidencia.erro=erro.message;throw erro;}
    finally {
      if(liberar)await liberar();
      if(pendentes)await pendentes;
      await sql('drop trigger if exists qa_barreira_admin on usuarios; drop function if exists qa_barreira_admin();');
      evidencia.duracaoMs=performance.now()-inicio;resultados.push(evidencia);
      gravar();
    }
  });
}

await test('QA-ADM-05: arquivamento de funcionário preserva último administrador',async()=>{
  const evidencia={nome:'QA-ADM-05: arquivamento de funcionário preserva último administrador',resultado:'REPROVADO'};
  try {
    await restaurar();
    await sql(`update usuarios set perfil='GERENTE',versao_sessao=versao_sessao+1 where id=${primeiro.id};`);
    const cliente=await new Cliente(config).entrar(segundo.login,senhaDefinitiva);
    const resposta=await cliente.resposta('PATCH',`/funcionarios/${funcionario.id}/arquivamento`,{arquivado:true});
    evidencia.statusHttp=[resposta.status];evidencia.mensagens=[resposta.dados?.mensagem].filter(Boolean);
    evidencia.administradoresAtivos=Number(await sql("select count(*) from usuarios where ativo and perfil='ADMIN';"));
    evidencia.funcionarioArquivado=await sql(`select arquivado from funcionarios where id=${funcionario.id};`)==='t';
    assert.equal(evidencia.administradoresAtivos,1,'Arquivamento de funcionário não pode desativar o último administrador.');
    assert.equal(resposta.status,409);assert.match(resposta.dados.mensagem,/último administrador ativo/);
    assert.equal(evidencia.funcionarioArquivado,false,'A recusa precisa preservar o funcionário.');
    assert.equal((await cliente.req('GET','/usuarios')).filter(u=>u.ativo&&u.perfil==='ADMIN').length,1);
    evidencia.resultado='APROVADO';
  } catch(erro){evidencia.erro=erro.message;throw erro;}
  finally{resultados.push(evidencia);gravar();}
});
