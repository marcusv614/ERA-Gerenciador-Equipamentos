import { localCalibracao } from './calibracoes.js';
const normalizarSerie = (serie) => String(serie || '').trim().toLocaleLowerCase('pt-BR');

export function localizarEquipamentos(equipamentos, solicitacoes) {
  return equipamentos.map((equipamento) => {
    const deslocamentos = solicitacoes.filter(({ status }) => ['Pendente', 'Aprovada', 'Aguardando coleta', 'Em trânsito'].includes(status))
      .flatMap((pedido) => pedido.materiais.filter((material) => material.identificacao && normalizarSerie(material.identificacao) === normalizarSerie(equipamento.serie))
        .map((material) => ({ solicitacaoId: pedido.id, status: pedido.status, quantidade: material.quantidade, origemId: pedido.obraOrigemId, destinoId: pedido.obraDestinoId, tecnico: pedido.tecnico })));
    const quantidadeEmTransito = deslocamentos.filter(({ status }) => status === 'Em trânsito').reduce((total, item) => total + item.quantidade, 0);
    const quantidadeNaOrigem = Math.max(0, (equipamento.quantidade ?? 1) - quantidadeEmTransito);
    return { ...equipamento, deslocamentos, quantidadeEmTransito, quantidadeNaOrigem,
      status: quantidadeEmTransito > 0 && quantidadeNaOrigem === 0 ? 'Em trânsito' : equipamento.status };
  });
}

export function descreverLocalizacao(equipamento, buscarObra) {
  const laboratorio = localCalibracao(equipamento);
  if (laboratorio) return laboratorio;
  const local = (id) => id == null ? 'Depósito central' : buscarObra(id)?.nome || 'Obra não disponível';
  const atual = local(equipamento.obraId);
  const rotas = (equipamento.deslocamentos || []).map((item) => item.status === 'Em trânsito'
    ? `${item.quantidade} em transporte: ${local(item.origemId)} → ${local(item.destinoId)} · aguardando recebimento${item.destinoId != null ? ` de ${item.tecnico}` : ' no depósito'}`
    : `${item.quantidade} reservada(s) para ${local(item.destinoId)}`);
  return [equipamento.quantidadeEmTransito > 0 ? (equipamento.quantidadeNaOrigem > 0 ? `${equipamento.quantidadeNaOrigem} em ${atual}` : null) : atual, ...rotas].filter(Boolean).join(' · ');
}
