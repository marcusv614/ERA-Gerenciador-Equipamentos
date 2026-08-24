// Incorporar o logo evita que a janela isolada de impressão perca o caminho do
// arquivo gerado pelo Vite antes de o navegador montar o PDF.
import logoEra from '../assets/ERALTDA.png?inline';
import { formatarData } from '../utils/datas';

const ESTILOS_DOCUMENTO = `
  body{font-family:Arial,Helvetica,sans-serif;padding:8px 10px;color:#111;background:#fff}
  h1{font-size:16px;margin:0 0 5px;font-weight:700}h2{font-size:12px;margin:10px 0 6px}
  .doc-card{margin-bottom:8px}.doc-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  .doc-logo{max-width:110px;height:auto;display:block;margin-right:auto}.header{display:flex;flex-wrap:wrap;gap:4px}
  .header-row{flex:1 1 130px;display:flex;flex-direction:column;gap:1px;padding:4px 6px;border:1px solid #d7d7d7;border-radius:4px;background:#fff;min-height:26px}
  .label{display:block;font-size:7px;color:#666;text-transform:uppercase;letter-spacing:.03em;line-height:1.1}.value{font-size:9px;font-weight:600;color:#111;line-height:1.2}
  table{width:100%;border-collapse:collapse;margin-top:7px;table-layout:auto}th,td{padding:5px 4px;border:1px solid #d9d9d9;text-align:left;vertical-align:top;font-size:9px;word-break:break-word}th{background:#f3f3f3}
  .muted{color:#666;font-size:9px}.signatures{display:grid;grid-template-columns:repeat(2,minmax(180px,1fr));gap:14px;margin-top:18px}
  .signature-box{display:flex;flex-direction:column;gap:6px;font-size:9px}.line{border-bottom:1px solid #111;padding-top:18px}
`;

const ASSINATURAS_CAUTELA = `<div class="signatures">
  <div class="signature-box"><span>Responsável técnico — Entrada</span><div class="line"></div></div>
  <div class="signature-box"><span>Responsável técnico — Saída</span><div class="line"></div></div>
  <div class="signature-box"><span>Responsável cliente — Entrada</span><div class="line"></div></div>
  <div class="signature-box"><span>Responsável cliente — Saída</span><div class="line"></div></div>
</div>`;

function textoSeguro(valor) {
  return String(valor ?? '—')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function imprimirAposCarregarImagens(janela) {
  const imagens = [...janela.document.images];
  const carregamentos = imagens.map((imagem) => imagem.complete
    ? Promise.resolve()
    : new Promise((concluir) => {
      imagem.addEventListener('load', concluir, { once: true });
      imagem.addEventListener('error', concluir, { once: true });
    }));
  Promise.race([
    Promise.all(carregamentos),
    new Promise((concluir) => setTimeout(concluir, 2000)),
  ]).then(() => {
    janela.focus();
    janela.print();
  });
}

function abrirJanelaDeImpressao(titulo, conteudo) {
  const documentoHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${textoSeguro(titulo)}</title><style>${ESTILOS_DOCUMENTO}</style></head><body>${conteudo}</body></html>`;
  const janelaImpressao = window.open('', '_blank');

  if (janelaImpressao) {
    janelaImpressao.document.write(documentoHtml);
    janelaImpressao.document.close();
    imprimirAposCarregarImagens(janelaImpressao);
    return;
  }

  const quadroImpressao = document.createElement('iframe');
  Object.assign(quadroImpressao.style, {
    position: 'fixed', width: '0', height: '0', border: '0', opacity: '0', pointerEvents: 'none',
  });
  document.body.appendChild(quadroImpressao);
  quadroImpressao.contentWindow.document.open();
  quadroImpressao.contentWindow.document.write(documentoHtml);
  quadroImpressao.contentWindow.document.close();
  imprimirAposCarregarImagens(quadroImpressao.contentWindow);
  setTimeout(() => quadroImpressao.remove(), 5000);
}

function criarCabecalhoObra(obra, tecnicos, titulo) {
  return `<div class="doc-card"><div class="doc-top"><img class="doc-logo" src="${logoEra}" alt="ERA Engenharia de Redes da Amazônia"/><h1>${titulo}</h1></div><div class="header">
    <div class="header-row"><span class="label">Obra</span><span class="value">${textoSeguro(obra.nome)}</span></div>
    <div class="header-row"><span class="label">Data da obra</span><span class="value">${formatarData(obra.inicio)}</span></div>
    <div class="header-row"><span class="label">Cliente</span><span class="value">${textoSeguro(obra.cliente)}</span></div>
    <div class="header-row"><span class="label">Localização</span><span class="value">${textoSeguro(obra.cidade)}</span></div>
    <div class="header-row"><span class="label">Responsáveis técnicos</span><span class="value">${textoSeguro(obra.responsaveis?.join(', '))}</span></div>
    <div class="header-row"><span class="label">Técnicos na obra</span><span class="value">${textoSeguro(tecnicos.length ? tecnicos.join(', ') : '—')}</span></div>
  </div></div>`;
}

function criarCabecalhoEquipamento(equipamento, buscarObraPorId) {
  const localAtual = equipamento.obraId
    ? buscarObraPorId(equipamento.obraId)?.nome || 'Obra não encontrada'
    : 'Depósito central';

  return `<div class="doc-card">
    <div class="doc-top">
      <img class="doc-logo" src="${logoEra}" alt="ERA Engenharia de Redes da Amazônia"/>
      <h1>Histórico de movimentações</h1>
    </div>
    <div class="header">
      <div class="header-row"><span class="label">Tipo</span><span class="value">${textoSeguro(equipamento.tipo)}</span></div>
      <div class="header-row"><span class="label">Equipamento</span><span class="value">${textoSeguro(equipamento.modelo)}</span></div>
      <div class="header-row"><span class="label">Número de série</span><span class="value">${textoSeguro(equipamento.serie)}</span></div>
      <div class="header-row"><span class="label">Status atual</span><span class="value">${textoSeguro(equipamento.status)}</span></div>
      <div class="header-row"><span class="label">Local atual</span><span class="value">${textoSeguro(localAtual)}</span></div>
      <div class="header-row"><span class="label">Técnico responsável</span><span class="value">${textoSeguro(equipamento.tecnico)}</span></div>
    </div>
  </div>`;
}

export function imprimirHistoricoEquipamento(equipamento, historico, buscarObraPorId) {
  const linhas = historico.map((movimentacao) => {
    const destino = movimentacao.destinoNome || (movimentacao.obraId
      ? buscarObraPorId(movimentacao.obraId)?.nome
      : 'Depósito central');
    return `<tr><td>${formatarData(movimentacao.dataMovimentacao || movimentacao.date || movimentacao.saida || movimentacao.when)}</td><td>${textoSeguro(movimentacao.origemNome || 'Depósito central')}</td><td>${textoSeguro(destino)}</td><td>${formatarData(movimentacao.dataSaida || movimentacao.dataMovimentacao || movimentacao.saida)}</td><td>${formatarData(movimentacao.dataEntrada || movimentacao.data || movimentacao.dataMovimentacao)}</td><td>${textoSeguro(movimentacao.tecnico)}</td><td>${textoSeguro(movimentacao.status)}</td></tr>`;
  }).join('');
  const conteudo = `${criarCabecalhoEquipamento(equipamento, buscarObraPorId)}<h2>Movimentações registradas</h2><table><thead><tr><th>Data movimentação</th><th>Origem</th><th>Destino</th><th>Data saída</th><th>Data entrada</th><th>Técnico</th><th>Status</th></tr></thead><tbody>${linhas}</tbody></table><p class="muted">Gerado em ${formatarData(new Date())}</p>`;
  abrirJanelaDeImpressao(`Histórico ${equipamento.modelo}`, conteudo);
}

export function imprimirCautelaObra(obra, equipamentos) {
  const equipamentosDaObra = equipamentos.filter(({ obraId }) => obraId === obra.id);
  const tecnicos = [...new Set(equipamentosDaObra.map(({ tecnico }) => tecnico).filter(Boolean))];
  const linhas = equipamentosDaObra.length ? equipamentosDaObra.map((equipamento) => `<tr><td>${textoSeguro(equipamento.tipo)}</td><td>${textoSeguro(equipamento.modelo)}</td><td>${textoSeguro(equipamento.serie)}</td><td>${textoSeguro(equipamento.tecnico)}</td><td>${formatarData(equipamento.data || equipamento.dataEntrada || equipamento.saida)}</td></tr>`).join('') : '<tr><td colspan="5">Nenhum equipamento cadastrado na obra.</td></tr>';
  const conteudo = `${criarCabecalhoObra(obra, tecnicos, 'Cautela de materiais')}<h2>Equipamentos atuais</h2><table><thead><tr><th>Tipo</th><th>Modelo</th><th>Série</th><th>Técnico</th><th>Data de entrada</th></tr></thead><tbody>${linhas}</tbody></table>${ASSINATURAS_CAUTELA}<p class="muted">Gerado em ${formatarData(new Date())}</p>`;
  abrirJanelaDeImpressao(`Cautela — ${obra.nome}`, conteudo);
}

export function imprimirCautelaSolicitacao(solicitacao, buscarObraPorId) {
  const identificadorSolicitacao = String(solicitacao.id ?? 'sem identificacao').toUpperCase();
  const materiais = Array.isArray(solicitacao.materiais) ? solicitacao.materiais : [];
  const obraOrigem = solicitacao.obraOrigemId ? buscarObraPorId(solicitacao.obraOrigemId) : null;
  const obraDestino = solicitacao.obraDestinoId ? buscarObraPorId(solicitacao.obraDestinoId) : null;
  const origem = obraOrigem?.nome || 'Depósito central';
  const destino = obraDestino?.nome || 'Depósito central';
  const linhas = materiais.length
    ? materiais.map((material) => `<tr><td>${textoSeguro(material.quantidade)}</td><td>${textoSeguro(material.nome)}</td><td>${textoSeguro(material.identificacao)}</td></tr>`).join('')
    : '<tr><td colspan="3">Nenhum material informado na solicitação.</td></tr>';
  const cabecalho = `<div class="doc-card"><div class="doc-top"><img class="doc-logo" src="${logoEra}" alt="ERA Engenharia de Redes da Amazônia"/><h1>Cautela da solicitação</h1></div><div class="header">
    <div class="header-row"><span class="label">Solicitação</span><span class="value">${textoSeguro(identificadorSolicitacao)}</span></div>
    <div class="header-row"><span class="label">Tipo</span><span class="value">Movimentação</span></div>
    <div class="header-row"><span class="label">Status</span><span class="value">${textoSeguro(solicitacao.status)}</span></div>
    <div class="header-row"><span class="label">Data da solicitação</span><span class="value">${formatarData(solicitacao.dataSolicitacao)}</span></div>
    <div class="header-row"><span class="label">Solicitante</span><span class="value">${textoSeguro(solicitacao.solicitante || solicitacao.tecnico)}</span></div>
    <div class="header-row"><span class="label">Técnico responsável</span><span class="value">${textoSeguro(solicitacao.tecnico)}</span></div>
    <div class="header-row"><span class="label">Origem</span><span class="value">${textoSeguro(origem)}</span></div>
    <div class="header-row"><span class="label">Destino</span><span class="value">${textoSeguro(destino)}</span></div>
  </div></div>`;
  const observacao = solicitacao.observacao ? `<h2>Observação</h2><p class="muted">${textoSeguro(solicitacao.observacao)}</p>` : '';
  const conteudo = `${cabecalho}<h2>Materiais solicitados</h2><table><thead><tr><th>Quantidade</th><th>Material</th><th>Identificação / Série</th></tr></thead><tbody>${linhas}</tbody></table>${observacao}${ASSINATURAS_CAUTELA}<p class="muted">Gerado em ${formatarData(new Date())}</p>`;
  abrirJanelaDeImpressao(`Cautela da solicitação — ${identificadorSolicitacao}`, conteudo);
}

export function imprimirHistoricoObra(obra, equipamentos) {
  const equipamentosAtuais = equipamentos.filter(({ obraId }) => obraId === obra.id);
  const equipamentosAnteriores = equipamentos.filter(({ historico }) => historico?.some((movimentacao) => movimentacao.destinoObraId === obra.id || movimentacao.origemObraId === obra.id));
  const equipamentosRelacionados = [...new Map([...equipamentosAtuais, ...equipamentosAnteriores].map((equipamento) => [equipamento.id, equipamento])).values()];
  const tecnicos = [...new Set(equipamentosRelacionados.flatMap((equipamento) => [
    equipamento.tecnico,
    ...(equipamento.historico || [])
      .filter((movimentacao) => movimentacao.destinoObraId === obra.id || movimentacao.origemObraId === obra.id)
      .map(({ tecnico }) => tecnico),
  ]).filter(Boolean))];
  const linhas = equipamentosRelacionados.length ? equipamentosRelacionados.map((equipamento) => {
    const entradas = equipamento.historico?.filter(({ destinoObraId }) => destinoObraId === obra.id) || [];
    const saidas = equipamento.historico?.filter(({ origemObraId }) => origemObraId === obra.id) || [];
    const ultimaEntrada = entradas.at(-1);
    const ultimaSaida = saidas.at(-1);
    const entrada = ultimaEntrada?.dataEntrada || ultimaEntrada?.dataMovimentacao ||
      (equipamento.obraId === obra.id ? equipamento.data || equipamento.dataEntrada || equipamento.saida : null);
    const saida = equipamento.obraId === obra.id
      ? null
      : ultimaSaida?.dataSaida || ultimaSaida?.dataMovimentacao;
    const tecnicoNaObra = ultimaEntrada?.tecnico || ultimaSaida?.tecnico || equipamento.tecnico;
    return `<tr><td>${textoSeguro(equipamento.tipo)}</td><td>${textoSeguro(equipamento.modelo)}</td><td>${textoSeguro(equipamento.serie)}</td><td>${textoSeguro(tecnicoNaObra)}</td><td>${formatarData(entrada)}</td><td>${formatarData(saida)}</td></tr>`;
  }).join('') : '<tr><td colspan="6">Nenhum histórico de equipamentos registrado para esta obra.</td></tr>';
  const conteudo = `${criarCabecalhoObra(obra, tecnicos, 'Histórico da obra')}<h2>Equipamentos que passaram pela obra</h2><table><thead><tr><th>Tipo</th><th>Modelo</th><th>Série</th><th>Técnico</th><th>Data de entrada</th><th>Data de saída</th></tr></thead><tbody>${linhas}</tbody></table><p class="muted">Gerado em ${formatarData(new Date())}</p>`;
  abrirJanelaDeImpressao(`Histórico da obra — ${obra.nome}`, conteudo);
}
