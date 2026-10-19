import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModelosDocumentos } from '../src/services/modelosDocumentos.js';
import { atualizarQuantidadeCondicao, filtrarAuditorias, limiteQuantidadeCondicao, somarCondicoes, validarRegistroVistoria } from '../src/utils/auditoriaTecnico.js';
import { gerarPlanilhaAuditorias } from '../src/services/planilhaAuditorias.js';

const item={equipamentoId:1,tipo:'Ferramentas',modelo:'Alicate',serie:'FER-1',local:'Obra A',quantidade:3,bom:1,avaria:1,quebrado:1,observacao:'Cabo rachado'};
const ficha={id:10,tecnicoNome:'Ana',criadoEm:'2026-10-19T09:00:00-04:00',criadoPorNome:'Maria',criadoPorLogin:'gerente',status:'CONCLUIDA',itens:[item],fiscal:'Fiscal João',dataVistoria:'2026-10-19',registradoPorNome:'Carlos',registradoPorLogin:'admin',concluidaEm:'2026-10-19T11:00:00-04:00',observacoes:'Trocar o cabo.'};
const modelos=criarModelosDocumentos('logo');
test('ficha para impressão tem três estados em branco, observações e assinaturas',()=>{
  const html=modelos.vistoriaTecnico(ficha,false).conteudo;
  assert.match(html,/Bom/);assert.match(html,/Com avaria/);assert.match(html,/Quebrado/);
  assert.match(html,/Assinatura do fiscal/);assert.match(html,/Assinatura do técnico fiscalizado/);
  assert.match(html,/Observações gerais/);assert.match(html,/Qtd\.: ______/);
  assert.doesNotMatch(html,/vistoria-caixa">X|Trocar o cabo/);
});
test('resultado concluído preserva ficha, fiscal, autor do lançamento e contagens',()=>{
  const html=modelos.vistoriaTecnico(ficha,true).conteudo;
  assert.match(html,/#0010/);assert.match(html,/Fiscal João/);assert.match(html,/Carlos \(admin\)/);
  assert.match(html,/Cabo rachado/);assert.match(html,/Trocar o cabo/);
  assert.equal((html.match(/vistoria-caixa">X/g)||[]).length,3);
  assert.match(html,/Qtd\.: 1/);assert.match(html,/Obra A/);
});
test('auditoria aberta não é impressa como resultado definitivo',()=>{
  assert.doesNotMatch(modelos.vistoriaTecnico({...ficha,status:'ABERTA'},true).conteudo,/Resultado da vistoria/);
});
test('dados de vistoria são escapados no documento',()=>{
  const html=modelos.vistoriaTecnico({...ficha,tecnicoNome:'<script>ataque</script>',itens:[{...item,observacao:'<img src=x>'}]},true).conteudo;
  assert.doesNotMatch(html,/<script>|<img src=x>/);assert.match(html,/&lt;script&gt;/);
});
test('lotes permitem estados mistos sem classificar unidades ausentes',()=>{
  assert.equal(validarRegistroVistoria([item],true),'');
  assert.equal(validarRegistroVistoria([{...item,bom:0}],false),'');
  assert.ok(validarRegistroVistoria([{...item,bom:0}],true));
  assert.ok(validarRegistroVistoria([{...item,bom:5}],false));
  assert.ok(validarRegistroVistoria([{...item,bom:-1}],false));
  assert.ok(validarRegistroVistoria([{...item,bom:0.5}],false));
  assert.deepEqual(somarCondicoes([item]),{quantidade:3,bom:1,avaria:1,quebrado:1});
});
test('edição não aumenta a soma de 1 bom, 4 com avaria e 2 quebrados acima das 7 unidades',()=>{
  const sete={...item,quantidade:7,bom:1,avaria:4,quebrado:2};
  assert.equal(limiteQuantidadeCondicao(sete,'bom'),1);
  assert.equal(limiteQuantidadeCondicao(sete,'avaria'),4);
  assert.equal(limiteQuantidadeCondicao(sete,'quebrado'),2);
  assert.deepEqual(atualizarQuantidadeCondicao(sete,'bom','2'),sete);
  assert.deepEqual(atualizarQuantidadeCondicao(sete,'quebrado','99'),sete);
  const reduzido=atualizarQuantidadeCondicao(sete,'avaria','2');
  const redistribuido=atualizarQuantidadeCondicao(reduzido,'bom','3');
  assert.deepEqual([redistribuido.bom,redistribuido.avaria,redistribuido.quebrado],[3,2,2]);
  assert.equal(validarRegistroVistoria([redistribuido],true),'');
});
test('quantidades só aceitam inteiros no saldo disponível e permitem limpar para redistribuir',()=>{
  const vazio={...item,quantidade:7,bom:0,avaria:0,quebrado:0};
  for(const valor of ['8','-1','1.5','2147483648','abc'])assert.deepEqual(atualizarQuantidadeCondicao(vazio,'bom',valor),vazio);
  const preenchido=atualizarQuantidadeCondicao(vazio,'bom','7');
  assert.equal(limiteQuantidadeCondicao(preenchido,'avaria'),0);
  assert.deepEqual(atualizarQuantidadeCondicao(preenchido,'avaria','1'),preenchido);
  const limpo=atualizarQuantidadeCondicao(preenchido,'bom','');
  assert.equal(limiteQuantidadeCondicao(limpo,'avaria'),7);
  assert.equal(atualizarQuantidadeCondicao(limpo,'avaria','7').avaria,7);
});
test('filtro de obra usa a ficha histórica e exporta apenas os materiais daquele local',()=>{
  const a={...ficha,funcionarioId:9,itens:[{...item,obraId:1},{...item,equipamentoId:2,obraId:2,modelo:'OTDR',local:'Obra B'}]};
  const resultado=filtrarAuditorias([a],{obra:'2',tecnico:'9',inicio:'2026-10-19',fim:'2026-10-19',status:'CONCLUIDA'});
  assert.equal(resultado.length,1);assert.equal(resultado[0].itens.length,1);assert.equal(a.itens.length,2);
  const csv=gerarPlanilhaAuditorias(resultado);assert.match(csv,/OTDR/);assert.doesNotMatch(csv,/Alicate/);
  const pdf=modelos.relatorioVistorias(resultado,'Obra: Obra B').conteudo;assert.match(pdf,/Obra B/);assert.doesNotMatch(pdf,/Obra A/);
});
test('pesquisa combina técnico, obra, código e data e período usa criação em fichas abertas',()=>{
  const a={...ficha,status:'ABERTA',dataVistoria:null,funcionarioId:9};
  assert.equal(filtrarAuditorias([a],{busca:'#0010 Ana Obra A',inicio:'2026-10-19',fim:'2026-10-19'}).length,1);
  assert.equal(filtrarAuditorias([a],{status:'CONCLUIDA'}).length,0);
  assert.equal(filtrarAuditorias([a],{inicio:'2026-10-20'}).length,0);
});
test('planilha não executa fórmulas vindas de observações e preserva quebras e separadores',()=>{
  const csv=gerarPlanilhaAuditorias([{...ficha,observacoes:'=HYPERLINK("ataque")',itens:[{...item,observacao:'texto; com "aspas"\ne quebra'}]}]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv,/'=HYPERLINK/);assert.match(csv,/texto; com ""aspas""\ne quebra/);
});
