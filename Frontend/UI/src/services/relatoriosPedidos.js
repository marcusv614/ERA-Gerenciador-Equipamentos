import { clienteHttp, obterDadosResposta } from './api/clienteHttp';
import { abrirDocumentoExportavel } from './documentosEquipamentos';
import { relatorioPedido,relatorioPedidosObra,relatorioComprasObra,relatorioFuncionario } from './modelosAuditoriaPedidos';
const consulta=(parametros,escopo)=>'?'+new URLSearchParams({...parametros,...(escopo?{escopo}:{})});
async function carregar(rota){return obterDadosResposta(await clienteHttp.get(rota));}
export async function exportarPedido(id,nome,escopo){const p=await carregar(`/relatorios/pedidos/${id}${consulta({},escopo)}`);abrirDocumentoExportavel(relatorioPedido(p));}
export async function exportarPedidosObra(id,nome,escopo){const p=await carregar(`/relatorios/pedidos${consulta({obraId:id},escopo)}`);abrirDocumentoExportavel(relatorioPedidosObra(p,`Pedidos da obra — ${nome}`));}
export async function exportarComprasObra(id,nome,escopo){const p=await carregar(`/relatorios/pedidos${consulta({obraId:id},escopo)}`);abrirDocumentoExportavel(relatorioComprasObra(p,`Compras da obra — ${nome}`));}
export async function exportarFuncionario(id,nome,escopo){const p=await carregar(`/relatorios/pedidos${consulta({funcionarioId:id},escopo)}`);abrirDocumentoExportavel(relatorioFuncionario(p,nome));}
export async function exportarConjunto(ids,nome,escopo){const p=await carregar('/relatorios/pedidos'+consulta({},escopo));const selecionados=new Set(ids);abrirDocumentoExportavel(relatorioPedidosObra(p.filter(pedido=>selecionados.has(pedido.id)||pedido.atendimentos.some(a=>selecionados.has(a.id))),nome||'Rastreabilidade dos pedidos selecionados'));}
