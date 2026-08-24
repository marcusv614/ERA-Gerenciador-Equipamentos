import { CartaoResumo } from '../stat-card/StatCard';

export function ResumoEquipamentos({ resumo, estilos }) {
  return <div className={estilos.statsGrid}>
    <CartaoResumo rotulo="Total de equipamentos" valor={resumo.total} />
    <CartaoResumo rotulo="Em campo" valor={resumo.emCampo} destaque="var(--accent)" />
    <CartaoResumo rotulo="Em estoque" valor={resumo.emEstoque} destaque="var(--info)" />
    <CartaoResumo rotulo="Em manutenção" valor={resumo.emManutencao} destaque="var(--warn)" />
    <CartaoResumo rotulo="Em trânsito" valor={resumo.emTransito} destaque="var(--accent)" />
  </div>;
}
