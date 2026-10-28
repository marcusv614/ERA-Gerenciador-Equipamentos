import { test, expect } from './test.mjs';

const hoje='2026-10-27';
const equipamento=extra=>({id:1,tipo:'Fluke',modelo:'Fluke QA',serie:'FLUKE-QA-1',status:'Em estoque',obraId:null,tecnico:null,quantidade:1,quantidadeDisponivel:1,quantidadeReservada:0,quantidadeManutencao:0,quantidadeCalibracao:0,historico:[],manutencoes:[],calibracoes:[],...extra});
const atendimento=status=>({id:11,status,modelo:'Fluke QA',serie:'FLUKE-QA-1',localOrigem:'Aurora QA',tecnicoOrigem:'Ana QA',laboratorio:'Laboratório QA',criadoEm:'2026-10-20T12:00:00Z',dataEnvio:'2026-10-22',previsaoRetorno:'2026-10-27',eventos:[{acao:'SOLICITADA',registradoEm:'2026-10-20T12:00:00Z',autorNome:'Gerente QA',autorLogin:'qa.gerente'}]});
const emCalibracao=(status,extra={})=>equipamento({quantidadeDisponivel:0,quantidadeCalibracao:1,calibracoes:[atendimento(status)],...extra});
const manutencao={id:7,status:'ABERTA',quantidade:2,motivo:'Ajuste QA',local:'Depósito central',abertaEm:'2026-10-20T12:00:00Z',abertaPorNome:'Estoque QA',abertaPorLogin:'qa.estoque'};
const pedido=(id,status,extra={})=>({id,status,tipo:'Pedido de materiais',tecnico:'Ana QA',solicitante:'Ana QA',dataSolicitacao:'2026-10-20',obraDestinoId:1,materiais:[{id:10,nome:'Capacete QA',catalogoChave:'EPI|Capacete QA',quantidade:3,quantidadeSolicitada:3,quantidadeCompra:3,quantidadeAdquirida:0,quantidadeEntradaEstoque:0}],planoFinanceiro:[{materialId:10,quantidadeCompra:3,origens:[]}],eventosFinanceiros:[],decisoes:[],analises:[],...extra});
function pendencia(){let liberar;const espera=new Promise(r=>liberar=r);return {espera,liberar};}
async function preparar(page,{perfil='ESTOQUE',item=equipamento(),pedidos=[],interceptar=()=>false}={}) {
  const dados={item,pedidos},mutacoes=[];
  await page.clock.setFixedTime(new Date(`${hoje}T16:00:00Z`));
  await page.route('http://127.0.0.1:4179/api/**',async r=>{
    const req=r.request(),rota=new URL(req.url()).pathname,metodo=req.method();
    if(metodo!=='GET')mutacoes.push({rota,metodo,corpo:req.postData()?req.postDataJSON():null});
    if(await interceptar(r,rota,metodo))return;
    const respostas={
      '/api/auth/me':{id:9,nome:`QA ${perfil}`,login:'qa.operacao',perfil,deveAlterarSenha:false},
      '/api/auth/csrf':{token:'qa-csrf'},'/api/notificacoes':{itens:[],naoLidas:0,temMais:false},
      '/api/obras':[{id:1,nome:'Aurora QA',cidade:'Manaus',status:'Em andamento',responsaveis:['Ana QA']}],
      '/api/equipamentos':[dados.item],'/api/equipamentos/disponibilidade-financeira':[dados.item],
      '/api/funcionarios':[{id:1,nome:'Ana QA',cargo:'Técnica',status:'Ativo'}],'/api/categorias-equipamento':[],
      '/api/atividades':dados.pedidos,'/api/atividades/pedidos-financeiros':dados.pedidos,'/api/atividades/pedidos-rh':dados.pedidos,
    };
    if(metodo==='GET'&&rota in respostas)return r.fulfill({json:respostas[rota]});
    return r.fulfill({status:503,json:{mensagem:`Rota sem resposta QA: ${metodo} ${rota}`}});
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();
  await expect(page.getByText('Carregando estoque…',{exact:true})).toHaveCount(0);
  await expect(page.getByText('Sincronizando dados com a API...')).toHaveCount(0);
  return {dados,mutacoes,responder:async(r,item)=>{dados.item=item;await r.fulfill({json:item});}};
}
async function abrir(page,tipo='calibracao',perfil='ESTOQUE') {
  if(perfil==='ESTOQUE'){
    await page.getByRole('navigation',{name:'Áreas do estoque'}).getByRole('button',{name:/^Manutenção/}).click();
    await page.getByRole('region',{name:'Manutenção dos equipamentos',exact:true}).getByRole('button',{name:tipo==='calibracao'?'Calibração':'Gerenciar manutenção',exact:true}).click();
  }else await page.getByRole('button',{name:tipo==='calibracao'?'Calibração de Fluke QA':'Manutenção de Fluke QA',exact:true}).click();
  return page.getByRole('dialog',{name:tipo==='calibracao'?'Calibração do Fluke':'Manutenção do equipamento',exact:true});
}
const recusar=r=>r.fulfill({status:409,json:{mensagem:'Recusa operacional QA'}});
const botao=(d,nome)=>d.getByRole('button',{name:nome,exact:true});

test('QA-MAN-01: abertura valida motivo e saldo sem alterar a localização',async({page})=>{
  const ctx=await preparar(page,{item:equipamento({quantidade:5,quantidadeDisponivel:3,quantidadeReservada:2}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/manutencoes')return false;
    await ctx.responder(r,equipamento({quantidade:5,quantidadeDisponivel:1,quantidadeReservada:2,quantidadeManutencao:2,manutencoes:[manutencao]}));return true;
  }});
  const d=await abrir(page,'manutencao'),salvar=botao(d,'Enviar para manutenção'),q=d.getByRole('spinbutton',{name:'Quantidade',exact:true});
  await expect(salvar).toBeDisabled();await d.getByRole('textbox',{name:'Motivo da manutenção'}).fill('   ');await expect(salvar).toBeDisabled();
  await q.fill('99');await expect(q).toHaveValue('1');await q.fill('1.5');await expect(q).toHaveValue('1');await q.fill('2');await d.getByRole('textbox',{name:'Motivo da manutenção'}).fill(' Ajuste QA ');await salvar.click();
  await expect(d.getByText('Manutenção #0007 · 2 unidade(s)',{exact:true})).toBeVisible();await expect(d.getByRole('textbox',{name:'Motivo da manutenção'})).toHaveValue('');await expect(d.getByText(/^Disponível\s*1$/)).toBeVisible();
  expect(ctx.mutacoes).toEqual([{rota:'/api/equipamentos/1/manutencoes',metodo:'POST',corpo:{quantidade:2,motivo:'Ajuste QA'}}]);
  await botao(d,'Fechar').click();await abrir(page,'manutencao');await expect(page.getByRole('dialog').getByText('Manutenção #0007 · 2 unidade(s)',{exact:true})).toBeVisible();
});
test('QA-MAN-02: envio pendente impede duplicidade e fechamento; recusa preserva dados',async({page},info)=>{
  const gate=pendencia();let falhar=true;const ctx=await preparar(page,{interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/manutencoes')return false;
    if(falhar){await gate.espera;await recusar(r);}else await ctx.responder(r,equipamento({quantidadeDisponivel:0,quantidadeManutencao:1,manutencoes:[{...manutencao,quantidade:1}]}));return true;
  }});
  const d=await abrir(page,'manutencao');await d.getByRole('textbox',{name:'Motivo da manutenção'}).fill('Falha QA');
  try {await botao(d,'Enviar para manutenção').dblclick();await expect(botao(d,'Enviar para manutenção')).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toBeVisible();expect(ctx.mutacoes).toHaveLength(1);}
  finally {await info.attach('envio-unico',{body:JSON.stringify({fluxo:'manutencao',requisicoes:ctx.mutacoes.length}),contentType:'application/json'});gate.liberar();}
  await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');await expect(d.getByRole('textbox',{name:'Motivo da manutenção'})).toHaveValue('Falha QA');
  falhar=false;await botao(d,'Enviar para manutenção').click();await expect(d.getByText('Nenhuma unidade disponível.',{exact:false})).toBeVisible();expect(ctx.mutacoes).toHaveLength(2);
});
test('QA-MAN-03: conclusão exige serviço, permite cancelar e recupera recusa',async({page})=>{
  let falhar=true;const ctx=await preparar(page,{item:equipamento({quantidade:3,quantidadeDisponivel:1,quantidadeManutencao:2,manutencoes:[manutencao]}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/manutencoes/7/conclusao')return false;
    if(falhar)await recusar(r);else await ctx.responder(r,equipamento({quantidade:3,quantidadeDisponivel:3,manutencoes:[{...manutencao,status:'CONCLUIDA',observacaoConclusao:'Reparado QA',concluidaEm:'2026-10-27T12:00:00Z',concluidaPorNome:'Estoque QA',concluidaPorLogin:'qa.estoque'}]}));return true;
  }});
  const d=await abrir(page,'manutencao');await botao(d,'Concluir manutenção').click();await expect(botao(d,'Confirmar conclusão')).toBeDisabled();await botao(d,'Cancelar').click();expect(ctx.mutacoes).toHaveLength(0);
  await botao(d,'Concluir manutenção').click();await d.getByRole('textbox',{name:'Serviço realizado / resultado'}).fill(' Reparado QA ');await botao(d,'Confirmar conclusão').click();await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');await expect(d.getByRole('textbox',{name:'Serviço realizado / resultado'})).toHaveValue(' Reparado QA ');
  falhar=false;await botao(d,'Confirmar conclusão').click();await expect(d.getByRole('region',{name:'Histórico de manutenção',exact:true})).toContainText('Serviço realizado: Reparado QA');await expect(d.getByText(/^Disponível\s*3$/)).toBeVisible();await expect(botao(d,'Concluir manutenção')).toHaveCount(0);expect(ctx.mutacoes.at(-1).corpo).toEqual({observacao:'Reparado QA'});
});
test('QA-MAN-04: saldo zero bloqueia nova manutenção sem bloquear consulta',async({page})=>{
  const {mutacoes}=await preparar(page,{item:equipamento({quantidadeDisponivel:0,quantidadeReservada:1})});const d=await abrir(page,'manutencao');await expect(botao(d,'Enviar para manutenção')).toBeDisabled();await expect(d.getByRole('spinbutton')).toBeDisabled();await expect(d.getByText('Nenhuma manutenção registrada.',{exact:true})).toBeVisible();expect(mutacoes).toHaveLength(0);
});
for(const obraId of [null,1])test(`QA-CAL-01: solicitação a partir de ${obraId?'obra':'depósito'} atualiza fila e reserva`,async({page},info)=>{
  const gate=pendencia();let falhar=true;const status=obraId?'AGUARDANDO_RETIRADA':'AGUARDANDO_ENVIO';
  const ctx=await preparar(page,{item:equipamento({obraId,status:obraId?'Em campo':'Em estoque',tecnico:obraId?'Ana QA':null}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes')return false;
    if(falhar){await gate.espera;await recusar(r);}else await ctx.responder(r,emCalibracao(status,{obraId,status:obraId?'Em campo':'Em estoque'}));return true;
  }});
  const d=await abrir(page);await d.getByRole('textbox',{name:'Laboratório previsto (opcional)'}).fill(' Laboratório QA ');await d.getByRole('textbox',{name:'Orientações para retirada / calibração'}).fill(' Orientação QA ');
  try {await botao(d,'Solicitar calibração').dblclick();await expect(botao(d,'Solicitar calibração')).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toBeVisible();expect(ctx.mutacoes).toHaveLength(1);}
  finally {await info.attach('envio-unico',{body:JSON.stringify({fluxo:`calibracao-${obraId?'obra':'deposito'}`,requisicoes:ctx.mutacoes.length}),contentType:'application/json'});gate.liberar();}
  await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');await expect(d.getByRole('textbox',{name:'Orientações para retirada / calibração'})).toHaveValue(' Orientação QA ');
  falhar=false;await botao(d,'Solicitar calibração').click();await expect(botao(d,'Solicitar calibração')).toHaveCount(0);await expect(d.getByRole('heading',{name:obraId?'Aguardando retirada da obra':'Aguardando envio ao laboratório',exact:true})).toBeVisible();
  expect(ctx.mutacoes.at(-1).corpo).toEqual({laboratorio:'Laboratório QA',observacao:'Orientação QA'});await botao(d,'Fechar').click();await expect(page.getByRole('region',{name:'Calibrações a atender',exact:true})).toContainText('Fluke QA');
});
test('QA-CAL-02: retirada valida data e conserva etapa na recusa',async({page})=>{
  let falhar=true;const ctx=await preparar(page,{item:emCalibracao('AGUARDANDO_RETIRADA',{obraId:1,tecnico:'Ana QA',status:'Em campo'}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes/11/retirada')return false;
    if(falhar)await recusar(r);else await ctx.responder(r,emCalibracao('AGUARDANDO_ENVIO'));return true;
  }});const d=await abrir(page),campo=d.getByLabel('Data da retirada e chegada ao depósito',{exact:true}),salvar=botao(d,'Confirmar retirada e chegada ao depósito');
  await campo.fill('2026-10-28');await expect(salvar).toBeDisabled();await campo.fill('');await expect(salvar).toBeDisabled();await campo.fill(hoje);await salvar.click();await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');await expect(campo).toHaveValue(hoje);
  falhar=false;await salvar.click();await expect(botao(d,'Confirmar envio ao laboratório')).toBeVisible();expect(ctx.mutacoes.at(-1).corpo).toEqual({dataRetirada:hoje});await expect(d.getByText('Depósito central',{exact:true})).toBeVisible();
});
test('QA-CAL-03: envio exige laboratório e previsão coerente, com retry',async({page})=>{
  let falhar=true;const ctx=await preparar(page,{item:emCalibracao('AGUARDANDO_ENVIO'),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes/11/envio')return false;
    if(falhar)await recusar(r);else await ctx.responder(r,emCalibracao('EM_CALIBRACAO'));return true;
  }});const d=await abrir(page),salvar=botao(d,'Confirmar envio ao laboratório');await d.getByRole('textbox',{name:'Laboratório / empresa responsável'}).fill('');await expect(salvar).toBeDisabled();await d.getByRole('textbox',{name:'Laboratório / empresa responsável'}).fill(' Laboratório QA ');
  await d.getByLabel('Previsão de retorno (opcional)',{exact:true}).fill('2026-10-26');await expect(salvar).toBeDisabled();await d.getByLabel('Previsão de retorno (opcional)',{exact:true}).fill('2026-10-30');await salvar.click();await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');
  falhar=false;await salvar.click();await expect(botao(d,'Confirmar retorno e certificado')).toBeVisible();await expect(botao(d,'Cancelar atendimento')).toHaveCount(0);expect(ctx.mutacoes.at(-1).corpo).toEqual({laboratorio:'Laboratório QA',dataEnvio:hoje,previsaoRetorno:'2026-10-30'});
});
test('QA-CAL-04: retorno verifica intervalo do certificado e libera saldo após sucesso',async({page})=>{
  let falhar=true;const ctx=await preparar(page,{item:emCalibracao('EM_CALIBRACAO'),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes/11/retorno')return false;
    if(falhar)await recusar(r);else await ctx.responder(r,equipamento({calibracoes:[{...atendimento('CONCLUIDA'),certificado:'CERT-QA',dataCalibracao:'2026-10-25',validade:'2027-10-25'}]}));return true;
  }});const d=await abrir(page),salvar=botao(d,'Confirmar retorno e certificado');await expect(salvar).toBeDisabled();await d.getByRole('textbox',{name:'Número do certificado'}).fill(' CERT-QA ');
  await d.getByLabel('Data da calibração',{exact:true}).fill('2026-10-21');await d.getByLabel('Validade conforme o certificado',{exact:true}).fill('2027-10-25');await expect(salvar).toBeDisabled();
  await d.getByLabel('Data da calibração',{exact:true}).fill('2026-10-25');await d.getByLabel('Data do retorno ao depósito',{exact:true}).fill('2026-10-24');await expect(salvar).toBeDisabled();await d.getByLabel('Data do retorno ao depósito',{exact:true}).fill(hoje);await d.getByLabel('Validade conforme o certificado',{exact:true}).fill('2026-10-24');await expect(salvar).toBeDisabled();await d.getByLabel('Validade conforme o certificado',{exact:true}).fill('2027-10-25');await salvar.click();await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');await expect(d.getByRole('textbox',{name:'Número do certificado'})).toHaveValue(' CERT-QA ');
  falhar=false;await salvar.click();await expect(botao(d,'Novo atendimento')).toBeVisible();await expect(d.getByText('CERT-QA',{exact:true})).toBeVisible();expect(ctx.mutacoes.at(-1).corpo).toMatchObject({dataRetorno:hoje,dataCalibracao:'2026-10-25',validade:'2027-10-25',certificado:'CERT-QA'});
  await botao(d,'Fechar').click();await expect(page.getByRole('region',{name:'Calibrações a atender',exact:true})).toHaveCount(0);await expect(page.getByRole('region',{name:'Manutenção dos equipamentos',exact:true})).toContainText('1 disponível(is)');
});
test('QA-CAL-05: certificado anterior preserva obra e não gera retirada',async({page})=>{
  const ctx=await preparar(page,{perfil:'GERENTE',item:equipamento({obraId:1,tecnico:'Ana QA',status:'Em campo'}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes/certificados')return false;
    await ctx.responder(r,equipamento({obraId:1,tecnico:'Ana QA',status:'Em campo',calibracoes:[{...atendimento('CONCLUIDA'),historico:true,certificado:'ANT-QA',dataCalibracao:'2026-10-20',validade:'2027-10-20'}]}));return true;
  }});const d=await abrir(page,'calibracao','GERENTE');await botao(d,'Certificado anterior').click();const salvar=botao(d,'Registrar certificado');await expect(salvar).toBeDisabled();await d.getByRole('textbox',{name:'Laboratório / empresa',exact:true}).fill(' Laboratório QA ');await d.getByRole('textbox',{name:'Número do certificado'}).fill(' ANT-QA ');await d.getByLabel('Data da calibração',{exact:true}).fill('2026-10-28');await d.getByLabel('Validade conforme o certificado',{exact:true}).fill('2027-10-20');await expect(salvar).toBeDisabled();await d.getByLabel('Data da calibração',{exact:true}).fill('2026-10-20');await salvar.click();await expect(d.getByText('ANT-QA',{exact:true})).toBeVisible();await expect(d.getByText('Aurora QA',{exact:true})).toBeVisible();expect(ctx.mutacoes).toHaveLength(1);expect(ctx.mutacoes[0].corpo).toMatchObject({certificado:'ANT-QA',dataCalibracao:'2026-10-20',validade:'2027-10-20'});
});
test('QA-CAL-06: cancelamento exige motivo e preserva localização na recusa e no sucesso',async({page})=>{
  let falhar=true;const ctx=await preparar(page,{item:emCalibracao('AGUARDANDO_RETIRADA',{obraId:1,status:'Em campo'}),interceptar:async(r,p,m)=>{
    if(m!=='POST'||p!=='/api/equipamentos/1/calibracoes/11/cancelamento')return false;
    if(falhar)await recusar(r);else await ctx.responder(r,equipamento({obraId:1,status:'Em campo',calibracoes:[atendimento('CANCELADA')]}));return true;
  }});const d=await abrir(page);await botao(d,'Cancelar atendimento').click();await expect(botao(d,'Confirmar cancelamento')).toBeDisabled();await botao(d,'Voltar').click();expect(ctx.mutacoes).toHaveLength(0);await botao(d,'Cancelar atendimento').click();await d.getByRole('textbox',{name:'Motivo do cancelamento'}).fill(' Cancelado QA ');await botao(d,'Confirmar cancelamento').click();await expect(d.getByRole('alert')).toContainText('Recusa operacional QA');falhar=false;await botao(d,'Confirmar cancelamento').click();await expect(botao(d,'Solicitar calibração')).toBeVisible();await expect(d.getByText('Aurora QA',{exact:true})).toBeVisible();expect(ctx.mutacoes.at(-1).corpo).toEqual({motivo:'Cancelado QA'});
});
for(const [nome,extra] of [['lote',{quantidade:2,quantidadeDisponivel:2}],['reserva',{quantidadeDisponivel:0,quantidadeReservada:1}]])test(`QA-CAL-07: ${nome} impede solicitação sem request`,async({page})=>{
  const {mutacoes}=await preparar(page,{item:equipamento(extra)});const d=await abrir(page);await expect(botao(d,'Solicitar calibração')).toBeDisabled();await expect(d.getByRole('status')).toBeVisible();expect(mutacoes).toHaveLength(0);
});
test('QA-CAL-08: Gerência consulta atendimento sem confirmar etapas físicas',async({page})=>{
  const {mutacoes}=await preparar(page,{perfil:'GERENTE',item:emCalibracao('EM_CALIBRACAO')});const d=await abrir(page,'calibracao','GERENTE');await expect(d.getByText('As confirmações físicas de retirada, envio e retorno são registradas pelo estoque ou administrador.',{exact:true})).toBeVisible();await expect(botao(d,'Confirmar retorno e certificado')).toHaveCount(0);await expect(botao(d,'Cancelar atendimento')).toHaveCount(0);await expect(d.getByRole('region',{name:'Histórico de calibrações'})).toContainText('Laboratório QA');expect(mutacoes).toHaveLength(0);
});

test('QA-EST-DADOS-01: filas, busca e obra filtram pedidos e histórico com dados',async({page})=>{
  await preparar(page,{pedidos:[pedido(21,'Aprovada'),pedido(22,'Em trânsito'),pedido(23,'Concluída')]});const fila=page.getByRole('region',{name:'Pedidos do estoque',exact:true});await expect(fila.getByRole('button',{name:'Atender pedido 21',exact:true})).toBeVisible();await expect(fila.getByRole('button',{name:'Atender pedido 22',exact:true})).toHaveCount(0);await page.getByRole('button',{name:/^Enviados/}).click();await expect(fila.getByRole('button',{name:'Atender pedido 22',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Pesquisar no estoque'}).fill('inexistente');await expect(fila.getByText('Nenhum pedido enviado',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await page.getByRole('combobox',{name:'Filtrar estoque por obra'}).selectOption('deposito');await expect(fila.getByText('Nenhum pedido enviado',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Limpar filtros',exact:true}).click();await page.getByRole('navigation',{name:'Áreas do estoque'}).getByRole('button',{name:'Histórico',exact:true}).click();await expect(page.getByRole('region',{name:'Histórico do estoque',exact:true}).getByRole('button',{name:'Atender pedido 23',exact:true})).toBeVisible();
});
test('QA-EST-DADOS-02: falha inicial do estoque oferece retry e carrega sem listas parciais',async({page})=>{
  let falhar=true;await preparar(page,{pedidos:[pedido(21,'Aprovada')],interceptar:async(r,p,m)=>{if(m!=='GET'||p!=='/api/obras'||!falhar)return false;await r.fulfill({status:503,json:{mensagem:'Consulta indisponível QA'}});return true;}});await expect(page.getByRole('alert')).toContainText('Não foi possível concluir a operação. Tente novamente. Se persistir, contate o suporte.');await expect(page.getByRole('button',{name:'Atender pedido 21',exact:true})).toHaveCount(0);falhar=false;await page.getByRole('button',{name:'Tentar novamente',exact:true}).click();await expect(page.getByRole('button',{name:'Atender pedido 21',exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
for(const perfil of ['RH','FINANCEIRO'])test(`QA-PAINEL-DADOS: ${perfil} apresenta pedido, materiais e decisões reais da resposta`,async({page})=>{
  const analise=pedido(31,perfil==='RH'?'Pendente':'Aguardando financeiro',{planoFinanceiro:[],materiais:[{id:10,nome:'Capacete QA',quantidade:3,identificacao:null}]});
  const p=pedido(31,analise.status,{analises:[analise],solicitanteLogin:'qa.ana',decisoes:[{tipo:'APROVACAO_INICIAL',autorNome:'Gerente QA',autorLogin:'qa.gerente',registradoEm:'2026-10-20T12:00:00Z',descricao:'Análise QA'}]});
  const {mutacoes}=await preparar(page,{perfil,item:equipamento({tipo:'EPI'}),pedidos:[p]});await page.getByRole('button',{name:/Atividades/}).filter({visible:true}).first().click();await page.getByRole('button',{name:/Ana QA/}).filter({visible:true}).first().click();await page.getByRole('button',{name:/^Abrir solicitação 31,/}).click();const d=page.getByRole('dialog',{name:'Solicitação #0031',exact:true});await expect(d.getByRole('article',{name:'Dados do pedido financeiro'})).toContainText('Capacete QA');await expect(d.getByRole('region',{name:'Aprovações do pedido'})).toContainText('Gerente QA');const aprovar=botao(d,perfil==='RH'?'Aprovar e enviar ao Financeiro':'Aprovar plano e enviar ao estoque');if(perfil==='RH')await expect(aprovar).toBeEnabled();else await expect(aprovar).toBeDisabled();await expect(botao(d,'Rejeitar')).toBeEnabled();expect(mutacoes).toHaveLength(0);await botao(d,'Fechar solicitação').click();await page.getByRole('button',{name:'Kanban',exact:true}).click();const kanban=page.getByRole('region',{name:'Kanban de solicitações',exact:true});await expect(kanban.getByRole('button',{name:/^Abrir solicitação 31,/})).toBeVisible();await kanban.getByRole('button',{name:/^Abrir solicitação 31,/}).click();await expect(d.getByRole('article',{name:'Dados do pedido financeiro'})).toContainText('Capacete QA');
});
