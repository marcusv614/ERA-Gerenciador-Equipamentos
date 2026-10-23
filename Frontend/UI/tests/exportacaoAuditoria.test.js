import test from 'node:test';
import assert from 'node:assert/strict';
import { celulaCsv, gerarCsv, dataRegistro } from '../src/services/planilhasRelatorios.js';
import { relatorioPedido, relatorioPedidosObra, relatorioComprasObra, relatorioFuncionario } from '../src/services/modelosAuditoriaPedidos.js';
import { validarFiltro, incluirLinha, linhasDoDocumento } from '../src/services/controlesExportacao.js';

const pedido={id:7,obra:'Obra A',solicitante:'Maria',conta:'maria',tecnico:'João',criadoEm:'2026-10-22T15:00:00Z',materiais:[{material:'Luva',quantidade:4}],eventos:[{atendimento:7,acao:'APROVACAO',instante:'2026-10-23T02:00:00Z',autor:'Financeiro',conta:'fin',descricao:'<script>alert(1)</script>'}],atendimentos:[{id:7,status:'Concluída'}],compras:[{atendimento:7,material:'Luva',quantidade:4,notaFiscal:'NF-12',fornecedor:'Fornecedor',instante:'2026-10-23T12:00:00Z',autor:'Estoquista',conta:'estoque',legado:false}],avisos:[]};
test('planilha protege fórmulas, separadores, aspas e preserva UTF-8',()=>{
  for(const v of ['=1+1',' +SUM(A1)','@x','-1','\tcmd','\r=1'])assert.ok(celulaCsv(v).startsWith('"\''));
  assert.equal(celulaCsv('NF "A";12'),'"NF ""A"";12"');assert.ok(gerarCsv([['João','1;2']]).startsWith('\uFEFF'));assert.match(gerarCsv([['a'],['b']]),/\r\n/);
});
test('dia do registro respeita Manaus inclusive na virada UTC',()=>{
  assert.equal(dataRegistro('2026-10-23T02:00:00Z'),'2026-10-22');assert.equal(dataRegistro('2026-10-23'),'2026-10-23');assert.equal(dataRegistro('inválido'),'');
});
test('pedidos da obra contém apenas fluxo, sem misturar compra e inventário',()=>{
  const html=relatorioPedidosObra([pedido]).conteudo;assert.match(html,/Maria/);assert.match(html,/Financeiro/);assert.match(html,/data-data="2026-10-22"/);assert.doesNotMatch(html,/Luva|NF-12|Saldo|<script>/);assert.match(html,/&lt;script&gt;/);
});
test('compras da obra usa apenas entradas homologadas e sua data de conferência',()=>{
  const html=relatorioComprasObra([pedido]).conteudo;assert.match(html,/Luva/);assert.match(html,/NF-12/);assert.match(html,/Estoquista/);assert.match(html,/data-data="2026-10-23"/);assert.doesNotMatch(html,/alert\(1\)/);
});
test('pedido individual e funcionário preservam fluxo e compras sem página por pedido',()=>{
  const individual=relatorioPedido(pedido).conteudo;assert.match(individual,/Quantidade original/);assert.match(individual,/Concluída/);assert.match(individual,/NF-12/);
  const funcionario=relatorioFuncionario([pedido],'João').conteudo;assert.match(funcionario,/João/);assert.match(funcionario,/NF-12/);assert.doesNotMatch(funcionario,/page-break-before/);
});
test('filtro da dashboard usa limites inclusivos e não apresenta contexto como saldo histórico',()=>{
  const linhas=[['2026-10-22',false],['2026-10-23',false],['',false],['',true]];
  assert.deepEqual(linhas.map(l=>incluirLinha(...l,{modo:'dia',inicio:'2026-10-22'})),[true,false,false,true]);
  assert.deepEqual(linhas.map(l=>incluirLinha(...l,{modo:'periodo',inicio:'2026-10-22',fim:'2026-10-23'})),[true,true,false,true]);
  assert.deepEqual(linhas.map(l=>incluirLinha(...l,{modo:'todos'})),[true,true,true,true]);
  assert.ok(validarFiltro({modo:'periodo',inicio:'2026-10-22',fim:'2026-10-21'}));
  assert.ok(validarFiltro({modo:'dia',inicio:''}));
  assert.ok(validarFiltro({modo:'periodo',inicio:'2026-10-22',fim:''}));
  assert.equal(validarFiltro({modo:'dia',inicio:'2026-10-22'}),'');
});
test('data de descrição livre não é usada como data do registro',()=>{
  const tabela={hasAttribute:()=>false,querySelectorAll:()=>[{textContent:'Descrição'},{textContent:'Data registrada'}]};
  const tr={closest:()=>tabela,hasAttribute:()=>false,cells:[{textContent:'Algo em 01/01/2020'},{textContent:'22/10/2026'}]};
  assert.equal(linhasDoDocumento({querySelectorAll:()=>[tr]})[0].data,'2026-10-22');
});
