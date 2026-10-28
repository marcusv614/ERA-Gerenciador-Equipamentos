import { test, expect } from './test.mjs';

// Componentes reais; API inteiramente simulada. Não equivale a E2E do backend.
test.beforeEach(async ({ context, page }) => {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== 'http://127.0.0.1:4179'
      ? route.abort('blockedbyclient') : route.continue();
  });
  await page.route('http://127.0.0.1:4179/api/**', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') return route.fulfill({ status: 401, json: { mensagem: 'Autenticação necessária.' } });
    if (pathname === '/api/auth/csrf') return route.fulfill({ json: { token: 'qa-csrf-ficticio' } });
    return route.fulfill({ status: 503, json: { mensagem: `Rota não simulada: ${pathname}` } });
  });
});

async function preencher(page) {
  await page.getByRole('textbox', { name: 'Usuário', exact: true }).fill('qa.ficticio');
  await page.getByLabel('Senha', { exact: true }).fill('FraseTeste!9382');
}

test('QA-UI-01: labels, teclado, senha e layout do acesso', async ({ page }, testInfo) => {
  const erros = []; page.on('pageerror', erro => erros.push(erro.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Acesse o painel' })).toBeVisible();
  const usuario = page.getByRole('textbox', { name: 'Usuário', exact: true });
  const senha = page.getByLabel('Senha', { exact: true });
  await expect(usuario).toBeFocused(); await usuario.press('Tab'); await expect(senha).toBeFocused();
  await preencher(page);
  await page.getByRole('button', { name: 'Visualizar senha', exact: true }).click();
  await expect(senha).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar senha', exact: true }).click();
  await expect(senha).toHaveAttribute('type', 'password');
  expect(await page.locator('html').getAttribute('lang')).toMatch(/^pt/i);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(erros).toEqual([]);
  const medicao = await page.evaluate(() => ({ domContentLoadedMs: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, ambiente: 'Vite local + API simulada, amostra única' }));
  await testInfo.attach('desempenho-local.json', { body: JSON.stringify(medicao), contentType: 'application/json' });
  // Não há SLA de carregamento especificado: registrar a medição sem inventar um.
  expect(Number.isFinite(medicao.domContentLoadedMs)).toBe(true);
  expect(medicao.domContentLoadedMs).toBeGreaterThan(0);
});

for (const [status, mensagem, esperado] of [[401,'Credenciais inválidas','Login ou senha inválidos'],[403,'Bloqueado','O acesso foi bloqueado'],[500,'Erro interno de teste','Não foi possível concluir a operação']]) {
  test(`QA-UI-02: login trata HTTP ${status} e permite nova tentativa`, async ({ page }) => {
    await page.route('**/api/auth/login', route => route.fulfill({ status, json: { mensagem } }));
    await page.goto('/'); await preencher(page);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText(esperado);
    await expect(page.getByRole('button', { name: 'Entrar', exact: true })).toBeEnabled();
    await expect(page.getByRole('heading', { name: 'Acesse o painel' })).toBeVisible();
  });
}

test('QA-UI-03: envio usa CSRF e bloqueia clique duplicado durante a resposta', async ({ page }) => {
  let liberar; const espera = new Promise(resolve => { liberar = resolve; }); let chamadas = 0;
  await page.route('**/api/auth/login', async route => {
    chamadas++;
    expect(route.request().headers()['x-xsrf-token']).toBe('qa-csrf-ficticio');
    expect(route.request().postDataJSON()).toEqual({ login: 'qa.ficticio', senha: 'FraseTeste!9382' });
    await espera; await route.fulfill({ status: 401, json: { mensagem: 'Inválido' } });
  });
  await page.goto('/'); await preencher(page);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Entrando...' })).toBeDisabled();
  expect(chamadas).toBe(1); liberar();
  await expect(page.getByRole('alert')).toBeVisible(); expect(chamadas).toBe(1);
});

test('QA-UI-04: campos obrigatórios impedem requisição vazia', async ({ page }) => {
  let chamadas = 0; page.on('request', request => { if (request.url().endsWith('/auth/login')) chamadas++; });
  await page.goto('/'); await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  expect(chamadas).toBe(0); await expect(page.getByRole('textbox', { name: 'Usuário', exact: true })).toBeFocused();
});

test('QA-UI-05: recuperação mantém resposta genérica e permite voltar', async ({ page }) => {
  await page.route('**/api/auth/recuperacao/solicitar', route => {
    expect(route.request().postDataJSON()).toEqual({ login: 'admin.qa' });
    return route.fulfill({ status: 202, json: { mensagem: 'Se esse login pertencer a um administrador ativo, enviaremos instruções.' } });
  });
  await page.goto('/'); await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await page.getByLabel('Login do administrador').fill(' admin.qa ');
  await page.getByRole('button', { name: 'Enviar instruções' }).click();
  await expect(page.getByRole('status')).toContainText('Se esse login');
  await expect(page.getByRole('button', { name: 'Enviar instruções' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Voltar ao acesso' }).click();
  await expect(page.getByRole('heading', { name: 'Acesse o painel' })).toBeVisible();
});

test('QA-UI-06: token sai da URL e confirmação divergente não chama a API', async ({ page }) => {
  const token = 'a'.repeat(43); let redefinicoes = 0;
  await page.route('**/api/auth/recuperacao/redefinir', route => { redefinicoes++; return route.fulfill({ status: 204 }); });
  await page.goto(`/#recuperacao=${token}`);
  await expect(page.getByRole('heading', { name: 'Crie uma nova senha' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  await page.getByLabel('Nova senha', { exact: true }).fill('FraseNova!9382');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('OutraFrase!9382');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('alert')).toContainText('confirmação'); expect(redefinicoes).toBe(0);
});

test('QA-UI-07: redefinição válida transmite token, encerra sessão e limpa campos', async ({ page }) => {
  const token = 'b'.repeat(43);
  await page.route('**/api/auth/recuperacao/redefinir', route => {
    expect(route.request().postDataJSON()).toEqual({ token, novaSenha: 'FraseNova!9382' });
    return route.fulfill({ status: 204 });
  });
  await page.route('**/api/auth/logout', route => route.fulfill({ status: 204 }));
  await page.goto(`/#recuperacao=${token}`);
  await page.getByLabel('Nova senha', { exact: true }).fill('FraseNova!9382');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('FraseNova!9382');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page.getByRole('status')).toContainText('Senha redefinida');
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0);
});

test('QA-UI-08: sessão com senha temporária obriga troca e compara confirmação', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id: 1, perfil: 'TECNICO', login: 'qa', deveAlterarSenha: true } }));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'Crie sua senha' })).toBeVisible();
  await page.getByLabel('Nova senha', { exact: true }).fill('FraseNova!9382');
  await page.getByLabel('Confirmar nova senha', { exact: true }).fill('Diferente!9382');
  await page.getByRole('button', { name: 'Definir nova senha' }).click();
  await expect(page.getByRole('alert')).toContainText('confirmação');
});

test('QA-UI-09: administrador exige e-mail e confirmação só aceita oito dígitos', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id: 1, perfil: 'ADMIN', login: 'qa', deveAlterarSenha: false } }));
  await page.route('**/api/auth/recuperacao/configuracao', route => route.fulfill({ json: { disponivel: true, obrigatorio: true, emailPendente: 'qa@example.invalid' } }));
  await page.goto('/'); await expect(page.getByRole('heading', { name: 'E-mail de recuperação' })).toBeVisible();
  const confirmar = page.getByRole('button', { name: 'Confirmar e-mail' });
  await expect(confirmar).toBeDisabled();
  await page.getByLabel('Código de confirmação').fill('12ab3456'); await expect(page.getByLabel('Código de confirmação')).toHaveValue('123456');
  await expect(confirmar).toBeDisabled();
  await page.getByLabel('Código de confirmação').fill('12345678'); await expect(confirmar).toBeEnabled();
});

test('QA-UI-10: indisponibilidade da configuração do admin exibe nova tentativa', async ({ page }) => {
  await page.route('**/api/auth/me', route => route.fulfill({ json: { id: 1, perfil: 'ADMIN', login: 'qa', deveAlterarSenha: false } }));
  await page.route('**/api/auth/recuperacao/configuracao', route => route.fulfill({ status: 503, json: { mensagem: 'Indisponível' } }));
  await page.goto('/'); await expect(page.getByRole('alert')).toContainText('Não foi possível verificar');
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeEnabled();
});
