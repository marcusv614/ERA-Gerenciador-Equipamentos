import { ArrowUpRight, Link2, UserRound } from 'lucide-react';
import { agruparUsuariosAdmin, agruparFuncionariosAdmin, contaBloqueada, funcionarioAtivo, formatarInstanteAdmin, PERFIS_USUARIO, perfilDeCampo } from '../../utils/administracaoUsuarios';
import css from './PainelAdmin.module.css';

export function ListaUsuariosAdmin({ usuarios, funcionarios, usuarioAtualId, aoGerenciar }) {
  const cadastros = new Map(funcionarios.map(f=>[f.id,f]));
  return <div className={css.grupos}>{agruparUsuariosAdmin(usuarios).map(grupo => grupo.itens.length>0 && <section key={grupo.chave} className={css.grupo} aria-label={grupo.titulo}>
    <header className={css.grupoTitulo}><span className={css.ponto} data-situacao={grupo.chave}/><h2>{grupo.titulo}</h2><b>{grupo.itens.length}</b></header>
    <table className={css.tabela}><thead><tr><th>Usuário / login</th><th>Perfil</th><th>Funcionário vinculado</th><th>Situação do acesso</th><th>Último login</th><th>Ações</th></tr></thead><tbody>
      {grupo.itens.map(u=>{
        const funcionario=cadastros.get(u.funcionarioId);
        return <tr key={u.id}>
          <td data-label="Usuário / login"><div className={css.pessoa}><span className={css.avatar}><UserRound size={18}/></span><div><strong>{u.nome}</strong><span className={css.login}>{u.login}</span>{u.id===usuarioAtualId&&<small className={css.suaConta}>Sua conta</small>}</div></div></td>
          <td data-label="Perfil"><span className={css.perfil}>{PERFIS_USUARIO[u.perfil]?.nome||u.perfil}</span></td>
          <td data-label="Funcionário vinculado">{funcionario?<div className={css.dado}><strong>{funcionario.nome}</strong><small>{funcionario.cargo}</small>{!funcionarioAtivo(funcionario)&&<small className={css.textoAlerta}>Cadastro {funcionario.arquivado?'arquivado':'inativo'}</small>}</div>:<span className={perfilDeCampo(u.perfil)?css.textoAlerta:css.muted}>{perfilDeCampo(u.perfil)?'Sem vínculo — revisar':'Não exigido para este perfil'}</span>}</td>
          <td data-label="Situação do acesso"><div className={css.dado}><span className={css.selo} data-tom={u.ativo?'ativo':'inativo'}>{u.ativo?'Ativo':'Inativo'}</span>{contaBloqueada(u)&&<small className={css.textoAlerta}>Bloqueio temporário</small>}<small>{u.deveAlterarSenha?'Troca de senha pendente':'Sem troca de senha pendente'}</small></div></td>
          <td data-label="Último login"><span className={css.data}>{formatarInstanteAdmin(u.ultimoLogin)}</span></td>
          <td data-label="Ações"><button type="button" className={css.gerenciar} onClick={()=>aoGerenciar(u.id)} aria-label={`Gerenciar acesso de ${u.nome}`}>Gerenciar<ArrowUpRight size={15}/></button></td>
        </tr>;
      })}
    </tbody></table>
  </section>)}</div>;
}

export function ListaFuncionariosAdmin({ funcionarios, usuarios, aoCriarAcesso, aoGerenciar }) {
  const contas=new Map(usuarios.filter(u=>u.funcionarioId!=null).map(u=>[u.funcionarioId,u]));
  return <div className={css.grupos}>{agruparFuncionariosAdmin(funcionarios).map(grupo=>grupo.itens.length>0&&<section key={grupo.chave} className={css.grupo} aria-label={grupo.titulo}>
    <header className={css.grupoTitulo}><span className={css.ponto} data-situacao={grupo.chave}/><h2>{grupo.titulo}</h2><b>{grupo.itens.length}</b></header>
    <table className={css.tabela}><thead><tr><th>Funcionário</th><th>Cargo</th><th>Cadastro</th><th>Acesso vinculado</th><th>Ações</th></tr></thead><tbody>{grupo.itens.map(f=>{
      const conta=contas.get(f.id);
      return <tr key={f.id}><td data-label="Funcionário"><div className={css.dado}><strong>{f.nome}</strong><small>Funcionário #{f.id}</small></div></td><td data-label="Cargo">{f.cargo}</td><td data-label="Cadastro"><span className={css.selo} data-tom={funcionarioAtivo(f)?'ativo':'inativo'}>{f.arquivado?'Arquivado':f.status}</span></td><td data-label="Acesso vinculado">{conta?<div className={css.dado}><strong>{conta.login}</strong><small>{PERFIS_USUARIO[conta.perfil]?.nome} · {conta.ativo?'Acesso ativo':'Acesso inativo'}</small></div>:<span className={css.muted}><Link2 size={13}/>Sem usuário vinculado</span>}</td><td data-label="Ações">{conta?<button type="button" className={css.gerenciar} onClick={()=>aoGerenciar(conta.id)}>Gerenciar acesso<ArrowUpRight size={15}/></button>:funcionarioAtivo(f)?<button type="button" className={css.gerenciar} onClick={()=>aoCriarAcesso(f)} aria-label={`Criar acesso para ${f.nome}`}>Criar acesso<ArrowUpRight size={15}/></button>:<small className={css.muted}>Reative o cadastro na Gerência para criar um acesso.</small>}</td></tr>;
    })}</tbody></table>
  </section>)}</div>;
}
