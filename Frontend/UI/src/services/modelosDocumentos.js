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
  const camposAutoria = (pedido) => [
    ['Solicitado por', pedido.solicitante || 'Não registrado'],
    ['Conta utilizada', pedido.solicitanteLogin || 'Não registrado'],
    ['Perfil na solicitação', ({ GERENTE: 'Gerente', ADMIN: 'Administrador', TECNICO: 'Técnico', ESTOQUE: 'Estoque' })[pedido.solicitantePerfil] || 'Não registrado'],
  ];
  const camposPedido = (pedido, buscar) => [['Atendimento',idPedido(pedido.id)],['Pedido original',idPedido(pedido.solicitacaoPaiId ?? pedido.id)],['Operação',pedido.obraDestinoId != null ? 'Envio para obra' : 'Retirada para o depósito'],['Status do atendimento',pedido.status],['Data do pedido',data(pedido.dataSolicitacao)],['Data da decisão',data(pedido.dataDecisao)],...camposAutoria(pedido),['Técnico responsável',pedido.tecnico],['Origem da separação',origemPedido(pedido,buscar)],['Destino',local(pedido.obraDestinoId,buscar)],['Saída registrada',instante(pedido.transitoEm)],['Recebimento confirmado',instante(pedido.concluidaEm)]];
  const observacao = (pedido) => pedido.observacao ? `<h2>Observações registradas</h2>${nota(pedido.observacao)}` : '';

  function historicoEquipamento(e, historico, buscar) {
    const titulo=`Histórico do equipamento — ${e.modelo}`;
    const campos=[['Equipamento',e.modelo],['Tipo',e.tipo],['Código / série',codigo(e.serie)],['Nota fiscal',e.notaFiscal],['Status atual',e.status],['Localização / deslocamentos',descreverLocalizacao(e,buscar)],['Técnico responsável',e.tecnico]];
    const linhas=historico.map((m)=>[idPedido(m.solicitacaoId),m.quantidade ?? 'Não registrado',data(m.dataMovimentacao),m.origemNome || 'Não registrado',m.destinoNome || 'Não registrado',instante(m.saidaEm),instante(m.entradaEm),m.tecnico,m.status]);
    const manutencoes=(e.manutencoes || []).map(m=>[idPedido(m.id),m.quantidade,m.status==='ABERTA'?'Em manutenção':'Concluída',m.modelo,m.serie,m.local,m.motivo,instante(m.abertaEm),m.abertaPorNome ? `${m.abertaPorNome} (${m.abertaPorLogin || 'Conta não informada'})` : 'Não informado',instante(m.concluidaEm),m.concluidaPorNome ? `${m.concluidaPorNome} (${m.concluidaPorLogin || 'Conta não informada'})` : 'Não informado',m.observacaoConclusao]);
    return documento(titulo,cabecalho('Histórico do equipamento',campos)+tabela('Movimentações registradas',['Atendimento','Qtd. movimentada','Data registrada','Origem','Destino','Saída registrada','Recebimento confirmado','Técnico responsável','Status'],linhas)+(manutencoes.length?tabela('Manutenções registradas',['Registro','Quantidade','Situação','Material na abertura','Código / série','Local na abertura','Motivo','Abertura','Registrada por','Conclusão','Concluída por','Serviço realizado'],manutencoes):'')+nota('Data registrada é a referência do lançamento. Saída e recebimento são apresentados somente quando comprovados pelo pedido vinculado.'));
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
    const manutencoes=itens.filter(e=>e.quantidadeManutencao>0).map(e=>[e.modelo,codigo(e.serie),e.quantidadeManutencao,e.tecnico]);
    const entradas=equipamentos.filter((e)=>!e.arquivado).flatMap((e)=>(e.deslocamentos || []).filter((d)=>d.status==='Em trânsito'&&String(d.destinoId)===String(obra.id)).map((d)=>[idPedido(d.solicitacaoId),e.modelo,codigo(e.serie),d.quantidade,local(d.origemId,buscar),d.tecnico]));
    // A origem permanece vinculada ao registro até a confirmação do recebimento.
    return documento(`Inventário — ${obra.nome}`,cabecalho('Inventário atual da obra',camposObra(obra,itens.map((e)=>e.tecnico)))+tabela('Posição por material',['Material','Tipo','Medida','Presentes na obra','Reservadas na obra','Em transporte de saída'],resumo)+tabela('Rastreabilidade dos registros',['Material','Código / série','Nota fiscal','Responsável','Presentes','Reservadas','Saída em transporte'],detalhes)+(manutencoes.length?tabela('Unidades em manutenção — bloqueadas para novos pedidos',['Material','Código / série','Em manutenção','Responsável'],manutencoes):'')+tabela('Entradas em transporte — ainda não recebidas',['Atendimento','Material','Código / série','Quantidade','Origem','Técnico de destino'],entradas)+nota('Reservadas e unidades em manutenção fazem parte das unidades presentes, não são quantidades adicionais. Unidades em transporte não são contabilizadas como presentes no destino.'));
  }

  function inventarioHistoricoObra(inventario) {
    const itens=inventario.materiais || [];
    const obra={nome:inventario.obraNome,cliente:inventario.cliente,cidade:inventario.cidade,responsaveis:inventario.responsaveisTecnicos};
    const campos=[...camposObra(obra,itens.map((e)=>e.tecnico)),['Data consultada',data(inventario.dataReferencia)],['Data do retrato armazenado',data(inventario.dataSnapshot)],['Registro do retrato',instante(inventario.registradoEm)],['Identificador do retrato',inventario.snapshotId],['Status da obra no retrato',inventario.status]];
    return documento(`Inventário histórico — ${obra.nome}`,cabecalho('Inventário histórico da obra',campos)+tabela('Resumo do retrato armazenado',['Material','Tipo','Medida','Qtd. registrada','Registros'],agrupar(itens).map((g)=>[g.nome,g.tipo,g.medida,g.quantidade,g.registros]))+tabela('Detalhamento para vistoria',['Qtd. registrada','Material','Código / série','Medida','Responsável'],itens.map((e)=>[e.quantidade,e.modelo,codigo(e.serie),e.medida,e.tecnico]))+nota('Posição cadastral do último retrato disponível até a data consultada. Não reconstitui a localização física durante o transporte.'));
  }

  function romaneioSeparacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const separado=itens.length>0&&itens.every((m)=>m.identificacao?.trim());
    return documento(`Romaneio — ${idPedido(pedido.id)}`,cabecalho('Romaneio de separação',camposPedido(pedido,buscar))+nota(separado?'Documento para conferência dos materiais separados. Não comprova recebimento.':'Separação ainda não concluída. Este documento não comprova reserva ou recebimento.')+tabela(separado?'Materiais separados':'Materiais solicitados',['Quantidade','Material','Código / série','Origem da coleta'],itens.map((m)=>[m.quantidade,m.nome,codigo(m.identificacao),m.identificacao ? origemPedido(pedido,buscar) : 'Ainda não definida']))+observacao(pedido));
  }

  function auditoriaSolicitacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const compras=(pedido.compras?.length?pedido.compras:itens).filter((m)=>m.quantidadeCompra>0).map((m)=>[m.nome,m.quantidadeCompra,m.quantidadeAdquirida ?? 0,m.quantidadeEntradaEstoque ?? 0,Math.max(0,m.quantidadeCompra-(m.quantidadeEntradaEstoque ?? 0))]);
    return documento(`Vistoria — ${idPedido(pedido.id)}`,cabecalho('Relatório de vistoria do atendimento',[...camposPedido(pedido,buscar),['Total solicitado',itens.reduce((total,m)=>total+(m.quantidade ?? 0),0)]])+tabela('Resumo por material',['Material','Quantidade solicitada','Registros'],agrupar(itens).map((g)=>[g.nome,g.quantidade,g.registros]))+tabela('Itens e locais de coleta',['Quantidade','Material','Código / série','Origem da coleta'],itens.map((m)=>[m.quantidade,m.nome,codigo(m.identificacao),m.identificacao?origemPedido(pedido,buscar):'Ainda não definida']))+(compras.length?tabela('Acompanhamento de compras do pedido original',['Material','Compra solicitada','Adquirida','Entrada no estoque','Aguardando entrada'],compras):'')+observacao(pedido)+nota('Datas ausentes não foram presumidas. Cada atendimento separado por origem mantém sua referência ao pedido original.'));
  }

  function listaComprasSolicitacao(pedido,aquisicoes,buscar) {
    const obra=buscar(pedido.obraDestinoId ?? pedido.obraOrigemId);
    const linhas=aquisicoes.filter(({pendente})=>pendente>0).map(({material,pendente},i)=>[i+1,material.nome,pendente,'','']);
    return documento(`Lista de compras — ${idPedido(pedido.id)}`,cabecalho('Lista de compras por atendimento',[['Atendimento',idPedido(pedido.id)],['Pedido original',idPedido(pedido.solicitacaoPaiId ?? pedido.id)],['Obra',obra?.nome || (pedido.obraDestinoId == null&&pedido.obraOrigemId == null?'Depósito central':'Obra não disponível')],...camposAutoria(pedido),['Data do pedido',data(pedido.dataSolicitacao)]])+tabela('Materiais pendentes de aquisição',['Item','Material','Quantidade','Fornecedor (preenchimento manual)','Conferência (preenchimento manual)'],linhas)+nota('Quantidade corresponde ao saldo ainda não adquirido. Os campos manuais não representam informações registradas no sistema.'));
  }

  function listaComprasGeral(aquisicoes,buscar) {
    const grupos=[...aquisicoes.filter(({pendente})=>pendente>0).reduce((mapa,item)=>{
      const chave=item.material.catalogoChave || normalizar(item.material.nome);
      const g=mapa.get(chave)||{nome:item.material.nome,quantidade:0,obras:new Set(),pedidos:new Set()};
      g.quantidade+=item.pendente;g.obras.add(local(item.solicitacao.obraDestinoId ?? item.solicitacao.obraOrigemId,buscar));g.pedidos.add(idPedido(item.solicitacao.id));mapa.set(chave,g);return mapa;
    },new Map()).values()].sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));
    return documento('Lista geral de compras',cabecalho('Lista geral de compras',[['Materiais distintos',grupos.length],['Unidades pendentes',grupos.reduce((n,g)=>n+g.quantidade,0)]])+tabela('Materiais pendentes de aquisição',['Item','Material','Quantidade','Obras','Atendimentos','Conferência (preenchimento manual)'],grupos.map((g,i)=>[i+1,g.nome,g.quantidade,[...g.obras].join(', '),[...g.pedidos].join(', '),'']))+nota('Materiais equivalentes foram consolidados. A conferência é um campo para preenchimento manual.'));
  }

  function historicoObra(obra,equipamentos) {
    const eventos=equipamentos.flatMap((e)=>(e.historico || []).filter((m)=>String(m.destinoObraId)===String(obra.id)||String(m.origemObraId)===String(obra.id)).map((m)=>({e,m})))
      .sort((a,b)=>String(a.m.entradaEm || a.m.saidaEm || a.m.dataMovimentacao || '').localeCompare(String(b.m.entradaEm || b.m.saidaEm || b.m.dataMovimentacao || '')));
    const linhas=eventos.map(({e,m})=>[idPedido(m.solicitacaoId),m.quantidade ?? 'Não registrado',e.modelo,codigo(e.serie),m.origemNome || 'Não registrado',m.destinoNome || 'Não registrado',data(m.dataMovimentacao),instante(m.saidaEm),instante(m.entradaEm),m.tecnico,m.status]);
    return documento(`Histórico da obra — ${obra.nome}`,cabecalho('Histórico de movimentações da obra',camposObra(obra,eventos.map(({m})=>m.tecnico)))+tabela('Uma linha por movimentação registrada',['Atendimento','Qtd. movimentada','Material','Código / série','Origem','Destino','Data registrada','Saída registrada','Recebimento confirmado','Técnico responsável','Status'],linhas)+nota('A quantidade corresponde a cada movimentação, não ao saldo atual do equipamento. Campos sem comprovação permanecem como não registrados.'));
  }
  function vistoriaTecnico(auditoria, preenchida = false) {
    const resultado = preenchida && auditoria.status === 'CONCLUIDA';
    const icones = {
      bom:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
      avaria:'<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v5m0 3v1"/>',
      quebrado:'<path d="m8 3-5 5v8l5 5h8l5-5V8l-5-5Z"/><path d="m8 8 8 8m0-8-8 8"/>',
    };
    const icone = (chave) => `<svg class="vistoria-icone" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">${icones[chave]}</svg>`;
    const campos = [['Vistoria',idPedido(auditoria.id)],['Técnico fiscalizado',auditoria.tecnicoNome],['Ficha criada em',instante(auditoria.criadoEm)],['Ficha criada por',`${auditoria.criadoPorNome} (${auditoria.criadoPorLogin})`],['Data da vistoria',resultado?data(auditoria.dataVistoria):'____ / ____ / ________'],['Fiscal responsável',resultado?auditoria.fiscal:'________________________________________________']];
    if(resultado)campos.push(['Lançado no sistema por',`${auditoria.registradoPorNome} (${auditoria.registradoPorLogin})`],['Conclusão do registro',instante(auditoria.concluidaEm)]);
    const celula = (item,chave) => `<td class="vistoria-estado"><span class="vistoria-caixa">${resultado&&item[chave]>0?'X':'&nbsp;'}</span>${item.quantidade>1?`<div>Qtd.: ${resultado?texto(item[chave]):'______'}</div>`:''}</td>`;
    const linhas=auditoria.itens.map((i,indice)=>`<tr><td>${indice+1}</td><td><strong>${texto(i.modelo)}</strong><br>${texto(i.tipo)}${i.medida?` · ${texto(i.medida)}`:''}</td><td>${texto(i.serie)}<br>${texto(i.local)}</td><td>${texto(i.quantidade)}</td>${['bom','avaria','quebrado'].map((chave)=>celula(i,chave)).join('')}<td>${resultado?texto(i.observacao||''):'&nbsp;'}</td></tr>`).join('');
    const grade=`<table class="vistoria-tabela"><thead><tr><th>Item</th><th>Material auditável</th><th>Código / série e local na ficha</th><th>Qtd.</th><th>${icone('bom')} Bom</th><th>${icone('avaria')} Com avaria</th><th>${icone('quebrado')} Quebrado</th><th>Observação do item</th></tr></thead><tbody>${linhas}</tbody></table>`;
    const instrucoes=nota(resultado?'Resultado lançado a partir da vistoria. As assinaturas manuscritas são coletadas na ficha física.':'Marque um X no estado de cada equipamento. Para lotes com unidades em condições diferentes, marque os estados encontrados e preencha as quantidades; a soma deve corresponder à quantidade da linha.');
    const observacoes=`<section class="vistoria-final"><h2>Observações gerais</h2><div class="vistoria-observacoes">${resultado?texto(auditoria.observacoes||'Sem observações registradas.'):'&nbsp;'}</div><div class="vistoria-assinaturas"><div><span>Assinatura do fiscal</span><small>${resultado?texto(auditoria.fiscal):'Nome: ______________________________________'}</small></div><div><span>Assinatura do técnico fiscalizado</span><small>${texto(auditoria.tecnicoNome)}</small></div></div></section>`;
    return documento(`Vistoria ${idPedido(auditoria.id)} — ${auditoria.tecnicoNome}`,cabecalho(resultado?'Resultado da vistoria de conservação':'Ficha de vistoria de conservação',campos)+instrucoes+grade+observacoes+nota('Os materiais, as identificações, os locais e as quantidades correspondem à ficha criada. Unidades em trânsito na geração da ficha não foram incluídas.'));
  }
  function relatorioVistorias(auditorias,filtros='') {
    const linhas=auditorias.flatMap((a)=>a.itens.map((i)=>[idPedido(a.id),a.tecnicoNome,a.fiscal||'Não informado',a.dataVistoria?data(a.dataVistoria):'Não informada',a.status==='CONCLUIDA'?'Concluída':'Aberta',i.modelo,i.serie,i.local,i.quantidade,i.bom,i.avaria,i.quebrado,i.quantidade-i.bom-i.avaria-i.quebrado,i.observacao||'']));
    return documento('Relatório de vistorias dos materiais',cabecalho('Relatório de vistorias dos materiais',[['Vistorias na consulta',auditorias.length],['Registros de materiais',linhas.length]])+nota(filtros)+tabela('Condições registradas nos materiais da consulta',['Vistoria','Técnico','Fiscal','Data da vistoria','Situação','Material','Código / série','Obra na ficha','Qtd.','Bom','Com avaria','Quebrado','A avaliar','Observação'],linhas)+nota('Os locais e as quantidades correspondem às fichas de vistoria, preservando cada vistoria periódica. As fichas originais completas, com campos de assinaturas, permanecem disponíveis por vistoria.'));
  }
  return {historicoEquipamento,inventarioObra,inventarioHistoricoObra,romaneioSeparacao,auditoriaSolicitacao,listaComprasSolicitacao,listaComprasGeral,historicoObra,vistoriaTecnico,relatorioVistorias};
}
