import test from 'node:test';
import assert from 'node:assert/strict';
import { formatarData, obterDataAtual } from '../src/utils/datas.js';
import { ferramentaManual, tipoSemNumeroSerie, identificacaoVisivel } from '../src/utils/identificacaoEquipamento.js';
import { ehFuncionarioEstoquista } from '../src/utils/classificacaoFuncionario.js';
import { obterEtapaSolicitacao, pertenceEtapaSolicitacao } from '../src/utils/statusSolicitacao.js';
import { obterHistoricoEquipamento } from '../src/utils/historicoEquipamento.js';
import { celulaCsv } from '../src/services/planilhasRelatorios.js';

for (const [entrada, esperado] of [[null,'—'],[undefined,'—'],['','—'],['2024-02-29','29/02/2024'],['2026-12-31','31/12/2026'],['texto','texto'],[new Date(2026,0,1),'01/01/2026']]) {
  test(`QA datas: ${String(entrada)}`, () => assert.equal(formatarData(entrada),esperado));
}
test('QA data atual usa calendário local sem deslocar o dia',()=>{
  const antes=new Date(); const atual=obterDataAtual(); const depois=new Date();
  const local=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  assert.ok([local(antes),local(depois)].includes(atual));
});
for (const tipo of ['Ferramentas',' ALICATES ','Brocas aço rápido','Cabos e fibras','Consumíveis e limpeza']) {
  test(`QA identificação: categoria sem série ${tipo}`,()=>assert.equal(tipoSemNumeroSerie(tipo),true));
}
test('QA identificação distingue ferramentas de equipamentos serializados',()=>{
  assert.equal(ferramentaManual('Ferramentas manuais'),true);
  assert.equal(ferramentaManual('OTDR'),false);
  assert.equal(tipoSemNumeroSerie('Fluke'),false);
  assert.equal(identificacaoVisivel('SERIE-1','Fluke'),'SERIE-1');
  assert.equal(identificacaoVisivel('SERIE-1','Ferramentas'),null);
  assert.equal(identificacaoVisivel(' era-001 ','OTDR'),null);
  assert.equal(identificacaoVisivel('INT-001','OTDR'),null);
  assert.equal(identificacaoVisivel('',null),null);
});
for (const [cargo, esperado] of [['Estoquista',true],['Auxiliar de ESTOQUE',true],['  Supervisor   de estoque ',true],['estoqueiro',false],['Técnico',false],['',false],[null,false]]) {
  test(`QA classificação de funcionário: ${cargo}`,()=>{
    assert.equal(ehFuncionarioEstoquista(cargo),esperado);
    assert.equal(ehFuncionarioEstoquista({cargo}),esperado);
  });
}
for (const [status,etapa] of [['Pendente','pendente'],['Aguardando financeiro','pendente'],['Aprovada','aceita'],['Aguardando coleta','aceita'],['Em trânsito','aceita'],['Rejeitada','rejeitada'],['Cancelada','rejeitada'],['Cancelamento solicitado','pendente'],['Concluída','finalizada'],['desconhecido','pendente'],[null,'pendente']]) {
  test(`QA transição de apresentação: ${status}`,()=>{
    assert.equal(obterEtapaSolicitacao(status).chave,etapa);
    assert.equal(pertenceEtapaSolicitacao(status,etapa),true);
    assert.equal(pertenceEtapaSolicitacao(status,'inexistente'),false);
  });
}
test('QA histórico não sintetiza movimentos e preserva registros reais',()=>{
  for(const historico of [null,undefined,{},'não é uma lista']) assert.deepEqual(obterHistoricoEquipamento({historico}),[]);
  const historico=[{id:1,status:'Cancelada'}]; assert.strictEqual(obterHistoricoEquipamento({historico}),historico);
});
for (const entrada of ['=SUM(A1:A2)',' +cmd','\t=1','\r=1','@SUM(A1)','-1','\uFEFF=1']) {
  test(`QA CSV neutraliza fórmula ${JSON.stringify(entrada)}`,()=>assert.ok(celulaCsv(entrada).startsWith('"\'')));
}
test('QA CSV preserva aspas, delimitador e quebra de linha dentro da célula',()=>{
  assert.equal(celulaCsv('a;"b"\nc'),'"a;""b""\nc"');
  assert.equal(celulaCsv(null),'""');
});
