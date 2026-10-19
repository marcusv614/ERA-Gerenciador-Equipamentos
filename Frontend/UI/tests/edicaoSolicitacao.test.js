import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogoParaEdicao, agruparItensPedido, dadosEdicaoPedido, pedidoEmAtendimento } from '../src/utils/edicaoSolicitacao.js';

const item = { nome:'Escada', quantidade:1, catalogoChave:'ferramentas|escada|', identificacao:null };
const pedido = { tecnico:'João', obraOrigemId:null, obraDestinoId:2, materiais:[item] };
const equipamento = { tipo:'Ferramentas', modelo:'Escada', catalogoChave:item.catalogoChave, quantidadeDisponivel:3, status:'Em estoque', obraId:null };

test('saldo considera depósito e outras obras, exclui destino e arquivados',()=>{
  const catalogo=catalogoParaEdicao([equipamento,{...equipamento,obraId:1,status:'Em campo',quantidadeDisponivel:2},{...equipamento,obraId:2,quantidadeDisponivel:20},{...equipamento,arquivado:true,quantidadeDisponivel:10}],2);
  assert.equal(catalogo.length,1);assert.equal(catalogo[0].disponivel,5);
});
test('catálogo mantém material sem saldo e sem limitar quantidade solicitada',()=>{
  assert.equal(catalogoParaEdicao([{...equipamento,quantidadeDisponivel:0}],2)[0].disponivel,0);
  const dados=dadosEdicaoPedido(pedido,'João',2,[{...item,quantidade:100}], ' Novo ');
  assert.equal(dados.materiais[0].quantidade,100);assert.equal(dados.materiais[0].identificacao,null);assert.equal(dados.obraOrigemId,null);
});
test('pedido com materiais de origens diferentes não recebe escolha automática de séries',()=>{
  const dados=dadosEdicaoPedido(pedido,'João',2,[item,{...item,nome:'Alicate',catalogoChave:'ferramentas|alicate|'}],'');
  assert.equal(dados.materiais.length,2);assert.ok(dados.materiais.every((m)=>m.identificacao===null));assert.equal(dados.obraOrigemId,null);
});
test('pedido separado preserva origem e não envia substituição de materiais',()=>{
  const separado={...pedido,obraOrigemId:1,materiais:[{...item,identificacao:'ESC-1'}]};
  assert.equal(pedidoEmAtendimento(separado),true);
  const dados=dadosEdicaoPedido(separado,'João',2,[],'Observação');
  assert.equal(dados.obraOrigemId,1);assert.equal('materiais' in dados,false);
});
test('compra iniciada também bloqueia substituição de itens',()=>{
  const compra={...pedido,materiais:[{...item,quantidadeCompra:5}]};
  assert.equal(pedidoEmAtendimento(compra),true);assert.equal('materiais' in dadosEdicaoPedido(compra,'João',2,[],''),false);
});
test('variantes com medidas diferentes não se misturam',()=>{
  assert.equal(agruparItensPedido([item,{...item,catalogoChave:'ferramentas|escada|2m'}]).length,2);
});
