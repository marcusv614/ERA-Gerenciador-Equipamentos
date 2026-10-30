import { test,expect } from './test.mjs';

const categoria={id:1,nome:'Instrumentos de teste e medição',descricao:'Medição QA',campos:[{chave:'serie',rotulo:'Número de série',tipo:'text'},{chave:'medida',rotulo:'Medida',tipo:'text'},{chave:'marca',rotulo:'Marca',tipo:'text'}]};
const sementes=()=>({
  obras:[{id:1,nome:'Aurora QA',cliente:'Cliente QA',cidade:'Manaus',inicio:'2026-10-20',status:'Em andamento',responsaveis:['Ana QA']},{id:2,nome:'Outra QA',cliente:'Cliente QA',cidade:'Manaus',inicio:'2026-10-20',status:'Em andamento',responsaveis:[]}],
  funcionarios:[{id:1,nome:'Ana QA',cargo:'Técnica',email:'ana@example.invalid',telefone:'92999999999',status:'Ativo'},{id:2,nome:'Beto QA',cargo:'Técnico',email:'beto@example.invalid',status:'Ativo'}],
  equipamentos:[{id:1,tipo:categoria.nome,modelo:'Medidor QA',serie:'SERIE-1',status:'Em estoque',obraId:null,tecnico:null,quantidade:5,quantidadeReservada:0,quantidadeManutencao:0,quantidadeDisponivel:5,controleQuantidade:'LOTE',historico:[],dataEntrada:'2026-10-20',atributos:{marca:'Marca QA'},medida:'unidade'},
    {id:2,tipo:categoria.nome,modelo:'Reservado QA',serie:'SERIE-2',status:'Em estoque',obraId:null,quantidade:5,quantidadeReservada:2,quantidadeManutencao:1,quantidadeDisponivel:2,controleQuantidade:'LOTE',historico:[],dataEntrada:'2026-10-20',atributos:{}}],
  categorias:[categoria,{id:2,nome:'Ferramentas manuais',campos:[{chave:'marca',rotulo:'Marca',tipo:'text'},{chave:'medida',rotulo:'Medida',tipo:'text'}]}],
});
function promessa(){let liberar;const espera=new Promise(r=>liberar=r);return {espera,liberar};}
async function preparar(page,interceptar=()=>false) {
  const dados=sementes(),mutacoes=[];let id=100;
  await page.route('http://127.0.0.1:4179/api/**',async route=>{
    const req=route.request(),p=new URL(req.url()).pathname,metodo=req.method();
    const corpo=req.postData()?req.postDataJSON():null;
    if(metodo!=='GET')mutacoes.push({rota:p,metodo,corpo});
    if(await interceptar(route,p,metodo,corpo))return;
    if(p==='/api/auth/me')return route.fulfill({json:{id:9,nome:'Gerente QA',login:'qa.formularios',perfil:'GERENTE',deveAlterarSenha:false}});
    if(p==='/api/auth/csrf')return route.fulfill({json:{token:'qa-csrf'}});
    if(p==='/api/notificacoes')return route.fulfill({json:{itens:[],naoLidas:0,temMais:false}});
    if(p==='/api/atividades')return route.fulfill({json:[]});
    const chave=({'/api/obras':'obras','/api/equipamentos':'equipamentos','/api/funcionarios':'funcionarios','/api/categorias-equipamento':'categorias'})[p];
    if(chave&&metodo==='GET')return route.fulfill({json:dados[chave]});
    if(chave&&metodo==='POST'){
      const novo={id:id++,...corpo};
      if(chave==='funcionarios'){novo.nome=novo.nome.trim();novo.status='Ativo';}
      if(chave==='equipamentos'){novo.quantidadeReservada=0;novo.quantidadeDisponivel=novo.quantidade;novo.obraId=novo.obraId==null?null:Number(novo.obraId);novo.historico=[];novo.serie=novo.serie||'ERA-GERADA';}
      dados[chave].push(novo);return route.fulfill({status:201,json:novo});
    }
    const patch=p.match(/^\/api\/(equipamentos|funcionarios)\/(\d+)(\/arquivamento)?$/);
    if(patch&&metodo==='PATCH'){
      const lista=dados[patch[1]],item=lista.find(x=>x.id===Number(patch[2]));Object.assign(item,corpo);
      return route.fulfill({json:item});
    }
    return route.fulfill({status:503,json:{mensagem:`Rota sem mock: ${metodo} ${p}`}});
  });
  await page.goto('/');await expect(page.getByRole('button',{name:'Sair do sistema'})).toBeVisible();
  await expect(page.getByText('Sincronizando dados com a API...')).toHaveCount(0);
  return {dados,mutacoes};
}
async function acaoRapida(page,nome) {
  const botao=page.getByRole('button',{name:nome,exact:true});
  if(!await botao.isVisible())await page.getByRole('button',{name:'Abrir ações rápidas'}).click();
  await botao.click();
}
async function navegar(page,nome){await page.getByRole('button',{name:(nome==='Funcionários'?/^(Funcionários|Equipe)$/:new RegExp(nome))}).filter({visible:true}).first().click();}
const dialogo=(page,nome)=>page.getByRole('dialog',{name:nome,exact:true});
const nomeItem=d=>d.getByRole('textbox',{name:/^Nome do material/});
async function selecionarCheckbox(d,nome,marcado=true){
  const checkbox=d.getByRole('checkbox',{name:nome,exact:true});
  if(await checkbox.isChecked()!==marcado)await d.getByText(nome,{exact:true}).click();
  await expect(checkbox).toBeChecked({checked:marcado});
}
async function preencherEquipamento(d){await nomeItem(d).fill(' Novo medidor QA ');await d.getByRole('spinbutton',{name:/^Quantidade/}).fill('3');await d.getByRole('textbox',{name:'Número de série',exact:true}).fill(' NOVA-1 ');await d.getByLabel(/^Data de entrada/).fill('2026-10-20');}
async function preencherObra(d){await d.getByRole('textbox',{name:'Nome da obra',exact:true}).fill('Nova obra QA');await d.getByRole('textbox',{name:'Cliente',exact:true}).fill('Cliente QA');await d.getByRole('textbox',{name:'Cidade / UF',exact:true}).fill('Manaus');await d.getByText('Selecionar técnicos',{exact:true}).click();await selecionarCheckbox(d,'Ana QA');await d.getByText('1 técnico(s) selecionado(s)',{exact:true}).click();}
async function preencherFuncionario(d){await d.getByRole('textbox',{name:'Nome completo',exact:true}).fill('Clara QA');await d.getByRole('textbox',{name:'Cargo ou função',exact:true}).fill('Técnica');}
const cadastros=[
  {nome:'equipamento',abrir:'Equipamento',titulo:'Adicionar item ao inventário',salvar:'Adicionar ao inventário',rota:'/api/equipamentos',preencher:preencherEquipamento},
  {nome:'obra',abrir:'Nova obra',titulo:'Nova obra',salvar:'Criar obra',rota:'/api/obras',preencher:preencherObra},
  {nome:'funcionário',abrir:'Funcionário',titulo:'Novo funcionário',salvar:'Adicionar funcionário',rota:'/api/funcionarios',preencher:preencherFuncionario},
];
for(const c of cadastros) {
  test(`QA-FORM-DUP: ${c.nome} impede duplo envio e fechamento enquanto aguarda API`,async({page},testInfo)=>{
    const gate=promessa();const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!==c.rota||m!=='POST')return false;await gate.espera;await r.fulfill({status:409,json:{mensagem:'Recusa QA'}});return true;});
    try{
      await acaoRapida(page,c.abrir);const d=dialogo(page,c.titulo);await c.preencher(d);
      await d.getByRole('button',{name:c.salvar,exact:true}).dblclick();
      await expect(d.getByRole('button',{name:'Salvando...',exact:true})).toBeDisabled();
      expect(mutacoes.filter(r=>r.rota===c.rota&&r.metodo==='POST')).toHaveLength(1);
      await expect(d.getByRole('button',{name:'Cancelar',exact:true})).toBeDisabled();
      await page.keyboard.press('Escape');await expect(d).toBeVisible();
    } finally{
      await testInfo.attach('resumo-envio',{body:JSON.stringify({formulario:c.nome,requisicoes:mutacoes.filter(r=>r.rota===c.rota&&r.metodo==='POST').length}),contentType:'application/json'});
      gate.liberar();
    }
    await expect(dialogo(page,c.titulo).getByRole('alert')).toContainText('Recusa QA');
  });
  test(`QA-FORM-RETRY: ${c.nome} preserva dados após recusa e fecha somente no sucesso`,async({page})=>{
    let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!==c.rota||m!=='POST'||!falhar)return false;await r.fulfill({status:409,json:{mensagem:'Dados recusados QA'}});return true;});
    await acaoRapida(page,c.abrir);const d=dialogo(page,c.titulo);
    await expect(d.getByRole('button',{name:c.salvar,exact:true})).toBeDisabled();await c.preencher(d);
    await d.getByRole('button',{name:c.salvar,exact:true}).click();await expect(d.getByRole('alert')).toContainText('Dados recusados QA');
    await expect(d.getByRole('textbox',{name:/^Nome/})).not.toHaveValue('');
    falhar=false;await d.getByRole('button',{name:c.salvar,exact:true}).click();await expect(d).toHaveCount(0);
    expect(mutacoes.filter(r=>r.rota===c.rota&&r.metodo==='POST')).toHaveLength(2);
    if(c.nome==='equipamento')expect(mutacoes.at(-1).corpo).toMatchObject({modelo:'Novo medidor QA',serie:'NOVA-1',quantidade:3,controleQuantidade:'LOTE',obraId:null});
    if(c.nome==='obra')expect(mutacoes.at(-1).corpo).toMatchObject({nome:'Nova obra QA',responsaveis:['Ana QA'],status:'Em andamento'});
    if(c.nome==='funcionário')expect(mutacoes.at(-1).corpo).toMatchObject({nome:'Clara QA',cargo:'Técnica',email:'',telefone:''});
  });
  test(`QA-FORM-ENTER: ${c.nome} permite envio pelo teclado`,async({page})=>{
    const {mutacoes}=await preparar(page);await acaoRapida(page,c.abrir);const d=dialogo(page,c.titulo);await c.preencher(d);
    await d.getByRole('textbox',{name:/^Nome/}).press('Enter');await expect(d).toHaveCount(0);
    expect(mutacoes.filter(r=>r.rota===c.rota&&r.metodo==='POST')).toHaveLength(1);
  });
}
test('QA-FORM-EMAIL: e-mail preenchido inválido não é enviado no cadastro',async({page})=>{
  const {mutacoes}=await preparar(page);await acaoRapida(page,'Funcionário');const d=dialogo(page,'Novo funcionário');await preencherFuncionario(d);
  const email=d.getByRole('textbox',{name:'E-mail (opcional)',exact:true});await email.fill('endereco-invalido');
  expect(await email.evaluate(e=>e.validity.valid)).toBe(false);
  await email.evaluate(e=>e.addEventListener('invalid',()=>{e.dataset.invalid='true';}));
  await d.getByRole('button',{name:'Adicionar funcionário',exact:true}).click();await expect(email).toHaveAttribute('data-invalid','true');expect(mutacoes.filter(r=>r.rota==='/api/funcionarios'&&r.metodo==='POST')).toHaveLength(0);await expect(d).toBeVisible();
});
test('QA-FORM-EQUIP: quantidade e série duplicada bloqueiam envio; categoria manual descarta série',async({page})=>{
  const {mutacoes}=await preparar(page);await acaoRapida(page,'Equipamento');const d=dialogo(page,'Adicionar item ao inventário');await preencherEquipamento(d);
  const salvar=d.getByRole('button',{name:'Adicionar ao inventário',exact:true}),q=d.getByRole('spinbutton',{name:/^Quantidade/});
  await q.fill('1.5');await expect(salvar).toBeDisabled();await q.fill('2');
  await d.getByRole('textbox',{name:'Número de série',exact:true}).fill(' serie-1 ');await expect(salvar).toBeDisabled();
  await d.getByRole('combobox',{name:'Categoria',exact:true}).selectOption('Ferramentas manuais');await expect(d.getByRole('textbox',{name:'Número de série',exact:true})).toHaveCount(0);
  await d.getByRole('textbox',{name:'Marca',exact:true}).fill(' Marca limpa ');await salvar.click();await expect(d).toHaveCount(0);
  expect(mutacoes.at(-1).corpo).toMatchObject({tipo:'Ferramentas manuais',serie:null,atributos:{marca:'Marca limpa'},quantidade:2});
});
test('QA-FORM-OBRA: responsáveis podem ser removidos e data vazia recebe data atual',async({page})=>{
  const {mutacoes}=await preparar(page);await acaoRapida(page,'Nova obra');const d=dialogo(page,'Nova obra');await preencherObra(d);
  await d.getByRole('button',{name:'Remover Ana QA'}).click();await expect(d.getByRole('button',{name:'Criar obra',exact:true})).toBeDisabled();
  await d.getByText('Selecionar técnicos',{exact:true}).click();await selecionarCheckbox(d,'Beto QA');await d.getByText('1 técnico(s) selecionado(s)',{exact:true}).click();await d.getByRole('button',{name:'Criar obra',exact:true}).click();await expect(d).toHaveCount(0);
  expect(mutacoes.at(-1).corpo.responsaveis).toEqual(['Beto QA']);expect(mutacoes.at(-1).corpo.inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
test('QA-FORM-GRUPOS: grupos de responsáveis e status mantêm nomes individuais acessíveis',async({page})=>{
  await preparar(page);await acaoRapida(page,'Nova obra');const d=dialogo(page,'Nova obra');
  await expect(d.getByRole('group',{name:'Técnicos responsáveis',exact:true})).toBeVisible();
  await d.getByText('Selecionar técnicos',{exact:true}).click();await expect(d.getByRole('checkbox',{name:'Ana QA',exact:true})).toBeVisible();await expect(d.getByRole('checkbox',{name:'Beto QA',exact:true})).toBeVisible();
  await expect(d.getByRole('group',{name:'Status inicial',exact:true}).getByRole('button',{name:'Em andamento',exact:true})).toBeVisible();
});
test('QA-FORM-FUNC: nome e e-mail duplicados são detectados sem API',async({page})=>{
  const {mutacoes}=await preparar(page);await acaoRapida(page,'Funcionário');const d=dialogo(page,'Novo funcionário');await preencherFuncionario(d);
  await d.getByRole('textbox',{name:'Nome completo',exact:true}).fill(' ANA QA ');await expect(d.getByRole('button',{name:'Adicionar funcionário',exact:true})).toBeDisabled();
  await d.getByRole('textbox',{name:'Nome completo',exact:true}).fill('Clara QA');await d.getByRole('textbox',{name:'E-mail (opcional)',exact:true}).fill(' ANA@EXAMPLE.INVALID ');await expect(d.getByRole('button',{name:'Adicionar funcionário',exact:true})).toBeDisabled();
  expect(mutacoes.filter(r=>r.metodo==='POST')).toHaveLength(0);
});
test('QA-FORM-EDICAO: reserva bloqueia identidade e localização, respeitando quantidade mínima',async({page})=>{
  const {mutacoes}=await preparar(page);await navegar(page,'Equipamentos');await page.getByRole('button',{name:'Editar Reservado QA',exact:true}).click();const d=dialogo(page,'Editar item do inventário');
  await expect(nomeItem(d)).toBeDisabled();await expect(d.getByRole('combobox',{name:'Categoria',exact:true})).toBeDisabled();await expect(d.getByRole('textbox',{name:'Número de série',exact:true})).toBeDisabled();await expect(d.getByRole('combobox',{name:/^Localização/})).toBeDisabled();
  await d.getByRole('spinbutton',{name:/^Quantidade/}).fill('2');await expect(d.getByRole('button',{name:'Salvar alterações',exact:true})).toBeDisabled();
  await d.getByRole('spinbutton',{name:/^Quantidade/}).fill('3');await d.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(d).toHaveCount(0);
  expect(mutacoes.at(-1)).toMatchObject({metodo:'PATCH',rota:'/api/equipamentos/2',corpo:{modelo:'Reservado QA',serie:'SERIE-2',quantidade:3,obraId:null}});
});
test('QA-FORM-EDIT-FUNC: edição preserva seleção na falha e atualiza nome e vínculos no sucesso',async({page})=>{
  let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!=='/api/funcionarios/1'||m!=='PATCH'||!falhar)return false;await r.fulfill({status:409,json:{mensagem:'Edição recusada QA'}});return true;});
  await navegar(page,'Funcionários');await page.getByRole('button',{name:'Editar dados de Ana QA'}).click();const d=dialogo(page,'Editar funcionário');
  await d.getByRole('textbox',{name:'Nome completo',exact:true}).fill(' Ana Nova QA ');await d.getByRole('textbox',{name:'E-mail (opcional)',exact:true}).fill(' ANA.NOVA@EXAMPLE.INVALID ');
  await selecionarCheckbox(d,'Aurora QA',false);await selecionarCheckbox(d,'Outra QA');
  await d.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(d.getByRole('alert')).toBeVisible();await expect(d.getByRole('checkbox',{name:'Outra QA',exact:true})).toBeChecked();
  falhar=false;await d.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(d).toHaveCount(0);
  expect(mutacoes.at(-1).corpo).toMatchObject({nome:'Ana Nova QA',email:'ana.nova@example.invalid',obraIds:[2]});await expect(page.getByRole('button',{name:'Editar dados de Ana Nova QA'})).toBeVisible();
});
test('QA-FORM-EMAIL-EDIT: e-mail inválido não é enviado na edição',async({page})=>{
  const {mutacoes}=await preparar(page);await navegar(page,'Funcionários');await page.getByRole('button',{name:'Editar dados de Ana QA'}).click();const d=dialogo(page,'Editar funcionário');const email=d.getByRole('textbox',{name:'E-mail (opcional)',exact:true});await email.fill('invalido');
  await email.evaluate(e=>e.addEventListener('invalid',()=>{e.dataset.invalid='true';}));
  await d.getByRole('button',{name:'Salvar alterações',exact:true}).click();await expect(email).toHaveAttribute('data-invalid','true');expect(mutacoes.filter(r=>r.rota==='/api/funcionarios/1'&&r.metodo==='PATCH')).toHaveLength(0);await expect(d).toBeVisible();
});
test('QA-FORM-CATEGORIA: categoria aninhada valida duplicidade, recupera falha e limpa especificações',async({page})=>{
  let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!=='/api/categorias-equipamento'||m!=='POST'||!falhar)return false;await r.fulfill({status:409,json:{mensagem:'Categoria recusada QA'}});return true;});
  await acaoRapida(page,'Equipamento');const principal=dialogo(page,'Adicionar item ao inventário');await preencherEquipamento(principal);
  await principal.getByRole('textbox',{name:'Marca',exact:true}).fill('Marca anterior');await principal.getByRole('button',{name:'Nova categoria',exact:true}).click();
  const d=dialogo(page,'Criar categoria');await d.getByRole('textbox',{name:/^Nome da categoria/}).fill(' instrumentos de teste e medição ');await expect(d.getByRole('button',{name:'Criar e selecionar'})).toBeDisabled();
  await d.getByRole('textbox',{name:/^Nome da categoria/}).fill('Material especial QA');await selecionarCheckbox(d,'Número de série');
  await d.getByRole('button',{name:'Criar e selecionar'}).click();await expect(d.getByRole('alert')).toContainText('Não foi possível cadastrar');
  falhar=false;await d.getByRole('button',{name:'Criar e selecionar'}).click();await expect(d).toHaveCount(0);
  await expect(principal.getByRole('combobox',{name:'Categoria',exact:true})).toHaveValue('Material especial QA');await expect(principal.getByRole('textbox',{name:'Número de série',exact:true})).toHaveValue('');await expect(principal.getByRole('textbox',{name:'Marca ou fabricante',exact:true})).toHaveValue('');
  expect(mutacoes.filter(r=>r.rota==='/api/categorias-equipamento')).toHaveLength(2);
  await principal.getByRole('button',{name:'Como registrar itens desta categoria'}).click();await expect(dialogo(page,'Guia de cadastro das categorias')).toBeVisible();await dialogo(page,'Guia de cadastro das categorias').getByRole('button',{name:'Entendi',exact:true}).click();await expect(principal).toBeVisible();
});
test('QA-FORM-ARQUIVAR-EQUIP: confirmação mantém erro e permite retry sem perder registro',async({page})=>{
  let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!=='/api/equipamentos/1/arquivamento'||m!=='PATCH'||!falhar)return false;await r.fulfill({status:409,json:{mensagem:'Arquivamento recusado QA'}});return true;});
  await navegar(page,'Equipamentos');await page.getByRole('button',{name:'Editar Medidor QA',exact:true}).click();const d=dialogo(page,'Editar item do inventário');await d.getByRole('button',{name:'Arquivar registro',exact:true}).click();
  const confirmar=d.getByRole('alertdialog',{name:'Confirmar arquivamento do equipamento'});await confirmar.getByRole('button',{name:'Arquivar',exact:true}).click();await expect(confirmar.getByText('Arquivamento recusado QA')).toBeVisible();await expect(d).toBeVisible();
  falhar=false;await confirmar.getByRole('button',{name:'Arquivar',exact:true}).click();await expect(d).toHaveCount(0);await expect(page.getByText('Equipamentos arquivados',{exact:true})).toBeVisible();
  expect(mutacoes.filter(r=>r.rota==='/api/equipamentos/1/arquivamento')).toHaveLength(2);
});
test('QA-FORM-ARQUIVAR-FUNC: cancelamento da confirmação não envia; recusa mantém modal',async({page})=>{
  let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m)=>{if(p!=='/api/funcionarios/1/arquivamento'||m!=='PATCH'||!falhar)return false;await r.fulfill({status:409,json:{mensagem:'Funcionário ainda vinculado QA'}});return true;});
  await navegar(page,'Funcionários');await page.getByRole('button',{name:'Editar dados de Ana QA'}).click();const d=dialogo(page,'Editar funcionário');
  page.once('dialog',r=>r.dismiss());await d.getByRole('button',{name:'Arquivar registro',exact:true}).click();expect(mutacoes.filter(r=>r.rota==='/api/funcionarios/1/arquivamento')).toHaveLength(0);
  page.once('dialog',r=>r.accept());await d.getByRole('button',{name:'Arquivar registro',exact:true}).click();await expect(d.getByRole('alert')).toContainText('Funcionário ainda vinculado QA');
  falhar=false;page.once('dialog',r=>r.accept());await d.getByRole('button',{name:'Arquivar registro',exact:true}).click();await expect(d).toHaveCount(0);
  expect(mutacoes.filter(r=>r.rota==='/api/funcionarios/1/arquivamento')).toHaveLength(2);
});
test('QA-FORM-MOVER: destino e responsável obrigatórios, envio protegido e retry preserva dados',async({page})=>{
  const gate=promessa();let falhar=true;const {mutacoes}=await preparar(page,async(r,p,m,corpo)=>{
    if(p!=='/api/atividades/transporte-direto'||m!=='POST')return false;
    if(falhar){await gate.espera;await r.fulfill({status:409,json:{mensagem:'Transporte recusado QA'}});}else await r.fulfill({status:201,json:{id:100,...corpo,tipo:'Movimentação',status:'Aprovada'}});return true;
  });
  await navegar(page,'Equipamentos');await page.getByRole('button',{name:'Mover Medidor QA',exact:true}).click();const d=dialogo(page,'Solicitar movimentação');await expect(d.getByRole('button',{name:'Enviar solicitação'})).toBeDisabled();
  await d.getByRole('combobox',{name:/^Novo destino/}).selectOption('1');await expect(d.getByRole('button',{name:'Enviar solicitação'})).toBeDisabled();await d.getByRole('combobox',{name:'Técnico responsável pelo recebimento',exact:true}).selectOption('Ana QA');
  await d.getByRole('spinbutton',{name:/^Quantidade/}).fill('99');await expect(d.getByRole('spinbutton',{name:/^Quantidade/})).toHaveValue('5');await d.getByRole('spinbutton',{name:/^Quantidade/}).fill('2');
  try{await d.getByRole('button',{name:'Enviar solicitação'}).click();await expect(d.getByRole('button',{name:'Enviando...'})).toBeDisabled();await page.keyboard.press('Escape');await expect(d).toBeVisible();}finally{gate.liberar();}
  await expect(d.getByRole('alert')).toContainText('Transporte recusado QA');await expect(d.getByRole('spinbutton',{name:/^Quantidade/})).toHaveValue('2');
  falhar=false;await d.getByRole('button',{name:'Enviar solicitação'}).click();await expect(d).toHaveCount(0);
  expect(mutacoes.filter(r=>r.rota==='/api/atividades/transporte-direto').at(-1).corpo).toMatchObject({tecnico:'Ana QA',obraDestinoId:1,materiais:[{nome:'Medidor QA',quantidade:2,identificacao:'SERIE-1'}]});
});
