import { test,expect } from './test.mjs';

const obra={id:1,nome:'Aurora',cliente:'QA',cidade:'Manaus',inicio:'2026-10-27',status:'Em andamento',responsaveis:['Ana','Beto']};
const eq={id:1,tipo:'Ferramentas',modelo:'Alicate',serie:'QA-1',status:'Em estoque',obraId:null,quantidade:5,quantidadeDisponivel:5,quantidadeReservada:0,historico:[{id:50,status:'Em estoque'}]};
const ana={id:1,nome:'Ana',cargo:'Técnica',email:'ana@example.invalid',status:'Ativo'};
const material={id:1,nome:'Alicate',catalogoChave:'ferramentas|alicate|',quantidade:1};
const pedido={id:1,tipo:'Movimentação',status:'Pendente',tecnico:'Ana',obraDestinoId:1,materiais:[material]};
const sementes=()=>({
  obras:[obra,{...obra,id:2,nome:'Outra obra',responsaveis:['Ana']},{...obra,id:3,nome:'Terceira obra',responsaveis:[]}],
  equipamentos:[eq,{...eq,id:2,serie:'QA-2',modelo:'Capacete',tipo:'EPI',obraId:1,status:'Em campo',quantidadeCalibracao:1},{...eq,id:3,serie:'QA-3',quantidadeManutencao:2},{...eq,id:4,serie:'QA-4',arquivado:true}],
  funcionarios:[ana,{...ana,id:2,nome:'Beto',email:null},{...ana,id:3,nome:'Gerente',cargo:'Gerente'},{...ana,id:4,nome:'Estoque',cargo:'Estoquista'},{...ana,id:5,nome:'Inativo',status:'Inativo'},{...ana,id:6,nome:'Arquivado',arquivado:true}],
  solicitacoes:[pedido,{...pedido,id:2}],categorias:[{id:1,nome:'Ferramentas'}],
});
const ler=page=>page.getByLabel('Estado',{exact:true}).textContent().then(JSON.parse);
async function acionar(page,nome,args) {
  await page.getByRole('combobox',{name:'Ação',exact:true}).selectOption(nome);
  await page.getByLabel('Argumentos',{exact:true}).fill(JSON.stringify(args));
  const antes=Number(await page.getByLabel('Concluídas',{exact:true}).textContent());
  await page.getByRole('button',{name:'Executar ação',exact:true}).click();
  await expect(page.getByLabel('Concluídas',{exact:true})).toHaveText(String(antes+1));
  return page.getByLabel('Retorno',{exact:true}).textContent().then(JSON.parse);
}
async function preparar(page,{perfil='ADMIN',interceptar=()=>false,dados=sementes()}={}) {
  const requisicoes=[];
  await page.route('http://127.0.0.1:4179/api/**',async route=>{
    const r=route.request(),p=new URL(r.url()).pathname;
    requisicoes.push({metodo:r.method(),rota:p,corpo:r.postData()?r.postDataJSON():null});
    if(await interceptar(route,p,r))return;
    if(r.method()!=='GET')return route.fulfill({status:503,json:{mensagem:'Mutação sem mock.'}});
    const financeiro=dados.solicitacoes.map(p=>({...p,decisoes:[],materiais:p.materiais.map(m=>({...m,quantidadeSolicitada:m.quantidade}))}));
    const respostas={'/api/obras':dados.obras,'/api/equipamentos':dados.equipamentos,'/api/funcionarios':dados.funcionarios,'/api/atividades':dados.solicitacoes,'/api/categorias-equipamento':dados.categorias,'/api/equipamentos/disponibilidade-financeira':dados.equipamentos,'/api/atividades/pedidos-financeiros':financeiro,'/api/atividades/pedidos-rh':financeiro};
    if(!(p in respostas))return route.fulfill({status:503,json:{mensagem:'Consulta sem mock.'}});
    await route.fulfill({json:respostas[p]});
  });
  await page.goto(`/qa-browser/controle-ativos.html?perfil=${perfil}`);
  await expect.poll(async()=>(await ler(page)).carregando).toBe(false);
  return {requisicoes,dados};
}

const novosEq={...eq,id:9,serie:'QA-NOVA'},novaObra={...obra,id:9,nome:'Nova obra'},novaPessoa={...ana,id:9,nome:'Clara',email:'clara@example.invalid'};
const contratos=[
  {nome:'cadastrarObra',args:[{nome:'Nova obra',cliente:'QA',cidade:'Manaus',inicio:'2026-10-27',status:'Em andamento',responsaveis:[]}],metodo:'POST',rota:'/api/obras',resposta:novaObra,colecao:'obras',ids:[9,1,2,3]},
  {nome:'atualizarStatusObra',args:[obra,'Concluída'],metodo:'PATCH',rota:'/api/obras/1',corpo:{...obra,id:undefined,status:'Concluída'},resposta:{...obra,status:'Concluída'},colecao:'obras',ids:[1,2,3]},
  {nome:'cadastrarEquipamento',args:[{modelo:'Alicate',serie:'QA-NOVA',tipo:'Ferramentas',status:'Em estoque',quantidade:1}],metodo:'POST',rota:'/api/equipamentos',resposta:novosEq,colecao:'equipamentos',ids:[9,1,2,3,4]},
  {nome:'cadastrarCategoriaEquipamento',args:[{nome:'Medição'}],metodo:'POST',rota:'/api/categorias-equipamento',resposta:{id:9,nome:'Medição'},colecao:'categorias',ids:[1,9],retorno:{id:9,nome:'Medição'}},
  {nome:'atualizarEquipamento',args:[1,{tipo:'Ferramentas',modelo:'Alicate revisado',serie:'QA-1',status:'Em estoque',obraId:null,quantidade:5}],metodo:'PATCH',rota:'/api/equipamentos/1',corpo:{tipo:'Ferramentas',modelo:'Alicate revisado',serie:'QA-1',status:'Em estoque',obraId:null,quantidade:5},resposta:{...eq,modelo:'Alicate revisado'},colecao:'equipamentos',ids:[1,2,3,4]},
  {nome:'excluirEquipamento',args:[1],metodo:'DELETE',rota:'/api/equipamentos/1',resposta:null,colecao:'equipamentos',ids:[2,3,4],retorno:{sucesso:true}},
  {nome:'arquivarEquipamento',args:[1,true],metodo:'PATCH',rota:'/api/equipamentos/1/arquivamento',corpo:{arquivado:true},resposta:{...eq,arquivado:true},colecao:'equipamentos',ids:[1,2,3,4],retorno:{sucesso:true}},
  {nome:'arquivarObra',args:[1,true],metodo:'PATCH',rota:'/api/obras/1/arquivamento',corpo:{arquivado:true},resposta:{...obra,arquivado:true},colecao:'obras',ids:[1,2,3]},
  {nome:'arquivarFuncionario',args:[1,true],metodo:'PATCH',rota:'/api/funcionarios/1/arquivamento',corpo:{arquivado:true},resposta:{...ana,arquivado:true},colecao:'funcionarios',ids:[1,2,3,4,5,6],retorno:{sucesso:true}},
  {nome:'cadastrarFuncionario',args:[{nome:'Clara',email:'clara@example.invalid',cargo:'Técnica'}],metodo:'POST',rota:'/api/funcionarios',resposta:novaPessoa,colecao:'funcionarios',ids:[9,1,2,3,4,5,6]},
  {nome:'atualizarFuncionario',args:[ana,{nome:'Ana Nova',cargo:'TST'},[3]],metodo:'PATCH',rota:'/api/funcionarios/1',corpo:{nome:'Ana Nova',cargo:'TST',obraIds:[3]},resposta:{...ana,nome:'Ana Nova',cargo:'TST'},colecao:'funcionarios',ids:[1,2,3,4,5,6]},
];
for(const [indice,c] of contratos.entries())test(`QA-ATIVOS-${String(indice+1).padStart(2,'0')}: ${c.nome} preserva estado na falha e aplica resposta no retry`,async({page})=>{
  let falhar=true;const {requisicoes}=await preparar(page,{interceptar:async(route,p,r)=>{
    if(p!==c.rota||r.method()!==c.metodo)return false;
    await route.fulfill(falhar?{status:409,json:{mensagem:'Falha controlada.'}}:c.resposta===null?{status:204}:{json:c.resposta});return true;
  }});
  const antes=await ler(page);const primeira=await acionar(page,c.nome,c.args);
  expect((await ler(page)).erro).toBe('Falha controlada.');
  for(const k of ['obras','equipamentos','funcionarios','solicitacoes','categorias'])expect((await ler(page))[k]).toEqual(antes[k]);
  expect(primeira.retorno).toEqual(c.nome==='cadastrarCategoriaEquipamento'?null:['excluirEquipamento','arquivarEquipamento','arquivarFuncionario'].includes(c.nome)?{sucesso:false,mensagem:'Falha controlada.'}:false);
  falhar=false;const segunda=await acionar(page,c.nome,c.args),depois=await ler(page);
  expect(segunda.retorno).toEqual(c.retorno??true);expect(depois.erro).toBeNull();
  expect(depois[c.colecao].map(x=>x.id)).toEqual(c.ids);
  if(c.resposta?.id&&c.ids.includes(c.resposta.id))expect(depois[c.colecao].find(x=>x.id===c.resposta.id)).toMatchObject(c.resposta);
  const mutacoes=requisicoes.filter(r=>r.metodo===c.metodo&&r.rota===c.rota);expect(mutacoes).toHaveLength(2);
  const esperado=c.corpo??c.args[0];if(c.metodo!=='DELETE')expect(mutacoes[1].corpo).toEqual(JSON.parse(JSON.stringify(esperado)));
  if(c.nome==='atualizarFuncionario')expect(depois.obras.map(o=>o.responsaveis)).toEqual([['Beto'],[],['Ana Nova']]);
});

test('QA-ATIVOS-12: duplicidade local de série, nome e email impede requisição',async({page})=>{
  const {requisicoes}=await preparar(page);
  expect((await acionar(page,'cadastrarEquipamento',[{serie:' qa-1 '}])).retorno).toBe(false);
  expect((await acionar(page,'atualizarEquipamento',[1,{serie:' QA-2 '}])).retorno).toBe(false);
  expect((await ler(page)).erro).toContain('número de série');
  expect((await acionar(page,'cadastrarFuncionario',[{nome:' ANA ',email:''}])).retorno).toBe(false);
  expect((await acionar(page,'cadastrarFuncionario',[{nome:'Pessoa nova',email:' ANA@EXAMPLE.INVALID '}])).retorno).toBe(false);
  expect(requisicoes.filter(r=>r.metodo!=='GET')).toEqual([]);
});
test('QA-ATIVOS-13: movimentação valida saldo e responsável antes do transporte direto',async({page})=>{
  let falhar=true;const {requisicoes}=await preparar(page,{interceptar:async(route,p,r)=>{
    if(p!=='/api/atividades/transporte-direto'||r.method()!=='POST')return false;
    await route.fulfill(falhar?{status:409,json:{mensagem:'Transporte recusado.'}}:{json:{...pedido,id:9,status:'Aprovada'}});return true;
  }});
  expect((await acionar(page,'movimentarEquipamento',[999,{}])).retorno).toBe(false);
  expect((await acionar(page,'movimentarEquipamento',[1,{obraId:1,quantidade:1}])).retorno).toBe(false);
  expect((await ler(page)).erro).toContain('responsável pelo recebimento');
  expect((await acionar(page,'movimentarEquipamento',[1,{obraId:1,tecnico:'Ana',quantidade:6}])).retorno).toBe(false);
  expect(requisicoes.filter(r=>r.metodo!=='GET')).toHaveLength(0);
  const args=[1,{obraId:1,tecnico:' Ana ',quantidade:2,dataMovimentacao:'2026-10-27'}];
  expect((await acionar(page,'movimentarEquipamento',args)).retorno).toBe(false);expect((await ler(page)).solicitacoes).toHaveLength(2);
  falhar=false;expect((await acionar(page,'movimentarEquipamento',args)).retorno).toBe(true);
  expect((await ler(page)).solicitacoes.map(p=>p.id)).toEqual([9,1,2]);expect((await ler(page)).erro).toBeNull();
  expect(requisicoes.filter(r=>r.metodo==='POST').at(-1).corpo).toEqual({tecnico:'Ana',obraOrigemId:null,obraDestinoId:1,dataSolicitacao:'2026-10-27',observacao:'Movimentação solicitada pelo gerente.',materiais:[{nome:'Alicate',quantidade:2,identificacao:'QA-1',catalogoChave:null}]});
});

const plano={materiais:[{materialId:1,quantidadeCompra:1,justificativa:'Compra QA',origens:[]}]};
const dadosPedido={tecnico:'Ana',obraDestinoId:1,dataSolicitacao:'2026-10-27',materiais:[{nome:'Alicate',catalogoChave:'ferramentas|alicate|',quantidade:1}]};
const fluxos=[
  {nome:'aprovação',acao:'definirStatusSolicitacao',args:[1,'Aprovada'],rota:'/api/atividades/1/aprovacao',metodo:'POST',resposta:{...pedido,status:'Aprovada'}},
  {nome:'rejeição',acao:'definirStatusSolicitacao',args:[1,'Rejeitada','Motivo QA'],rota:'/api/atividades/1/rejeicao',metodo:'POST',corpo:{motivo:'Motivo QA'},resposta:{...pedido,status:'Rejeitada'}},
  {nome:'trânsito',acao:'avancarMovimentacao',args:[1,'transito'],rota:'/api/atividades/1/transito',metodo:'POST',resposta:{...pedido,status:'Em trânsito'}},
  {nome:'recebimento',acao:'avancarMovimentacao',args:[1,'concluir'],rota:'/api/atividades/1/conclusao',metodo:'POST',resposta:{...pedido,status:'Concluída'}},
  {nome:'edição',acao:'editarSolicitacao',args:[1,{obraDestinoId:1,observacao:'Editado QA'}],rota:'/api/atividades/1',metodo:'PATCH',corpo:{obraDestinoId:1,observacao:'Editado QA'},resposta:{...pedido,observacao:'Editado QA'}},
  {nome:'plano',acao:'salvarPlanoFinanceiro',args:[1,plano],rota:'/api/atividades/1/plano-financeiro',metodo:'POST',corpo:plano,resposta:{...pedido,observacao:'Plano salvo'}},
  {nome:'novo pedido',acao:'cadastrarSolicitacao',args:[dadosPedido],rota:'/api/atividades',metodo:'POST',corpo:dadosPedido,resposta:{...pedido,id:9}},
];
for(const [indice,c] of fluxos.entries())test(`QA-ATIVOS-${14+indice}: ${c.nome} só altera pedido após resposta bem-sucedida`,async({page})=>{
  let falhar=true;const {requisicoes,dados}=await preparar(page,{interceptar:async(route,p,r)=>{
    if(p!==c.rota||r.method()!==c.metodo)return false;
    await route.fulfill(falhar?{status:409,json:{mensagem:'Ação recusada.'}}:{json:c.resposta});return true;
  }});
  const antes=(await ler(page)).solicitacoes;
  const erro=await acionar(page,c.acao,c.args);expect(erro).toEqual(c.acao==='salvarPlanoFinanceiro'?{excecao:'Ação recusada.'}:{retorno:false,indefinido:false});
  expect((await ler(page)).solicitacoes).toEqual(antes);expect((await ler(page)).erro).toBe('Ação recusada.');
  falhar=false;if(c.nome==='recebimento')dados.equipamentos=[{...eq,modelo:'Retornado ao estoque'}];
  expect((await acionar(page,c.acao,c.args)).retorno).toBe(true);
  const depois=await ler(page);expect(depois.erro).toBeNull();expect(depois.solicitacoes.find(p=>p.id===c.resposta.id)).toMatchObject(c.resposta);
  expect(depois.solicitacoes.some(p=>p.id===2)).toBe(true);
  if(c.corpo)expect(requisicoes.filter(r=>r.metodo===c.metodo&&r.rota===c.rota).at(-1).corpo).toEqual(c.corpo);
  if(c.nome==='recebimento')await expect.poll(async()=>(await ler(page)).equipamentos[0].modelo).toBe('Retornado ao estoque');
});

for(const perfil of ['FINANCEIRO','RH'])test(`QA-ATIVOS-21: ${perfil} recarrega lista adaptada após decisões, edição e plano`,async({page})=>{
  const dados=sementes();let versao=0;
  const {requisicoes}=await preparar(page,{perfil,dados,interceptar:async(route,p,r)=>{
    if(r.method()==='GET')return false;
    versao++;dados.solicitacoes=[{...pedido,status:'Aprovada',observacao:`Recarregado ${versao}`}];
    await route.fulfill({json:{...pedido,observacao:'Resposta simples não deve substituir a lista financeira'}});return true;
  }});
  if(perfil==='RH'){expect((await ler(page)).funcionarios.map(f=>f.nome)).toEqual(['Ana']);expect((await ler(page)).equipamentos.map(e=>e.tipo)).toEqual(['EPI']);}
  for(const [acao,args] of [['definirStatusSolicitacao',[1,'Aprovada']],['editarSolicitacao',[1,{obraDestinoId:1,observacao:'QA'}]],['salvarPlanoFinanceiro',[1,plano]]]) {
    expect((await acionar(page,acao,args)).retorno).toBe(true);
    const p=(await ler(page)).solicitacoes[0];expect(p.financeiro).toBe(true);expect(p.observacao).toBe(`Recarregado ${versao}`);expect(p.materiais[0].quantidade).toBe(1);
  }
  expect(requisicoes.filter(r=>r.rota===`/api/atividades/pedidos-${perfil==='RH'?'rh':'financeiros'}`)).toHaveLength(4);
});
test('QA-ATIVOS-22: consultas locais, resumo e atualização recebida preservam outros itens',async({page})=>{
  const {requisicoes}=await preparar(page);
  expect((await ler(page)).tecnicos).toEqual(['Ana','Beto']);expect((await ler(page)).resumo).toMatchObject({total:3,emCampo:1,emCalibracao:1,emManutencao:1});
  expect((await acionar(page,'buscarObraPorId',[1])).retorno).toEqual(obra);
  expect((await acionar(page,'buscarObraPorId',[999])).indefinido).toBe(true);
  expect((await acionar(page,'consultarHistorico',[eq])).retorno).toEqual(eq.historico);
  expect((await acionar(page,'consultarHistorico',[{id:8}])).retorno).toEqual([]);
  await acionar(page,'receberEquipamentoAtualizado',[{...eq,modelo:'Atualização recebida'}]);
  expect((await ler(page)).equipamentos[0].modelo).toBe('Atualização recebida');expect((await ler(page)).equipamentos.find(e=>e.id===2).modelo).toBe('Capacete');
  expect((await acionar(page,'avancarMovimentacao',[999,'transito'])).retorno).toBe(false);
  expect(requisicoes.filter(r=>r.metodo!=='GET')).toHaveLength(0);
});

const renderizar=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
test('QA-ATIVOS-23: falha no carregamento encerra espera e expõe erro sem listas parciais',async({page})=>{
  await preparar(page,{interceptar:async(route,p)=>{
    if(p!=='/api/categorias-equipamento')return false;
    await route.fulfill({status:503,json:{mensagem:'Erro interno fictício'}});return true;
  }});
  const e=await ler(page);expect(e.carregando).toBe(false);expect(e.erro).toContain('Não foi possível');
  for(const k of ['obras','equipamentos','funcionarios','solicitacoes','categorias'])expect(e[k]).toEqual([]);
});
test('QA-ATIVOS-24: refresh falho preserva par de listas e próxima tentativa aplica ambas',async({page})=>{
  let falhar=false;const dados=sementes();
  await preparar(page,{dados,interceptar:async(route,p)=>{
    if(p!=='/api/atividades'||!falhar)return false;
    await route.fulfill({status:503,json:{mensagem:'Falha fictícia no refresh'}});return true;
  }});
  const antes=await ler(page);dados.equipamentos=[{...eq,modelo:'Novo remoto'}];dados.solicitacoes=[{...pedido,status:'Concluída'}];falhar=true;
  const resposta=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/atividades'&&r.status()===503);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await (await resposta).finished();await renderizar(page);
  expect((await ler(page)).equipamentos).toEqual(antes.equipamentos);expect((await ler(page)).solicitacoes).toEqual(antes.solicitacoes);expect((await ler(page)).erro).toBeNull();
  falhar=false;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect.poll(async()=>(await ler(page)).equipamentos[0].modelo).toBe('Novo remoto');expect((await ler(page)).solicitacoes[0].status).toBe('Concluída');
});
test('QA-ATIVOS-25: painel oculto não faz polling e retoma ao ficar visível',async({page})=>{
  await page.clock.install();const {requisicoes}=await preparar(page);
  const antes=requisicoes.filter(r=>r.rota==='/api/equipamentos').length;
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});window.dispatchEvent(new Event('focus'));document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.fastForward(10000);expect(requisicoes.filter(r=>r.rota==='/api/equipamentos')).toHaveLength(antes);
  await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});document.dispatchEvent(new Event('visibilitychange'));});
  await expect.poll(()=>requisicoes.filter(r=>r.rota==='/api/equipamentos').length).toBe(antes+1);
});
test('QA-ATIVOS-26: recebimento mantém sucesso e dados atuais se recarga secundária falhar',async({page})=>{
  let concluir=false;
  await preparar(page,{interceptar:async(route,p,r)=>{
    if(p==='/api/atividades/1/conclusao'&&r.method()==='POST'){concluir=true;await route.fulfill({json:{...pedido,status:'Concluída'}});return true;}
    if(p==='/api/equipamentos'&&concluir){await route.fulfill({status:503,json:{mensagem:'Falha fictícia na consulta'}});return true;}
    return false;
  }});
  const antes=(await ler(page)).equipamentos;
  const resposta=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/equipamentos'&&r.status()===503);
  expect((await acionar(page,'avancarMovimentacao',[1,'concluir'])).retorno).toBe(true);
  await (await resposta).finished();await renderizar(page);
  expect((await ler(page)).solicitacoes[0].status).toBe('Concluída');expect((await ler(page)).equipamentos).toEqual(antes);expect((await ler(page)).erro).toBeNull();
});
test('QA-ATIVOS-27: série em branco e funcionário sem email seguem para a API',async({page})=>{
  const {requisicoes}=await preparar(page,{interceptar:async(route,p,r)=>{
    if(r.method()!=='POST')return false;
    if(p==='/api/equipamentos'){await route.fulfill({status:201,json:{...eq,id:9,serie:'ERA-GERADA'}});return true;}
    if(p==='/api/funcionarios'){await route.fulfill({status:201,json:{...novaPessoa,email:null}});return true;}
    return false;
  }});
  expect((await acionar(page,'cadastrarEquipamento',[{tipo:'Ferramentas',modelo:'Alicate',serie:' ',status:'Em estoque',quantidade:1}])).retorno).toBe(true);
  expect((await ler(page)).equipamentos[0].serie).toBe('ERA-GERADA');
  expect((await acionar(page,'cadastrarFuncionario',[{nome:'Clara',cargo:'Técnica'}])).retorno).toBe(true);
  expect((await ler(page)).funcionarios[0].email).toBeNull();expect(requisicoes.filter(r=>r.metodo==='POST')).toHaveLength(2);
});
for(const perfil of ['FINANCEIRO','RH'])test(`QA-ATIVOS-28: foco recarrega disponibilidade e pedidos de ${perfil}`,async({page})=>{
  const dados=sementes();const {requisicoes}=await preparar(page,{perfil,dados});
  dados.equipamentos=[{...dados.equipamentos[1],modelo:'Disponibilidade atualizada QA'}];dados.solicitacoes=[{...pedido,observacao:'Pedido atualizado no foco'}];
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect.poll(async()=>(await ler(page)).equipamentos[0].modelo).toBe('Disponibilidade atualizada QA');expect((await ler(page)).solicitacoes[0]).toMatchObject({financeiro:true,observacao:'Pedido atualizado no foco'});
  expect(requisicoes.filter(r=>r.rota===`/api/atividades/pedidos-${perfil==='RH'?'rh':'financeiros'}`)).toHaveLength(2);
});
