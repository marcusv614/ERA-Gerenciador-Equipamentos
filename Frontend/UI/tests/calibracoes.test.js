import test from 'node:test';
import assert from 'node:assert/strict';
import { ehFluke, resumoCalibracao, calibracaoAberta } from '../src/utils/calibracoes.js';
import { descreverLocalizacao } from '../src/utils/localizacaoEquipamentos.js';
import { criarModelosDocumentos } from '../src/services/modelosDocumentos.js';

const hoje='2026-10-20';
const concluida={ id:1,status:'CONCLUIDA',modelo:'DSX',serie:'FL-1',localOrigem:'Obra A',tecnicoOrigem:'Ana',laboratorio:'Laboratório A',certificado:'CERT-1',dataRetirada:'2026-10-01',dataEnvio:'2026-10-02',dataRetorno:'2026-10-05',dataCalibracao:'2026-10-04',validade:'2027-06-01',eventos:[{acao:'SOLICITADA',autorNome:'Maria Gerente',autorLogin:'maria',autorPerfil:'GERENTE',registradoEm:'2026-10-01T10:00:00-04:00',observacao:'Calibração periódica'}] };

test('identifica Fluke por categoria, modelo ou marca cadastrada',()=>{
  assert.ok(ehFluke({tipo:'FLUKE',modelo:'DSX'}));assert.ok(ehFluke({tipo:'Instrumento',modelo:'Fluke 123'}));assert.ok(ehFluke({tipo:'Instrumento',atributos:{Marca:'FLUKE'}}));assert.ok(!ehFluke({tipo:'Ferramentas',modelo:'Chave Phillips'}));
});
test('validade é inclusiva, indica vencimento e avisa com trinta dias',()=>{
  const resumo=validade=>resumoCalibracao({calibracoes:[{...concluida,validade}]},hoje).chave;
  assert.equal(resumo('2026-10-19'),'VENCIDA');assert.equal(resumo(hoje),'A_VENCER');assert.equal(resumo('2026-11-19'),'A_VENCER');assert.equal(resumo('2026-11-20'),'EM_DIA');
});
test('certificado anterior lançado depois não substitui uma calibração mais recente',()=>{
  const e={calibracoes:[{...concluida,id:999,historico:true,dataCalibracao:'2025-01-01',validade:'2025-12-31'},concluida]};assert.equal(resumoCalibracao(e,hoje).registro.id,1);
});
test('situação em atendimento prevalece e laboratório não aparece como depósito',()=>{
  const e={obraId:null,calibracoes:[concluida,{id:2,status:'EM_CALIBRACAO',laboratorio:'Laboratório externo'}]};
  assert.equal(resumoCalibracao(e,hoje).chave,'ATENDIMENTO');assert.equal(calibracaoAberta(e).id,2);assert.equal(descreverLocalizacao(e,()=>null),'Laboratório: Laboratório externo');
  assert.equal(resumoCalibracao({calibracoes:[{status:'CANCELADA'}]},hoje).chave,'SEM_REGISTRO');
});
test('PDF preserva origem, datas, certificado e autoria sem executar HTML',()=>{
  const e={modelo:'DSX',serie:'FL-1',tipo:'Fluke',status:'Em estoque',calibracoes:[{...concluida,laboratorio:'<script>externo</script>'}]};
  const doc=criarModelosDocumentos('').historicoEquipamento(e,[],()=>null).conteudo;
  for(const texto of ['Obra A','Ana','CERT-1','01/06/2027','04/10/2026','Maria Gerente','maria','Calibrações'])assert.ok(doc.includes(texto));
  assert.ok(!doc.includes('<script>'));assert.ok(doc.includes('&lt;script&gt;'));
});
test('certificado anterior não inventa retirada, envio ou retorno no documento',()=>{
  const e={modelo:'DSX',serie:'FL-1',tipo:'Fluke',status:'Em campo',calibracoes:[{...concluida,historico:true,dataRetirada:null,dataEnvio:null,dataRetorno:null}]};
  const doc=criarModelosDocumentos('').historicoEquipamento(e,[],()=>null).conteudo;assert.ok(doc.includes('Certificado anterior'));assert.ok(doc.includes('Não registrado'));
});
