import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Cliente, configuracaoTeste, senhaTemporaria, senhaDefinitiva } from './cliente.mjs';

const config=configuracaoTeste();
assert.match(config.mail,/^http:\/\/127\.0\.0\.1:\d+$/);
const compose=['compose','--env-file',config.envVazio,'-f',fileURLToPath(new URL('../../compose.test.yaml',import.meta.url)),'-p',config.project];
const sql=comando=>execFileSync('docker',[...compose,'exec','-T','database','psql','-U','era_test','-d','era_test','-At','-v','ON_ERROR_STOP=1'],{input:comando,encoding:'utf8'}).trim();
// Defesa adicional antes de qualquer fixture SQL (somente esta stack descartável).
const ids=execFileSync('docker',[...compose,'ps','-q','database'],{encoding:'utf8'}).trim();
assert.match(ids,/^[a-f0-9]+$/);
assert.equal(execFileSync('docker',['inspect','-f','{{index .Config.Labels "era.test"}}',ids],{encoding:'utf8'}).trim(),'true');
async function mensagens(){
  const r=await fetch(config.mail+'/mensagens',{signal:AbortSignal.timeout(3000)});
  return (await r.json()).map(raw=>{
    const n=raw.indexOf('\r\n\r\n'),cabecalho=raw.slice(0,n),corpo=raw.slice(n+4);
    if (/Content-Transfer-Encoding: base64/i.test(cabecalho)) return Buffer.from(corpo.replace(/\s/g,''),'base64').toString('utf8');
    if (/Content-Transfer-Encoding: quoted-printable/i.test(cabecalho)) return Buffer.from(corpo.replace(/=\r\n/g,'').replace(/=([0-9A-F]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16))),'latin1').toString('utf8');
    return corpo;
  });
}
async function esperarMensagem(procurar){
  for(let n=0;n<80;n++){
    const encontrada=(await mensagens()).findLast(procurar);if(encontrada)return encontrada;
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error('Mensagem fictícia não recebida.');
}
const admin=await new Cliente(config).entrar('audit-smoke-admin','TempCheck#578943',true);
assert.equal((await admin.req('GET','/auth/recuperacao/configuracao')).obrigatorio,true);
await admin.req('GET','/usuarios',undefined,403);
await admin.req('POST','/auth/recuperacao/email',{email:'admin.teste@gmail.com',senhaAtual:'Errada!123'},409);
await admin.req('POST','/auth/recuperacao/email',{email:'admin.teste@gmail.com',senhaAtual:senhaDefinitiva},204);
const codigo=(await esperarMensagem(m=>m.includes('código de confirmação'))).match(/\b[0-9]{8}\b/)[0];
await admin.req('GET','/usuarios',undefined,403);
await admin.req('POST','/auth/recuperacao/confirmar-email',{codigo:codigo==='00000000'?'11111111':'00000000'},409);
await admin.req('POST','/auth/recuperacao/confirmar-email',{codigo},204);
await admin.req('POST','/auth/recuperacao/confirmar-email',{codigo},409);
assert.equal((await admin.req('GET','/auth/recuperacao/configuracao')).emailVerificado,'admin.teste@gmail.com');
await admin.req('GET','/usuarios');

const conta=await admin.req('POST','/usuarios',{nome:'Estoque recuperação',login:'estoque.recuperacao',perfil:'ESTOQUE',senhaTemporaria},201);
const estoque=await new Cliente(config).entrar(conta.login,senhaTemporaria,true);
await estoque.req('GET','/auth/recuperacao/configuracao',undefined,403);
await estoque.req('POST','/auth/recuperacao/email',{email:'outro@gmail.com',senhaAtual:senhaDefinitiva},403);
const publico=new Cliente(config);await publico.token();
const respostaGenerica=await publico.req('POST','/auth/recuperacao/solicitar',{login:'inexistente'},202);
assert.deepEqual(await publico.req('POST','/auth/recuperacao/solicitar',{login:conta.login},202),respostaGenerica);
assert.deepEqual(await publico.req('POST','/auth/recuperacao/solicitar',{login:'audit-smoke-admin'},202),respostaGenerica);
const token=(await esperarMensagem(m=>m.includes('#recuperacao='))).match(/#recuperacao=([A-Za-z0-9_-]{43})/)[1];
const hash=createHash('sha256').update(token).digest('hex');
assert.equal(sql("SELECT token_hash FROM recuperacao_tokens WHERE finalidade='REDEFINIR_SENHA' ORDER BY id DESC LIMIT 1;"),hash);
await publico.req('POST','/auth/recuperacao/redefinir',{token:'x'.repeat(43),novaSenha:'NovaSegura!987'},409);
await publico.req('POST','/auth/recuperacao/redefinir',{token,novaSenha:'1234567'},400);
await publico.req('POST','/auth/recuperacao/redefinir',{token,novaSenha:'NovaSegura!987'},204);
await publico.req('POST','/auth/recuperacao/redefinir',{token,novaSenha:'OutraSegura!987'},409);
await admin.req('GET','/auth/me',undefined,401);
await admin.token();await admin.req('POST','/auth/login',{login:'audit-smoke-admin',senha:senhaDefinitiva},401);
await admin.entrar('audit-smoke-admin','NovaSegura!987');
console.log('Recuperação real: confirmação de e-mail, restrição ao administrador, resposta genérica, hash no banco, token de uso único e revogação de sessão.');

// Expirar e recuar somente o relógio das fixtures, sem esperas de 15 minutos.
sql("UPDATE recuperacao_tokens SET criado_em=criado_em-interval '2 minutes' WHERE finalidade='REDEFINIR_SENHA';");
const quantidadeAntes=(await mensagens()).length;
await publico.req('POST','/auth/recuperacao/solicitar',{login:'audit-smoke-admin'},202);
let novas=[];
for(let n=0;n<80;n++){
  novas=(await mensagens()).slice(quantidadeAntes);if(novas.some(m=>m.includes('#recuperacao=')))break;
  await new Promise(r=>setTimeout(r,100));
}
const expirado=novas.find(m=>m.includes('#recuperacao='))?.match(/#recuperacao=([A-Za-z0-9_-]{43})/)[1];
assert.ok(expirado);
sql("UPDATE recuperacao_tokens SET expira_em=now()-interval '1 minute' WHERE finalidade='REDEFINIR_SENHA';");
await publico.req('POST','/auth/recuperacao/redefinir',{token:expirado,novaSenha:'OutraSegura!987'},409);

await fetch(config.mail+'/falhar',{method:'POST',signal:AbortSignal.timeout(3000)});
sql("UPDATE recuperacao_tokens SET criado_em=criado_em-interval '2 minutes' WHERE finalidade='CONFIRMAR_EMAIL';");
const antes=await admin.req('GET','/auth/recuperacao/configuracao');
const falha=await admin.resposta('POST','/auth/recuperacao/email',{email:'novo.teste@gmail.com',senhaAtual:'NovaSegura!987'});
assert.equal(falha.status,409);assert.match(falha.dados.mensagem,/Não foi possível enviar/);
assert.deepEqual(await admin.req('GET','/auth/recuperacao/configuracao'),antes,'Falha SMTP não pode trocar o e-mail confirmado ou deixar token pendente');
const saude=await publico.req('GET','/actuator/health');assert.equal(saude.status,'UP');
console.log(`Token expirado e falha SMTP com rollback, sem quebrar o login nem a saúde da API: OK. ${admin.verificacoes+estoque.verificacoes+publico.verificacoes} requisições verificadas.`);
