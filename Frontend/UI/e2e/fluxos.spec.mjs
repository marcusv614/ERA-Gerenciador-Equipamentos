import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(process.env.ERA_TEST_CONFIG,'utf8'));
async function entrar(page,nome) {
  const conta = config.contas.find(c=>c.login===`demo.${nome}`);
  await page.goto('/');
  await page.getByRole('textbox',{name:'Usuário',exact:true}).fill(conta.login);
  await page.getByLabel('Senha',{exact:true}).fill(conta.senha);
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();
}
async function semOverflow(page) {
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
}
async function atividades(page) {
  // No mobile a navegação inferior está visível; no desktop, a lateral.
  await page.getByRole('button',{name:/Atividades/}).filter({visible:true}).first().click();
  await expect(page.getByRole('region',{name:'Solicitações',exact:true}).getByRole('heading',{name:'Solicitações',exact:true})).toBeVisible();
}

for (const nome of ['admin','gerente','rh','financeiro','estoque','tecnico2','tst']) {
  test(`${nome}: login, painel, responsividade e logout reais`,async({page},testInfo)=>{
    const erros = [];
    page.on('pageerror',e=>erros.push(e.message));
    await entrar(page,nome);
    await semOverflow(page);
    if (['rh','financeiro'].includes(nome)) {
      await expect(page.getByRole('button',{name:'Equipamento',exact:true})).toHaveCount(0);
      await expect(page.getByRole('button',{name:'Funcionário',exact:true})).toHaveCount(0);
    }
    if (['tecnico2','tst'].includes(nome)) {
      await expect(page.getByRole('button',{name:/PDF|Planilha|Auditoria/})).toHaveCount(0);
      await page.getByRole('button',{name:/Meus pedidos/}).click();
      await expect(page.getByText('DEMO Clínica Rio Negro',{exact:true}).first()).toBeVisible();
    }
    if (['gerente','rh','financeiro'].includes(nome)) {
      await atividades(page);
      await page.getByRole('button',{name:'Kanban',exact:true}).click();
      const board = page.getByRole('region',{name:'Kanban de solicitações',exact:true});
      await expect(board).toBeVisible();
      await expect(page.getByRole('button',{name:/Rolar Kanban/})).toHaveCount(0);
      const barra = page.getByRole('region',{name:'Barra de rolagem horizontal do Kanban',exact:true});
      if (await barra.isVisible()) {
        expect(await barra.evaluate(e=>e.parentElement.getBoundingClientRect().height)).toBeLessThanOrEqual(26);
        await barra.evaluate(e=>{e.scrollLeft=e.scrollWidth;});
        await expect.poll(()=>board.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)))).toBeLessThanOrEqual(2);
      }
      await semOverflow(page);
      await expect(board.getByRole('button',{name:/Auditoria.*PDF/})).toHaveCount(0);
    }
    if (nome==='estoque') {
      for (const periodo of ['Hoje','Semana','Mês']) {
        await page.getByRole('button',{name:periodo,exact:true}).click();
        await semOverflow(page);
      }
    }
    await page.screenshot({path:testInfo.outputPath(`${nome}.png`),fullPage:true});
    await page.getByRole('button',{name:'Ativar tema escuro',exact:true}).click();
    await expect(page.getByRole('button',{name:'Ativar tema claro',exact:true})).toBeVisible();
    await semOverflow(page);
    await page.screenshot({path:testInfo.outputPath(`${nome}-escuro.png`),fullPage:true});
    expect(erros).toEqual([]);
    await page.getByRole('button',{name:'Sair do sistema'}).click();
    await expect(page.getByRole('heading',{name:'Acesse o painel'})).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading',{name:'Acesse o painel'})).toBeVisible();
  });
}

for (const [nome,material,proibido] of [['tecnico2','DEMO Alicate','DEMO Luva'],['tst','DEMO Luva','DEMO Alicate']]) {
  test(`${nome}: criar pedido pela interface com catálogo restrito`,async({page})=>{
    await entrar(page,nome);
    await page.getByRole('button',{name:nome==='tst'?/Pedir EPI/:/Pedir material/}).click();
    await page.getByRole('button',{name:/DEMO Clínica Rio Negro/}).click();
    await page.getByRole('button',{name:/Continuar/}).click();
    await expect(page.getByRole('button',{name:`Selecionar ${proibido}`,exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:`Selecionar ${material}`,exact:true}).click();
    await page.getByRole('button',{name:/Revisar/}).click();
    // Falha controlada apenas na primeira tentativa; a segunda grava na API real.
    let primeiraTentativa=true;
    await page.route('**/api/atividades',route=>{
      if (route.request().method()==='POST'&&primeiraTentativa) {
        primeiraTentativa=false;
        return route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({status:409,mensagem:'Conflito temporário de teste. Tente novamente.'})});
      }
      return route.continue();
    });
    await page.getByRole('button',{name:/Enviar/}).click();
    await expect(page.getByRole('alert')).toContainText('Conflito temporário de teste');
    await expect(page.getByRole('button',{name:/Enviar/})).toBeEnabled();
    const enviada = page.waitForResponse(r=>r.url().endsWith('/api/atividades')&&r.request().method()==='POST');
    await page.getByRole('button',{name:/Enviar/}).click();
    const resposta = await enviada;
    expect(resposta.status()).toBe(201);
    const pedido = await resposta.json();
    expect(pedido.status).toBe('Pendente');
    expect(pedido.solicitanteLogin).toBe(`demo.${nome}`);
    expect(pedido.materiais.every(m=>m.catalogoChave.startsWith('epi|'))).toBe(nome==='tst');
    await semOverflow(page);
  });
}

test('senha inválida não permite acesso e permite nova tentativa',async({page})=>{
  await page.goto('/');
  await page.getByRole('textbox',{name:'Usuário',exact:true}).fill('demo.tecnico2');
  await page.getByLabel('Senha',{exact:true}).fill('SenhaErrada!875');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Login ou senha inválidos');
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Sair do sistema'})).toHaveCount(0);
});

test('falha de rede é tratada sem travar o login',async({page})=>{
  await page.goto('/');
  await page.route('**/api/auth/login',route=>route.abort('failed'));
  await page.getByRole('textbox',{name:'Usuário',exact:true}).fill('demo.tecnico2');
  await page.getByLabel('Senha',{exact:true}).fill('Ficticia!875');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeEnabled();
  await expect(page.getByRole('button',{name:'Sair do sistema'})).toHaveCount(0);
});

for (const nome of ['gerente','rh','financeiro']) {
  test(`${nome}: relatório real, filtro por dia, CSV e impressão`,async({page},testInfo)=>{
    await entrar(page,nome);
    if (nome==='gerente') {
      await page.getByRole('button',{name:/^(Funcionários|Equipe)$/}).filter({visible:true}).first().click();
      await expect(page.getByRole('main').getByText('<img src=x onerror="window.__eraXss=1">',{exact:true})).toBeVisible();
      expect(await page.evaluate(()=>window.__eraXss)).toBeUndefined();
      await page.getByRole('button',{name:`Auditoria do funcionário · PDF / Planilha · funcionario ${config.funcionarios.tecnico2.id}`,exact:true}).click();
    } else {
      await atividades(page);
      await page.getByRole('button',{name:/^Pedidos · PDF \/ Planilha/}).click();
    }
    const modal = page.getByRole('dialog',{name:'Exportar relatório'});
    await expect(modal).toBeVisible();
    await modal.getByLabel('Registros por data').selectOption('dia');
    await expect(modal.getByRole('button',{name:'Baixar planilha'})).toBeDisabled();
    const hoje = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
    await modal.getByLabel('Dia',{exact:true}).fill(hoje);
    const baixar = page.waitForEvent('download');
    await modal.getByRole('button',{name:'Baixar planilha'}).click();
    const download = await baixar;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
    const csv = readFileSync(await download.path(),'utf8');
    expect(csv).toContain('Fluxo dos pedidos');
    expect(csv).toContain('Solicitante');
    expect(csv).toContain(hoje);
    expect(csv).not.toContain('<table');
    if (nome==='rh') {expect(csv).toContain('DEMO tst');expect(csv).not.toContain('DEMO tecnico2');}
    if (nome==='gerente') {expect(csv).toContain('DEMO tecnico2');expect(csv).not.toContain('DEMO tst');}
    const abrir = page.waitForEvent('popup');
    await modal.getByRole('button',{name:'Imprimir / Salvar PDF'}).click();
    const impressao = await abrir;
    await expect(impressao.locator('body')).toContainText('Fluxo dos pedidos');
    await expect(impressao.getByRole('button')).toHaveCount(0);
    await expect(impressao.locator('input,select')).toHaveCount(0);
    const pdf=await impressao.pdf({format:'A4',landscape:true,printBackground:true});
    expect(pdf.subarray(0,5).toString()).toBe('%PDF-');
    await testInfo.attach('auditoria.pdf',{body:pdf,contentType:'application/pdf'});
    await impressao.close();
  });
}
