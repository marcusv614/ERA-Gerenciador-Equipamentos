// Carga de leitura, com contas e dados fictícios, só no banco etiquetado do executor.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {Cliente,configuracaoTeste,senhaTemporaria} from './cliente.mjs';
import {bancoDescartavel} from './banco-descartavel.mjs';
const config=configuracaoTeste(),{sql}=await bancoDescartavel(config);
const quantidade=(nome,padrao,min,max)=>{const n=Number(process.env[nome]??padrao);assert.ok(Number.isSafeInteger(n)&&n>=min&&n<=max,`${nome} fora do intervalo ${min}..${max}`);return n;};
const usuarios=20,equipamentos=quantidade('ERA_CARGA_EQUIPAMENTOS',5000,100,10000),pedidos=quantidade('ERA_CARGA_PEDIDOS',2000,100,5000);
const resultado={nome:'QA-CARGA-01: 20 sessões independentes em três obras',resultado:'REPROVADO',usuarios,equipamentosAdicionais:equipamentos,pedidosAdicionais:pedidos,obras:3,escopo:'Leituras HTTP locais; 20 contas de Gerência sintéticas, volume escolhido para ensaio, sem representar quantidade real ainda desconhecida. Não mede renderização de 20 navegadores nem SLA da Hostinger.',limites:{apiCpus:2,apiMemoria:'4GiB',postgresCpus:0.5,postgresMemoria:'512MiB',uiCpus:0.25,uiMemoria:'128MiB',timeoutHttpMs:10000},amostras:[]};
resultado.inicio=new Date().toISOString();
const inicio=performance.now();let ativos=0,maximo=0;
try{
 const apiId=execFileSync('docker',['compose','--env-file',config.envVazio,'-f','compose.test.yaml','-f','compose.test.load.yaml','-p',config.project,'ps','-q','api'],{encoding:'utf8'}).trim();
 assert.match(apiId,/^[a-f0-9]{12,64}$/);
 resultado.imageId=execFileSync('docker',['inspect','-f','{{.Image}}',apiId],{encoding:'utf8'}).trim();
 assert.match(resultado.imageId,/^sha256:[a-f0-9]{64}$/);
 const ambienteJava=JSON.parse(execFileSync('docker',['inspect','-f','{{json .Config.Env}}',apiId],{encoding:'utf8'}));
 resultado.limites.javaToolOptions=ambienteJava.find(x=>x.startsWith('JAVA_TOOL_OPTIONS='))?.slice('JAVA_TOOL_OPTIONS='.length)??'';
 const recursos=JSON.parse(execFileSync('docker',['inspect','-f','{{json .HostConfig}}',apiId],{encoding:'utf8'}));
 resultado.limites.apiCpus=recursos.NanoCpus/1e9;resultado.limites.apiMemoriaBytes=recursos.Memory;resultado.limites.apiMemoria=`${recursos.Memory/(1024**3)}GiB`;
 for(const [servico,campo] of [['database','postgres'],['ui','ui']]){
  const id=execFileSync('docker',['compose','--env-file',config.envVazio,'-f','compose.test.yaml','-f','compose.test.load.yaml','-p',config.project,'ps','-q',servico],{encoding:'utf8'}).trim();
  assert.match(id,/^[a-f0-9]{12,64}$/);
  const limites=JSON.parse(execFileSync('docker',['inspect','-f','{{json .HostConfig}}',id],{encoding:'utf8'}));
  resultado.limites[`${campo}Cpus`]=limites.NanoCpus/1e9;resultado.limites[`${campo}MemoriaBytes`]=limites.Memory;
 }
 assert.ok(config.obras.length>=3);const ids=config.obras.slice(0,3).map(o=>o.id);assert.ok(ids.every(Number.isSafeInteger));
 const tecnico=config.funcionarios.tecnico1.id;assert.ok(Number.isSafeInteger(tecnico));
 await sql(`begin; insert into equipamentos(tipo,modelo,serie,status,quantidade,quantidade_reservada,controle_quantidade,atributos,obra_id,tecnico_id,auditavel,arquivado,criado_em,atualizado_em,data_entrada)
 select 'Ferramentas manuais','QA Carga '||(g%100),'QA-CARGA-EQ-'||g,'Em campo',1,0,'INDIVIDUAL','{}'::jsonb,(array[${ids.join(',')}])[1+(g%3)],${tecnico},false,false,now(),now(),(now() at time zone 'America/Manaus')::date from generate_series(1,${equipamentos}) g;
 insert into solicitacoes(tipo,status,tecnico_id,solicitante_id,solicitante_nome,solicitante_login,solicitante_perfil,obra_destino_id,data_solicitacao,observacao,criado_em,atualizado_em,compras,plano_financeiro,entradas_compra,materiais_originais,eventos_financeiros,aquisicoes_auditadas,reservas_plano_ativas,movimentacao_direta,financeiro_cancelamento_confirmado,estoque_cancelamento_confirmado)
 select 'Movimentação','Pendente',${tecnico},${tecnico},'DEMO tecnico1','demo.tecnico1','TECNICO',(array[${ids.join(',')}])[1+(g%3)],(now() at time zone 'America/Manaus')::date,'QA CARGA PILOTO',now(),now(),'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,'[]'::jsonb,false,false,false,false from generate_series(1,${pedidos}) g;
 insert into materiais_solicitados(solicitacao_id,nome,quantidade,catalogo_chave,quantidade_compra,quantidade_adquirida,quantidade_entrada_estoque)
 select id,'QA Carga 1',1,'ferramentas manuais|qa carga 1|',0,0,0 from solicitacoes where observacao='QA CARGA PILOTO'; analyze; commit;`);
 resultado.volumes=JSON.parse(await sql(`select json_build_object('equipamentos',(select count(*) from equipamentos),'pedidos',(select count(*) from solicitacoes),'obrasComEquipamentos',(select count(distinct obra_id) from equipamentos where serie like 'QA-CARGA-EQ-%'));`));
 assert.equal(resultado.volumes.obrasComEquipamentos,3);
 const conta=config.contas.find(c=>c.login==='demo.admin');const admin=await new Cliente(config).entrar(conta.login,conta.senha);const clientes=[];
 // Login de contas distintas evita revogar sessões concorrentes da mesma conta.
 for(let i=0;i<usuarios;i++){
  const funcionario=await admin.req('POST','/funcionarios',{nome:`QA Carga ${i}`,cargo:'GERENTE',status:'Ativo'},201);
  await admin.req('POST','/usuarios',{nome:`QA Carga ${i}`,login:`qa.carga.${i}`,perfil:'GERENTE',funcionarioId:funcionario.id,senhaTemporaria},201);
  clientes.push(await new Cliente(config).entrar(`qa.carga.${i}`,senhaTemporaria,true));
 }
 const leitura=async(cliente,usuario,rota,fase)=>{
  const inicio=performance.now();ativos++;maximo=Math.max(maximo,ativos);const registro={usuario,rota,fase};
  try{
   const resposta=await fetch(`${config.url}/api${rota}`,{headers:{Cookie:[...cliente.cookies].map(([k,v])=>`${k}=${v}`).join('; '),Accept:'application/json'},signal:AbortSignal.timeout(10000)});
   registro.status=resposta.status;const texto=await resposta.text();registro.bytes=Buffer.byteLength(texto);
   assert.equal(resposta.status,200,`Resposta HTTP ${resposta.status}`);const dados=JSON.parse(texto);assert.ok(Array.isArray(dados));registro.itens=dados.length;
   if(rota==='/equipamentos')assert.ok(dados.length>=equipamentos);
   if(rota==='/atividades')assert.ok(dados.length>=pedidos);
   registro.sucesso=true;
  }catch(e){registro.sucesso=false;registro.erro=e.name==='TimeoutError'?'Tempo limite de 10s':e.message;}
  finally{registro.duracaoMs=performance.now()-inicio;ativos--;resultado.amostras.push(registro);}
  return registro.sucesso;
 };
 // Aquecer separadamente; o orçamento HTTP é o mesmo da interface.
 resultado.aquecimento=[];
 for(const rota of ['/obras','/equipamentos','/atividades']){
  const ok=await leitura(clientes[0],0,rota,'aquecimento');resultado.aquecimento.push({rota,sucesso:ok});
 }
 resultado.inicioCarga=new Date().toISOString();
 const cargaInicio=performance.now();
 await Promise.all(clientes.map(async(cliente,i)=>{
  for(const rota of ['/equipamentos','/atividades','/obras','/equipamentos','/atividades'])if(!await leitura(cliente,i,rota,'carga'))break;
 }));
 resultado.duracaoCargaMs=performance.now()-cargaInicio;resultado.concorrenciaMaxima=maximo;
 const medidas=resultado.amostras.filter(x=>x.fase==='carga'),tempos=medidas.map(x=>x.duracaoMs).sort((a,b)=>a-b);
 const percentil=p=>tempos[Math.max(0,Math.ceil(tempos.length*p)-1)]??null;
 resultado.resumo={requisicoes:medidas.length,sucessos:medidas.filter(x=>x.sucesso).length,erros:medidas.filter(x=>!x.sucesso).length,p50Ms:percentil(0.5),p95Ms:percentil(0.95),maxMs:tempos.at(-1),requisicoesPorSegundo:medidas.filter(x=>x.sucesso).length/(resultado.duracaoCargaMs/1000)};
 assert.equal(maximo,20);assert.equal(resultado.resumo.erros,0,'O ensaio encontrou falhas ou timeouts.');assert.ok(resultado.aquecimento.every(x=>x.sucesso),'Aquecimento ultrapassou o orçamento de leitura.');
 resultado.resultado='APROVADO';
}catch(e){resultado.erro=e.message;throw e;}
finally{
 resultado.duracaoMs=performance.now()-inicio;const texto=JSON.stringify(resultado,null,2)+'\n';
 mkdirSync(config.artefatos,{recursive:true});writeFileSync(path.join(config.artefatos,'carga-piloto.json'),texto,{mode:0o600});
 mkdirSync('test-results/quality-assurance/piloto',{recursive:true});writeFileSync('test-results/quality-assurance/piloto/carga-piloto.json',texto,{mode:0o600});
 console.log(JSON.stringify({nome:resultado.nome,resultado:resultado.resultado,volumes:resultado.volumes,usuarios,resumo:resultado.resumo,erro:resultado.erro}));
}
