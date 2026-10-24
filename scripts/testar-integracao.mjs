// Node 22+, Docker Compose. Nunca lê .env nem usa o banco habitual.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const artefatos = path.join(raiz, 'test-results', `integracao-${Date.now()}`);
await mkdir(artefatos, { recursive: true });
const temporario = await mkdtemp(path.join(os.tmpdir(), 'era-tests-'));
const envVazio = path.join(temporario, 'sem-env');
await writeFile(envVazio, '', { mode: 0o600 });
const resultados = [];
const suiteSolicitada = process.argv.find(arg=>arg.startsWith('--suite='))?.slice(8);
assert.ok(!suiteSolicitada || ['atendimento-parcial','regressao','recuperacao'].includes(suiteSolicitada),'Suíte inválida.');
const filhos = new Set();
let interrompido = false;
function interromper() { interrompido = true;for (const filho of filhos) filho.kill('SIGTERM'); }
process.once('SIGINT', interromper);
process.once('SIGTERM', interromper);

async function executar(comando, args, { capturar = false, cwd = raiz, env = process.env, timeout = 600000 } = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(comando, args, { cwd, env, stdio: ['ignore', capturar ? 'pipe' : 'inherit', 'inherit'] });
    filhos.add(filho);
    let saida = '';
    if (capturar) filho.stdout.on('data', trecho => { saida += trecho; });
    const timer = setTimeout(() => filho.kill('SIGTERM'), timeout);
    filho.once('error', erro => { filhos.delete(filho);clearTimeout(timer); reject(erro); });
    filho.once('exit', (codigo, sinal) => {
      clearTimeout(timer);
      filhos.delete(filho);
      if (codigo === 0) resolve(saida.trim());
      else reject(new Error(`${comando} ${args[0]} falhou (${codigo ?? sinal}).`));
    });
  });
}

async function stack(nome, testar) {
  assert.equal(interrompido, false, 'Execução interrompida.');
  const project = `era-tests-${randomBytes(6).toString('hex')}`;
  const args = ['compose', '--env-file', envVazio, '-f', path.join(raiz, 'compose.test.yaml'), '-p', project];
  if (nome==='recuperacao') args.push('-f',path.join(raiz,'compose.test.recovery.yaml'));
  let origem='http://localhost:5173';
  const compose = (comandos, opcoes) => executar('docker', [...args, ...comandos], {...opcoes,env:{...process.env,ERA_TEST_ORIGIN:origem}});
  const inicio = Date.now();
  let erroTeste;
  console.log(`\n[${nome}] Iniciando ${project} (dados descartáveis, portas aleatórias).`);
  try {
    const porta = async (servico, interna) => {
      const endereco = await compose(['port', servico, String(interna)], { capturar: true });
      assert.match(endereco, /^127\.0\.0\.1:\d+$/);
      return `http://${endereco}`;
    };
    // Reservar porta da UI primeiro para permitir apenas sua origem exata no CORS.
    await compose(['up','-d','--no-build','--no-deps','ui']);
    origem=await porta('ui',80);
    await compose(['up', '-d', '--no-build']);
    const config = { descartavel: true, project, database: 'era_test', url: await porta('api',8080), ui: origem, envVazio };
    if (nome==='recuperacao') config.mail=await porta('mail',8025);
    const arquivo = path.join(temporario, `${nome}.json`);
    await writeFile(arquivo, JSON.stringify(config), { mode: 0o600 });
    const limite = Date.now() + 180000;
    while (true) {
      assert.equal(interrompido, false, 'Execução interrompida.');
      try { if ((await fetch(`${config.url}/api/actuator/health`, { signal: AbortSignal.timeout(2000) })).ok) break; } catch { /* Inicialização. */ }
      assert.ok(Date.now() < limite, 'API de testes não ficou saudável.');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    await testar(arquivo, config);
    const logs=await compose(['logs','--no-color','api'],{capturar:true});
    for (const segredo of ['TempCheck#578943','TempUser#578943','ChangedUser#578943','NovaSegura!987','ResetTeste!8729','admin.teste@gmail.com','#recuperacao=']) {
      assert.ok(!logs.includes(segredo),'Dado sensível fictício encontrado no log da API.');
    }
    await writeFile(path.join(artefatos,`${nome}-api.log`),logs,{mode:0o600});
    console.log(`[${nome}] Logs da API sem senhas, tokens de recuperação ou e-mail de teste.`);
  } catch (erro) {
    erroTeste = erro;
    console.error(`[${nome}] FALHOU: ${erro.message}`);
    const logs = await compose(['logs', '--no-color', '--tail=250', 'api'], { capturar: true }).catch(() => 'Logs indisponíveis.');
    // Apenas dados fictícios. Não publicar artefatos de testes feitos com dados reais.
    await writeFile(path.join(artefatos, `${nome}-api.log`), logs, { mode: 0o600 });
  } finally {
    // Exato projeto aleatório criado aqui; nunca "down" do compose habitual.
    const ids = (await compose(['ps', '-aq'], { capturar: true })).split(/\s+/).filter(Boolean);
    for (const id of ids) {
      const label = await executar('docker', ['inspect', '-f', '{{index .Config.Labels "era.test"}}', id], { capturar: true });
      assert.equal(label, 'true', 'Limpeza interrompida: container não pertence aos testes.');
    }
    await compose(['down', '--remove-orphans', '--timeout', '10']);
    resultados.push({ suite: nome, resultado: erroTeste ? 'falhou' : 'passou', duracaoMs: Date.now()-inicio, erro: erroTeste?.message });
    await writeFile(path.join(artefatos, 'resumo.json'), JSON.stringify(resultados,null,2));
  }
}

const node = (script, arquivo, ...extras) => executar(process.execPath, [script, arquivo, ...extras]);
if (!process.argv.includes('--sem-build')) {
  try {await executar('docker', ['compose', '--env-file', envVazio, '-f', path.join(raiz,'compose.test.yaml'), '-p', 'era-tests-build', 'build']);}
  catch (erro) {
    await writeFile(path.join(artefatos,'resumo.json'),JSON.stringify([{suite:'construcao',resultado:'falhou',erro:erro.message}],null,2));
    throw erro;
  }
}
else console.warn('ATENÇÃO: usando imagens de testes já construídas (--sem-build).');
if (!suiteSolicitada || suiteSolicitada==='atendimento-parcial') await stack('atendimento-parcial', arquivo => node('scripts/validar-atendimento-parcial.mjs', arquivo));
if (!suiteSolicitada || suiteSolicitada==='regressao') await stack('regressao', async (arquivo, config) => {
  await node('scripts/testes/preparar-dados.mjs', arquivo);
  const falhas = [];
  async function etapa(nome, executarEtapa) {
    assert.equal(interrompido,false,'Execução interrompida.');
    try { await executarEtapa(); }
    catch (erro) { falhas.push(nome);console.error(`[${nome}] ${erro.message}`); }
  }
  for (const script of ['validar-notificacoes-por-perfil', 'validar-cancelamento-rh']) {
    await etapa(script,()=>node(`scripts/${script}.mjs`, arquivo, '--banco-descartavel'));
  }
  await etapa('operacoes',()=>node('scripts/testes/operacoes.mjs', arquivo));
  await etapa('seguranca',()=>node('scripts/testes/seguranca.mjs', arquivo));
  if (!process.argv.includes('--sem-navegador')) {
    await etapa('navegador',()=>executar(process.execPath, ['node_modules/@playwright/test/cli.js', 'test'], {
      cwd: path.join(raiz,'Frontend/UI'),
      env: { ...process.env, ERA_TEST_CONFIG: arquivo, ERA_TEST_UI: config.ui, ERA_TEST_ARTIFACTS: path.join(artefatos,'navegador') },
    }));
  }
  assert.deepEqual(falhas,[],`Etapas com falhas: ${falhas.join(', ')}`);
});
if (!suiteSolicitada || suiteSolicitada==='recuperacao') await stack('recuperacao',arquivo=>node('scripts/testes/recuperacao.mjs',arquivo));
console.log(`\nRelatório: ${path.relative(raiz, artefatos)}/resumo.json`);
console.table(resultados);
if (resultados.some(r => r.resultado !== 'passou')) process.exitCode = 1;
