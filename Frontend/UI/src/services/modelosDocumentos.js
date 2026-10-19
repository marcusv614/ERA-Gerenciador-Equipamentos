import { formatarData } from '../utils/datas.js';
import { descreverLocalizacao } from '../utils/localizacaoEquipamentos.js';

const texto = (valor) => String(valor ?? '—').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const data = (valor) => valor ? formatarData(valor) : 'Não registrado';
const instante = (valor) => valor && !Number.isNaN(new Date(valor).getTime()) ? new Date(valor).toLocaleString('pt-BR', { timeZone:'America/Manaus' }) : 'Não registrado';
const codigo = (valor) => String(valor || '').trim() || 'Não selecionado';
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
const local = (id, buscar) => id == null ? 'Depósito central' : buscar(id)?.nome || 'Obra não disponível';
const idPedido = (id) => id == null ? 'Não registrado' : `#${String(id).padStart(4, '0')}`;
const agrupar = (itens) => [...itens.reduce((mapa, item) => {
  const chave = item.catalogoChave || [item.tipo, item.modelo || item.nome, item.medida].map(normalizar).join('|');
  const atual = mapa.get(chave) || { nome:item.modelo || item.nome, tipo:item.tipo, medida:item.medida, quantidade:0, presentes:0, reservados:0, transito:0, registros:0 };
  atual.quantidade += Number(item.quantidade ?? 0); atual.presentes += item.presentes ?? 0; atual.reservados += item.reservados ?? 0; atual.transito += item.transito ?? 0; atual.registros++;
  mapa.set(chave, atual);return mapa;
}, new Map()).values()].sort((a,b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
const tabela = (titulo, colunas, linhas) => `<h2>${texto(titulo)}</h2><table><thead><tr>${colunas.map((coluna) => `<th>${texto(coluna)}</th>`).join('')}</tr></thead><tbody>${linhas.length ? linhas.map((linha) => `<tr>${linha.map((valor) => `<td>${texto(valor)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${colunas.length}">Nenhum registro disponível.</td></tr>`}</tbody></table>`;
const nota = (mensagem) => `<p class="muted">${texto(mensagem)}</p>`;

export function criarModelosDocumentos(logoEra) {
  const cabecalho = (titulo, campos) => `<div class="doc-card"><div class="doc-top"><img class="doc-logo" src="${texto(logoEra)}" alt="ERA Engenharia de Redes da Amazônia"/><h1>${texto(titulo)}</h1></div><div class="header">${campos.map(([rotulo, valor]) => `<div class="header-row"><span class="label">${texto(rotulo)}</span><span class="value">${texto(valor)}</span></div>`).join('')}</div></div>`;
  const documento = (titulo, conteudo) => ({ titulo, conteudo:conteudo + nota(`Gerado em ${instante(new Date())} · horário de Manaus.`) });
  const camposObra = (obra, responsaveis = []) => [['Obra',obra.nome],['Cliente',obra.cliente],['Localização',obra.cidade],...(obra.inicio ? [['Início da obra',data(obra.inicio)]] : []),['Responsáveis técnicos cadastrados',obra.responsaveis?.join(', ') || 'Não registrado'],['Responsáveis pelos equipamentos relacionados',[...new Set(responsaveis.filter(Boolean))].join(', ') || 'Não registrado']];
  const origemPedido = (pedido, buscar) => pedido.obraOrigemId != null ? local(pedido.obraOrigemId, buscar) : pedido.materiais?.length && pedido.materiais.every((m) => m.identificacao?.trim()) ? 'Depósito central' : 'Ainda não definida pelo estoque';
  const camposPedido = (pedido, buscar) => [['Solicitação',idPedido(pedido.id)],['Pedido original',idPedido(pedido.solicitacaoPaiId ?? pedido.id)],['Operação',pedido.obraDestinoId != null ? 'Envio para obra' : 'Retirada para o depósito'],['Status do atendimento',pedido.status],['Data da solicitação',data(pedido.dataSolicitacao)],['Data da decisão',data(pedido.dataDecisao)],['Solicitante',pedido.solicitante || pedido.tecnico],['Técnico responsável',pedido.tecnico],['Origem da separação',origemPedido(pedido,buscar)],['Destino',local(pedido.obraDestinoId,buscar)],['Saída registrada',instante(pedido.transitoEm)],['Recebimento confirmado',instante(pedido.concluidaEm)]];
  const observacao = (pedido) => pedido.observacao ? `<h2>Observações registradas</h2>${nota(pedido.observacao)}` : '';

  function historicoEquipamento(e, historico, buscar) {
    const titulo=`Histórico de movimentações — ${e.modelo}`;
    const campos=[['Equipamento',e.modelo],['Tipo',e.tipo],['Código / série',codigo(e.serie)],['Nota fiscal',e.notaFiscal],['Status atual',e.status],['Localização / deslocamentos',descreverLocalizacao(e,buscar)],['Técnico responsável',e.tecnico]];
    const linhas=historico.map((m)=>[idPedido(m.solicitacaoId),m.quantidade ?? 'Não registrado',data(m.dataMovimentacao),m.origemNome || 'Não registrado',m.destinoNome || 'Não registrado',instante(m.saidaEm),instante(m.entradaEm),m.tecnico,m.status]);
    return documento(titulo,cabecalho('Histórico de movimentações',campos)+tabela('Movimentações registradas',['Solicitação','Qtd. movimentada','Data registrada','Origem','Destino','Saída registrada','Recebimento confirmado','Técnico responsável','Status'],linhas)+nota('Data registrada é a referência do lançamento. Saída e recebimento são apresentados somente quando comprovados pelo pedido vinculado.'));
  }

  function inventarioObra(obra,equipamentos,buscar=(id)=>({nome:`Obra #${id}`})) {
    const itens=equipamentos.filter((e)=>!e.arquivado&&String(e.obraId)===String(obra.id)).map((e)=>{
      const transito=Math.min(e.quantidade ?? 1,Math.max(0,e.quantidadeEmTransito ?? 0));
      const presentes=Math.max(0,e.quantidadeNaOrigem ?? (e.quantidade ?? 1)-transito);
      return {...e,presentes,transito,reservados:Math.min(presentes,Math.max(0,(e.quantidadeReservada ?? 0)-transito))};
    });
    const grupos=agrupar(itens);
    const resumo=grupos.map((g)=>[g.nome,g.tipo,g.medida,g.presentes,g.reservados,g.transito]);
    const detalhes=itens.map((e)=>[e.modelo,codigo(e.serie),e.notaFiscal,e.tecnico,e.presentes,e.reservados,e.transito]);
    const entradas=equipamentos.filter((e)=>!e.arquivado).flatMap((e)=>(e.deslocamentos || []).filter((d)=>d.status==='Em trânsito'&&String(d.destinoId)===String(obra.id)).map((d)=>[idPedido(d.solicitacaoId),e.modelo,codigo(e.serie),d.quantidade,local(d.origemId,buscar),d.tecnico]));
    // A origem permanece vinculada ao registro até a confirmação do recebimento.
    return documento(`Inventário — ${obra.nome}`,cabecalho('Inventário atual da obra',camposObra(obra,itens.map((e)=>e.tecnico)))+tabela('Posição por material',['Material','Tipo','Medida','Presentes na obra','Reservadas na obra','Em transporte de saída'],resumo)+tabela('Rastreabilidade dos registros',['Material','Código / série','Nota fiscal','Responsável','Presentes','Reservadas','Saída em transporte'],detalhes)+tabela('Entradas em transporte — ainda não recebidas',['Solicitação','Material','Código / série','Quantidade','Origem','Técnico de destino'],entradas)+nota('Reservadas são parte das unidades presentes, não uma quantidade adicional. Unidades em transporte não são contabilizadas como presentes no destino.'));
  }

  function inventarioHistoricoObra(inventario) {
    const itens=inventario.materiais || [];
    const obra={nome:inventario.obraNome,cliente:inventario.cliente,cidade:inventario.cidade,responsaveis:inventario.responsaveisTecnicos};
    const campos=[...camposObra(obra,itens.map((e)=>e.tecnico)),['Data consultada',data(inventario.dataReferencia)],['Data do retrato armazenado',data(inventario.dataSnapshot)],['Registro do retrato',instante(inventario.registradoEm)],['Identificador do retrato',inventario.snapshotId],['Status da obra no retrato',inventario.status]];
    return documento(`Inventário histórico — ${obra.nome}`,cabecalho('Inventário histórico da obra',campos)+tabela('Resumo do retrato armazenado',['Material','Tipo','Medida','Qtd. registrada','Registros'],agrupar(itens).map((g)=>[g.nome,g.tipo,g.medida,g.quantidade,g.registros]))+tabela('Detalhamento para auditoria',['Qtd. registrada','Material','Código / série','Medida','Responsável'],itens.map((e)=>[e.quantidade,e.modelo,codigo(e.serie),e.medida,e.tecnico]))+nota('Posição cadastral do último retrato disponível até a data consultada. Não reconstitui a localização física durante o transporte.'));
  }

  function romaneioSeparacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const separado=itens.length>0&&itens.every((m)=>m.identificacao?.trim());
    return documento(`Romaneio — ${idPedido(pedido.id)}`,cabecalho('Romaneio de separação',camposPedido(pedido,buscar))+nota(separado?'Documento para conferência dos materiais separados. Não comprova recebimento.':'Separação ainda não concluída. Este documento não comprova reserva ou recebimento.')+tabela(separado?'Materiais separados':'Materiais solicitados',['Quantidade','Material','Código / série','Origem da coleta'],itens.map((m)=>[m.quantidade,m.nome,codigo(m.identificacao),m.identificacao ? origemPedido(pedido,buscar) : 'Ainda não definida']))+observacao(pedido));
  }

  function auditoriaSolicitacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const compras=itens.filter((m)=>m.quantidadeCompra>0).map((m)=>[m.nome,m.quantidadeCompra,m.quantidadeAdquirida ?? 0,m.quantidadeEntradaEstoque ?? 0,Math.max(0,m.quantidadeCompra-(m.quantidadeEntradaEstoque ?? 0))]);
    return documento(`Auditoria — ${idPedido(pedido.id)}`,cabecalho('Relatório de auditoria da solicitação',[...camposPedido(pedido,buscar),['Total solicitado',itens.reduce((total,m)=>total+(m.quantidade ?? 0),0)]])+tabela('Resumo por material',['Material','Quantidade solicitada','Registros'],agrupar(itens).map((g)=>[g.nome,g.quantidade,g.registros]))+tabela('Itens e locais de coleta',['Quantidade','Material','Código / série','Origem da coleta'],itens.map((m)=>[m.quantidade,m.nome,codigo(m.identificacao),m.identificacao?origemPedido(pedido,buscar):'Ainda não definida']))+(compras.length?tabela('Acompanhamento de compras',['Material','Compra solicitada','Adquirida','Entrada no estoque','Aguardando entrada'],compras):'')+observacao(pedido)+nota('Datas ausentes não foram presumidas. Cada atendimento separado por origem mantém sua referência ao pedido original.'));
  }

  function listaComprasSolicitacao(pedido,aquisicoes,buscar) {
    const obra=buscar(pedido.obraDestinoId ?? pedido.obraOrigemId);
    const linhas=aquisicoes.filter(({pendente})=>pendente>0).map(({material,pendente},i)=>[i+1,material.nome,pendente,'','']);
    return documento(`Lista de compras — ${idPedido(pedido.id)}`,cabecalho('Lista de compras por solicitação',[['Solicitação',idPedido(pedido.id)],['Pedido original',idPedido(pedido.solicitacaoPaiId ?? pedido.id)],['Obra',obra?.nome || (pedido.obraDestinoId == null&&pedido.obraOrigemId == null?'Depósito central':'Obra não disponível')],['Solicitante',pedido.solicitante || pedido.tecnico],['Data da solicitação',data(pedido.dataSolicitacao)]])+tabela('Materiais pendentes de aquisição',['Item','Material','Quantidade','Fornecedor (preenchimento manual)','Conferência (preenchimento manual)'],linhas)+nota('Quantidade corresponde ao saldo ainda não adquirido. Os campos manuais não representam informações registradas no sistema.'));
  }

  function listaComprasGeral(aquisicoes,buscar) {
    const grupos=[...aquisicoes.filter(({pendente})=>pendente>0).reduce((mapa,item)=>{
      const chave=item.material.catalogoChave || normalizar(item.material.nome);
      const g=mapa.get(chave)||{nome:item.material.nome,quantidade:0,obras:new Set(),pedidos:new Set()};
      g.quantidade+=item.pendente;g.obras.add(local(item.solicitacao.obraDestinoId ?? item.solicitacao.obraOrigemId,buscar));g.pedidos.add(idPedido(item.solicitacao.id));mapa.set(chave,g);return mapa;
    },new Map()).values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return documento('Lista geral de compras',cabecalho('Lista geral de compras',[['Materiais distintos',grupos.length],['Unidades pendentes',grupos.reduce((n,g)=>n+g.quantidade,0)]])+tabela('Materiais pendentes de aquisição',['Item','Material','Quantidade','Obras','Solicitações','Conferência (preenchimento manual)'],grupos.map((g,i)=>[i+1,g.nome,g.quantidade,[...g.obras].join(', '),[...g.pedidos].join(', '),'']))+nota('Materiais equivalentes foram consolidados. A conferência é um campo para preenchimento manual.'));
  }

  function historicoObra(obra,equipamentos) {
    const eventos=equipamentos.flatMap((e)=>(e.historico || []).filter((m)=>String(m.destinoObraId)===String(obra.id)||String(m.origemObraId)===String(obra.id)).map((m)=>({e,m})))
      .sort((a,b)=>String(a.m.entradaEm || a.m.saidaEm || a.m.dataMovimentacao || '').localeCompare(String(b.m.entradaEm || b.m.saidaEm || b.m.dataMovimentacao || '')));
    const linhas=eventos.map(({e,m})=>[idPedido(m.solicitacaoId),m.quantidade ?? 'Não registrado',e.modelo,codigo(e.serie),m.origemNome || 'Não registrado',m.destinoNome || 'Não registrado',data(m.dataMovimentacao),instante(m.saidaEm),instante(m.entradaEm),m.tecnico,m.status]);
    return documento(`Histórico da obra — ${obra.nome}`,cabecalho('Histórico de movimentações da obra',camposObra(obra,eventos.map(({m})=>m.tecnico)))+tabela('Uma linha por movimentação registrada',['Solicitação','Qtd. movimentada','Material','Código / série','Origem','Destino','Data registrada','Saída registrada','Recebimento confirmado','Técnico responsável','Status'],linhas)+nota('A quantidade corresponde a cada movimentação, não ao saldo atual do equipamento. Campos sem comprovação permanecem como não registrados.'));
  }
  return {historicoEquipamento,inventarioObra,inventarioHistoricoObra,romaneioSeparacao,auditoriaSolicitacao,listaComprasSolicitacao,listaComprasGeral,historicoObra};
}
