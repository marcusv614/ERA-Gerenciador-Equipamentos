import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModelosDocumentos } from '../src/services/modelosDocumentos.js';

const modelos=criarModelosDocumentos('logo');
const buscar=id=>({nome:`Obra ${id}`});
const pedido={id:10,status:'Aprovada',obraDestinoId:2,tecnico:'Ana',materiais:[{id:1,nome:'Escada',quantidade:10,quantidadeCompra:4,quantidadeAdquirida:2,quantidadeEntradaEstoque:1}],planoFinanceiro:[{materialId:1,nome:'Escada',quantidadeCompra:4,origens:[{obraOrigemId:null,identificacao:'DEP-1',quantidade:2},{obraOrigemId:1,identificacao:'OBRA-1',quantidade:4}]}],entradasCompra:[{obraOrigemId:null,identificacao:'COMPRA-1',quantidade:1,nome:'Escada'}],eventosFinanceiros:[{tipo:'APROVACAO_INICIAL',autorNome:'Gerente',registradoEm:'2026-10-22T08:00:00-04:00'},{tipo:'APROVACAO',autorNome:'Financeiro',registradoEm:'2026-10-22T09:00:00-04:00'}]};

test('ordem destaca destino, agrupa retiradas por local e usa datas reais de aprovação',()=>{
  const html=modelos.ordemAtendimento(pedido,buscar).conteudo;
  assert.match(html,/Entregar em<\/span><strong>Obra 2/);
  assert.match(html,/Retirar em: Depósito central/);assert.match(html,/Retirar em: Obra 1/);
  for(const serie of ['DEP-1','OBRA-1','COMPRA-1'])assert.equal((html.match(new RegExp(serie,'g'))||[]).length,1);
  assert.match(html,/22\/10\/2026.*?08:00:00.*?Gerente/);assert.match(html,/22\/10\/2026.*?09:00:00.*?Financeiro/);
});
test('ordem calcula apenas o saldo a comprar e separa compras que aguardam entrada',()=>{
  const html=modelos.ordemAtendimento(pedido,buscar).conteudo;
  assert.match(html,/<td>Escada<\/td><td>4<\/td><td>1<\/td><td>2<\/td><td>1<\/td>/);
  assert.doesNotMatch(html,/Comprar 4/);
});
test('após separação imprime apenas origens reais deste lote, sem repetir plano e compras',()=>{
  const html=modelos.ordemAtendimento({...pedido,solicitacaoPaiId:7,obraOrigemId:3,materiais:[{nome:'Escada',quantidade:2,identificacao:'LOTE-REAL'}]},buscar).conteudo;
  assert.match(html,/Pedido original.*?#0007/);assert.match(html,/Retirar em: Obra 3/);assert.match(html,/<td>Escada<\/td><td>2<\/td><td>LOTE-REAL<\/td>/);
  assert.doesNotMatch(html,/DEP-1|OBRA-1|COMPRA-1|Compras deste atendimento/);
});
test('ordem pendente não autoriza compras ou coleta nem inventa data de aprovação',()=>{
  const html=modelos.ordemAtendimento({...pedido,status:'Aguardando financeiro',eventosFinanceiros:[]},buscar).conteudo;
  assert.match(html,/Não iniciar compras ou retiradas/);assert.match(html,/Aprovação ainda não registrada/);assert.doesNotMatch(html,/Retirar em:|Compras deste atendimento/);
});
test('ordem concluída previne nova execução e texto livre permanece escapado',()=>{
  const html=modelos.ordemAtendimento({...pedido,status:'Concluída',observacao:'<img src=x onerror=alert(1)>'},buscar).conteudo;
  assert.match(html,/Não executar novas compras/);assert.doesNotMatch(html,/<img src=x/);assert.match(html,/&lt;img/);
});
test('relatório não duplica o resumo nem inclui um plano antigo após separação',()=>{
  const html=modelos.auditoriaSolicitacao({...pedido,obraOrigemId:3,materiais:[{nome:'Escada',quantidade:2,identificacao:'REAL'}]},buscar).conteudo;
  assert.doesNotMatch(html,/Resumo por material|Retiradas planejadas|DEP-1|OBRA-1/);assert.match(html,/Itens deste atendimento/);assert.match(html,/Financeiro/);
});
