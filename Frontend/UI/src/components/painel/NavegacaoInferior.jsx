import { Activity, Boxes, Building2, Users, Warehouse } from 'lucide-react';

const ITENS = [
  { id: 'equipamentos', rotulo: 'Equipamentos', icone: Boxes },
  { id: 'obras', rotulo: 'Obras', icone: Building2 },
  { id: 'atividades', rotulo: 'Atividades', icone: Activity },
  { id: 'funcionarios', rotulo: 'Equipe', icone: Users },
  { id: 'deposito', rotulo: 'Depósito', icone: Warehouse },
];

export function NavegacaoInferior({ telaAtual, totalAtividadesPendentes, aoSelecionarTela, estilos }) {
  return <nav className={estilos.bottomNav} aria-label="Navegação principal">
    {ITENS.map(({ id, rotulo, icone: Icone }) => <button type="button" key={id} className={telaAtual === id ? estilos.bottomNavAtivo : ''} onClick={() => aoSelecionarTela(id)} aria-current={telaAtual === id ? 'page' : undefined}>
      <span><Icone />{id === 'atividades' && totalAtividadesPendentes > 0 && <b>{totalAtividadesPendentes}</b>}</span>
      <small>{rotulo}</small>
    </button>)}
  </nav>;
}
