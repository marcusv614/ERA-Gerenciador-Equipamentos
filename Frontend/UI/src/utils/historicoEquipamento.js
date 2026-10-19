export function obterHistoricoEquipamento(equipamento) {
  // Cadastro e localização atual não comprovam uma transferência anterior.
  return Array.isArray(equipamento.historico) ? equipamento.historico : [];
}
