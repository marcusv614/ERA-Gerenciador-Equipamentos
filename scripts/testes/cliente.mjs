import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

export function configuracaoTeste(arquivo = process.argv[2]) {
  const config = JSON.parse(readFileSync(arquivo, 'utf8').replace(/^\uFEFF/, ''));
  assert.equal(config.descartavel, true, 'Somente configuração gerada pelo executor isolado.');
  assert.match(config.project, /^era-tests-[a-f0-9]{12}$/);
  assert.equal(config.database, 'era_test');
  assert.match(config.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.match(config.ui, /^http:\/\/127\.0\.0\.1:\d+$/);
  return config;
}

export const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Manaus' }).format(new Date());
export const senhaTemporaria = 'TempUser#578943';
export const senhaDefinitiva = 'ChangedUser#578943';

export class Cliente {
  cookies = new Map();
  csrf = '';
  verificacoes = 0;
  constructor(config) { this.config = config; }
  async resposta(method, path, body, opcoes = {}) {
    const headers = { 'Content-Type': 'application/json', Cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; '), ...opcoes.headers };
    if (method !== 'GET' && !opcoes.semCsrf) headers['X-XSRF-TOKEN'] = this.csrf;
    const resposta = await fetch(`${this.config.url}/api${path}`, {
      method, headers, body: body === undefined ? undefined : opcoes.bruto ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(20000), redirect: 'manual',
    });
    for (const cookie of resposta.headers.getSetCookie()) {
      const par = cookie.split(';')[0], n = par.indexOf('=');
      this.cookies.set(par.slice(0,n), par.slice(n+1));
    }
    const texto = await resposta.text();
    const dados = texto && resposta.headers.get('content-type')?.includes('json') ? JSON.parse(texto) : texto || null;
    if (resposta.status >= 400 && dados && typeof dados === 'object') {
      for (const campo of ['trace', 'stackTrace', 'exception', 'senhaHash', 'senha_hash']) assert.ok(!(campo in dados), `Vazamento em ${path}: ${campo}`);
    }
    this.verificacoes++;
    return { status: resposta.status, dados, headers: resposta.headers };
  }
  async req(method, path, body, esperado = 200, opcoes) {
    const r = await this.resposta(method, path, body, opcoes);
    assert.ok([esperado].flat().includes(r.status), `${method} ${path}: esperado ${esperado}, recebido ${r.status}: ${r.dados?.mensagem || ''}`);
    return r.dados;
  }
  async token() { this.csrf = (await this.req('GET', '/auth/csrf')).token; }
  async entrar(login, senha = senhaDefinitiva, trocar = false) {
    await this.token();
    await this.req('POST', '/auth/login', { login, senha });
    await this.token();
    if (trocar) {
      await this.req('POST', '/auth/alterar-senha', { novaSenha: senhaDefinitiva }, 204);
      await this.token();
    }
    return this;
  }
}
