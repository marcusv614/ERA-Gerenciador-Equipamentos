import assert from 'node:assert/strict';
import { Cliente, configuracaoTeste, senhaTemporaria, senhaDefinitiva, hoje } from './cliente.mjs';
const config = configuracaoTeste(), clientes = {};
for (const conta of config.contas) clientes[conta.perfil] = await new Cliente(config).entrar(conta.login,conta.senha);
const admin = clientes.ADMIN;
const matriz = [
  ['/usuarios',['ADMIN']],
  ['/usuarios/eventos-seguranca',['ADMIN']],
  ['/auth/recuperacao/configuracao',['ADMIN']],
  ['/funcionarios',['ADMIN','GERENTE','RH','FINANCEIRO']],
  ['/painel/resumo',['ADMIN','GERENTE','FINANCEIRO']],
  ['/deposito/equipamentos',['ADMIN','GERENTE','ESTOQUE']],
  ['/auditorias',['ADMIN','GERENTE','RH']],
  ['/atividades/pedidos-financeiros',['ADMIN','FINANCEIRO']],
  ['/atividades/pedidos-rh',['ADMIN','RH']],
  ['/equipamentos/disponibilidade-financeira',['ADMIN','FINANCEIRO']],
  ['/equipamentos',['ADMIN','GERENTE','RH','ESTOQUE','TECNICO','TST']],
  ['/relatorios/pedidos',['ADMIN','GERENTE','RH','FINANCEIRO']],
];
const anonimo = new Cliente(config);
for (const [rota,permitidos] of matriz) {
  await anonimo.req('GET',rota,undefined,401);
  for (const [perfil,c] of Object.entries(clientes)) await c.req('GET',rota,undefined,permitidos.includes(perfil)?200:403);
}
for (const [perfil,c] of Object.entries(clientes)) {
  for (const rota of ['/usuarios','/funcionarios','/equipamentos','/obras','/categorias-equipamento']) {
    const permitido = rota==='/usuarios' ? perfil==='ADMIN' : ['ADMIN','GERENTE'].includes(perfil);
    if (!permitido) await c.req('POST',rota,{},403);
  }
  await c.req('POST','/equipamentos/1/movimentacoes',{},403);
}
console.log('Matriz real de autorização: 12 consultas × 7 perfis + anônimo; cadastros e rota legada bloqueados.');

for (const c of Object.values(clientes)) {
  const antes = await admin.req('GET','/atividades');
  await c.req('POST','/atividades',{},403,{ semCsrf:true });
  const token = c.csrf;c.csrf='invalido';await c.req('POST','/atividades',{},403);c.csrf=token;
  assert.deepEqual(await admin.req('GET','/atividades'),antes,'CSRF inválido não pode causar alterações');
}
const externo = await anonimo.resposta('OPTIONS','/usuarios',undefined,{headers:{Origin:'https://invasor.invalid','Access-Control-Request-Method':'GET'}});
assert.equal(externo.status,403);assert.equal(externo.headers.get('access-control-allow-origin'),null);

const novo = await admin.req('POST','/usuarios',{nome:'Conta segurança',login:'teste.seguranca',perfil:'ESTOQUE',senhaTemporaria},201);
const primeiro = new Cliente(config);
await primeiro.token();
const loginInicial=await primeiro.resposta('POST','/auth/login',{login:novo.login,senha:senhaTemporaria});
assert.equal(loginInicial.status,200);
const cookieSessao=loginInicial.headers.getSetCookie().find(c=>c.startsWith('JSESSIONID='));
assert.ok(cookieSessao,'Login precisa emitir cookie de sessão');
assert.match(cookieSessao,/HttpOnly/i);assert.match(cookieSessao,/SameSite=Lax/i);
await primeiro.token();
assert.equal((await primeiro.req('GET','/auth/me')).deveAlterarSenha,true);
await primeiro.req('GET','/atividades',undefined,403);
await primeiro.req('POST','/auth/alterar-senha',{novaSenha:'1234567'},400);
await primeiro.req('POST','/auth/alterar-senha',{novaSenha:senhaDefinitiva},204);
await primeiro.token();
assert.equal((await primeiro.req('GET','/auth/me')).deveAlterarSenha,false);
await primeiro.req('GET','/atividades');
const cookieResposta = await primeiro.resposta('GET','/auth/csrf');
assert.ok(cookieResposta.headers.get('x-content-type-options')==='nosniff');
const segundo = await new Cliente(config).entrar(novo.login);
await primeiro.req('GET','/auth/me',undefined,401);
assert.equal((await segundo.req('GET','/auth/me')).login,novo.login);
await segundo.req('POST','/auth/alterar-senha',{senhaAtual:'Errada!123',novaSenha:'OutraSegura!987'},409);
await segundo.req('POST','/auth/logout',{},204);
await segundo.req('GET','/auth/me',undefined,401);

const ativo = await new Cliente(config).entrar(novo.login);
await admin.req('PATCH',`/usuarios/${novo.id}/status`,{ativo:false});
await ativo.req('GET','/auth/me',undefined,401);
await ativo.token();await ativo.req('POST','/auth/login',{login:novo.login,senha:senhaDefinitiva},401);
await admin.req('PATCH',`/usuarios/${novo.id}/status`,{ativo:true});
await ativo.entrar(novo.login);
await admin.req('POST',`/usuarios/${novo.id}/redefinicao-senha`,{senhaTemporaria:'ResetTeste!8729'});
await ativo.req('GET','/auth/me',undefined,401);
await ativo.token();await ativo.req('POST','/auth/login',{login:novo.login,senha:senhaDefinitiva},401);
await ativo.req('POST','/auth/login',{login:novo.login,senha:'ResetTeste!8729'});
assert.equal((await ativo.req('GET','/auth/me')).deveAlterarSenha,true);

const bloqueado = await admin.req('POST','/usuarios',{nome:'Bloqueio teste',login:'teste.bloqueio',perfil:'ESTOQUE',senhaTemporaria},201);
const tentativas = new Cliente(config);await tentativas.token();
for (let n=0;n<5;n++) await tentativas.req('POST','/auth/login',{login:bloqueado.login,senha:'Errada!123'},401);
await tentativas.req('POST','/auth/login',{login:bloqueado.login,senha:senhaTemporaria},401);
assert.ok((await admin.req('GET','/usuarios')).find(u=>u.id===bloqueado.id).bloqueadoAte);
const eventos = await admin.req('GET','/usuarios/eventos-seguranca?tipo=LOGIN_BLOQUEADO');
assert.ok(JSON.stringify(eventos).includes('LOGIN_BLOQUEADO'));
assert.ok(!JSON.stringify(eventos).includes('Errada!123'));
console.log('Autenticação real: troca obrigatória, mínimo de senha, concorrência de sessões, logout, desativação, reset e bloqueio após cinco erros.');

const antes = await admin.req('GET','/funcionarios');
for (const corpo of ['{','[]','null']) await admin.req('POST','/funcionarios',corpo,400,{bruto:true});
await admin.req('POST','/funcionarios','nome=x',415,{bruto:true,headers:{'Content-Type':'text/plain'}});
await admin.req('POST','/funcionarios',{nome:'',cargo:'',status:'Ativo'},400);
await admin.req('GET','/equipamentos/invalido/historico',undefined,400);
await admin.req('GET','/equipamentos/999999999/historico',undefined,404);
await admin.req('GET','/usuarios/eventos-seguranca?inicio=nao-data',undefined,400);
await admin.req('PATCH','/usuarios',{},405);
assert.deepEqual(await admin.req('GET','/funcionarios'),antes,'Entradas inválidas não podem persistir registros');
await anonimo.token();
await anonimo.req('POST','/auth/login',{login:"admin' OR '1'='1",senha:'InjecaoNaoPodeAutenticar!42'},401);
const nomeXss='<img src=x onerror="window.__eraXss=1">';
const entradaXss=await admin.req('POST','/funcionarios',{nome:nomeXss,cargo:'Teste de texto não confiável',status:'Ativo'},201);
assert.equal(entradaXss.nome,nomeXss,'Texto informado deve ser preservado como dado, nunca executado');
const ferramenta = config.equipamentos[2], epi = config.equipamentos[7], destino = config.obras[2];
const pedido = e => ({tecnico:'FORJADO',solicitanteLogin:'demo.admin',solicitante:'Administrador',obraDestinoId:destino.id,dataSolicitacao:hoje(),materiais:[{nome:e.modelo,catalogoChave:e.catalogoChave,quantidade:1}]});
const antesDasCategorias=await admin.req('GET','/atividades');
await clientes.TECNICO.req('POST','/atividades',pedido(epi),409);
await clientes.TST.req('POST','/atividades',pedido(ferramenta),409);
assert.deepEqual(await admin.req('GET','/atividades'),antesDasCategorias,'Categoria incompatível não pode gerar pedido');
const usuarioTecnico = config.contas.filter(u=>u.perfil==='TECNICO').at(-1);
const tecnico = await new Cliente(config).entrar(usuarioTecnico.login,usuarioTecnico.senha);
const forjado = await tecnico.req('POST','/atividades',pedido(ferramenta),201);
assert.equal(forjado.solicitanteLogin,usuarioTecnico.login);
assert.notEqual(forjado.solicitante,'Administrador');
for (const campo of ['senha','senhaHash','senha_hash','token']) assert.ok(!JSON.stringify(await admin.req('GET','/usuarios')).includes(`"${campo}":`));
const ausente = await anonimo.resposta('GET','/auth/me');assert.equal(ausente.status,401);
console.log('Erros HTTP, payloads inválidos, CORS, CSRF, autoria forjada, restrições EPI e respostas sem credenciais: OK.');
console.log(`${Object.values(clientes).reduce((n,c)=>n+c.verificacoes,0)+anonimo.verificacoes} verificações na matriz e consultas (além das sessões auxiliares).`);
