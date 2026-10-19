const CONDICOES = ['bom', 'avaria', 'quebrado'];

export function limiteQuantidadeCondicao(item, condicao) {
  if (!CONDICOES.includes(condicao)) return 0;
  const outras = CONDICOES.filter((chave) => chave !== condicao)
    .reduce((total, chave) => total + Number(item[chave] || 0), 0);
  return Math.max(0, item.quantidade - outras);
}

export function atualizarQuantidadeCondicao(item, condicao, valor) {
  if (!CONDICOES.includes(condicao)) return item;
  if (valor === '') return { ...item, [condicao]: '' };
  const quantidade = Number(valor);
  if (!Number.isInteger(quantidade) || quantidade < 0 || quantidade > limiteQuantidadeCondicao(item, condicao)) return item;
  return { ...item, [condicao]: quantidade };
}

export function somarCondicoes(itens) {
  return itens.reduce((r, i) => ({ quantidade:r.quantidade+i.quantidade, bom:r.bom+Number(i.bom || 0), avaria:r.avaria+Number(i.avaria || 0), quebrado:r.quebrado+Number(i.quebrado || 0) }), {quantidade:0,bom:0,avaria:0,quebrado:0});
}
export function validarRegistroVistoria(itens, concluir = false) {
  if (!itens.length) return 'A ficha não contém itens para vistoria.';
  for (const item of itens) {
    const valores = ['bom','avaria','quebrado'].map((chave) => Number(item[chave] || 0));
    const total = valores.reduce((s, v) => s+v, 0);
    if (valores.some((v) => !Number.isInteger(v) || v<0) || total>item.quantidade || (concluir && total!==item.quantidade)) return `Confira ${item.modelo}: distribua as ${item.quantidade} unidade(s) entre bom, com avaria e quebrado.`;
  }
  return '';
}
import { formatarData } from './datas.js';
const normalizar = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export const obraDoItem = (item) => item.obraId == null ? 'deposito' : String(item.obraId);
export function filtrarAuditorias(registros, { busca='',tecnico='',obra='',status='',inicio='',fim='' } = {}) {
  const termos=normalizar(busca).trim().split(/\s+/).filter(Boolean);
  return registros.flatMap((a)=>{
    const dia=a.dataVistoria || a.criadoEm?.slice(0,10) || '';
    if((tecnico&&String(a.funcionarioId)!==String(tecnico))||(status&&a.status!==status)||(inicio&&dia<inicio)||(fim&&dia>fim))return [];
    const itens=obra?a.itens.filter((i)=>obraDoItem(i)===obra):a.itens;
    if(!itens.length)return [];
    const texto=normalizar([a.id,`#${String(a.id).padStart(4,'0')}`,a.tecnicoNome,a.fiscal,a.observacoes,a.criadoPorNome,a.registradoPorNome,a.status==='CONCLUIDA'?'concluida':'aberta',formatarData(dia),...itens.flatMap((i)=>[i.modelo,i.serie,i.local,i.observacao])].join(' '));
    return termos.every((t)=>texto.includes(t))?[{...a,itens}]:[];
  });
}
