import { CartaoTecnico } from '../tecnico-card/TecnicoCard';

export function TelaFuncionarios({ funcionarios, obras, equipamentos, podeEditar, aoEditarFuncionario, estilos }) {
  return <div className={estilos.tecnicoGrid}>
    {funcionarios.map((funcionario) => <CartaoTecnico
      key={funcionario.id}
      funcionario={funcionario}
      obras={obras.filter(({ responsaveis }) => responsaveis?.includes(funcionario.nome))}
      equipamentos={equipamentos.filter(({ tecnico }) => tecnico === funcionario.nome)}
      todasAsObras={obras}
      podeEditar={podeEditar}
      aoEditar={aoEditarFuncionario}
    />)}
    {funcionarios.length === 0 && <div className={estilos.emptyState}>Nenhum funcionário encontrado.</div>}
  </div>;
}
