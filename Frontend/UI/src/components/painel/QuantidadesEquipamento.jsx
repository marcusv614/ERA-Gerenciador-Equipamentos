export function QuantidadesEquipamento({ equipamento, className }) {
  const quantidades = [
    ['Total cadastrado', equipamento.quantidade ?? 1],
    ['Disponível', equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1],
    ['Reservado', equipamento.quantidadeReservada],
    ['Em manutenção', equipamento.quantidadeManutencao],
    ['Em calibração', equipamento.quantidadeCalibracao],
    ['Em trânsito', equipamento.quantidadeEmTransito],
  ];
  return <div className={className} aria-label="Quantidades do equipamento">
    {quantidades.filter(([, valor], indice) => indice < 2 || valor > 0).map(([rotulo, valor]) =>
      <span key={rotulo}><small>{rotulo}</small><strong>{valor}</strong></span>)}
  </div>;
}
