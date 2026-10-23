// Carga manual local: nunca executada por migration ou inicialização da aplicação.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

assert.ok(process.argv.includes('--confirmar-banco-local'), 'Use --confirmar-banco-local somente no ambiente de testes.');
const base = 'http://localhost:8088/api';
const docker = args => execFileSync('docker', ['compose', ...args], { encoding:'utf8' }).trim();
const sql = command => execFileSync('docker', ['compose','exec','-T','database','sh','-c',
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'], { input:command, encoding:'utf8' }).trim();
const existentes=sql("SELECT count(*) FROM usuarios WHERE login LIKE 'demo.%';");
const retomar=process.argv.includes('--retomar-bootstrap');
if(retomar) {
  assert.equal(existentes,'1');
  assert.equal(sql("SELECT count(*) FROM usuarios WHERE login='demo.admin' AND nome='DEMO Administrador' AND ultimo_login IS NULL;"),'1');
} else assert.equal(existentes, '0', 'Contas DEMO já existem; não repetir a carga sobre cenários em uso.');
const origin = docker(['exec','-T','api','printenv','CORS_ALLOWED_ORIGINS']).split(',')[0];
const senha = () => `Demo!${randomBytes(15).toString('base64url')}9a`;
const temporaria = senha();
const perfis = { admin:'ADMIN', gerente:'GERENTE', rh:'RH', financeiro:'FINANCEIRO', estoque:'ESTOQUE', tecnico1:'TECNICO', tecnico2:'TECNICO', tst:'TST' };
const contas = Object.entries(perfis).map(([nome,perfil]) => ({ login:`demo.${nome}`, perfil, senha:senha() }));
const arquivo = `/tmp/era-demo-acessos-${Date.now()}.json`;
writeFileSync(arquivo, JSON.stringify({ aviso:'Somente testes. Não publicar ou versionar.', contas },null,2), { mode:0o600, flag:'wx' });
console.log(`Acessos locais (arquivo restrito): ${arquivo}`);
// Mesmos parâmetros Argon2id configurados no servidor; depende de libargon2 local.
const hash = execFileSync('python3',['-c',`import sys,ctypes,os
p=sys.stdin.buffer.read(); salt=os.urandom(16); out=ctypes.create_string_buffer(256)
lib=ctypes.CDLL('libargon2.so.1')
fn=lib.argon2id_hash_encoded
fn.argtypes=[ctypes.c_uint32,ctypes.c_uint32,ctypes.c_uint32,ctypes.c_void_p,ctypes.c_size_t,ctypes.c_void_p,ctypes.c_size_t,ctypes.c_size_t,ctypes.c_void_p,ctypes.c_size_t]
assert fn(2,19456,1,p,len(p),salt,len(salt),32,out,256)==0
print(out.value.decode())`],{input:temporaria,encoding:'utf8'}).trim();
assert.match(hash,/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]+\$[A-Za-z0-9+/]+$/);
if(retomar) sql(`UPDATE usuarios SET senha_hash='${hash}', tentativas_falhas=0, bloqueado_ate=NULL WHERE login='demo.admin' AND ultimo_login IS NULL;`);
else sql(`BEGIN;
INSERT INTO usuarios(nome,login,senha_hash,perfil,ativo,deve_alterar_senha,tentativas_falhas,versao_sessao,criado_em,atualizado_em)
VALUES ('DEMO Administrador','demo.admin','${hash}','ADMIN',true,true,0,0,now(),now());
COMMIT;`);

class Cliente {
  cookies = new Map(); csrf = '';
  async req(method,rota,body) {
    const headers = { 'Content-Type':'application/json', Origin:origin, Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ') };
    if(method!=='GET') headers['X-XSRF-TOKEN']=this.csrf;
    const r=await fetch(base+rota,{method,headers,body:body==null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
    for(const c of r.headers.getSetCookie()){const p=c.split(';')[0], i=p.indexOf('=');this.cookies.set(p.slice(0,i),p.slice(i+1));}
    const text=await r.text(); const data=text?JSON.parse(text):null;
    if(!r.ok) throw Error(`${method} ${rota}: ${r.status} ${data?.mensagem||'Falha'}`);
    return data;
  }
  async entrar(conta) {
    this.csrf=(await this.req('GET','/auth/csrf')).token;
    await this.req('POST','/auth/login',{login:conta.login,senha:temporaria});
    this.csrf=(await this.req('GET','/auth/csrf')).token;
    await this.req('POST','/auth/alterar-senha',{novaSenha:conta.senha});
    this.csrf=(await this.req('GET','/auth/csrf')).token;
    return this;
  }
}
const admin=await new Cliente().entrar(contas[0]);
const clientes={admin}; const funcionarios={};
for(const conta of contas.slice(1)) {
  const nome=conta.login.slice(5);
  const f=await admin.req('POST','/funcionarios',{nome:`DEMO ${nome}`,cargo:conta.perfil,status:'Ativo'});
  funcionarios[nome]=f;
  await admin.req('POST','/usuarios',{nome:f.nome,login:conta.login,perfil:conta.perfil,funcionarioId:f.id,senhaTemporaria:temporaria});
  clientes[nome]=await new Cliente().entrar(conta);
}
const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Manaus'}).format(new Date());
const obras=[];
for(const nome of ['Residencial Aurora','Escola Horizonte','Clínica Rio Negro']) obras.push(await admin.req('POST','/obras',{
  nome:`DEMO ${nome}`,cliente:'Cliente fictício',cidade:'Manaus',status:'Em andamento',inicio:hoje,
  responsaveis:[funcionarios.tecnico1.nome,funcionarios.tecnico2.nome,funcionarios.tst.nome]
}));
const equipamentos=[];
for(const [tipo,modelo,q,obra] of [
  ['Ferramentas','DEMO Furadeira',8,null],['Ferramentas','DEMO Furadeira',4,obras[0]],
  ['Ferramentas','DEMO Alicate',20,null],['Ferramentas','DEMO Alicate',6,obras[1]],
  ['Ferramentas','DEMO Escada',1,obras[0]],['EPI','DEMO Capacete',30,null],
  ['EPI','DEMO Capacete',10,obras[0]],['EPI','DEMO Luva',50,null],['EPI','DEMO Óculos',15,obras[1]]
]) equipamentos.push(await admin.req('POST','/equipamentos',{
  tipo,modelo,serie:`DEMO-${equipamentos.length+1}`,quantidade:q,controleQuantidade:q===1?'INDIVIDUAL':'LOTE',
  obraId:obra?.id,tecnico:obra?(tipo==='EPI'?funcionarios.tst.nome:funcionarios.tecnico1.nome):undefined,
  status:obra?'Em campo':'Em estoque',data:hoje,auditavel:tipo!=='EPI',observacoes:'Dados fictícios para testes manuais.'
}));
const criar = async(e,q,etapa,epi=false,origem=null,compra=q) => {
  const nome=epi?'tst':'tecnico2', analista=epi?clientes.rh:clientes.gerente;
  let p=await clientes[nome].req('POST','/atividades',{tecnico:funcionarios[nome].nome,obraDestinoId:obras[2].id,
    dataSolicitacao:hoje,materiais:[{nome:e.modelo,catalogoChave:e.catalogoChave,quantidade:q}],observacao:`DEMO — cenário ${etapa}`});
  if(etapa==='Pendente') return p;
  if(etapa==='Rejeitada') return analista.req('POST',`/atividades/${p.id}/rejeicao`,{motivo:'Material não necessário nesta etapa de teste'});
  p=await analista.req('POST',`/atividades/${p.id}/aprovacao`,{});
  if(etapa==='Aguardando financeiro')return p;
  await clientes.financeiro.req('POST',`/atividades/${p.id}/plano-financeiro`,{materiais:[{
    materialId:p.materiais[0].id,quantidadeCompra:compra,justificativa:compra?'DEMO: compra para preservar saldo da obra e atender demanda.':'',
    origens:origem?[{equipamentoId:origem.id,quantidade:q-compra}]:[]
  }]});
  p=await clientes.financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});
  if(etapa==='Aprovada')return p;
  if(compra)await clientes.estoque.req('POST',`/atividades/${p.id}/materiais/${p.materiais[0].id}/aquisicao`,{
    quantidade:compra,numeroNota:`DEMO-NF-${p.id}`,identificacao:`DEMO-COMPRA-${p.id}`});
  if(etapa==='Compra recebida')return p;
  const envios=await clientes.estoque.req('POST',`/atividades/${p.id}/execucao-plano`,{});
  for(const envio of envios) {
    await clientes.estoque.req('POST',`/atividades/${envio.id}/transito`,{});
    if(etapa==='Concluída') await clientes[nome].req('POST',`/atividades/${envio.id}/conclusao`,{});
  }
  return p;
};
await criar(equipamentos[0],2,'Pendente');
await criar(equipamentos[5],3,'Pendente',true);
await criar(equipamentos[2],4,'Aguardando financeiro');
await criar(equipamentos[7],8,'Aguardando financeiro',true);
await criar(equipamentos[0],6,'Aprovada',false,equipamentos[1],3);
await criar(equipamentos[5],5,'Aprovada',true);
await criar(equipamentos[2],3,'Compra recebida');
await criar(equipamentos[2],2,'Em trânsito',false,equipamentos[2],0);
await criar(equipamentos[5],2,'Em trânsito',true,equipamentos[5],0);
await criar(equipamentos[2],2,'Concluída',false,equipamentos[2],0);
await criar(equipamentos[7],3,'Concluída',true,equipamentos[7],0);
await criar(equipamentos[0],1,'Rejeitada');
await criar(equipamentos[5],1,'Rejeitada',true);
console.log('Carga concluída: 8 contas, 7 funcionários, 3 obras, 9 lotes/equipamentos iniciais e 13 pedidos.');
console.log('Pedidos e movimentações criados pela API; nenhum registro anterior removido.');
