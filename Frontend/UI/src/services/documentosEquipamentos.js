import logoEra from '../assets/ERALTDA.png?inline';
import { criarModelosDocumentos } from './modelosDocumentos';

const ESTILOS_DOCUMENTO = `
  @page{size:A4 landscape;margin:10mm}thead{display:table-header-group}tr{break-inside:avoid}
  body{font-family:Arial,Helvetica,sans-serif;padding:8px 10px;color:#111;background:#fff}
  h1{font-size:16px;margin:0 0 5px;font-weight:700}h2{font-size:12px;margin:10px 0 6px}
  .doc-card{margin-bottom:8px}.doc-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
  .doc-logo{max-width:110px;height:auto;display:block;margin-right:auto}.header{display:flex;flex-wrap:wrap;gap:4px}
  .header-row{flex:1 1 130px;display:flex;flex-direction:column;gap:1px;padding:4px 6px;border:1px solid #d7d7d7;border-radius:4px;background:#fff;min-height:26px}
  .label{display:block;font-size:7px;color:#666;text-transform:uppercase;letter-spacing:.03em;line-height:1.1}.value{font-size:9px;font-weight:600;color:#111;line-height:1.2}
  table{width:100%;border-collapse:collapse;margin-top:7px;table-layout:auto}th,td{padding:5px 4px;border:1px solid #d9d9d9;text-align:left;vertical-align:top;font-size:9px;word-break:break-word}th{background:#f3f3f3}
  .muted{color:#666;font-size:9px}
  .ordem-atendimento{font-size:12px}.ordem-atendimento .label{font-size:9px}.ordem-atendimento .value{font-size:12px}.ordem-atendimento .header-row{padding:8px}.ordem-atendimento h1{font-size:20px}.ordem-atendimento h2{font-size:14px;margin-top:18px}.ordem-atendimento th,.ordem-atendimento td{font-size:12px;padding:9px 7px}.ordem-atendimento .muted{font-size:11px}.ordem-destino{padding:12px 0;border-bottom:2px solid #234d39;break-inside:avoid}.ordem-destino span{display:block;font-size:11px;color:#555}.ordem-destino strong{display:block;font-size:20px;margin-top:4px}.ordem-instrucao{padding:10px;background:#f0f4f1;line-height:1.5}
  h2{break-after:avoid}.ordem-atendimento th{word-break:normal;overflow-wrap:normal}.ordem-retirada table,.ordem-compras table{table-layout:fixed}.ordem-retirada th:first-child{width:50%}.ordem-retirada th:nth-child(2){width:15%}.ordem-compras th:first-child{width:40%}
  .vistoria-icone{vertical-align:middle;display:inline-block;margin-right:3px}.vistoria-tabela td{height:32px}.vistoria-estado{min-width:58px;text-align:center;white-space:nowrap}.vistoria-caixa{display:inline-block;width:15px;height:15px;border:1px solid #222;text-align:center;line-height:15px;font-size:13px;margin-bottom:4px}
  .vistoria-final{break-inside:avoid}.vistoria-observacoes{min-height:90px;padding:8px;border:1px solid #999;font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere}.vistoria-assinaturas{display:flex;gap:40px;margin-top:55px;margin-bottom:15px}.vistoria-assinaturas>div{flex:1;border-top:1px solid #222;padding-top:6px;text-align:center}.vistoria-assinaturas span,.vistoria-assinaturas small{display:block;font-size:11px;margin-top:4px}
`;
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

function abrirJanelaDeImpressao(titulo, conteudo, retrato = false) {
  const documentoHtml = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${textoSeguro(titulo)}</title><style>${ESTILOS_DOCUMENTO}${retrato ? '@page{size:A4 portrait;margin:14mm}body{padding:0}' : ''}</style></head><body>${conteudo}</body></html>`;
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

const modelos = criarModelosDocumentos(logoEra);
export function imprimirOrdemAtendimento(...argumentos) {
  const { titulo, conteudo } = modelos.ordemAtendimento(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo, true);
}
export function imprimirVistoriaTecnico(...argumentos) {
  const { titulo, conteudo } = modelos.vistoriaTecnico(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}
export function imprimirRelatorioVistorias(...argumentos) {
  const { titulo, conteudo } = modelos.relatorioVistorias(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirHistoricoEquipamento(...argumentos) {
  const { titulo, conteudo } = modelos.historicoEquipamento(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirInventarioObra(...argumentos) {
  const { titulo, conteudo } = modelos.inventarioObra(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirInventarioHistoricoObra(...argumentos) {
  const { titulo, conteudo } = modelos.inventarioHistoricoObra(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirRomaneioSeparacao(...argumentos) {
  const { titulo, conteudo } = modelos.romaneioSeparacao(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirRelatorioAuditoriaSolicitacao(...argumentos) {
  const { titulo, conteudo } = modelos.auditoriaSolicitacao(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirListaComprasSolicitacao(...argumentos) {
  const { titulo, conteudo } = modelos.listaComprasSolicitacao(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirListaComprasGeral(...argumentos) {
  const { titulo, conteudo } = modelos.listaComprasGeral(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}

export function imprimirHistoricoObra(...argumentos) {
  const { titulo, conteudo } = modelos.historicoObra(...argumentos);
  abrirJanelaDeImpressao(titulo, conteudo);
}
