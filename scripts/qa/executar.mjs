// Executa somente testes locais/descartáveis. Nunca lê .env ou usa banco habitual.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const artefatos = path.join(raiz, 'test-results/quality-assurance');
mkdirSync(artefatos, { recursive: true });
const arquivoResumo = path.join(artefatos, 'comandos.json');
const resultados = existsSync(arquivoResumo) ? JSON.parse(readFileSync(arquivoResumo, 'utf8')) : [];
const jdk21 = '/usr/lib/jvm/jdk-21.0.11-oracle-x64';
const javaHome = process.env.ERA_QA_JAVA_HOME || (existsSync(jdk21) ? jdk21 : process.env.JAVA_HOME);
const javaEnv = javaHome ? { ...process.env, JAVA_HOME: javaHome, PATH: `${javaHome}/bin:${process.env.PATH}` } : process.env;
const ui = path.join(raiz, 'Frontend/UI');
const testesNode = readdirSync(path.join(ui, 'tests')).filter(f => f.endsWith('.test.js')).map(f => `tests/${f}`);
const etapas = {
  java: { comando: 'sh', args: ['mvnw', '-B', '-ntp', 'clean', 'verify', '-Pcoverage', '-Dmaven.test.failure.ignore=true'], cwd: path.join(raiz, 'Backend/API'), env: javaEnv },
  node: { comando: process.execPath, args: ['--experimental-test-coverage', '--test-coverage-include=src/**/*.js', '--test-reporter=tap', '--test-reporter=lcov', `--test-reporter-destination=${path.join(artefatos, 'frontend.tap')}`, `--test-reporter-destination=${path.join(artefatos, 'frontend.lcov')}`, '--test', '--test-isolation=none', ...testesNode], cwd: ui },
  lint: { comando: 'npm', args: ['run', 'lint'], cwd: ui },
  build: { comando: 'npm', args: ['run', 'build'], cwd: ui },
  browser: { comando: process.execPath, args: ['node_modules/@playwright/test/cli.js', 'test', '--config=qa-browser/playwright.config.mjs'], cwd: ui },
  integration: { comando: process.execPath, args: ['scripts/testar-integracao.mjs'], cwd: raiz,
    env: { ...process.env, ...(existsSync('/usr/bin/chromium') ? { ERA_TEST_CHROMIUM: process.env.ERA_TEST_CHROMIUM || '/usr/bin/chromium' } : {}) } },
  audit: { comando: 'npm', args: ['audit', '--json'], cwd: ui },
  'maven-deps': { comando: 'sh', args: ['mvnw', '-B', '-ntp', 'dependency:tree', '-DoutputType=json', '-DoutputFile=target/security-dependencies.json', '-Dscope=runtime'], cwd: path.join(raiz, 'Backend/API'), env: javaEnv },
  osv: { comando: process.execPath, args: ['scripts/verificar-dependencias-java.mjs'], cwd: raiz },
};
const selecionadas = process.argv.find(a => a.startsWith('--only='))?.slice(7).split(',') || Object.keys(etapas);
for (const nome of selecionadas) {
  if (!Object.hasOwn(etapas, nome)) throw new Error(`Etapa desconhecida: ${nome}`);
  const etapa = etapas[nome], inicio = new Date(), tentativa = resultados.filter(r => r.etapa === nome).length + 1;
  const log = path.join(artefatos, `${nome}-${tentativa}.log`);
  console.log(`[QA] ${nome}: início ${inicio.toISOString()}`);
  const resultado = await new Promise(resolve => {
    let saida = '';
    const filho = spawn(etapa.comando, etapa.args, { cwd: etapa.cwd, env: etapa.env || process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => filho.kill('SIGTERM'), 15 * 60 * 1000);
    const registrar = b => { saida += b; writeFileSync(log, saida, { mode: 0o600 }); };
    filho.stdout.on('data', registrar); filho.stderr.on('data', registrar);
    filho.once('error', erro => { clearTimeout(timer); resolve({ codigo: null, erro: erro.message, saida }); });
    filho.once('close', (codigo, sinal) => { clearTimeout(timer); resolve({ codigo, sinal, saida }); });
  });
  if (nome === 'java' && resultado.codigo === 0) {
    const reports = path.join(raiz, 'Backend/API/target/surefire-reports');
    const falhas = readdirSync(reports).filter(f => /^TEST-.*\.xml$/.test(f)).reduce((total, f) => {
      const cabecalho = readFileSync(path.join(reports, f), 'utf8').match(/<testsuite\b[^>]*>/)?.[0] || '';
      return total + Number(cabecalho.match(/\bfailures="(\d+)"/)?.[1] || 0) + Number(cabecalho.match(/\berrors="(\d+)"/)?.[1] || 0);
    }, 0);
    if (falhas) { resultado.codigoProcesso = 0; resultado.codigo = 1; resultado.falhasTestes = falhas; }
  }
  writeFileSync(log, resultado.saida, { mode: 0o600 });
  // Recarregar para preservar registros de outra etapa executada simultaneamente.
  if (existsSync(arquivoResumo)) resultados.splice(0, resultados.length, ...JSON.parse(readFileSync(arquivoResumo, 'utf8')));
  resultados.push({ etapa: nome, tentativa, inicio: inicio.toISOString(), duracaoMs: Date.now() - inicio.getTime(), comando: [etapa.comando, ...etapa.args], cwd: etapa.cwd, codigo: resultado.codigo, codigoProcesso: resultado.codigoProcesso, falhasTestes: resultado.falhasTestes, sinal: resultado.sinal, erro: resultado.erro, log: path.relative(raiz, log) });
  writeFileSync(arquivoResumo, JSON.stringify(resultados, null, 2));
  console.log(`[QA] ${nome}: código ${resultado.codigo}, log ${path.relative(raiz, log)}`);
}
console.log('Maven usa failure.ignore apenas para emitir JaCoCo; conferir falhas em surefire-reports, não o código do build isoladamente.');
if (selecionadas.some(nome => resultados.filter(r => r.etapa === nome).at(-1)?.codigo !== 0)) process.exitCode = 1;
