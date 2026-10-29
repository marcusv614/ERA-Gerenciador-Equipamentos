import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const pasta = path.join(raiz, 'test-results/quality-assurance');
mkdirSync(pasta, { recursive: true });
const ler = relativo => readFileSync(path.join(raiz, relativo), 'utf8');
const arquivos = diretorio => readdirSync(path.join(raiz, diretorio), { withFileTypes: true }).flatMap(e => e.isDirectory() ? arquivos(`${diretorio}/${e.name}`) : [`${diretorio}/${e.name}`]);
const attr = (xml, chave) => xml.match(new RegExp(`\\b${chave}="([^"]*)"`))?.[1];
const pct = (c, t) => t ? Number((100 * c / t).toFixed(2)) : null;
const metricas = { coletadoEm: new Date().toISOString() };
const casosJava = [];
let casosNode = [];
const casosBrowser = [];
const reports = 'Backend/API/target/surefire-reports';
if (existsSync(path.join(raiz, reports))) {
  const suites = arquivos(reports).filter(f => /TEST-.*\.xml$/.test(f));
  const java = { suites: suites.length, testes: 0, falhas: 0, erros: 0, ignorados: 0, novosQa: 0, defeitos: [] };
  for (const arquivo of suites) {
    const xml = ler(arquivo), cabecalho = xml.match(/<testsuite\b[^>]*>/)?.[0] || '';
    for (const [campo, nome] of [['testes','tests'],['falhas','failures'],['erros','errors'],['ignorados','skipped']]) java[campo] += Number(attr(cabecalho, nome) || 0);
    if (/Qa/.test(attr(cabecalho, 'name') || '')) java.novosQa += Number(attr(cabecalho, 'tests') || 0);
    for (const caso of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
      casosJava.push({ classe: attr(caso[1], 'classname'), teste: attr(caso[1], 'name'), resultado: /<failure\b/.test(caso[2] || '') ? 'REPROVADO' : /<error\b/.test(caso[2] || '') ? 'ERRO' : /<skipped\b/.test(caso[2] || '') ? 'NAO_EXECUTADO' : 'APROVADO' });
      if (/<(failure|error)\b/.test(caso[2] || '')) java.defeitos.push({ classe: attr(caso[1], 'classname'), teste: attr(caso[1], 'name'), arquivo });
    }
  }
  java.aprovados = java.testes - java.falhas - java.erros - java.ignorados;
  java.taxaAprovacao = pct(java.aprovados, java.testes - java.ignorados);
  metricas.java = java;
}
const jacoco = 'Backend/API/target/site/jacoco/jacoco.xml';
if (existsSync(path.join(raiz, jacoco))) {
  const xml = ler(jacoco); const totais = {};
  for (const match of xml.matchAll(/<counter type="([A-Z]+)" missed="(\d+)" covered="(\d+)"\/>/g)) {
    const missed = Number(match[2]), covered = Number(match[3]);
    totais[match[1]] = { missed, covered, total: missed + covered, percentual: pct(covered, missed + covered) };
  }
  metricas.jacoco = totais;
  metricas.classesServico = [...xml.matchAll(/<class name="(br\/com\/era\/api\/service\/[^"$]+)"[^>]*>([\s\S]*?)<\/class>/g)].map(m => {
    const contadores = {};
    for (const c of m[2].matchAll(/<counter type="([A-Z]+)" missed="(\d+)" covered="(\d+)"\/>/g)) contadores[c[1]] = { missed: Number(c[2]), covered: Number(c[3]), percentual: pct(Number(c[3]), Number(c[2]) + Number(c[3])) };
    return { classe: m[1], contadores };
  });
}
const comandos = existsSync(path.join(pasta, 'comandos.json')) ? JSON.parse(readFileSync(path.join(pasta, 'comandos.json'), 'utf8')) : [];
metricas.comandos = comandos;
const node = comandos.filter(c => c.etapa === 'node').at(-1);
if (node && existsSync(path.join(raiz, node.log))) {
  const tap = path.join(pasta, 'frontend.tap');
  const log = existsSync(tap) ? readFileSync(tap, 'utf8') : ler(node.log), contagens = {};
  casosNode = [...log.matchAll(/^# Subtest: (.+)$/gm)].map(m=>({teste:m[1]}));
  for (const campo of ['tests','pass','fail','skipped','cancelled','todo']) contagens[campo] = Number(log.match(new RegExp(`^# ${campo} (\\d+)`, 'm'))?.[1] || 0);
  contagens.taxaAprovacao = pct(contagens.pass, contagens.tests - contagens.skipped);
  metricas.node = contagens;
}
const lcov = path.join(pasta, 'frontend.lcov');
if (existsSync(lcov)) {
  const texto = readFileSync(lcov, 'utf8');
  const somar = chave => [...texto.matchAll(new RegExp(`^${chave}:(\\d+)`, 'gm'))].reduce((s,m) => s + Number(m[1]), 0);
  const cobertura = { arquivos: (texto.match(/^SF:/gm) || []).length, linhas: { covered: somar('LH'), total: somar('LF') }, ramos: { covered: somar('BRH'), total: somar('BRF') } };
  for (const item of [cobertura.linhas,cobertura.ramos]) item.percentual = pct(item.covered,item.total);
  cobertura.escopo = 'Apenas módulos .js carregados pelos testes Node; JSX e módulos não carregados excluídos pelo coletor.';
  metricas.frontendV8 = cobertura;
}
const browser = 'test-results/quality-assurance/browser-local/results.json';
if (existsSync(path.join(raiz,browser))) {
  const r = JSON.parse(ler(browser));
  metricas.browser = { stats: r.stats, falhas: [], medicoes: [] };
  const visitar = s => {
    for (const spec of s.specs || []) for (const t of spec.tests || []) {
      casosBrowser.push({teste:spec.title,projeto:t.projectName,resultado:t.status});
      if (t.status !== 'expected') metricas.browser.falhas.push({ titulo: spec.title, projeto: t.projectName, status: t.status, erros: t.results?.flatMap(r => r.errors || []) });
      for (const resultado of t.results || []) for (const a of resultado.attachments || []) if (a.name === 'desempenho-local.json' && a.body) metricas.browser.medicoes.push({ projeto: t.projectName, ...JSON.parse(Buffer.from(a.body, 'base64').toString()) });
    }
    for (const filho of s.suites || []) visitar(filho);
  };
  visitar(r);
}
const coberturaUi='test-results/quality-assurance/browser-local/coverage/resumo.json';
if (existsSync(path.join(raiz,coberturaUi))) {
  const cobertura=JSON.parse(ler(coberturaUi)),stats=metricas.browser?.stats;
  metricas.frontendIstanbul={...cobertura,compativelComResultados:Boolean(stats&&cobertura.casosEsperados===stats.expected+stats.unexpected+stats.skipped+stats.flaky)};
}
const integracoes = readdirSync(path.join(raiz,'test-results')).filter(f=>/^integracao-\d+$/.test(f)).sort((a,b)=>Number(b.slice(11))-Number(a.slice(11)));
const integracaoEscolhida=process.argv.find(a=>a.startsWith('--integracao='))?.slice(13);
if(integracaoEscolhida&&(!/^test-results\/integracao-\d+$/.test(integracaoEscolhida)||!existsSync(path.join(raiz,integracaoEscolhida,'resumo.json'))))throw new Error('Informe --integracao=test-results/integracao-ID com resumo existente.');
if (integracoes.length||integracaoEscolhida) {
  const diretorio=integracaoEscolhida??`test-results/${integracoes[0]}`;
  const resumo=`${diretorio}/resumo.json`, navegador=`${diretorio}/navegador/resultados.json`;
  metricas.integracao={diretorio,selecao:integracaoEscolhida?'explícita':'tentativa mais recente',tentativaMaisRecente:integracoes.length?`test-results/${integracoes[0]}`:null,suites:existsSync(path.join(raiz,resumo))?JSON.parse(ler(resumo)):null};
  if (existsSync(path.join(raiz,navegador))) metricas.integracao.navegador=JSON.parse(ler(navegador)).stats;
  const administradores=`${diretorio}/administradores/administradores-concorrentes.json`;
  if (existsSync(path.join(raiz,administradores))) metricas.integracao.administradores=JSON.parse(ler(administradores));
  const notificacoes=`${diretorio}/notificacoes/notificacoes-persistencia.json`;
  if (existsSync(path.join(raiz,notificacoes))) metricas.integracao.notificacoes=JSON.parse(ler(notificacoes));
}
const ensaioCarga='test-results/quality-assurance/piloto/carga-piloto.json';
if(existsSync(path.join(raiz,ensaioCarga))){const c=JSON.parse(ler(ensaioCarga));metricas.ensaioCarga={artefato:ensaioCarga,resultado:c.resultado,limites:c.limites,usuarios:c.usuarios,volumes:c.volumes,resumo:c.resumo,escopo:c.escopo};}
const qualidadeApi='test-results/quality-assurance/qualidade-api.json';
if (existsSync(path.join(raiz,qualidadeApi))) metricas.qualidadeApi=JSON.parse(ler(qualidadeApi));
const controllers = arquivos('Backend/API/src/main/java/br/com/era/api/controller').filter(f => f.endsWith('.java'));
const endpoints = [];
for (const arquivo of controllers) {
  const fonte = ler(arquivo), base = fonte.match(/@RequestMapping\("([^"]+)"\)/)?.[1] || '';
  for (const m of fonte.matchAll(/@(Get|Post|Patch|Put|Delete)Mapping(?:\("([^"]*)"\))?/g)) endpoints.push({ metodo: m[1].toUpperCase(), rota: `/api${base}${m[2] || ''}`, arquivo });
}
metricas.inventario = { controllers: controllers.length, endpoints: endpoints.length, servicos: arquivos('Backend/API/src/main/java/br/com/era/api/service').filter(f=>f.endsWith('.java')).length, migrations: arquivos('Backend/API/src/main/resources/db/migration').length, arquivosTesteJava: arquivos('Backend/API/src/test/java').filter(f=>f.endsWith('.java')).length, arquivosTesteNode: arquivos('Frontend/UI/tests').filter(f=>f.endsWith('.test.js')).length, arquivosJsProducao: arquivos('Frontend/UI/src').filter(f=>f.endsWith('.js')).length, componentesJsx: arquivos('Frontend/UI/src').filter(f=>f.endsWith('.jsx')).length };
if (metricas.java && metricas.node && metricas.browser && metricas.integracao?.navegador && metricas.qualidadeApi) {
  const b=metricas.browser.stats,e=metricas.integracao.navegador,a=metricas.qualidadeApi.resultados;
  const complementares=[...(metricas.integracao.administradores?.resultados||[]),...(metricas.integracao.notificacoes?.resultados||[])];
  const totalBrowser=s=>s.expected+s.unexpected+s.skipped+s.flaky;
  const testes=metricas.java.testes+metricas.node.tests+totalBrowser(b)+totalBrowser(e)+a.length+complementares.length;
  const aprovados=metricas.java.aprovados+metricas.node.pass+b.expected+e.expected+a.filter(t=>t.resultado==='APROVADO').length+complementares.filter(t=>t.resultado==='APROVADO').length;
  metricas.resumoFinal={casosIndividuais:testes,aprovados,reprovados:metricas.java.falhas+metricas.java.erros+metricas.node.fail+b.unexpected+e.unexpected+a.filter(t=>t.resultado==='REPROVADO').length+complementares.filter(t=>t.resultado==='REPROVADO').length,
    ignorados:metricas.java.ignorados+metricas.node.skipped+b.skipped+e.skipped,taxaAprovacao:pct(aprovados,testes),
    novosCasos:metricas.java.novosQa+casosNode.filter(t=>t.teste.startsWith('QA ')).length+totalBrowser(b)+a.length+complementares.length,
    familiasFuncionais:(ler('docs/quality-assurance/MATRIZ_DE_TESTES.md').match(/^\| F\d\d \|/gm)||[]).length};
}
writeFileSync(path.join(pasta,'endpoints.json'),JSON.stringify(endpoints,null,2));
writeFileSync(path.join(pasta,'metricas.json'),JSON.stringify(metricas,null,2));
if (process.argv.includes('--snapshot')) {
  const evidencia = path.join(raiz,'docs/quality-assurance/evidencias');
  mkdirSync(evidencia,{recursive:true});
  const scanner = etapa => {
    const comando = comandos.filter(c=>c.etapa===etapa).at(-1);
    if (!comando) return null;
    try { return JSON.parse(ler(comando.log)); } catch { return { codigo: comando.codigo, log: comando.log }; }
  };
  const resumo = { ...metricas, comandos: undefined, npmAudit: scanner('audit'), osv: scanner('osv'),
    comandosFinais: Object.fromEntries([...new Set(comandos.map(c=>c.etapa))].map(etapa=>{
      const c=comandos.filter(x=>x.etapa===etapa).at(-1);
      return [etapa,{codigo:c.codigo,codigoProcesso:c.codigoProcesso,falhasTestes:c.falhasTestes,inicio:c.inicio,duracaoMs:c.duracaoMs,log:c.log}];
    })) };
  writeFileSync(path.join(evidencia,'metricas.json'),JSON.stringify(resumo,null,2)+'\n');
  writeFileSync(path.join(evidencia,'casos-java.json'),JSON.stringify(casosJava,null,2)+'\n');
  writeFileSync(path.join(evidencia,'casos-node.json'),JSON.stringify(casosNode,null,2)+'\n');
  writeFileSync(path.join(evidencia,'casos-browser-local.json'),JSON.stringify(casosBrowser,null,2)+'\n');
  writeFileSync(path.join(evidencia,'endpoints.json'),JSON.stringify(endpoints,null,2)+'\n');
}
console.log(JSON.stringify({ ...metricas, comandos: undefined, classesServico: undefined },null,2));
