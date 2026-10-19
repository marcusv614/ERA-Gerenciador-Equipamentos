import test from 'node:test';
import assert from 'node:assert/strict';
import { criarModelosDocumentos } from '../src/services/modelosDocumentos.js';
const modelos=criarModelosDocumentos('logo');
const m={id:1,quantidade:2,status:'CONCLUIDA',modelo:'Escada',serie:'ESC-1',local:'Obra A',motivo:'Degrau com avaria',abertaEm:'2026-10-19T10:00:00-04:00',abertaPorNome:'Maria',abertaPorLogin:'maria.gerente',concluidaEm:'2026-10-19T14:00:00-04:00',concluidaPorNome:'João',concluidaPorLogin:'joao.estoque',observacaoConclusao:'Degrau substituído e ensaio aprovado'};
test('PDF do equipamento preserva quantidade, motivo, datas reais, autores e resultado da manutenção',()=>{
  const html=modelos.historicoEquipamento({modelo:'Escada',manutencoes:[m]},[],()=>null).conteudo;
  for(const valor of ['Manutenções registradas','Degrau com avaria','maria.gerente','joao.estoque','Degrau substituído','10:00:00','14:00:00','Obra A'])assert.ok(html.includes(valor));
  assert.match(html,/<td>#0001<\/td><td>2<\/td><td>Concluída<\/td>/);
});
test('histórico não inventa abertura de manutenção anterior e escapa o conteúdo informado',()=>{
  const html=modelos.historicoEquipamento({modelo:'Escada',manutencoes:[{...m,status:'ABERTA',abertaEm:null,abertaPorNome:null,concluidaEm:null,motivo:'<script>invadir()</script>'}]},[],()=>null).conteudo;
  assert.match(html,/Em manutenção/);assert.match(html,/Não registrado/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
});
test('inventário informa o bloqueio de manutenção dentro do total presente na obra',()=>{
  const html=modelos.inventarioObra({id:1,nome:'Obra A'},[{id:1,obraId:1,modelo:'Escada',serie:'ESC-1',tipo:'Ferramentas',quantidade:10,quantidadeReservada:3,quantidadeManutencao:2}],()=>({nome:'Obra A'})).conteudo;
  assert.match(html,/bloqueadas para novos pedidos/);assert.match(html,/<td>10<\/td><td>3<\/td><td>0<\/td>/);assert.match(html,/<td>Escada<\/td><td>ESC-1<\/td><td>2<\/td>/);
});
