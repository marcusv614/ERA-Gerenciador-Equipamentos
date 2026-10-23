import test from 'node:test';
import assert from 'node:assert/strict';
import { PERFIS_USUARIO, agruparUsuariosAdmin, agruparFuncionariosAdmin, filtrarUsuariosAdmin, filtrarFuncionariosAdmin, contaBloqueada, formatarInstanteAdmin } from '../src/utils/administracaoUsuarios.js';

const funcionarios=[{id:10,nome:'João da Silva',cargo:'Técnico de campo',status:'Ativo',arquivado:false},{id:11,nome:'Ana TST',cargo:'Segurança do Trabalho',status:'Inativo',arquivado:false},{id:12,nome:'Carlos',cargo:'Técnico',status:'Ativo',arquivado:true},{id:13,nome:'Rita',cargo:'Técnico',status:'Ativo',arquivado:false}];
const usuarios=[{id:1,nome:'Administrador',login:'admin',perfil:'ADMIN',ativo:true,deveAlterarSenha:false},{id:2,nome:'João',login:'joao.campo',perfil:'TECNICO',funcionarioId:10,ativo:true,deveAlterarSenha:true},{id:3,nome:'Ana',login:'ana.tst',perfil:'TST',funcionarioId:11,ativo:false,deveAlterarSenha:false},{id:4,nome:'RH',login:'recursos.humanos',perfil:'RH',ativo:true,deveAlterarSenha:false}];
test('Usuários ativos e inativos nunca são misturados nos grupos',()=>{
  const grupos=agruparUsuariosAdmin(usuarios);assert.deepEqual(grupos[0].itens.map(u=>u.id),[1,2,4]);assert.deepEqual(grupos[1].itens.map(u=>u.id),[3]);assert.equal(grupos.flatMap(g=>g.itens).length,usuarios.length);
});
test('Funcionários arquivados com status Ativo não aparecem no grupo ativo',()=>{
  const grupos=agruparFuncionariosAdmin(funcionarios);assert.deepEqual(grupos.map(g=>g.itens.map(f=>f.id)),[[10,13],[11],[12]]);assert.equal(grupos.flatMap(g=>g.itens).length,funcionarios.length);
});
test('Pesquisa combina nome do funcionário, cargo, perfil e login sem exigir acentos',()=>{
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{busca:'JOAO SILVA tecnico'}).map(u=>u.id),[2]);
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{busca:'recursos.humanos'}).map(u=>u.id),[4]);
  assert.deepEqual(filtrarFuncionariosAdmin(funcionarios,usuarios,{busca:'ana.tst seguranca'}).map(f=>f.id),[11]);
});
test('Perfil, situação e troca pendente são combinados sem perder a separação de grupos',()=>{
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{perfil:'TECNICO',situacao:'ativos',seguranca:'troca'}).map(u=>u.id),[2]);
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{situacao:'inativos'}).map(u=>u.id),[3]);
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{perfil:'TST',situacao:'ativos'}),[]);
});
test('Ausência de vínculo não é apontada como problema para perfis administrativos',()=>{
  assert.deepEqual(filtrarUsuariosAdmin(usuarios,funcionarios,{seguranca:'sem-vinculo'}),[]);
  const inconsistente={id:5,nome:'Sem vínculo',login:'sem',perfil:'TST',ativo:true};
  assert.deepEqual(filtrarUsuariosAdmin([...usuarios,inconsistente],funcionarios,{seguranca:'sem-vinculo'}).map(u=>u.id),[5]);
});
test('Filtros de funcionário distinguem ausência de usuário de acesso inativo',()=>{
  assert.deepEqual(filtrarFuncionariosAdmin(funcionarios,usuarios,{vinculo:'sem',situacao:'ativos'}).map(f=>f.id),[13]);
  assert.deepEqual(filtrarFuncionariosAdmin(funcionarios,usuarios,{vinculo:'inativo'}).map(f=>f.id),[11]);
  assert.deepEqual(filtrarFuncionariosAdmin(funcionarios,usuarios,{vinculo:'ativo'}).map(f=>f.id),[10]);
  assert.deepEqual(filtrarFuncionariosAdmin(funcionarios,usuarios,{situacao:'inativos'}).map(f=>f.id),[11,12]);
});
test('Bloqueio vencido não é apresentado como vigente e data ausente não é inventada',()=>{
  const agora=Date.parse('2026-10-23T12:00:00Z');assert.equal(contaBloqueada({bloqueadoAte:'2026-10-23T12:05:00Z'},agora),true);assert.equal(contaBloqueada({bloqueadoAte:'2026-10-23T12:00:00Z'},agora),false);
  assert.equal(formatarInstanteAdmin(null),'Sem registro');assert.equal(formatarInstanteAdmin('inválido'),'Sem registro');assert.match(formatarInstanteAdmin('2026-10-23T02:30:00Z'),/22\/10\/2026.*22:30/);
});
test('Todos os perfis existentes continuam disponíveis e as listas originais são preservadas',()=>{
  assert.deepEqual(Object.keys(PERFIS_USUARIO).sort(),['ADMIN','ESTOQUE','FINANCEIRO','GERENTE','RH','TECNICO','TST']);
  filtrarUsuariosAdmin(usuarios,funcionarios);assert.deepEqual(usuarios.map(u=>u.id),[1,2,3,4]);
});
