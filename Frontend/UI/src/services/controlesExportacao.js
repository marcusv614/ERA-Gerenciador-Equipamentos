import { gerarCsv } from './planilhasRelatorios.js';

export const EVENTO_EXPORTACAO = 'era:exportar-relatorio';

export function validarFiltro({ modo = 'todos', inicio = '', fim = '' } = {}) {
  if (modo === 'todos') return '';
  const dataValida = data => /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(Date.parse(data));
  if (!dataValida(inicio) || (modo === 'periodo' && !dataValida(fim))) return 'Preencha as datas do filtro.';
  if (modo === 'periodo' && fim < inicio) return 'A data final deve ser igual ou posterior à inicial.';
  return '';
}

export function incluirLinha(data, estatica, { modo = 'todos', inicio = '', fim = '' } = {}) {
  if (modo === 'todos' || estatica) return true;
  return !!data && data >= inicio && data <= (modo === 'dia' ? inicio : fim);
}

export function linhasDoDocumento(documento) {
  return [...documento.querySelectorAll('tbody tr')].map(tr => {
    const tabela = tr.closest('table');
    const coluna = [...tabela.querySelectorAll('thead th')].findIndex(th => /^(data\b|registrado em\b|abertura\b|retirada\b|conferência\b)/i.test(th.textContent.trim()));
    const data = (coluna < 0 ? '' : tr.cells[coluna]?.textContent || '').match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
    return { tr, data: tr.hasAttribute('data-data') ? tr.dataset.data : data ? `${data[3]}-${data[2]}-${data[1]}` : '', estatica: tabela.hasAttribute('data-estatica') };
  });
}

// Documento separado: o HTML do relatório nunca é inserido na dashboard.
export function prepararExportacao({ titulo, conteudo }, filtro = {}) {
  const documento = new DOMParser().parseFromString(conteudo, 'text/html');
  const linhas = linhasDoDocumento(documento);
  const temData = linhas.some(l => l.data && !l.estatica);
  const aplicado = temData ? filtro : { modo: 'todos' };
  const erro = validarFiltro(aplicado);
  let excluidas = 0;
  for (const linha of linhas) {
    if (!incluirLinha(linha.data, linha.estatica, aplicado)) { linha.tr.remove(); excluidas++; }
  }
  const recorte = aplicado.modo && aplicado.modo !== 'todos'
    ? `Período: ${aplicado.inicio} a ${aplicado.modo === 'dia' ? aplicado.inicio : aplicado.fim} · horário de Manaus. Registros sem data comprovada não incluídos.`
    : 'Todos os registros · horário de Manaus.';
  const resumo = documento.createElement('p');
  resumo.className = 'muted'; resumo.textContent = recorte; documento.body.prepend(resumo);
  const planilha = [[titulo], [recorte], []];
  for (const node of documento.querySelectorAll('h1,h2,.header-row,table,body > p')) {
    if (node === resumo) continue;
    if (node.matches('h1,h2,p')) planilha.push([node.textContent]);
    else if (node.matches('.header-row')) planilha.push([...node.children].map(x => x.textContent));
    else { for (const tr of node.querySelectorAll('tr')) planilha.push([...tr.cells].map(td => td.textContent)); planilha.push([]); }
  }
  return { conteudo: documento.body.innerHTML, csv: gerarCsv(planilha), temData, erro, excluidas, quantidade: linhas.length - excluidas };
}

export function baixarPlanilha(titulo, csv) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = titulo.replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 90) + '.csv';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
