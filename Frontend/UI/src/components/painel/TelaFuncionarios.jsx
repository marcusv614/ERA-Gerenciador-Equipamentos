import { CartaoTecnico } from '../tecnico-card/TecnicoCard';

export function TelaFuncionarios({ funcionarios, obras, equipamentos, estilos }) {
  return <div className={estilos.tecnicoGrid}>
    {funcionarios.map((funcionario) => <CartaoTecnico
      key={funcionario.id}
      funcionario={funcionario}
      obras={obras.filter(({ responsaveis }) => responsaveis?.includes(funcionario.nome))}
      equipamentos={equipamentos.filter(({ tecnico }) => tecnico === funcionario.nome)}
      todasAsObras={obras}
    />)}
    {funcionarios.length === 0 && <div className={estilos.emptyState}>Nenhum funcionário encontrado.</div>}
  </div>;
}
