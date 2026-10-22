export function materiaisParaEnvioParcial(solicitacao) {
  return solicitacao.materiais.map((material) => {
    const plano = (solicitacao.planoFinanceiro || []).find((p) => String(p.materialId) === String(material.id));
    const entradas = (solicitacao.entradasCompra || []).filter((e) => e.catalogoChave === material.catalogoChave);
    const porId = new Map();
    [...(plano?.origens || []), ...entradas].forEach((origem) => {
      const id = String(origem.equipamentoId), anterior = porId.get(id);
      porId.set(id, { ...origem, quantidade: (anterior?.quantidade || 0) + origem.quantidade });
    });
    return { ...material, origens: [...porId.values()] };
  });
}

export function dadosEnvioParcial(solicitacao, escolhas, motivo) {
  if (!motivo.trim()) throw new Error('Informe o motivo do ajuste.');
  let total = 0;
  const materiais = materiaisParaEnvioParcial(solicitacao).map((material) => {
    let enviado = 0;
    const origens = material.origens.flatMap((origem) => {
      const quantidade = Number(escolhas[`${material.id}-${origem.equipamentoId}`] || 0);
      if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > origem.quantidade) throw new Error(`Revise a quantidade de ${material.nome}.`);
      enviado += quantidade;
      return quantidade ? [{ equipamentoId: origem.equipamentoId, quantidade }] : [];
    });
    if (enviado > material.quantidade) throw new Error(`O envio de ${material.nome} supera o pedido.`);
    total += enviado;
    return { materialId: material.id, origens };
  });
  if (!total) throw new Error('Selecione ao menos uma unidade para enviar.');
  return { motivo: motivo.trim(), materiais };
}
