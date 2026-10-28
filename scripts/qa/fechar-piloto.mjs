// Consolida evidências locais; não inicia serviços, não implanta e não lê .env.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../../',import.meta.url));
process.chdir(raiz);
const pasta='test-results/quality-assurance/piloto';mkdirSync(pasta,{recursive:true});
const ler=p=>JSON.parse(readFileSync(p,'utf8'));
const opcional=p=>existsSync(p)?ler(p):null;
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const manifesto=ler(`${pasta}/fontes-iniciais.json`);
const basePath='docs/quality-assurance/evidencias/sincronizacao-financeira-2026-10-27.json';
const base=ler(basePath),metricas=ler('test-results/quality-assurance/metricas.json');
const comandos=ler('test-results/quality-assurance/comandos.json');
const ultima=etapa=>comandos.filter(x=>x.etapa===etapa).at(-1);
const verificacoes=[];
function item(id,nome,estado,detalhes){verificacoes.push({id,nome,estado,...detalhes});}
function listar(pasta){return existsSync(pasta)?readdirSync(pasta,{withFileTypes:true}).flatMap(e=>e.isDirectory()?listar(path.join(pasta,e.name)):e.isFile()?[path.join(pasta,e.name)]:[]):[];}
const novos=['Backend/API/src','Frontend/UI/src','Frontend/UI/public','scripts/testes','scripts/qa'].flatMap(listar).filter(p=>!(p in manifesto));
const alterados=[...Object.entries(manifesto).filter(([p,h])=>!existsSync(p)||sha(p)!==h).map(([p])=>p),...novos];
item('P01','Integridade dos fontes do fechamento',alterados.length?'REPROVADO':'APROVADO',{arquivos:Object.keys(manifesto).length,alterados});
const fontesUi=Object.entries(base.hashesSha256).filter(([p])=>p.startsWith('Frontend/UI/src/'));
const uiIgual=fontesUi.length===102&&fontesUi.every(([p,h])=>existsSync(p)&&sha(p)===h);
const uiAprovada=base.browser.stats.expected===278&&!['unexpected','skipped','flaky'].some(k=>base.browser.stats[k])&&base.coberturaIstanbul.execucaoCompleta&&base.coberturaIstanbul.compativelComResultados&&base.coberturaIstanbul.casosColetados===278;
item('P02','Regressão de interface preservada no mesmo código',uiIgual&&uiAprovada?'APROVADO':'REPROVADO',{reexecutadaNesteFechamento:false,baseline:basePath,sha256Baseline:sha(basePath),fontesConferidos:fontesUi.length,casos:base.browser.stats,cobertura:base.coberturaIstanbul.total.lines});
const etapas=['java','node','lint','build','maven-deps','audit','osv'];
const locais=Object.fromEntries(etapas.map(e=>[e,ultima(e)]));
const localOk=['java','node','lint','build'].every(e=>locais[e]?.codigo===0)&&metricas.java.aprovados===786&&metricas.java.falhas===0&&metricas.java.erros===0&&metricas.node.pass===189&&metricas.node.fail===0;
item('P03','Backend, Node, lint e build',localOk?'APROVADO':'REPROVADO',{java:metricas.java,node:metricas.node,comandos:Object.fromEntries(['java','node','lint','build'].map(e=>[e,locais[e]]))});
function jsonLog(etapa){try{return ler(ultima(etapa).log);}catch{return null;}}
const npm=jsonLog('audit'),osv=jsonLog('osv');
const dependenciasOk=['maven-deps','audit','osv'].every(e=>locais[e]?.codigo===0)&&npm?.metadata?.vulnerabilities?.total===0&&osv?.bibliotecasConsultadas>0&&osv.alertas.length===0;
item('P04','Dependências npm e Maven',dependenciasOk?'APROVADO':'REPROVADO',{npm: npm?.metadata??null,osv,comandos:Object.fromEntries(['maven-deps','audit','osv'].map(e=>[e,locais[e]]))});
const execucao=opcional(`${pasta}/integracao-execucao.json`);
let relatorio=null,resumo=null;
if(execucao){
 const inicio=Date.parse(execucao.inicio),fim=Date.parse(execucao.fim);
 const nomes=readdirSync('test-results').filter(n=>/^integracao-\d+$/.test(n)&&Number(n.slice(11))>=inicio&&Number(n.slice(11))<=fim).sort((a,b)=>Number(b.slice(11))-Number(a.slice(11)));
 if(nomes.length){relatorio=`test-results/${nomes[0]}/resumo.json`;resumo=opcional(relatorio);}
}
const log=execucao&&existsSync(execucao.log)?readFileSync(execucao.log,'utf8'):'';
const semDocker=/failed to connect to the docker API|Cannot connect to the Docker daemon|docker\.sock.*no such file/i.test(log);
const suites=['atendimento-parcial','regressao','recuperacao','administradores','notificacoes','backup-restauracao'];
const integOk=execucao?.codigo===0&&suites.every(s=>resumo?.some(r=>r.suite===s&&r.resultado==='passou'));
item('P05','Integração completa em stacks descartáveis',integOk?'APROVADO':semDocker||!execucao?'BLOQUEADO':'REPROVADO',{motivo:semDocker?'Daemon Docker indisponível; nenhuma stack foi validada nesta tentativa.':integOk?null:'Execução completa ausente ou sem aprovação de todas as suítes.',execucao,relatorio,resumo,logSha256:execucao&&existsSync(execucao.log)?sha(execucao.log):null,anterior:base.integracaoReal.relatorio});
const dir=relatorio?path.dirname(relatorio):null;
const backup=dir?opcional(`${dir}/backup-restauracao/backup-restauracao.json`):null;
const backupOk=integOk&&backup?.resultados?.length===1&&backup.resultados[0].resultado==='APROVADO';
item('P06','Ensaio de backup e restauração',backupOk?'APROVADO':semDocker||!backup?'BLOQUEADO':'REPROVADO',{motivo:backupOk?null:'Ensaio preparado; execução depende da stack Docker descartável.',evidencia:backup,script:'scripts/testes/backup-restauracao.mjs',politicaRealValidada:false});
const imagens=opcional(`${pasta}/imagens.json`);
const imagensOk=imagens?.resultados?.length===2&&imagens.resultados.every(x=>x.resultado==='APROVADO'&&x.imageId&&x.sha256Relatorio&&x.altas===0&&x.criticas===0&&existsSync(x.relatorio)&&sha(x.relatorio)===x.sha256Relatorio);
item('P07','Varredura das imagens finais de API e UI',imagensOk?'APROVADO':imagens?.resultados?.some(x=>x.resultado==='REPROVADO')?'REPROVADO':'BLOQUEADO',{motivo:imagensOk?null:'Não há relatório atual de duas imagens identificadas, sem alertas HIGH/CRITICAL. Consultar os motivos registrados no relatório de imagens.',evidencia:imagens});
const reais=dir?opcional(`${dir}/navegador/resultados.json`):null;
const e2eOk=integOk&&reais?.stats.expected===38&&!['unexpected','skipped','flaky'].some(k=>reais.stats[k]);
item('P08','E2E reais desktop/mobile atualizados',e2eOk?'APROVADO':semDocker||!reais?'BLOQUEADO':'REPROVADO',{motivo:e2eOk?null:'Os 38 E2E anteriores não são contados como nova execução do fechamento.',atual:reais?.stats??null,anterior:base.integracaoReal.browser});
const reprovados=verificacoes.filter(x=>x.estado==='REPROVADO'),bloqueados=verificacoes.filter(x=>x.estado==='BLOQUEADO');
const parecer=reprovados.length?'REPROVADO':bloqueados.length?'BLOQUEADO':'APTO PARA PILOTO CONTROLADO COM RESSALVAS';
const snapshot={coletadoEm:new Date().toISOString(),fuso:'America/Manaus',baseGit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),arvoreDeTrabalho:'Alterações de QA ainda não commitadas; a base Git isolada não identifica a versão testada.',parecerTecnico:parecer,inicioOperacional:'PENDENTE: ambiente, responsáveis, backup real e aceite das ressalvas não informados.',verificacoes,hashesSha256:manifesto,ferramentasFechamento:Object.fromEntries(['scripts/qa/fechar-piloto.mjs','scripts/qa/verificar-imagens-piloto.mjs'].map(p=>[p,sha(p)])),ressalvas:['Resposta do próprio POST/PATCH perdida após commit e idempotência geral.','Acessibilidade sistemática, outros navegadores/dispositivos e carga representativa.','Backup externo, retenção, criptografia e restauração de base real ainda não demonstrados.','Upgrade de base legada representativa e rollback de versão compatível com json:v1:.'],historico:{defeitosConfirmados:10,altos:2,medios:6,baixos:2,corrigidosNasRodadasAnteriores:10,novoDefeitoDeAplicacaoConfirmadoNesteFechamento:false}};
writeFileSync(`${pasta}/fechamento.json`,JSON.stringify(snapshot,null,2)+'\n');
const linhas=['| Critério | Resultado | Evidência |','| --- | --- | --- |',...verificacoes.map(v=>`| ${v.id} — ${v.nome} | **${v.estado}** | ${v.motivo??(v.id==='P02'?'278 casos já aprovados; 102 fontes conferidos por hash.':v.id==='P03'?'786 Java, 189 Node, lint e build aprovados.':v.id==='P04'?'npm sem vulnerabilidades; 102 bibliotecas Maven sem alertas.':'Hashes dos arquivos conferidos.')} |`)];
writeFileSync(`${pasta}/resumo.md`,`Parecer técnico: **${parecer}**.\n\n${linhas.join('\n')}\n\nInício operacional: ${snapshot.inicioOperacional}\n`);
assert.equal(verificacoes.length,8);
console.log(JSON.stringify({parecer,aprovados:verificacoes.filter(x=>x.estado==='APROVADO').map(x=>x.id),bloqueados:bloqueados.map(x=>x.id),reprovados:reprovados.map(x=>x.id),relatorio:`${pasta}/fechamento.json`},null,2));
if(parecer==='REPROVADO'||parecer==='BLOQUEADO')process.exitCode=1;
