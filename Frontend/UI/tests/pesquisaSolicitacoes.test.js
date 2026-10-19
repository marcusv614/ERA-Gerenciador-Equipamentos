import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarSolicitacoes, pesquisarSolicitacoes, locaisDoPedido } from '../src/utils/pesquisaSolicitacoes.js';

const pedidos=[
  {id:1,tecnico:'João',obraOrigemId:10,obraDestinoId:20,dataSolicitacao:'2026-10-15',status:'Concluída',observacao:'Entregar pela manhã',materiais:[{nome:'Escada',identificacao:'ESC-001'}]},
  {id:11,tecnico:'Maria',obraOrigemId:null,obraDestinoId:20,dataSolicitacao:'2026-10-16',status:'Pendente',materiais:[{nome:'Alicate',identificacao:null}]},
  {id:23,solicitacaoPaiId:1,tecnico:'João',obraOrigemId:null,obraDestinoId:20,dataSolicitacao:'2026-10-15',status:'Rejeitada',materiais:[{nome:'Escada',identificacao:'ESC-002'}]},
];
const buscar=(id)=>({nome:id===10?'São João — obra antiga':'Condomínio Central'});
const ids=(lista)=>lista.map(({id})=>id);

test('código aceita hash, zeros e número simples sem confundir 1 com 11',()=>{
  for(const termo of ['1','0001','#0001','solicitação #0001','código 1']) assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,termo,buscar)),[1,23]);
});
test('código próprio de atendimento continua pesquisável',()=>{assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'#0023',buscar)),[23]);});
test('obra de origem e destino participam da busca sem acentos',()=>{
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'sao joao',buscar)),[1]);
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'condominio',buscar)),[1,11,23]);
});
test('permite combinar código com material e técnico em qualquer ordem',()=>{assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'escada joao #0001',buscar)),[1,23]);});
test('busca inclui série, observação, data brasileira e status mostrado na tela',()=>{
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'ESC-001',buscar)),[1]);
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'manha',buscar)),[1]);
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'15/10/2026',buscar)),[1,23]);
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'finalizada',buscar)),[1]);
});
test('filtro de obra considera origem e destino sem declarar depósito para pedido ainda não separado',()=>{
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos,{obra:'10'})),[1]);
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos,{obra:'20'})),[1,11,23]);
  assert.deepEqual(locaisDoPedido(pedidos[1]),['20']);
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos,{obra:'deposito'})),[23]);
});
test('período é inclusivo e combina com obra e situação',()=>{
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos,{inicio:'2026-10-15',fim:'2026-10-15',obra:'20',etapa:'finalizada'})),[1]);
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos,{inicio:'2026-10-16'})),[11]);
  assert.deepEqual(filtrarSolicitacoes(pedidos,{inicio:'2026-10-19',fim:'2026-10-15'}),[]);
});
test('pedidos concluídos e rejeitados permanecem disponíveis sem filtro de situação',()=>{
  assert.deepEqual(ids(pesquisarSolicitacoes(pedidos,'escada',buscar)),[1,23]);
  assert.deepEqual(ids(filtrarSolicitacoes(pedidos)),[1,11,23]);
});
test('pesquisa vazia e sem resultado não alteram a lista original',()=>{
  assert.equal(pesquisarSolicitacoes(pedidos,'   ',buscar),pedidos);
  assert.deepEqual(pesquisarSolicitacoes(pedidos,'inexistente',buscar),[]);
  assert.deepEqual(ids(pedidos),[1,11,23]);
});
