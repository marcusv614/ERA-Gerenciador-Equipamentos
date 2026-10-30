import { test, expect } from './test.mjs';

// Navegador com componentes reais e API simulada: não altera o ambiente da empresa.
const obras = [
  { id:1, nome:'Expansão de rede · Distrito Industrial', cidade:'Manaus · AM', cliente:'ERA Telecom', status:'Em andamento', inicio:'2026-10-01', responsaveis:['Marina Oliveira'] },
  { id:2, nome:'Backbone metropolitano · Zona Norte', cidade:'Manaus · AM', cliente:'ERA Telecom', status:'Em andamento', inicio:'2026-10-05', responsaveis:['Marina Oliveira'] },
];
const equipamentos = [
  { id:1, tipo:'Fluke', modelo:'Certificador de redes Fluke DSX-8000', serie:'FLUKE-0048', status:'Em campo', obraId:1, tecnico:'Marina Oliveira', quantidade:1, quantidadeDisponivel:1, calibracoes:[], historico:[] },
  { id:2, tipo:'Ferramentas', modelo:'Alicate de crimpagem RJ45', serie:null, status:'Em estoque', obraId:null, quantidade:18, quantidadeDisponivel:14, quantidadeReservada:4, historico:[] },
  { id:3, tipo:'OTDR', modelo:'OTDR óptico SmartOTDR', serie:'OTDR-0023', status:'Em estoque', obraId:null, quantidade:1, quantidadeDisponivel:1, historico:[] },
  { id:4, tipo:'Ferramentas', modelo:'Escada extensível em fibra', medida:'7,2 m', serie:null, status:'Em campo', obraId:1, tecnico:'Marina Oliveira', quantidade:2, quantidadeDisponivel:2, historico:[] },
];
const material = (id,nome,quantidade) => ({ id, nome, catalogoChave:`Ferramentas|${nome}`, quantidade, quantidadeSolicitada:quantidade, quantidadeCompra:0 });
const pedido = (id,status) => ({ id, status, tecnico:'Marina Oliveira', solicitante:'Marina Oliveira', dataSolicitacao:'2026-10-28', obraDestinoId:1, materiais:[material(1,'Alicate de crimpagem RJ45',3),material(2,'Escada extensível em fibra',2),material(3,'Conector óptico SC/APC',20)], planoFinanceiro:[], eventosFinanceiros:[], decisoes:[], analises:[] });
const funcionarios = [{ id:1, nome:'Marina Oliveira', cargo:'Técnica de redes', status:'Ativo', email:'marina@example.invalid', telefone:'(92) 99999-0000' }];

async function preparar(page, perfil, { itens = equipamentos, pedidosIniciais } = {}) {
  const mutacoes = [], pedidos = pedidosIniciais ?? [pedido(108,'Pendente'),pedido(107,'Aguardando financeiro'),pedido(106,'Aprovada'),pedido(105,'Em trânsito'),pedido(104,'Concluída')];
  await page.route('http://127.0.0.1:4179/api/**', async route => {
    const req=route.request(), rota=new URL(req.url()).pathname;
    if(req.method()==='POST' && rota==='/api/atividades') {
      const corpo=req.postDataJSON(); mutacoes.push(corpo);
      const novo={...pedido(109,'Pendente'),...corpo}; pedidos.unshift(novo);
      return route.fulfill({status:201,json:novo});
    }
    const respostas = {
      '/api/auth/me':{id:9,funcionarioId:1,nome:'Marina Oliveira',login:'qa.marina',perfil,deveAlterarSenha:false},
      '/api/auth/csrf':{token:'qa-csrf'}, '/api/notificacoes':{itens:[],naoLidas:0,temMais:false},
      '/api/obras':obras,
      '/api/auditorias':[{id:1,funcionarioId:1,tecnicoNome:'Marina Oliveira',fiscal:'João Santos',criadoEm:'2026-10-28T12:00:00Z',status:'CONCLUIDA',dataVistoria:'2026-10-28',itens:[{equipamentoId:1,modelo:'Certificador de redes Fluke DSX-8000',obraId:1,local:obras[0].nome,quantidade:1,bom:1,avaria:0,quebrado:0}]}], '/api/equipamentos':itens,
      '/api/equipamentos/catalogo':itens.map(e=>({...e,catalogoChave:`${e.tipo}|${e.modelo}|${e.medida||''}`})),
      '/api/equipamentos/disponibilidade-financeira':itens,
      '/api/funcionarios':funcionarios, '/api/categorias-equipamento':[{id:1,nome:'Ferramentas'},{id:2,nome:'Fluke'},{id:3,nome:'OTDR'}],
      '/api/atividades':pedidos, '/api/atividades/pedidos-financeiros':pedidos, '/api/atividades/pedidos-rh':pedidos,
      '/api/usuarios':[{id:9,nome:'Marina Oliveira',login:'qa.marina',perfil:'ADMIN',ativo:true},{id:10,nome:'Técnico de campo',login:'qa.campo',perfil:'TECNICO',ativo:true,funcionarioId:1}],
    };
    if(rota in respostas)return route.fulfill({json:respostas[rota]});
    return route.fulfill({json:[]});
  });
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();
  await expect(page.getByText('Sincronizando dados com a API...')).toHaveCount(0);
  await expect(page.getByText('Sincronizando o campo...')).toHaveCount(0);
  await expect(page.getByText('Carregando estoque…',{exact:true})).toHaveCount(0);
  return mutacoes;
}
async function semOverflow(page) {
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
}
async function capturar(page, info, nome) {
  await semOverflow(page);
  await page.evaluate(()=>{window.scrollTo(0,0);document.querySelectorAll('main,main > div').forEach(el=>{el.scrollTop=0;});});
  await page.screenshot({path:info.outputPath(`${nome}.png`),fullPage:info.project.name!=='qa-mobile',animations:'disabled'});
}

for(const perfil of ['ADMIN','GERENTE','RH','FINANCEIRO','ESTOQUE','TECNICO','TST']) {
  test(`UI-ERA: ${perfil} com dados, navegação e temas sem transbordamento`,async({page},info)=>{
    test.setTimeout(60000);
    const erros=[]; page.on('pageerror',e=>erros.push(e.message));
    await preparar(page,perfil);
    await capturar(page,info,`${perfil}-claro`);
    if(['GERENTE','RH','FINANCEIRO'].includes(perfil)) {
      await page.getByRole('button',{name:/Solicitações/}).filter({visible:true}).first().click();
      await page.getByRole('button',{name:'Kanban',exact:true}).click();
      const quadro=page.getByRole('region',{name:'Kanban de solicitações',exact:true});
      await expect(quadro.getByLabel('Resumo dos materiais').first()).toContainText('Alicate de crimpagem RJ45');
      await capturar(page,info,`${perfil}-kanban`);
      if(perfil==='GERENTE')for(const nome of ['Obras','Funcionários','Depósito','Vistorias']) {
        await page.getByRole('button',{name:nome==='Funcionários'?/^(Funcionários|Equipe)$/:new RegExp(`^${nome}$`)}).filter({visible:true}).first().click();
        await capturar(page,info,`GERENTE-${nome}`);
        if(nome==='Vistorias'){await page.locator('summary').filter({hasText:'Nova vistoria'}).click();await page.getByRole('combobox',{name:'Técnico fiscalizado',exact:true}).selectOption('1');await expect(page.getByRole('button',{name:'Preparar ficha',exact:true})).toBeEnabled();await page.locator('summary').filter({hasText:/^Filtros/}).click();await page.getByRole('combobox',{name:'Situação',exact:true}).selectOption('ABERTA');await expect(page.getByText('Nenhuma vistoria encontrada. Prepare uma ficha para iniciar uma vistoria.',{exact:true})).toBeVisible();}
      }
    }
    await page.getByRole('button',{name:'Ativar tema escuro',exact:true}).click();
    await capturar(page,info,`${perfil}-escuro`);
    if(info.project.name==='qa-mobile'){await page.setViewportSize({width:320,height:740});await semOverflow(page);}
    expect(erros).toEqual([]);
  });
}

test('UI-ERA: pedido do técnico mantém quantidades, revisão e envio da API',async({page},info)=>{
  const mutacoes=await preparar(page,'TECNICO');
  await page.getByRole('button',{name:/Pedir material/}).click();
  await page.getByRole('button',{name:/Expansão de rede/}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  if(info.project.name==='qa-mobile'){
    const primeiro=await page.getByRole('button',{name:'Selecionar Certificador de redes Fluke DSX-8000',exact:true}).boundingBox();
    expect(primeiro.y).toBeLessThan(page.viewportSize().height*0.6);
  }
  const quantidade=page.getByRole('textbox',{name:'Quantidade de Alicate de crimpagem RJ45',exact:true});
  await page.getByRole('button',{name:'Selecionar Alicate de crimpagem RJ45',exact:true}).click();
  await quantidade.fill('3');
  await page.getByRole('button',{name:'Aumentar quantidade de Alicate de crimpagem RJ45',exact:true}).click();
  await expect(quantidade).toHaveValue('4');
  await capturar(page,info,'TECNICO-catalogo');
  await page.getByRole('button',{name:/Revisar 4 itens/}).click();
  await expect(page.getByRole('heading',{name:'Revisar pedido',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'Adicionar observação',exact:true}).click();
  await page.getByRole('textbox',{name:/Observação/}).fill('Entregar com o responsável da obra.');
  await capturar(page,info,'TECNICO-revisao');
  await page.getByRole('button',{name:/Enviar ao gerente/}).click();
  await expect(page.getByRole('heading',{name:'Meus pedidos',exact:true})).toBeVisible();
  await expect(page.locator('#pedido-tecnico-109')).toBeFocused();
  expect(mutacoes).toHaveLength(1);
  expect(mutacoes[0]).toMatchObject({obraDestinoId:1,obraOrigemId:null,observacao:'Entregar com o responsável da obra.',materiais:[{nome:'Alicate de crimpagem RJ45',quantidade:4}]});
  await semOverflow(page);
});

test('UI-ERA: busca e menu de cadastros continuam acessíveis por teclado',async({page})=>{
  await preparar(page,'GERENTE');
  await page.getByRole('button',{name:'Abrir ações rápidas',exact:true}).click();
  await expect(page.getByRole('button',{name:'Equipamento',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Equipamento',exact:true})).toBeHidden();
  await expect(page.getByRole('button',{name:'Abrir ações rápidas',exact:true})).toBeFocused();
  await page.getByRole('textbox',{name:'Pesquisar em equipamentos',exact:true}).fill('Nada encontrado');
  await expect(page.getByRole('status').filter({hasText:'Pesquisa por'})).toHaveCount(1);
  await expect(page.getByText('Nenhum equipamento encontrado com esses filtros.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Limpar pesquisa',exact:true}).first().click();
  await expect(page.getByRole('textbox',{name:'Pesquisar em equipamentos',exact:true})).toHaveValue('');
  await semOverflow(page);
});

test('UI-ERA: filtros de período e ordem do estoque permanecem disponíveis',async({page})=>{
  await preparar(page,'ESTOQUE');
  const inicial=page.getByLabel('Data inicial dos pedidos do estoque',{exact:true});
  await expect(inicial).toBeHidden();
  await page.getByRole('button',{name:'Personalizado',exact:true}).click();
  await expect(inicial).toBeVisible();
  await inicial.fill('2026-10-01');
  await page.getByLabel('Data final dos pedidos do estoque',{exact:true}).fill('2026-10-29');
  await page.getByRole('combobox',{name:'Ordenar pedidos do estoque',exact:true}).selectOption('recentes');
  await expect(page.getByRole('button',{name:'Atender pedido 106',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/^Enviados/}).click();
  await expect(page.getByRole('button',{name:'Atender pedido 105',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();
  await expect(page.getByLabel('Ordenar pedidos do estoque',{exact:true})).toHaveValue('operacional');
  await semOverflow(page);
});

test('UI-ERA: administrador alterna áreas também na navegação compacta',async({page},info)=>{
  await preparar(page,'ADMIN');
  if(info.project.name==='qa-mobile')await page.getByRole('combobox',{name:'Escolher área administrativa',exact:true}).selectOption('gerencia');
  else await page.getByRole('navigation',{name:'Áreas administrativas',exact:true}).getByRole('button',{name:'Gerência',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Equipamentos',exact:true})).toBeVisible();
  await semOverflow(page);
  if(info.project.name==='qa-mobile')await page.getByRole('combobox',{name:'Escolher área administrativa',exact:true}).selectOption('usuarios');
  else await page.getByRole('navigation',{name:'Áreas administrativas',exact:true}).getByRole('button',{name:'Administração',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Administração',exact:true})).toBeVisible();
  await semOverflow(page);
});

test('UI-ERA: inventário mostra saldos parciais nos cartões, lista e depósito',async({page},info)=>{
  const lote={...equipamentos[0],id:20,obraId:null,serie:'LOTE-20',quantidade:8,quantidadeDisponivel:2,quantidadeReservada:1,quantidadeManutencao:1,quantidadeCalibracao:1,status:'Em estoque'};
  const transporte={...pedido(200,'Em trânsito'),obraOrigemId:null,materiais:[{...material(20,lote.modelo,3),identificacao:lote.serie}]};
  await preparar(page,'GERENTE',{itens:[lote,equipamentos[1]],pedidosIniciais:[transporte]});
  const conferir=async()=>{
    const quantidades=page.getByLabel('Quantidades do equipamento',{exact:true}).first();
    for(const [rotulo,valor] of [['Total cadastrado',8],['Disponível',2],['Reservado',1],['Em manutenção',1],['Em calibração',1],['Em trânsito',3]]) {
      await expect(quantidades.locator('span').filter({has:page.getByText(rotulo,{exact:true})})).toHaveText(new RegExp(`${rotulo}\\s*${valor}`));
    }
  };
  await conferir();
  if(info.project.name==='qa-desktop'){
    await page.getByRole('button',{name:'Lista',exact:true}).click();
    await conferir();
  }
  await page.getByRole('button',{name:'Depósito',exact:true}).filter({visible:true}).first().click();
  await conferir();
  await expect(page.getByRole('heading',{name:'Inventário do depósito',exact:true})).toBeVisible();
  await expect(page.getByText(/Ferramentas\s*·\s*·/)).toHaveCount(0);
  await semOverflow(page);
});

test('UI-ERA: trocar de área começa no topo da nova dashboard',async({page})=>{
  const itens=Array.from({length:20},(_,indice)=>({...equipamentos[0],id:indice+20,serie:`SCROLL-${indice}`,modelo:`Certificador ${indice+1}`,obraId:1}));
  await preparar(page,'GERENTE',{itens,pedidosIniciais:[]});
  const conteudo=page.getByRole('main').locator(':scope > div').last();
  await conteudo.evaluate(el=>{el.scrollTo({top:el.scrollHeight,behavior:'instant'});});
  await expect.poll(()=>conteudo.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('button',{name:'Obras',exact:true}).filter({visible:true}).first().click();
  await expect(page.getByRole('heading',{name:obras[0].nome,exact:true})).toBeVisible();
  await expect.poll(()=>conteudo.evaluate(el=>el.scrollTop)).toBe(0);
});

test('UI-ERA: devolução mantém limite da obra e envia a quantidade revisada',async({page})=>{
  const mutacoes=await preparar(page,'TECNICO');
  await page.getByRole('button',{name:/Devolver material/}).click();
  await page.getByRole('button',{name:/Expansão de rede/}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  const aumentar=page.getByRole('button',{name:'Aumentar quantidade de Escada extensível em fibra',exact:true});
  await aumentar.click();await aumentar.click();
  await expect(aumentar).toBeDisabled();
  await expect(page.getByRole('textbox',{name:'Quantidade de Escada extensível em fibra',exact:true})).toHaveValue('2');
  await page.getByRole('button',{name:/Revisar 2 itens/}).click();
  const resumo=page.getByLabel('Resumo da solicitação',{exact:true});
  await expect(resumo).toContainText('7,2 m');
  await expect(resumo).toContainText('Retirar de Expansão de rede');
  await page.getByRole('button',{name:/Enviar ao gerente/}).click();
  await expect(page.locator('#pedido-tecnico-109')).toBeFocused();
  expect(mutacoes).toHaveLength(1);
  expect(mutacoes[0]).toMatchObject({obraOrigemId:1,obraDestinoId:null,materiais:[{nome:'Escada extensível em fibra',quantidade:2}]});
});
