export function tecnicosParaRecebimento(obras, funcionarios, destinoId) {
  const obra = obras.find(({ id }) => String(id) === String(destinoId));
  if (!obra || obra.arquivado || obra.status === 'Concluída') return [];
  return funcionarios.filter((f) => !f.arquivado && f.status === 'Ativo' && (obra.responsaveis || []).includes(f.nome))
    .map(({ nome }) => nome).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
