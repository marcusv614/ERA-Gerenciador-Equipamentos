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
      const barra = page.getByRole('scrollbar',{name:'Barra de rolagem horizontal do Kanban',exact:true});
      if (await barra.isVisible()) {
        expect(await barra.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(24);
        await barra.focus();
        await barra.press('End');
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

test('Kanban: barra integrada, mouse, teclado, gestos e redimensionamento',async({page,isMobile},testInfo)=>{
  await entrar(page,'gerente');
  await atividades(page);
  await page.getByRole('button',{name:'Kanban',exact:true}).click();
  const board = page.getByRole('region',{name:'Kanban de solicitações',exact:true});
  const barra = page.getByRole('scrollbar',{name:'Barra de rolagem horizontal do Kanban',exact:true});
  const indicador = barra.locator('[data-indicador-rolagem]');
  await expect(barra).toBeVisible();
  await expect(barra).toHaveCount(1);
  await expect(barra).toHaveAttribute('aria-controls',await board.getAttribute('id'));
  await expect(barra).toHaveAttribute('aria-orientation','horizontal');
  expect(await board.evaluate(e=>getComputedStyle(e).scrollbarWidth)).toBe('none');
  // O trilho usa o próprio espaço superior do quadro, sem faixa adicional.
  const caixaQuadro = await board.boundingBox();
  const caixaBarra = await barra.boundingBox();
  expect(Math.abs(caixaBarra.y-caixaQuadro.y)).toBeLessThanOrEqual(1);
  expect(caixaBarra.height).toBe(24);
  expect(await indicador.evaluate(e=>e.getBoundingClientRect().height)).toBeLessThanOrEqual(8);

  await barra.focus();
  await barra.press('Home');
  await expect(barra).toHaveAttribute('aria-valuenow','0');
  await barra.press('ArrowRight');
  await expect.poll(()=>board.evaluate(e=>e.scrollLeft)).toBe(40);
  await barra.press('End');
  await expect.poll(async()=>Number(await barra.getAttribute('aria-valuenow'))===Number(await barra.getAttribute('aria-valuemax'))).toBe(true);
  await barra.press('ArrowRight');
  await expect.poll(()=>board.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)))).toBeLessThanOrEqual(1);
  await barra.press('PageUp');
  await expect.poll(()=>board.evaluate(e=>e.scrollLeft<e.scrollWidth-e.clientWidth)).toBe(true);
  await barra.press('Home');

  // Clique no trilho vai ao ponto; captura mantém o arraste fora da barra.
  await page.mouse.click(caixaBarra.x+caixaBarra.width-2,caixaBarra.y+12);
  await expect.poll(()=>board.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)))).toBeLessThanOrEqual(1);
  await barra.press('Home');
  await expect(barra).toHaveAttribute('aria-valuenow','0');
  const caixaIndicador = await indicador.boundingBox();
  await page.mouse.move(caixaIndicador.x+caixaIndicador.width/2,caixaBarra.y+12);
  await page.mouse.down();
  await expect(barra).toHaveAttribute('data-arrastando','true');
  await page.mouse.move(caixaBarra.x+caixaBarra.width+30,caixaBarra.y+70,{steps:8});
  await page.mouse.up();
  await expect(barra).toHaveAttribute('data-arrastando','false');
  await expect.poll(()=>board.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)))).toBeLessThanOrEqual(1);
  await barra.press('Home');
  await expect(barra).toHaveAttribute('aria-valuenow','0');

  if (isMobile) {
    // Eventos de toque reais do Chromium: o quadro mantém o swipe nativo.
    const sessao = await page.context().newCDPSession(page);
    const x = caixaQuadro.x+caixaQuadro.width-30;
    const y = Math.min(caixaQuadro.y+180,page.viewportSize().height-100);
    await sessao.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for (let passo=1;passo<=10;passo++) {
      await sessao.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-passo*20,y}]});
    }
    await sessao.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect.poll(()=>board.evaluate(e=>e.scrollLeft)).toBeGreaterThan(20);
    await sessao.detach();
  } else {
    await page.mouse.move(caixaQuadro.x+100,caixaQuadro.y+100);
    await page.mouse.wheel(160,0);
    await expect.poll(()=>board.evaluate(e=>e.scrollLeft)).toBeGreaterThan(20);
    // A roda vertical não é convertida em movimento horizontal.
    await expect.poll(()=>board.evaluate(e=>Math.round(e.scrollLeft))).toBe(160);
    await page.mouse.wheel(0,100);
    await expect.poll(()=>board.evaluate(e=>Math.round(e.scrollLeft))).toBe(160);
  }
  await semOverflow(page);
  await page.screenshot({path:testInfo.outputPath('kanban-refinado.png'),fullPage:true});

  await page.setViewportSize({width:3200,height:1000});
  await expect(barra).toBeHidden();
  await page.setViewportSize({width:320,height:900});
  await expect(barra).toBeVisible();
  await expect.poll(()=>indicador.evaluate(e=>e.getBoundingClientRect().width)).toBeGreaterThanOrEqual(44);
  await barra.focus();
  await barra.press('End');
  await expect.poll(()=>board.evaluate(e=>Math.abs(e.scrollLeft-(e.scrollWidth-e.clientWidth)))).toBeLessThanOrEqual(1);
  await semOverflow(page);
});

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
