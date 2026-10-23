import test from 'node:test';
import assert from 'node:assert/strict';
import { acompanhamentoSolicitacao as etapa, pedidosDoPerfil, visivelNoFinanceiro } from '../src/utils/acompanhamentoSolicitacao.js';
const material = { id:1, nome:'Escada', catalogoChave:'ferramentas|escada|', quantidade:10, quantidadeCompra:10, quantidadeEntradaEstoque:0 };
const pedido = { id:1, status:'Pendente', materiais:[material], tecnico:'Ana', obraDestinoId:2 };
test('Financeiro e sua prévia excluem pedidos pendentes e rejeitados na primeira etapa', () => {
  const recebidas = [pedido,{...pedido,id:2,status:'Aguardando financeiro'},{...pedido,id:3,status:'Rejeitada',eventosFinanceiros:[{tipo:'ALTERACAO'}]},{...pedido,id:4,status:'Rejeitada',eventosFinanceiros:[{tipo:'REJEICAO'}]}];
  assert.deepEqual(pedidosDoPerfil(recebidas,'FINANCEIRO').map(p=>p.id),[2,4]);
  assert.deepEqual(pedidosDoPerfil(recebidas,'GERENTE'),recebidas);assert.equal(pedidosDoPerfil(recebidas,'ADMIN'),recebidas);
  assert.equal(visivelNoFinanceiro({...pedido,status:'Aprovada',movimentacaoDireta:true}),false);
});
test('aprovação da Gerência coloca o pedido no Financeiro e o plano salvo indica preparação', () => {
  assert.equal(etapa(pedido).grupo,'gerencia');
  assert.equal(etapa({...pedido,status:'Aguardando financeiro'}).rotulo,'Aguardando análise financeira');
  assert.equal(etapa({...pedido,status:'Aguardando financeiro',planoFinanceiro:[{}]}).rotulo,'Plano financeiro em preparação');
});
test('compra autorizada não é apresentada como iniciada antes do registro real', () => {
  assert.equal(etapa({...pedido,status:'Aprovada'}).rotulo,'Aprovado · aguardando estoque');
  assert.equal(etapa({...pedido,status:'Aprovada',eventosFinanceiros:[{tipo:'INICIO_ATENDIMENTO'}]}).rotulo,'Compra em andamento');
});
test('compras parciais, recebimento da compra e separação são estados distintos', () => {
  const p={...pedido,status:'Aprovada',materiais:[{...material,quantidadeEntradaEstoque:6}]};
  assert.equal(etapa(p).rotulo,'Compra parcialmente recebida');assert.match(etapa(p).detalhe,/6 de 10/);
  assert.equal(etapa({...p,materiais:[{...material,quantidadeEntradaEstoque:10}]}).rotulo,'Compra recebida · falta separar');
  assert.equal(etapa({...p,materiais:[{...material,identificacao:'ESCADA-1'}]}).rotulo,'Pronto para envio');
});
test('providenciar transporte sem compra exige início registrado', () => {
  const p={...pedido,status:'Aprovada',materiais:[{...material,quantidadeCompra:0}]};
  assert.equal(etapa(p).rotulo,'Aprovado · aguardando estoque');
  assert.equal(etapa({...p,eventosFinanceiros:[{tipo:'INICIO_ATENDIMENTO'}]}).rotulo,'Providenciando materiais');
});
test('transporte e recebimento representam o andamento do atendimento, não da compra', () => {
  assert.equal(etapa({...pedido,status:'Em trânsito'}).passo,3);
  assert.equal(etapa({...pedido,status:'Concluída'}).passo,4);
  assert.equal(etapa({...pedido,status:'Concluída',materiais:[{...material,quantidade:6}],materiaisOriginais:[{quantidade:10}]}).parcial,true);
});
test('rejeição financeira é distinguida da decisão da Gerência e do RH', () => {
  assert.equal(etapa({...pedido,status:'Rejeitada'}).rotulo,'Rejeitado pela Gerência');
  assert.equal(etapa({...pedido,status:'Rejeitada',eventosFinanceiros:[{tipo:'REJEICAO'}]}).rotulo,'Rejeitado pelo Financeiro');
  assert.equal(etapa({...pedido,materiais:[{...material,catalogoChave:'epi|capacete|'}]}).gestor,'RH');
});
