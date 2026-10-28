import { test, expect } from './test.mjs';

const material=(extra={})=>({id:410,nome:'Alicate QA',catalogoChave:'Ferramentas manuais|Alicate QA|',quantidade:10,quantidadeSolicitada:10,quantidadeCompra:10,quantidadeAdquirida:0,quantidadeEntradaEstoque:0,...extra});
const pedido=(extra={})=>({id:41,status:'Aprovada',tipo:'Pedido de materiais',tecnico:'Ana QA',solicitante:'Ana QA',dataSolicitacao:'2026-10-27',obraDestinoId:1,materiais:[material()],planoFinanceiro:[{materialId:410,quantidadeCompra:10,origens:[]}],entradasCompra:[],eventosFinanceiros:[],...extra});
const entrada=(extra={})=>({equipamentoId:30,identificacao:'ERA-30',obraOrigemId:null,quantidade:6,catalogoChave:material().catalogoChave,nome:'Alicate QA',...extra});
const comprado=()=>pedido({materiais:[material({quantidadeAdquirida:6,quantidadeEntradaEstoque:6})],entradasCompra:[entrada()],eventosFinanceiros:[{tipo:'INICIO_ATENDIMENTO',autorNome:'Estoque QA',registradoEm:'2026-10-27T12:00:00Z'}]});
const dividido=()=>[
  pedido({materiais:[material({quantidade:6,quantidadeCompra:6,quantidadeAdquirida:6,quantidadeEntradaEstoque:6,identificacao:'ERA-30'})],materiaisOriginais:[material()],planoFinanceiro:[],entradasCompra:[]}),
  pedido({id:42,solicitacaoPaiId:41,materiais:[material({id:420,quantidade:4,quantidadeCompra:4})],materiaisOriginais:[material()],planoFinanceiro:[{materialId:420,quantidadeCompra:4,origens:[]}]}),
];
function pendencia(){let liberar;const espera=new Promise(r=>liberar=r);return {espera,liberar};}
async function preparar(page,{principal=pedido(),interceptar=()=>false}={}){
  const dados={pedidos:[principal,pedido({id:59,materiais:[material({id:590,nome:'Outro material QA'})]})]},mutacoes=[];
  await page.clock.setFixedTime(new Date('2026-10-27T16:00:00Z'));
  await page.route('http://127.0.0.1:4179/api/**',async r=>{
    const req=r.request(),rota=new URL(req.url()).pathname,metodo=req.method(),corpo=req.postData()?req.postDataJSON():null;
    if(metodo!=='GET')mutacoes.push({rota,metodo,corpo});
    if(await interceptar(r,rota,metodo,corpo))return;
    const respostas={'/api/auth/me':{id:9,nome:'Estoque QA',login:'qa.estoque',perfil:'ESTOQUE',deveAlterarSenha:false},'/api/auth/csrf':{token:'qa-csrf'},'/api/notificacoes':{itens:[],naoLidas:0,temMais:false},'/api/obras':[{id:1,nome:'Aurora QA',responsaveis:['Ana QA']}],'/api/equipamentos':[],'/api/atividades':dados.pedidos};
    if(metodo==='GET'&&rota in respostas)return r.fulfill({json:respostas[rota]});
    return r.fulfill({status:503,json:{mensagem:`Rota sem resposta QA: ${metodo} ${rota}`}});
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();await expect(page.getByText('Carregando estoque…',{exact:true})).toHaveCount(0);
  return {dados,mutacoes,responder:async(r,atualizados,array=false)=>{
    const itens=Array.isArray(atualizados)?atualizados:[atualizados];dados.pedidos=[...dados.pedidos.filter(p=>!itens.some(n=>n.id===p.id)),...itens];await r.fulfill({json:array?itens:itens[0]});
  }};
}
const botao=(d,nome)=>d.getByRole('button',{name:nome,exact:true});
const dialogo=(page,nome)=>page.getByRole('dialog',{name:nome,exact:true});
const recusar=r=>r.fulfill({status:409,json:{mensagem:'Recusa de estoque QA'}});
async function abrirCompra(page){await page.getByRole('navigation',{name:'Áreas do estoque'}).getByRole('button',{name:/^Compras/}).click();await page.getByRole('region',{name:'Compras pendentes',exact:true}).getByRole('article').filter({hasText:'Pedido #0041'}).getByRole('button',{name:'Registrar compra',exact:true}).click();return dialogo(page,'Registrar compra recebida');}
async function abrirPedido(page,id=41){await botao(page,`Atender pedido ${id}`).click();return dialogo(page,`Pedido #${String(id).padStart(4,'0')}`);}
async function abrirParcial(page){const p=await abrirPedido(page);await botao(p,'Ajustar envio').click();return dialogo(page,'Editar solicitação · envio parcial');}
const motivo=d=>d.getByRole('textbox',{name:/^Motivo do ajuste/});
const quantidadeEnvio=d=>d.getByRole('spinbutton',{name:'Enviar Alicate QA de ERA-30',exact:true});
const rotaCompra='/api/atividades/41/materiais/410/aquisicao';
const rotaParcial='/api/atividades/41/atendimento-parcial';

for(const serial of [false,true])test(`QA-COMPRA-01: ${serial?'equipamento exige série':'ferramenta manual dispensa série'} e entrada valida nota e quantidade`,async({page})=>{
  const principal=serial?pedido({materiais:[material({nome:'OTDR QA',catalogoChave:'OTDR|OTDR QA|'})]}):pedido();
  const ctx=await preparar(page,{principal,interceptar:async(r,p,m)=>{if(p!==rotaCompra||m!=='POST')return false;await ctx.responder(r,serial?{...principal,materiais:[{...principal.materiais[0],quantidadeAdquirida:6,quantidadeEntradaEstoque:6}],entradasCompra:[entrada({identificacao:'SERIE-QA',nome:'OTDR QA',catalogoChave:principal.materiais[0].catalogoChave})]}:comprado());return true;}});
  const d=await abrirCompra(page),salvar=botao(d,'Registrar entrada'),q=d.getByRole('spinbutton',{name:'Quantidade recebida'});await expect(salvar).toBeDisabled();await q.fill('99');await expect(q).toHaveValue('10');await q.fill('2.5');await expect(q).toHaveValue('2');await q.fill('0');await expect(q).toHaveValue('1');await q.fill('');await d.getByRole('textbox',{name:'Nota fiscal',exact:true}).fill(' NF-QA ');
  if(serial){await expect(salvar).toBeDisabled();await d.getByRole('textbox',{name:'Número de série',exact:true}).fill(' SERIE-QA ');}else await expect(d.getByRole('textbox',{name:'Número de série',exact:true})).toHaveCount(0);
  await salvar.click();expect(ctx.mutacoes).toHaveLength(0);await q.fill('6');await salvar.click();await expect(d).toHaveCount(0);expect(ctx.mutacoes).toEqual([{rota:rotaCompra,metodo:'POST',corpo:{quantidade:6,numeroNota:'NF-QA',identificacao:serial?'SERIE-QA':''}}]);
});
test('QA-COMPRA-02: envio único bloqueia fechamento e recusa mantém preenchimento para retry',async({page},info)=>{
  const gate=pendencia();let falhar=true;const ctx=await preparar(page,{interceptar:async(r,p,m)=>{if(p!==rotaCompra||m!=='POST')return false;if(falhar){await gate.espera;await recusar(r);}else await ctx.responder(r,comprado());return true;}});
  const d=await abrirCompra(page);await d.getByRole('spinbutton',{name:'Quantidade recebida'}).fill('6');await d.getByRole('textbox',{name:'Nota fiscal',exact:true}).fill('NF-QA');
  try {await botao(d,'Registrar entrada').dblclick();await expect(botao(d,'Registrando…')).toBeDisabled();await expect(botao(d,'Cancelar')).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toBeVisible();expect(ctx.mutacoes).toHaveLength(1);}
  finally {await info.attach('envio-unico',{body:JSON.stringify({fluxo:'compra',requisicoes:ctx.mutacoes.length}),contentType:'application/json'});gate.liberar();}
  await expect(d.getByRole('alert')).toContainText('Recusa de estoque QA');await expect(d.getByRole('spinbutton',{name:'Quantidade recebida'})).toHaveValue('6');await expect(d.getByRole('textbox',{name:'Nota fiscal',exact:true})).toHaveValue('NF-QA');falhar=false;await botao(d,'Registrar entrada').click();await expect(d).toHaveCount(0);expect(ctx.mutacoes).toHaveLength(2);
});
test('QA-COMPRA-03: receber seis de dez conserva quatro pendentes após recarregar',async({page})=>{
  const ctx=await preparar(page,{interceptar:async(r,p,m)=>{if(p!==rotaCompra||m!=='POST')return false;await ctx.responder(r,comprado());return true;}});const d=await abrirCompra(page);await d.getByRole('spinbutton',{name:'Quantidade recebida'}).fill('6');await d.getByRole('textbox',{name:'Nota fiscal',exact:true}).fill('NF-SEIS');await botao(d,'Registrar entrada').click();await expect(d).toHaveCount(0);
  const compras=page.getByRole('region',{name:'Compras pendentes',exact:true});await expect(compras.getByRole('article').filter({hasText:'Pedido #0041'})).toContainText('6 recebidas de 10 un.');await page.reload();await expect(botao(page,'Atender pedido 41')).toBeVisible();const p=await abrirPedido(page);await expect(p.getByRole('region',{name:'Materiais e instruções'})).toContainText('4 un. pendentes da compra');await expect(p.getByRole('region',{name:'Materiais e instruções'})).toContainText('Compra recebida · 6 un.');await botao(p,'Registrar compra').click();const novamente=dialogo(page,'Registrar compra recebida');await expect(novamente.getByRole('spinbutton',{name:'Quantidade recebida'})).toHaveValue('4');expect(ctx.mutacoes).toHaveLength(1);
});
test('QA-PARCIAL-01: compras sem entrada não oferecem saldo para envio',async({page})=>{
  const {mutacoes}=await preparar(page);const d=await abrirParcial(page);await expect(d.getByText('Aguardando compra. Nenhuma unidade disponível para este envio.',{exact:true})).toBeVisible();await expect(d.getByRole('spinbutton')).toHaveCount(0);await motivo(d).fill('Enviar o disponível');await expect(botao(d,'Separar itens selecionados')).toBeDisabled();expect(mutacoes).toHaveLength(0);
});
test('QA-PARCIAL-02: motivo e quantidade positiva são obrigatórios; limite é a entrada recebida',async({page})=>{
  const {mutacoes}=await preparar(page,{principal:comprado()});const d=await abrirParcial(page),q=quantidadeEnvio(d),salvar=botao(d,'Separar itens selecionados');await expect(q).toHaveValue('6');await expect(salvar).toBeDisabled();await motivo(d).fill('  ');await expect(salvar).toBeDisabled();await motivo(d).fill('Fornecedor parcial QA');await q.fill('99');await expect(q).toHaveValue('6');await q.fill('2.9');await expect(q).toHaveValue('2');await q.fill('-1');await expect(q).toHaveValue('0');await expect(salvar).toBeDisabled();await q.fill('');await expect(q).toHaveValue('0');expect(mutacoes).toHaveLength(0);
});
test('QA-PARCIAL-03: recusa preserva ajuste; sucesso divide seis e quatro sem apagar outro pedido',async({page},info)=>{
  const gate=pendencia();let falhar=true;const ctx=await preparar(page,{principal:comprado(),interceptar:async(r,p,m)=>{if(p!==rotaParcial||m!=='POST')return false;if(falhar){await gate.espera;await recusar(r);}else await ctx.responder(r,dividido(),true);return true;}});const d=await abrirParcial(page);await motivo(d).fill(' Faltam quatro no fornecedor QA ');
  try {await botao(d,'Separar itens selecionados').dblclick();await expect(botao(d,'Separando...')).toBeDisabled();await expect(botao(d,'Cancelar')).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toBeVisible();expect(ctx.mutacoes).toHaveLength(1);}
  finally {await info.attach('envio-unico',{body:JSON.stringify({fluxo:'parcial',requisicoes:ctx.mutacoes.length}),contentType:'application/json'});gate.liberar();}
  await expect(d.getByRole('alert')).toContainText('Recusa de estoque QA');await expect(quantidadeEnvio(d)).toHaveValue('6');await expect(motivo(d)).toHaveValue(' Faltam quatro no fornecedor QA ');falhar=false;await botao(d,'Separar itens selecionados').click();await expect(d).toHaveCount(0);const p=dialogo(page,'Pedido #0041');await expect(botao(p,'Confirmar envio')).toBeVisible();await expect(botao(p,'Ajustar envio')).toHaveCount(0);expect(ctx.mutacoes.at(-1)).toMatchObject({rota:rotaParcial,metodo:'POST',corpo:{motivo:'Faltam quatro no fornecedor QA',materiais:[{materialId:410,origens:[{equipamentoId:30,quantidade:6}]}]}});
  await botao(p,'Fechar pedido').click();for(const id of [41,42,59])await expect(botao(page,`Atender pedido ${id}`)).toBeVisible();const resto=await abrirPedido(page,42);await expect(resto.getByRole('region',{name:'Materiais e instruções'})).toContainText('4 un.');await expect(resto.getByRole('region',{name:'Materiais e instruções'})).toContainText('4 un. pendentes da compra');
});
test('QA-PARCIAL-04: cancelar ajuste não envia e reabertura restaura a seleção inicial',async({page})=>{
  const {mutacoes}=await preparar(page,{principal:comprado()});const d=await abrirParcial(page);await quantidadeEnvio(d).fill('2');await motivo(d).fill('Rascunho QA');await botao(d,'Cancelar').click();await expect(d).toHaveCount(0);await botao(dialogo(page,'Pedido #0041'),'Ajustar envio').click();await expect(quantidadeEnvio(d)).toHaveValue('6');await expect(motivo(d)).toHaveValue('');expect(mutacoes).toHaveLength(0);
});
test('QA-PARCIAL-05: origens autorizadas e recebidas são separadas; material sem entrada fica pendente',async({page})=>{
  const origem={equipamentoId:10,identificacao:'ORIGEM-QA',obraOrigemId:1,quantidade:2,catalogoChave:material().catalogoChave};
  const principal=comprado();principal.materiais[0].quantidadeCompra=8;principal.materiais.push(material({id:411,nome:'Escada QA',catalogoChave:'Escada|Escada QA|',quantidade:4,quantidadeCompra:4,quantidadeAdquirida:0,quantidadeEntradaEstoque:0}));principal.planoFinanceiro=[{materialId:410,quantidadeCompra:8,origens:[origem]},{materialId:411,quantidadeCompra:4,origens:[]}];
  const ctx=await preparar(page,{principal,interceptar:async(r,p,m)=>{if(p!==rotaParcial||m!=='POST')return false;await recusar(r);return true;}});const d=await abrirParcial(page);await d.getByRole('spinbutton',{name:'Enviar Alicate QA de ORIGEM-QA',exact:true}).fill('1');await quantidadeEnvio(d).fill('2');await motivo(d).fill('Enviar parte das duas origens QA');await botao(d,'Separar itens selecionados').click();await expect(d.getByRole('alert')).toContainText('Recusa de estoque QA');expect(ctx.mutacoes.at(-1).corpo.materiais).toEqual([{materialId:410,origens:[{equipamentoId:10,quantidade:1},{equipamentoId:30,quantidade:2}]},{materialId:411,origens:[]}]);
});
test('QA-EST-FLUXO-01: envio recusado mantém pedido separado; retry move para enviados uma vez',async({page})=>{
  let falhar=true;const pronto=dividido()[0];const ctx=await preparar(page,{principal:pronto,interceptar:async(r,p,m)=>{if(p!=='/api/atividades/41/transito'||m!=='POST')return false;if(falhar)await recusar(r);else await ctx.responder(r,{...pronto,status:'Em trânsito'});return true;}});const d=await abrirPedido(page);await botao(d,'Confirmar envio').click();await expect(d.getByRole('alert')).toContainText('Recusa de estoque QA');await expect(botao(d,'Confirmar envio')).toBeVisible();falhar=false;await botao(d,'Confirmar envio').click();await expect(botao(d,'Confirmar envio')).toHaveCount(0);await botao(d,'Fechar pedido').click();await expect(botao(page,'Atender pedido 41')).toHaveCount(0);await page.getByRole('button',{name:/^Enviados/}).click();await expect(botao(page,'Atender pedido 41')).toBeVisible();expect(ctx.mutacoes.map(m=>m.rota)).toEqual(['/api/atividades/41/transito','/api/atividades/41/transito']);
});
test('QA-EST-FLUXO-02: falha após trânsito preserva avanço e retry de recebimento não repete saída',async({page})=>{
  let falhar=true;const retorno={...dividido()[0],status:'Aguardando coleta',obraOrigemId:1,obraDestinoId:null};const ctx=await preparar(page,{principal:retorno,interceptar:async(r,p,m)=>{
    if(m!=='POST')return false;
    if(p==='/api/atividades/41/transito'){await ctx.responder(r,{...retorno,status:'Em trânsito'});return true;}
    if(p==='/api/atividades/41/conclusao'){if(falhar)await recusar(r);else await ctx.responder(r,{...retorno,status:'Concluída'});return true;}return false;
  }});const d=await abrirPedido(page);await botao(d,'Confirmar recebimento').click();await expect(d.getByRole('alert')).toContainText('Recusa de estoque QA');falhar=false;await botao(d,'Confirmar recebimento').click();await expect(botao(d,'Confirmar recebimento')).toHaveCount(0);expect(ctx.mutacoes.map(m=>m.rota)).toEqual(['/api/atividades/41/transito','/api/atividades/41/conclusao','/api/atividades/41/conclusao']);await botao(d,'Fechar pedido').click();await page.getByRole('navigation',{name:'Áreas do estoque'}).getByRole('button',{name:'Histórico',exact:true}).click();await expect(botao(page,'Atender pedido 41')).toBeVisible();
});
