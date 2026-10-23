import { CartaoResumo } from '../stat-card/StatCard';

export function ResumoEquipamentos({ resumo, estilos }) {
  return <div className={estilos.statsGrid}>
    <CartaoResumo rotulo="Total de equipamentos" valor={resumo.total} />
    <CartaoResumo rotulo="Em campo" valor={resumo.emCampo} destaque="var(--status-campo-text)" />
    <CartaoResumo rotulo="Em estoque" valor={resumo.emEstoque} destaque="var(--status-estoque-text)" />
    <CartaoResumo rotulo="Em manutenção" valor={resumo.emManutencao} destaque="var(--status-manutencao-text)" />
    <CartaoResumo rotulo="Em calibração / aguardando" valor={resumo.emCalibracao ?? 0} destaque="var(--status-calibracao-text)" />
    <CartaoResumo rotulo="Em trânsito" valor={resumo.emTransito} destaque="var(--status-transito-text)" />
  </div>;
}
