import test from 'node:test';
import assert from 'node:assert/strict';
import { comprasOperacionais, etapaEstoque, itensOperacionais, locaisOperacaoEstoque, ordenarFilaEstoque } from '../src/utils/operacaoEstoque.js';

const m={id:11,nome:'Chave Phillips',catalogoChave:'ferramentas|chave phillips|',quantidade:6,quantidadeCompra:6,quantidadeEntradaEstoque:0};
const pedido={id:1,status:'Aprovada',obraDestinoId:2,dataSolicitacao:'2026-10-22',materiais:[m],planoFinanceiro:[{materialId:11,origens:[]}]};
test('compra recebida deixa de ser apresentada como necessidade de comprar',()=>{
  assert.equal(etapaEstoque(pedido).chave,'comprar');
  const recebido={...pedido,materiais:[{...m,quantidadeEntradaEstoque:6}]};
  assert.equal(etapaEstoque(recebido).acao,'Confirmar separação');
  assert.equal(etapaEstoque(recebido).iniciar,false);
});
test('compras parciais mantêm somente o saldo pendente',()=>{
  assert.equal(etapaEstoque({...pedido,materiais:[{...m,quantidadeEntradaEstoque:2}]}).faltaCompra,4);
  assert.equal(comprasOperacionais([{...pedido,materiais:[{...m,quantidadeEntradaEstoque:2}]}])[0].pendenteEntrada,4);
});
test('início de compra ou retirada é registrado uma única vez antes da conclusão',()=>{
  assert.equal(etapaEstoque(pedido).acao,'Iniciar compra');
  assert.equal(etapaEstoque({...pedido,eventosFinanceiros:[{tipo:'INICIO_ATENDIMENTO'}]}).acao,undefined);
  const coleta={...pedido,materiais:[{...m,quantidadeCompra:0}],planoFinanceiro:[{materialId:11,origens:[{quantidade:6,obraOrigemId:1}]}]};
  assert.equal(etapaEstoque(coleta).acao,'Iniciar separação');
  assert.equal(etapaEstoque({...coleta,eventosFinanceiros:[{tipo:'INICIO_ATENDIMENTO'}]}).acao,'Confirmar separação');
});
test('o estoque confirma envio e aguarda recebimento pelo técnico',()=>{
  const separado={...pedido,materiais:[{...m,identificacao:'ERA-1'}]};
  assert.equal(etapaEstoque(separado).acao,'Confirmar envio');
  assert.equal(etapaEstoque({...separado,status:'Em trânsito'}).acao,undefined);
  assert.equal(etapaEstoque({...separado,status:'Em trânsito'}).chave,'aguardar');
});
test('retorno ao depósito é recebido pelo estoque; encerrados não têm ações',()=>{
  for(const status of ['Aguardando coleta','Em trânsito'])assert.equal(etapaEstoque({...pedido,status,obraDestinoId:null}).acao,'Confirmar recebimento');
  for(const status of ['Concluída','Rejeitada','Pendente','Aguardando financeiro'])assert.equal(etapaEstoque({...pedido,status}).acao,undefined);
  assert.equal(etapaEstoque({...pedido,planoFinanceiro:[]}).acao,undefined);
});
test('fila prioriza o que pode sair e depois os pedidos mais antigos dentro da etapa',()=>{
  const antigo={...pedido,id:2,dataSolicitacao:'2026-10-20'},pronto={...pedido,id:3,materiais:[{...m,identificacao:'ERA-1'}]};
  const enviados={...pedido,id:4,status:'Em trânsito'};
  assert.deepEqual(ordenarFilaEstoque([pedido,enviados,antigo,pronto]).map(p=>p.id),[3,2,1,4]);
});
test('o mesmo material aparece agrupado com as quantidades e origens corretas',()=>{
  const misto={...pedido,materiais:[{...m,quantidade:3,quantidadeCompra:0},{...m,id:12,quantidade:2,quantidadeCompra:2}],planoFinanceiro:[{materialId:11,origens:[{obraOrigemId:1,quantidade:3,identificacao:'ERA-A'}]},{materialId:12,origens:[]}]};
  const [item]=itensOperacionais(misto);assert.equal(item.quantidade,5);assert.equal(item.compra,2);assert.equal(item.origens.length,1);assert.equal(item.origens[0].obraOrigemId,1);
  assert.deepEqual(locaisOperacaoEstoque(misto).sort(),['1','2']);
});
test('compras históricas não viram novas entradas de estoque',()=>{
  assert.equal(comprasOperacionais([{...pedido,status:'Concluída',compras:[m]}]).length,0);
  assert.equal(comprasOperacionais([{...pedido,materiais:[{...m,identificacao:'ERA-SEPARADO'}],compras:[m]}]).length,0);
});
