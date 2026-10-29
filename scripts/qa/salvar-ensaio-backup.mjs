// Copia exclusivamente dump fictício cujo ensaio de restauração foi aprovado.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync,copyFileSync,chmodSync,constants} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../../',import.meta.url));process.chdir(raiz);
const candidatos=readdirSync('test-results').filter(n=>/^integracao-\d+$/.test(n)).sort((a,b)=>Number(b.slice(11))-Number(a.slice(11)));
let origem=null,evidencia=null;
for(const nome of candidatos){
 const pasta=path.join('test-results',nome,'backup-restauracao'),json=path.join(pasta,'backup-restauracao.json');
 if(!existsSync(json))continue;
 const r=JSON.parse(readFileSync(json,'utf8')).resultados?.[0];
 if(r?.resultado==='APROVADO'){origem=pasta;evidencia=r;break;}
}
assert.ok(origem,'Não há ensaio de restauração aprovado.');
const dump=path.join(origem,'banco-ficticio.dump'),conteudo=readFileSync(dump);
const sha256=createHash('sha256').update(conteudo).digest('hex');
assert.equal(conteudo.subarray(0,5).toString(),'PGDMP');assert.equal(sha256,evidencia.backup.sha256);assert.equal(conteudo.length,evidencia.backup.bytes);
const destino=path.resolve(process.argv[2]||path.join(os.homedir(),'Documents','Backups-ERA','ensaios'));
mkdirSync(destino,{recursive:true,mode:0o700});
const arquivo=path.join(destino,`ENSAIO-FICTICIO-ERA-${sha256.slice(0,16)}.dump`);
if(existsSync(arquivo))assert.equal(createHash('sha256').update(readFileSync(arquivo)).digest('hex'),sha256,'O destino já existe com outro conteúdo.');
else copyFileSync(dump,arquivo,constants.COPYFILE_EXCL);
chmodSync(arquivo,0o600);
assert.equal(createHash('sha256').update(readFileSync(arquivo)).digest('hex'),sha256);
const manifesto={tipo:'ENSAIO COM DADOS FICTÍCIOS',backupRealDaVps:false,arquivo,sha256,bytes:conteudo.length,origem,restauracao:'APROVADA',tabelas:evidencia.restauracao.tabelas.length,sequencias:evidencia.restauracao.sequencias.length,salvoEm:new Date().toISOString(),retencao:'Sem remoção automática; política dos dados reais ainda a definir.'};
const metadados=arquivo+'.json';
if(!existsSync(metadados))writeFileSync(metadados,JSON.stringify(manifesto,null,2)+'\n',{mode:0o600,flag:'wx'});
mkdirSync('test-results/quality-assurance/piloto',{recursive:true});writeFileSync('test-results/quality-assurance/piloto/backup-documentos.json',JSON.stringify(manifesto,null,2)+'\n');
console.log(JSON.stringify(manifesto,null,2));
