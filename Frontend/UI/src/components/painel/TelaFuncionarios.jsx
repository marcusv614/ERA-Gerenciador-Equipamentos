import { CartaoTecnico } from '../tecnico-card/TecnicoCard';

export function TelaFuncionarios({ funcionarios, obras, equipamentos, podeEditar, aoEditarFuncionario, estilos }) {
  const grupos=[{titulo:'Funcionários ativos',itens:funcionarios.filter((f)=>f.status==='Ativo'&&!f.arquivado)},{titulo:'Funcionários inativos',itens:funcionarios.filter((f)=>f.status!=='Ativo'||f.arquivado)}];
  return <div className={estilos.registrosAgrupados}>{grupos.map((grupo)=>grupo.itens.length>0&&<section key={grupo.titulo} className={estilos.registroGrupo}><header><strong>{grupo.titulo}</strong><b>{grupo.itens.length}</b></header><div className={estilos.tecnicoGrid}>
    {grupo.itens.map((funcionario) => <CartaoTecnico
      key={funcionario.id}
      funcionario={funcionario}
      obras={obras.filter(({ responsaveis, arquivado }) => !arquivado&&responsaveis?.includes(funcionario.nome))}
      equipamentos={equipamentos.filter(({ tecnico, arquivado }) => !arquivado&&tecnico === funcionario.nome)}
      todasAsObras={obras}
      podeEditar={podeEditar}
      aoEditar={aoEditarFuncionario}
    />)}</div></section>)}
    {funcionarios.length === 0 && <div className={estilos.emptyState}>Nenhum funcionário encontrado.</div>}
  </div>;
}
