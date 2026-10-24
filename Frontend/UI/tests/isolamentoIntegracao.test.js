import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { configuracaoTeste } from '../../../scripts/testes/cliente.mjs';

const valida = {descartavel:true,project:'era-tests-abcdef012345',database:'era_test',url:'http://127.0.0.1:35001',ui:'http://127.0.0.1:35002'};
function verificar(config,executar) {
  const diretorio=mkdtempSync(path.join(tmpdir(),'era-tests-guard-'));
  const arquivo=path.join(diretorio,'config.json');
  try {writeFileSync(arquivo,JSON.stringify(config),{mode:0o600});executar(arquivo);}
  finally {rmSync(diretorio,{recursive:true,force:true});}
}
test('executor aceita somente configuração explícita de stack descartável',()=>{
  verificar(valida,arquivo=>assert.deepEqual(configuracaoTeste(arquivo),valida));
  for (const campo of ['descartavel','project','database','url','ui']) {
    const config={...valida};delete config[campo];
    verificar(config,arquivo=>assert.throws(()=>configuracaoTeste(arquivo)));
  }
});
test('executor recusa projetos e bancos habituais antes de qualquer requisição',()=>{
  for (const config of [{...valida,project:'era-erp'},{...valida,database:'era_erp'},{...valida,descartavel:false}]) verificar(config,arquivo=>assert.throws(()=>configuracaoTeste(arquivo)));
});
test('executor recusa endereços públicos, credenciais e caminhos arbitrários',()=>{
  for (const url of ['https://exemplo.com','http://localhost:8088','http://127.0.0.1:35001/api','http://usuario:senha@127.0.0.1:35001','http://127.0.0.1:35001?alvo=outro']) {
    for (const campo of ['url','ui']) verificar({...valida,[campo]:url},arquivo=>assert.throws(()=>configuracaoTeste(arquivo)));
  }
});
