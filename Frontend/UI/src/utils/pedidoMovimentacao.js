import { obterDataAtual } from './datas.js';

export function criarPedidoMovimentacao(equipamento, movimentacao) {
  const destino = movimentacao.obraId ? Number(movimentacao.obraId) : null;
  const tecnicoNaOrigem = equipamento.tecnico?.trim();
  const tecnico = (destino == null ? tecnicoNaOrigem || movimentacao.tecnico : movimentacao.tecnico)?.trim();
  if (!tecnico) throw new Error(destino == null
    ? 'Selecione o técnico responsável pela retirada.'
    : 'Selecione o técnico responsável pelo recebimento.');
  const quantidade = Number(movimentacao.quantidade ?? 1);
  const disponivel = equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1;
  if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > disponivel)
    throw new Error('Informe uma quantidade inteira dentro do saldo disponível.');
  return {
    tecnico,
    obraOrigemId: equipamento.obraId ?? null,
    obraDestinoId: destino,
    dataSolicitacao: movimentacao.dataMovimentacao || obterDataAtual(),
    observacao: 'Movimentação solicitada pelo gerente.',
    materiais: [{ nome: equipamento.modelo, quantidade, identificacao: equipamento.serie, catalogoChave: equipamento.catalogoChave || null }],
  };
}
