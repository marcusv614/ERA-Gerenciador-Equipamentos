export const PERFIS_USUARIO = {
  ADMIN: { nome: 'Administrador', descricao: 'Gerencia usuários e acessa todos os painéis.' },
  GERENTE: { nome: 'Gerente', descricao: 'Gerencia cadastros e aprova solicitações de materiais, exceto EPIs.' },
  RH: { nome: 'RH', descricao: 'Aprova solicitações e acompanha entregas exclusivamente de EPIs.' },
  FINANCEIRO: { nome: 'Financeiro', descricao: 'Analisa pedidos aprovados e define compras e retiradas.' },
  ESTOQUE: { nome: 'Estoquista', descricao: 'Executa o plano autorizado: compras, separação e transporte.' },
  TECNICO: { nome: 'Técnico de campo', descricao: 'Solicita materiais que não sejam EPIs e confirma recebimentos.' },
  TST: { nome: 'TST', descricao: 'Solicita exclusivamente EPIs e confirma seus recebimentos.' },
};
export const perfilDeCampo = perfil => ['TECNICO','TST'].includes(perfil);
export const funcionarioAtivo = funcionario => funcionario.status === 'Ativo' && !funcionario.arquivado;
export const contaBloqueada = (usuario, agora = Date.now()) => !!usuario.bloqueadoAte && Date.parse(usuario.bloqueadoAte) > agora;
const normalizar = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
const corresponde = (valores, busca) => normalizar(busca).split(/\s+/).every(termo => normalizar(valores.filter(Boolean).join(' ')).includes(termo));
const ordenarNome = (a,b) => a.nome.localeCompare(b.nome,'pt-BR',{sensitivity:'base'}) || a.id-b.id;

export function filtrarUsuariosAdmin(usuarios, funcionarios, { busca='', perfil='todos', situacao='todos', seguranca='todos' } = {}) {
  const cadastros = new Map(funcionarios.map(f => [f.id,f]));
  return usuarios.filter(u => {
    const f = cadastros.get(u.funcionarioId);
    return (perfil==='todos'||u.perfil===perfil) && (situacao==='todos'||u.ativo===(situacao==='ativos'))
      && (seguranca==='todos'||(seguranca==='troca'&&u.deveAlterarSenha)||(seguranca==='bloqueados'&&contaBloqueada(u))||(seguranca==='sem-vinculo'&&perfilDeCampo(u.perfil)&&!f))
      && corresponde([u.nome,u.login,u.id,PERFIS_USUARIO[u.perfil]?.nome,u.perfil,f?.nome,f?.cargo],busca);
  }).sort(ordenarNome);
}
export function agruparUsuariosAdmin(usuarios) {
  return [{ titulo:'Usuários ativos', chave:'ativos', itens:usuarios.filter(u=>u.ativo) },{ titulo:'Usuários inativos', chave:'inativos', itens:usuarios.filter(u=>!u.ativo) }];
}
export function filtrarFuncionariosAdmin(funcionarios, usuarios, { busca='', situacao='todos', vinculo='todos' } = {}) {
  const contas = new Map(usuarios.filter(u=>u.funcionarioId!=null).map(u=>[u.funcionarioId,u]));
  return funcionarios.filter(f => {
    const conta = contas.get(f.id);
    return (situacao==='todos'||(situacao==='ativos'?funcionarioAtivo(f):!funcionarioAtivo(f)))
      && (vinculo==='todos'||(vinculo==='sem'&&!conta)||(vinculo==='ativo'&&conta?.ativo)||(vinculo==='inativo'&&conta&&!conta.ativo))
      && corresponde([f.nome,f.cargo,f.id,f.email,f.telefone,conta?.login,PERFIS_USUARIO[conta?.perfil]?.nome],busca);
  }).sort(ordenarNome);
}
export function agruparFuncionariosAdmin(funcionarios) {
  return [{titulo:'Funcionários ativos',chave:'ativos',itens:funcionarios.filter(funcionarioAtivo)},
    {titulo:'Funcionários inativos',chave:'inativos',itens:funcionarios.filter(f=>!f.arquivado&&f.status!=='Ativo')},
    {titulo:'Funcionários arquivados',chave:'arquivados',itens:funcionarios.filter(f=>f.arquivado)}];
}
export function formatarInstanteAdmin(valor) {
  if (!valor || Number.isNaN(Date.parse(valor))) return 'Sem registro';
  return new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Manaus'}).format(new Date(valor));
}
