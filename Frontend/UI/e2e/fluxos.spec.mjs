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
  // CSS pixels podem retornar 43.999996 para largura de 44 em viewport mobile.
  await expect.poll(()=>indicador.evaluate(e=>Math.round(e.getBoundingClientRect().width*1000)/1000)).toBeGreaterThanOrEqual(44);
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

for (const acao of ['aprovacao','rejeicao']) {
  test(`QA-FIN-REAL: ${acao} gravada resiste à falha da consulta sem novo envio`,async({page,request},testInfo)=>{
    const dados=async(resposta,status=200)=>{
      expect(resposta.status()).toBe(status);
      const corpo=await resposta.json();return corpo.dados??corpo;
    };
    // Preparar um pedido próprio com outra conta. O APIRequestContext tem
    // cookies isolados dos da página; não realiza novo login do Financeiro.
    const gerente=config.contas.find(c=>c.login==='demo.gerente');
    let csrf=(await dados(await request.get('/api/auth/csrf'))).token;
    await dados(await request.post('/api/auth/login',{data:{login:gerente.login,senha:gerente.senha},headers:{'X-XSRF-TOKEN':csrf}}));
    csrf=(await dados(await request.get('/api/auth/csrf'))).token;
    const obras=await dados(await request.get('/api/obras')),equipamentos=await dados(await request.get('/api/equipamentos'));
    const destino=obras.find(o=>o.nome==='DEMO Clínica Rio Negro'),equipamento=equipamentos.find(e=>e.serie==='DEMO-3');
    expect(destino).toBeTruthy();expect(equipamento).toBeTruthy();
    const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
    const pedido=await dados(await request.post('/api/atividades',{headers:{'X-XSRF-TOKEN':csrf},data:{tecnico:'DEMO tecnico2',obraDestinoId:destino.id,dataSolicitacao:hoje,observacao:'QA decisão confirmada com consulta interrompida',materiais:[{nome:equipamento.modelo,catalogoChave:equipamento.catalogoChave,quantidade:1}]}}),201);
    expect(pedido.status).toBe('Aguardando financeiro');
    await entrar(page,'financeiro');
    const token=(await dados(await page.request.get('/api/auth/csrf'))).token;
    await dados(await page.request.post(`/api/atividades/${pedido.id}/plano-financeiro`,{headers:{'X-XSRF-TOKEN':token},data:{materiais:[{materialId:pedido.materiais[0].id,quantidadeCompra:1,justificativa:'Preservar saldo na origem durante o teste',origens:[]}]}}));
    await page.reload();await atividades(page);await page.getByRole('button',{name:'Kanban',exact:true}).click();
    const abrir=page.getByRole('button',{name:new RegExp(`^Abrir solicitação ${pedido.id},`)});
    await abrir.click();const principal=page.getByRole('dialog',{name:`Solicitação #${String(pedido.id).padStart(4,'0')}`,exact:true});
    let bloquearConsulta=true,posts=0;
    await page.route('**/api/atividades/pedidos-financeiros',r=>bloquearConsulta?r.fulfill({status:503,json:{mensagem:'Consulta interrompida pelo teste'}}):r.continue());
    page.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname===`/api/atividades/${pedido.id}/${acao}`)posts++;});
    let ativo=principal;
    if(acao==='aprovacao')await principal.getByRole('button',{name:'Aprovar plano e enviar ao estoque',exact:true}).click();
    else {await principal.getByRole('button',{name:'Rejeitar',exact:true}).click();ativo=page.getByRole('dialog',{name:`Justificar rejeição · pedido #${pedido.id}`,exact:true});await ativo.getByRole('textbox',{name:'Justificativa obrigatória',exact:true}).fill('Material não necessário neste teste');await ativo.getByRole('button',{name:'Confirmar rejeição com justificativa',exact:true}).click();}
    await expect(ativo).toHaveCount(0);await expect(page.getByRole('alert')).toContainText('A decisão foi registrada');
    // Esta consulta direta ao backend não é interceptada pela rota da página.
    const persistido=(await dados(await page.request.get('/api/atividades/pedidos-financeiros'))).find(p=>p.id===pedido.id);
    expect(persistido?.status).toBe(acao==='aprovacao'?'Aprovada':'Rejeitada');
    const decisoes=persistido.decisoes.filter(e=>e.tipo===(acao==='aprovacao'?'APROVACAO':'REJEICAO'));
    expect(decisoes).toHaveLength(1);expect(posts).toBe(1);
    await abrir.click();await expect(principal.getByRole('button',{name:'Aprovar plano e enviar ao estoque',exact:true})).toHaveCount(0);await expect(principal.getByRole('button',{name:'Rejeitar',exact:true})).toHaveCount(0);await principal.getByRole('button',{name:'Fechar solicitação',exact:true}).click();
    bloquearConsulta=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('alert')).toHaveCount(0);expect(posts).toBe(1);
    await testInfo.attach('decisao-persistida',{body:JSON.stringify({pedidoId:pedido.id,acao,status:persistido.status,registros:decisoes.length,posts}),contentType:'application/json'});
  });
}

for (const acao of ['plano','edicao']) {
  test(`QA-SYNC-REAL: ${acao} confirmada resiste à falha da consulta sem novo envio`,async({page,request},testInfo)=>{
    const dados=async(resposta,status=200)=>{
      expect(resposta.status()).toBe(status);
      const corpo=await resposta.json();return corpo.dados??corpo;
    };
    const gerente=config.contas.find(c=>c.login==='demo.gerente');
    let csrf=(await dados(await request.get('/api/auth/csrf'))).token;
    await dados(await request.post('/api/auth/login',{data:{login:gerente.login,senha:gerente.senha},headers:{'X-XSRF-TOKEN':csrf}}));
    csrf=(await dados(await request.get('/api/auth/csrf'))).token;
    const obras=await dados(await request.get('/api/obras')),equipamentos=await dados(await request.get('/api/equipamentos'));
    const destino=obras.find(o=>o.nome==='DEMO Clínica Rio Negro'),equipamento=equipamentos.find(e=>e.serie==='DEMO-3');
    expect(destino).toBeTruthy();expect(equipamento).toBeTruthy();
    const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
    const pedido=await dados(await request.post('/api/atividades',{headers:{'X-XSRF-TOKEN':csrf},data:{tecnico:'DEMO tecnico2',obraDestinoId:destino.id,dataSolicitacao:hoje,observacao:'QA sincronização inicial',materiais:[{nome:equipamento.modelo,catalogoChave:equipamento.catalogoChave,quantidade:3}]}}),201);
    expect(pedido.status).toBe('Aguardando financeiro');
    await entrar(page,'financeiro');await atividades(page);await page.getByRole('button',{name:'Kanban',exact:true}).click();
    const abrir=page.getByRole('button',{name:new RegExp(`^Abrir solicitação ${pedido.id},`)});
    const principal=page.getByRole('dialog',{name:`Solicitação #${String(pedido.id).padStart(4,'0')}`,exact:true});
    const formulario=()=>page.getByRole('dialog',{name:acao==='plano'?'Planejar transporte e compra':'Editar solicitação',exact:true});
    const nome=pedido.materiais[0].nome;
    await abrir.click();await principal.getByRole('button',{name:acao==='plano'?'Definir transporte e compra':'Editar',exact:true}).click();
    const modal=formulario();
    if(acao==='plano'){
      await modal.getByRole('spinbutton',{name:`Quantidade de ${nome} para comprar`,exact:true}).fill('3');
      await modal.getByRole('textbox',{name:/^Motivo da compra/}).fill('Compra confirmada com consulta interrompida');
    }else{
      await modal.getByRole('spinbutton',{name:`Quantidade de ${nome}`,exact:true}).fill('2');
      await modal.getByRole('textbox',{name:'Observação',exact:true}).fill('Edição confirmada com consulta interrompida');
    }
    let bloquearConsulta=true,mutacoes=0;
    const metodo=acao==='plano'?'POST':'PATCH',rota=`/api/atividades/${pedido.id}${acao==='plano'?'/plano-financeiro':''}`;
    await page.route('**/api/atividades/pedidos-financeiros',r=>bloquearConsulta?r.fulfill({status:503,json:{mensagem:'Consulta interrompida pelo teste'}}):r.continue());
    page.on('request',r=>{if(r.method()===metodo&&new URL(r.url()).pathname===rota)mutacoes++;});
    await modal.getByRole('button',{name:acao==='plano'?'Salvar plano financeiro':'Salvar alterações',exact:true}).click();
    await expect(modal).toHaveCount(0);await expect(page.getByRole('alert')).toContainText(acao==='plano'?'O plano foi salvo':'As alterações foram salvas');
    const persistido=(await dados(await page.request.get('/api/atividades/pedidos-financeiros'))).find(p=>p.id===pedido.id);
    const analise=persistido.analises.find(a=>a.id===pedido.id);
    if(acao==='plano')expect(analise.planoFinanceiro[0].quantidadeCompra).toBe(3);
    else {expect(analise.materiais.reduce((s,m)=>s+m.quantidade,0)).toBe(2);expect(analise.observacao).toBe('Edição confirmada com consulta interrompida');}
    const registros=persistido.decisoes.filter(e=>e.tipo==='ALTERACAO');expect(registros).toHaveLength(1);expect(mutacoes).toBe(1);
    if(acao==='plano')await principal.getByRole('button',{name:'Fechar solicitação',exact:true}).click();
    bloquearConsulta=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect(page.getByRole('alert')).toHaveCount(0);
    await page.reload();await atividades(page);await page.getByRole('button',{name:'Kanban',exact:true}).click();await abrir.click();
    await principal.getByRole('button',{name:acao==='plano'?'Revisar plano':'Editar',exact:true}).click();
    if(acao==='plano'){
      await expect(formulario().getByRole('spinbutton',{name:`Quantidade de ${nome} para comprar`,exact:true})).toHaveValue('3');
      await expect(formulario().getByRole('textbox',{name:/^Motivo da compra/})).toHaveValue('Compra confirmada com consulta interrompida');
    }else{
      await expect(formulario().getByRole('spinbutton',{name:`Quantidade de ${nome}`,exact:true})).toHaveValue('2');
      await expect(formulario().getByRole('textbox',{name:'Observação',exact:true})).toHaveValue('Edição confirmada com consulta interrompida');
    }
    expect(mutacoes).toBe(1);
    await testInfo.attach('alteracao-persistida',{body:JSON.stringify({pedidoId:pedido.id,acao,metodo,status:persistido.status,registros:registros.length,mutacoes,valores:acao==='plano'?{planoFinanceiro:analise.planoFinanceiro}:{observacao:analise.observacao,materiais:analise.materiais.map(({nome,quantidade})=>({nome,quantidade}))}}),contentType:'application/json'});
  });
}
