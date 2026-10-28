import { test,expect } from './test.mjs';

const abrir=(page,cenario,extra='')=>page.goto(`/qa-browser/interacoes.html?cenario=${cenario}${extra}`);
const estado=page=>page.getByLabel('Estado dos ativos').textContent().then(JSON.parse);
const ids=(page,nome)=>page.getByLabel(nome,{exact:true}).textContent().then(JSON.parse);
const equipamento={id:1,tipo:'Ferramentas',modelo:'Alicate',serie:'QA-1',status:'Em estoque',obraId:null,quantidade:3,quantidadeReservada:0,historico:[]};
async function mockAtivos(page,interceptar=()=>false) {
  await page.route('http://127.0.0.1:4179/api/**',async route=>{
    const rota=new URL(route.request().url()).pathname;
    if(await interceptar(route,rota))return;
    const dados=rota==='/api/equipamentos'?[equipamento]:rota==='/api/obras'?[{id:1,nome:'Aurora',responsaveis:['Ana']}]:rota==='/api/funcionarios'?[{id:1,nome:'Ana',cargo:'Técnica',status:'Ativo'},{id:2,nome:'Gerente',cargo:'Gerente',status:'Ativo'}]:[];
    await route.fulfill({json:dados});
  });
}
function promessa(){let liberar;const espera=new Promise(r=>liberar=r);return {espera,liberar};}
const aguardarRender=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));

test('QA-JSX-01: filtros combinam tipo, status e busca normalizada',async({page})=>{
  await abrir(page,'filtros');expect(await ids(page,'equipamentosFiltrados')).toEqual([1,2,3]);
  await page.getByRole('combobox',{name:'Tipo',exact:true}).selectOption('Ferramentas');
  await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('Em manutenção');
  await page.getByLabel('Busca',{exact:true}).fill('  nf-100  ');
  await expect.poll(()=>ids(page,'equipamentosFiltrados')).toEqual([1]);
  await page.getByLabel('Busca',{exact:true}).fill('inexistente');
  await expect.poll(()=>ids(page,'equipamentosFiltrados')).toEqual([]);
});
test('QA-JSX-02: busca considera responsáveis, contato e arquivamento',async({page})=>{
  await abrir(page,'filtros');await page.getByLabel('Busca',{exact:true}).fill('ANA');
  expect(await ids(page,'obrasFiltradas')).toEqual([1]);expect(await ids(page,'funcionariosFiltrados')).toEqual([1]);
  await page.getByLabel('Busca',{exact:true}).fill('arquivad');
  expect(await ids(page,'equipamentosFiltrados')).toEqual([3]);expect(await ids(page,'obrasFiltradas')).toEqual([2]);expect(await ids(page,'funcionariosFiltrados')).toEqual([2]);
});
test('QA-JSX-03: depósito exclui arquivados e filtro inclui calibração parcial',async({page})=>{
  await abrir(page,'filtros');expect(await ids(page,'equipamentosDoDeposito')).toEqual([1]);
  await page.getByRole('combobox',{name:'Status',exact:true}).selectOption('Em calibração');expect(await ids(page,'equipamentosFiltrados')).toEqual([2]);
  await page.getByLabel('Busca',{exact:true}).fill('QA-2');expect(await ids(page,'equipamentosDoDeposito')).toEqual([]);
});

test('QA-JSX-04: hook do estoque bloqueia operação duplicada e libera após sucesso',async({page})=>{
  const gate=promessa();let chamadas=0;
  await page.route('**/api/qa/operacao',async r=>{chamadas++;await gate.espera;await r.fulfill({json:{ok:true}});});
  await abrir(page,'operacao');await page.getByRole('button',{name:'Executar operação',exact:true}).click();
  await expect(page.getByLabel('Processando')).toHaveText('true');
  await page.getByRole('button',{name:'Executar operação',exact:true}).click();
  await expect(page.getByLabel('Resultado')).toContainText('Aguarde');expect(chamadas).toBe(1);
  gate.liberar();await expect(page.getByLabel('Processando')).toHaveText('false');await expect(page.getByLabel('Resultado')).toHaveText('{"sucesso":true}');
});
test('QA-JSX-05: hook do estoque trata erro e permite nova tentativa',async({page})=>{
  let falhar=true;await page.route('**/api/qa/operacao',r=>r.fulfill(falhar?{status:409,json:{mensagem:'Reserva indisponível.'}}:{json:{ok:true}}));
  await abrir(page,'operacao');await page.getByRole('button',{name:'Executar operação',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('Reserva indisponível');await expect(page.getByLabel('Processando')).toHaveText('false');
  falhar=false;await page.getByRole('button',{name:'Executar operação',exact:true}).click();
  await expect(page.getByLabel('Resultado')).toHaveText('{"sucesso":true}');await expect(page.getByRole('alert')).toHaveCount(0);
});
test('QA-JSX-06: hook do estoque fornece mensagem segura para falha sem descrição',async({page})=>{
  await abrir(page,'operacao');await page.getByRole('button',{name:'Falhar sem mensagem'}).click();
  await expect(page.getByRole('alert')).toHaveText('Não foi possível concluir a operação.');await expect(page.getByLabel('Processando')).toHaveText('false');
});

test('QA-JSX-07: ativos carregam e cadastro falho preserva estado até nova tentativa',async({page})=>{
  let falhar=true;
  await mockAtivos(page,async(r,p)=>{
    if(p!=='/api/equipamentos'||r.request().method()!=='POST')return false;
    await r.fulfill(falhar?{status:409,json:{mensagem:'Cadastro recusado.'}}:{status:201,json:{...equipamento,id:2,serie:'QA-NOVA'}});return true;
  });
  await abrir(page,'controle');await expect.poll(async()=>(await estado(page)).carregando).toBe(false);
  expect((await estado(page)).tecnicos).toEqual(['Ana']);expect((await estado(page)).resumo.total).toBe(1);
  await page.getByRole('button',{name:'Cadastrar equipamento'}).click();await expect.poll(async()=>(await estado(page)).erro).toBe('Cadastro recusado.');
  expect((await estado(page)).equipamentos).toHaveLength(1);
  falhar=false;await page.getByRole('button',{name:'Cadastrar equipamento'}).click();
  await expect.poll(async()=>(await estado(page)).equipamentos.length).toBe(2);expect((await estado(page)).erro).toBeNull();
});
test('QA-JSX-08: ativos ignoram resposta inicial antiga após mudar perfil',async({page})=>{
  const gate=promessa();let entrou=false;
  await mockAtivos(page,async(r,p)=>{
    if(p==='/api/equipamentos'){entrou=true;await gate.espera;await r.fulfill({json:[equipamento]});return true;}
    return false;
  });
  await abrir(page,'controle');await expect.poll(()=>entrou).toBe(true);
  await page.getByRole('combobox',{name:'Perfil',exact:true}).selectOption('FINANCEIRO');
  await expect.poll(async()=>(await estado(page)).carregando).toBe(false);expect((await estado(page)).equipamentos).toEqual([]);
  const resposta=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/equipamentos');
  gate.liberar();await (await resposta).finished();await aguardarRender(page);
  expect((await estado(page)).equipamentos).toEqual([]);
});
test('QA-JSX-09: ativos evitam refresh sobreposto e limpam polling ao desmontar',async({page})=>{
  await page.clock.install();let consultas=0,travar=false;const gate=promessa();
  await mockAtivos(page,async(r,p)=>{
    if(p!=='/api/equipamentos')return false;consultas++;if(travar)await gate.espera;await r.fulfill({json:[equipamento]});return true;
  });
  await abrir(page,'controle');await expect.poll(async()=>(await estado(page)).carregando).toBe(false);
  const antes=consultas;travar=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>consultas).toBe(antes+1);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.fastForward(10000);expect(consultas).toBe(antes+1);
  gate.liberar();await page.getByRole('button',{name:'Desmontar ativos'}).click();
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.clock.fastForward(20000);expect(consultas).toBe(antes+1);
});

const aviso={id:1,solicitacaoId:10,obraId:1,obraNome:'Obra QA',tipo:'AJUSTE_FINANCEIRO',status:'Aprovada',mensagem:'Plano atualizado.',criadaEm:'2026-10-27T10:00:00Z',lidaEm:null,materiais:[]};
const caixa=(itens=[aviso],outros={})=>({itens,naoLidas:itens.filter(n=>!n.lidaEm).length,temMais:false,...outros});
test('QA-JSX-10: sino trata falha e retry, vazio, Escape e foco de retorno',async({page})=>{
  let falhar=true;await page.route('**/api/notificacoes?*',r=>r.fulfill(falhar?{status:503,json:{mensagem:'Falha simulada'}}:{json:caixa([])}));
  await abrir(page,'sino');const botao=page.getByRole('button',{name:/^Notificações/});await botao.click();
  await expect(page.getByRole('alert')).toBeVisible();falhar=false;await page.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(page.getByText('Nenhum aviso por aqui.')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(botao).toBeFocused();
});
test('QA-JSX-11: sino pagina e registra leitura sem reverter com consulta antiga',async({page})=>{
  const gate=promessa();let travar=false,entrou=false;
  await page.route('**/api/notificacoes?*',async r=>{
    if(travar){entrou=true;await gate.espera;}
    const pagina=new URL(r.request().url()).searchParams.get('pagina');
    await r.fulfill({json:pagina==='1'?caixa([{...aviso,id:2,obraNome:'Outra obra'}]):caixa([aviso],{temMais:true})});
  });
  await page.route('**/api/notificacoes/1/leitura',r=>r.fulfill({json:{...aviso,lidaEm:'2026-10-27T11:00:00Z'}}));
  await abrir(page,'sino');await page.getByRole('button',{name:/^Notificações/}).click();
  await page.getByRole('button',{name:'Próximas'}).click();await expect(page.getByRole('heading',{name:'Outra obra'})).toBeVisible();
  await page.getByRole('button',{name:'Anteriores'}).click();await expect(page.getByRole('heading',{name:'Obra QA'})).toBeVisible();
  travar=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await expect.poll(()=>entrou).toBe(true);
  await page.getByRole('button',{name:'Entendi'}).click();await expect(page.getByText('Visto',{exact:true})).toBeVisible();
  const resposta=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/notificacoes');
  gate.liberar();await (await resposta).finished();await aguardarRender(page);
  await expect(page.getByRole('button',{name:'Notificações',exact:true})).toBeVisible();await expect(page.getByText('Visto',{exact:true})).toBeVisible();
});
test('QA-JSX-12: Ver pedido só navega após leitura confirmada e permite retry',async({page})=>{
  await page.route('**/api/notificacoes?*',r=>r.fulfill({json:caixa()}));let falhar=true;
  await page.route('**/api/notificacoes/1/leitura',r=>r.fulfill(falhar?{status:409,json:{mensagem:'Leitura recusada'}}:{json:{...aviso,lidaEm:'2026-10-27T11:00:00Z'}}));
  await abrir(page,'sino','&navegar=1');await page.getByRole('button',{name:/^Notificações/}).click();await page.getByRole('button',{name:'Ver pedido'}).click();
  await expect(page.getByRole('alert')).toContainText('Leitura recusada');await expect(page.getByLabel('Pedido aberto')).toBeEmpty();
  falhar=false;await page.getByRole('button',{name:'Ver pedido'}).click();await expect(page.getByLabel('Pedido aberto')).toHaveText('10');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('QA-JSX-13: sino fecha por clique externo e limita selo a 99+',async({page})=>{
  await page.route('**/api/notificacoes?*',r=>r.fulfill({json:caixa([],{naoLidas:105})}));await abrir(page,'sino');
  const botao=page.getByRole('button',{name:'Notificações: 105 não lidas'});await expect(botao).toContainText('99+');await botao.click();
  await page.getByRole('button',{name:'Fora do painel'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('QA-JSX-14: toast pausa com foco e expira após saída do foco',async({page})=>{
  await page.clock.install();await abrir(page,'toasts');await page.getByRole('button',{name:'Notificar sucesso',exact:true}).click();
  await page.getByRole('button',{name:'Fechar notificação',exact:true}).focus();await page.clock.fastForward(7000);await expect(page.getByRole('status')).toContainText('Aviso 1');
  await page.getByRole('button',{name:'Notificar sucesso',exact:true}).focus();await page.clock.fastForward(6100);await expect(page.getByRole('status')).toHaveCount(0);
});
test('QA-JSX-15: toast mostra três avisos e revela próximo após fechar',async({page})=>{
  await page.clock.install();await abrir(page,'toasts');for(let i=0;i<4;i++)await page.getByRole('button',{name:'Notificar sucesso',exact:true}).click();
  await expect(page.getByRole('status')).toHaveCount(3);await expect(page.getByText('Aviso 4',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Fechar notificação',exact:true}).first().click();await expect(page.getByText('Aviso 4',{exact:true})).toBeVisible();await expect(page.getByRole('status')).toHaveCount(3);
});
