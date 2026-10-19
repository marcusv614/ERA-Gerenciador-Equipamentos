const rotulos = {
  tecnico: 'Técnico responsável', dataSolicitacao: 'Data do pedido',
  obraOrigemId: 'Obra de origem', obraDestinoId: 'Obra de destino',
  observacao: 'Observação', materiais: 'Materiais', solicitante: 'Solicitante',
  nome: 'Nome', quantidade: 'Quantidade', identificacao: 'Identificação', catalogoChave: 'Material do catálogo',
};

export function mensagemErroApi(erro) {
  const status = erro.response?.status;
  if (status >= 500) return 'Não foi possível concluir a operação. Tente novamente. Se persistir, contate o suporte.';
  const corpo = erro.response?.data;
  const mensagem = corpo?.mensagem || (erro.code === 'ECONNABORTED'
    ? 'O servidor demorou para responder. Confira o pedido antes de tentar novamente.'
    : 'Não foi possível comunicar com a API. Verifique sua conexão e tente novamente.');
  if (status !== 400 || !corpo?.detalhes || typeof corpo.detalhes !== 'object' || Array.isArray(corpo.detalhes)) return mensagem;
  const detalhes = Object.entries(corpo.detalhes).filter(([, texto]) => typeof texto === 'string').map(([campo, texto]) => {
    const material = campo.match(/^materiais\[(\d+)\](?:\.(\w+))?$/);
    const rotulo = material ? `Material ${Number(material[1]) + 1}${material[2] ? ` — ${rotulos[material[2]] || material[2]}` : ''}` : rotulos[campo] || campo;
    return `${rotulo}: ${texto}`;
  });
  return detalhes.length ? `${mensagem} ${detalhes.join('; ')}` : mensagem;
}
