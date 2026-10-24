import { writeFileSync } from 'node:fs';
import { Cliente, configuracaoTeste, hoje, senhaTemporaria, senhaDefinitiva } from './cliente.mjs';

const config = configuracaoTeste();
const bootstrap = await new Cliente(config).entrar('audit-smoke-admin','TempCheck#578943',true);
const perfis = { admin:'ADMIN', gerente:'GERENTE', rh:'RH', financeiro:'FINANCEIRO', estoque:'ESTOQUE', tecnico1:'TECNICO', tecnico2:'TECNICO', tst:'TST' };
const contas = [], clientes = {}, funcionarios = {};
for (const [nome, perfil] of Object.entries(perfis)) {
  const funcionario = nome === 'admin' ? null : await bootstrap.req('POST','/funcionarios',{ nome:`DEMO ${nome}`,cargo:perfil,status:'Ativo' },201);
  if (funcionario) funcionarios[nome] = funcionario;
  const conta = await bootstrap.req('POST','/usuarios',{ nome:`DEMO ${nome}`, login:`demo.${nome}`, perfil, funcionarioId:funcionario?.id, senhaTemporaria },201);
  clientes[nome] = await new Cliente(config).entrar(conta.login,senhaTemporaria,true);
  contas.push({ ...conta, senha:senhaDefinitiva });
}
const { admin } = clientes;
const obras = [];
for (const nome of ['Residencial Aurora','Escola Horizonte','Clínica Rio Negro']) {
  obras.push(await admin.req('POST','/obras',{ nome:`DEMO ${nome}`,cliente:'Cliente fictício',cidade:'Manaus',status:'Em andamento',inicio:hoje(),responsaveis:[funcionarios.tecnico1.nome,funcionarios.tecnico2.nome,funcionarios.tst.nome] },201));
}
const equipamentos = [];
for (const [tipo,modelo,quantidade,obra] of [
  ['Ferramentas','DEMO Furadeira',8,null], ['Ferramentas','DEMO Furadeira',4,obras[0]],
  ['Ferramentas','DEMO Alicate',20,null], ['Ferramentas','DEMO Alicate',6,obras[1]],
  ['Ferramentas','DEMO Escada',1,obras[0]], ['EPI','DEMO Capacete',30,null],
  ['EPI','DEMO Capacete',10,obras[0]], ['EPI','DEMO Luva',50,null], ['EPI','DEMO Óculos',15,obras[1]],
]) {
  equipamentos.push(await admin.req('POST','/equipamentos',{ tipo,modelo,serie:`DEMO-${equipamentos.length+1}`,quantidade,controleQuantidade:quantidade===1?'INDIVIDUAL':'LOTE',obraId:obra?.id,tecnico:obra?funcionarios[tipo==='EPI'?'tst':'tecnico1'].nome:undefined,status:obra?'Em campo':'Em estoque',data:hoje(),auditavel:tipo!=='EPI' },201));
}
const pedidos = [];
for (const epi of [false,true]) {
  const solicitante = epi ? 'tst' : 'tecnico2', gestor = epi ? 'rh' : 'gerente', item = equipamentos[epi?7:2];
  for (const etapa of ['Pendente','Rejeitada','Aguardando financeiro','Aprovada','Em trânsito','Concluída']) {
    let p = await clientes[solicitante].req('POST','/atividades',{ tecnico:funcionarios[solicitante].nome,obraDestinoId:obras[2].id,dataSolicitacao:hoje(),observacao:`Cenário isolado ${etapa}`,materiais:[{ nome:item.modelo,catalogoChave:item.catalogoChave,quantidade:1 }] },201);
    if (etapa === 'Rejeitada') p = await clientes[gestor].req('POST',`/atividades/${p.id}/rejeicao`,{ motivo:'Rejeição fictícia para testar rastreabilidade' });
    else if (etapa !== 'Pendente') {
      p = await clientes[gestor].req('POST',`/atividades/${p.id}/aprovacao`,{});
      if (etapa !== 'Aguardando financeiro') {
        await clientes.financeiro.req('POST',`/atividades/${p.id}/plano-financeiro`,{ materiais:[{ materialId:p.materiais[0].id,quantidadeCompra:0,origens:[{ equipamentoId:item.id,quantidade:1 }] }] });
        p = await clientes.financeiro.req('POST',`/atividades/${p.id}/aprovacao`,{});
        if (['Em trânsito','Concluída'].includes(etapa)) {
          [p] = await clientes.estoque.req('POST',`/atividades/${p.id}/execucao-plano`,{});
          p = await clientes.estoque.req('POST',`/atividades/${p.id}/transito`,{});
          if (etapa==='Concluída') p = await clientes[solicitante].req('POST',`/atividades/${p.id}/conclusao`,{});
        }
      }
    }
    pedidos.push(p);
  }
}
writeFileSync(process.argv[2],JSON.stringify({ ...config,contas,funcionarios,obras,equipamentos,pedidos }),{ mode:0o600 });
console.log('Dados isolados: 7 perfis, 8 contas, 3 obras, 9 materiais e 12 pedidos em diferentes etapas.');
