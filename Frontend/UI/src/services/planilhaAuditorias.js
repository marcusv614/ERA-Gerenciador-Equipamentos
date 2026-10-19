import { formatarData } from '../utils/datas.js';
const celula = (valor) => {
  let texto=String(valor ?? '');
  if (/^[\s\uFEFF]*[=+\-@]/.test(texto)||/^[\t\r\n]/.test(texto))texto=`'${texto}`;
  return `"${texto.replaceAll('"','""')}"`;
};
export function gerarPlanilhaAuditorias(auditorias) {
  const cabecalho=['Auditoria','Técnico fiscalizado','Situação','Criação da ficha','Data da vistoria','Fiscal','Equipamento ID','Material','Categoria','Código / série','Local na ficha','Quantidade','Bom','Com avaria','Quebrado','A avaliar','Observação do item','Observações gerais','Ficha criada por','Conta da criação','Lançado no sistema por','Conta do lançamento'];
  const linhas=auditorias.flatMap((a)=>a.itens.map((i)=>[`#${String(a.id).padStart(4,'0')}`,a.tecnicoNome,a.status==='CONCLUIDA'?'Concluída':'Aberta',a.criadoEm,a.dataVistoria?formatarData(a.dataVistoria):'',a.fiscal,i.equipamentoId,i.modelo,i.tipo,i.serie,i.local,i.quantidade,i.bom,i.avaria,i.quebrado,i.quantidade-i.bom-i.avaria-i.quebrado,i.observacao,a.observacoes,a.criadoPorNome,a.criadoPorLogin,a.registradoPorNome,a.registradoPorLogin]));
  return '\uFEFF'+[cabecalho,...linhas].map((linha)=>linha.map(celula).join(';')).join('\r\n');
}
export function exportarPlanilhaAuditorias(auditorias) {
  const url=URL.createObjectURL(new Blob([gerarPlanilhaAuditorias(auditorias)],{type:'text/csv;charset=utf-8;'}));
  const link=document.createElement('a');link.href=url;link.download='auditorias-materiais.csv';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
