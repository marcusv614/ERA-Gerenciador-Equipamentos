import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModelosDocumentos } from '../src/services/modelosDocumentos.js';
import { obterHistoricoEquipamento } from '../src/utils/historicoEquipamento.js';
import { localizarEquipamentos } from '../src/utils/localizacaoEquipamentos.js';

const modelos=criarModelosDocumentos('data:image/png;base64,teste');
const obra={id:1,nome:'Obra A',inicio:'2026-01-01',responsaveis:['Maria']};
const buscar=(id)=>({id,nome:id===1?'Obra A':'Obra B'});
const material={nome:'Escada',quantidade:2,catalogoChave:'ferramentas|escada|',identificacao:null};
const pedido={id:3,obraOrigemId:null,obraDestinoId:2,tecnico:'João',status:'Pendente',materiais:[material]};

test('pedido não separado não é apresentado como material saindo do depósito',()=>{
  const html=modelos.auditoriaSolicitacao(pedido,buscar).conteudo;
  assert.match(html,/Ainda não definida pelo estoque/);assert.match(html,/Não selecionado/);
  assert.doesNotMatch(html,/Depósito central/);
});
test('relatório identifica pedido original e horários reais de saída e recebimento',()=>{
  const html=modelos.auditoriaSolicitacao({...pedido,solicitacaoPaiId:1,transitoEm:'2026-10-15T10:00:00-04:00',concluidaEm:'2026-10-17T14:00:00-04:00',status:'Concluída'},buscar).conteudo;
  assert.match(html,/Pedido original.*?#0001/);assert.match(html,/15\/10\/2026.*?10:00:00/);assert.match(html,/17\/10\/2026.*?14:00:00/);
});
test('inventário distingue presentes, reservas e unidades em transporte sem somar duas vezes',()=>{
  const e={id:1,modelo:'Escada',tipo:'Ferramentas',serie:'ESC-1',obraId:1,quantidade:10,quantidadeReservada:5,notaFiscal:'NF-1',status:'Em campo'};
  const [localizado]=localizarEquipamentos([e],[{...pedido,obraOrigemId:1,status:'Em trânsito',materiais:[{...material,quantidade:3,identificacao:'ESC-1'}]}]);
  const html=modelos.inventarioObra(obra,[localizado],buscar).conteudo;
  assert.match(html,/<td>7<\/td><td>2<\/td><td>3<\/td>/);
  assert.match(html,/NF-1/);
  const destino=modelos.inventarioObra({...obra,id:2,nome:'Obra B'},[localizado],buscar).conteudo;
  assert.match(destino,/Entradas em transporte/);assert.match(destino,/<td>#0003<\/td><td>Escada<\/td><td>ESC-1<\/td><td>3<\/td><td>Obra A/);
});
test('itens arquivados não entram no inventário atual',()=>{
  assert.doesNotMatch(modelos.inventarioObra(obra,[{obraId:1,modelo:'ARQUIVADO',arquivado:true}],buscar).conteudo,/ARQUIVADO/);
});
test('inventário histórico diferencia consulta de retrato sem atribuir início fictício à obra',()=>{
  const html=modelos.inventarioHistoricoObra({obraNome:'Obra A',dataReferencia:'2026-10-19',dataSnapshot:'2026-10-15',registradoEm:'2026-10-15T10:00:00-04:00',materiais:[]}).conteudo;
  assert.match(html,/Data consultada.*?19\/10\/2026/);assert.match(html,/Data do retrato armazenado.*?15\/10\/2026/);
  assert.doesNotMatch(html,/Início da obra|Data da obra/);
});
test('histórico da obra mantém cada transferência e quantidade movimentada',()=>{
  const e={modelo:'Escada',serie:'ESC-1',quantidade:100,historico:[{solicitacaoId:10,origemObraId:null,destinoObraId:1,quantidade:4,dataMovimentacao:'2026-10-10',origemNome:'Depósito central',destinoNome:'Obra A'},{solicitacaoId:11,origemObraId:1,destinoObraId:2,quantidade:2,dataMovimentacao:'2026-10-15',origemNome:'Obra A',destinoNome:'Obra B'}]};
  const html=modelos.historicoObra(obra,[e]).conteudo;
  assert.match(html,/<td>#0010<\/td><td>4<\/td>/);assert.match(html,/<td>#0011<\/td><td>2<\/td>/);assert.doesNotMatch(html,/<td>100<\/td>/);
});
test('cadastro isolado não gera transferências presumidas',()=>{
  assert.deepEqual(obterHistoricoEquipamento({id:1,obraId:1,saida:'2026-10-10',dataEntrada:'2026-10-10'}),[]);
});
test('histórico sem horários não transforma data de referência em saída e recebimento',()=>{
  const html=modelos.historicoEquipamento({modelo:'Escada',obraId:1},[{dataMovimentacao:'2026-10-10',quantidade:1}],buscar).conteudo;
  assert.match(html,/Não registrado/);assert.equal((html.match(/10\/10\/2026/g)||[]).length,1);
});
test('campos manuais de compra são identificados como preenchimento manual',()=>{
  assert.match(modelos.listaComprasSolicitacao(pedido,[{material,pendente:2}],buscar).conteudo,/Fornecedor \(preenchimento manual\)/);
});
test('dados fornecidos não são executados como HTML no documento',()=>{
  const html=modelos.auditoriaSolicitacao({...pedido,observacao:'<script>alert(1)</script>',tecnico:'<img src=x onerror=alert(1)>'},buscar).conteudo;
  assert.doesNotMatch(html,/<script>|<img src=x/);assert.match(html,/&lt;script&gt;/);
});
test('romaneio diferencia separação pendente e não comprova recebimento',()=>{
  assert.match(modelos.romaneioSeparacao(pedido,buscar).conteudo,/Separação ainda não concluída/);
  const separado={...pedido,materiais:[{...material,identificacao:'ESC-1'}]};
  assert.match(modelos.romaneioSeparacao(separado,buscar).conteudo,/Não comprova recebimento/);
});
