import { formatarData } from '../utils/datas.js';
import { descreverLocalizacao } from '../utils/localizacaoEquipamentos.js';
import { ROTULOS_CALIBRACAO, EVENTOS_CALIBRACAO } from '../utils/calibracoes.js';
import { acompanhamentoPedidoFinanceiro, rotuloDecisaoFinanceira } from '../utils/pedidosFinanceiros.js';

const texto = (valor) => String(valor ?? '—').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
const data = (valor) => valor ? formatarData(valor) : 'Não registrado';
const instante = (valor) => valor && !Number.isNaN(new Date(valor).getTime()) ? new Date(valor).toLocaleString('pt-BR', { timeZone:'America/Manaus' }) : 'Não registrado';
const codigo = (valor) => String(valor || '').trim() || 'Não selecionado';
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
const local = (id, buscar) => id == null ? 'Depósito central' : buscar(id)?.nome || 'Obra não disponível';
const idPedido = (id) => id == null ? 'Não registrado' : `#${String(id).padStart(4, '0')}`;
const tabela = (titulo, colunas, linhas) => `<h2>${texto(titulo)}</h2><table><thead><tr>${colunas.map((coluna) => `<th>${texto(coluna)}</th>`).join('')}</tr></thead><tbody>${linhas.length ? linhas.map((linha) => `<tr>${linha.map((valor) => `<td>${texto(valor)}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${colunas.length}">Nenhum registro disponível.</td></tr>`}</tbody></table>`;
const nota = (mensagem) => `<p class="muted">${texto(mensagem)}</p>`;

export function criarModelosDocumentos(logoEra) {
  const cabecalho = (titulo, campos) => `<div class="doc-card"><div class="doc-top"><img class="doc-logo" src="${texto(logoEra)}" alt="ERA Engenharia de Redes da Amazônia"/><h1>${texto(titulo)}</h1></div><div class="header">${campos.filter(([,valor])=>valor!=null&&valor!=='').map(([rotulo, valor]) => `<div class="header-row"><span class="label">${texto(rotulo)}</span><span class="value">${texto(valor)}</span></div>`).join('')}</div></div>`;
  const documento = (titulo, conteudo) => ({ titulo, conteudo:conteudo + nota(`Gerado em ${instante(new Date())} · horário de Manaus.`) });
  function pedidosFinanceiros(pedidos,buscar,titulo='Pedidos e compras') {
    return documento(titulo,pedidos.length?pedidos.map(p=>cabecalho(titulo,[['Pedido',idPedido(p.id)],['Obra',p.obra||local(p.obraDestinoId,buscar)],['Técnico',p.tecnico],['Solicitado por',p.solicitante],['Conta do solicitante',p.solicitanteLogin],['Data do pedido',data(p.dataSolicitacao)],['Situação financeira',acompanhamentoPedidoFinanceiro(p).rotulo]])+tabela('Materiais do pedido',['Material','Quantidade pedida','Compra autorizada','Quantidade comprada'],p.materiais.map(m=>[m.nome,m.quantidadeSolicitada,m.quantidadeCompra,m.quantidadeAdquirida]))+tabela('Aprovações e responsáveis',['Decisão','Responsável','Conta','Data'],(p.decisoes||[]).map(d=>[rotuloDecisaoFinanceira(d.tipo),d.autorNome,d.autorLogin,instante(d.registradoEm)]))+(p.observacao?nota(`Observação do pedido: ${p.observacao}`):'')).join('<div style="break-after:page"></div>'):nota('Nenhum pedido encontrado para esta consulta.'));
  }
  const camposObra = (obra, responsaveis = []) => [['Obra',obra.nome],['Cliente',obra.cliente],['Localização',obra.cidade],...(obra.inicio ? [['Início da obra',data(obra.inicio)]] : []),['Responsáveis técnicos cadastrados',obra.responsaveis?.join(', ') || 'Não registrado'],['Responsáveis pelos equipamentos relacionados',[...new Set(responsaveis.filter(Boolean))].join(', ') || 'Não registrado']];
  const origemPedido = (pedido, buscar) => pedido.obraOrigemId != null ? local(pedido.obraOrigemId, buscar) : pedido.materiais?.length && pedido.materiais.every((m) => m.identificacao?.trim()) ? 'Depósito central' : 'Ainda não definida pelo estoque';
  const camposAutoria = (pedido) => [
    ['Solicitado por', pedido.solicitante || 'Não registrado'],
    ['Conta utilizada', pedido.solicitanteLogin || 'Não registrado'],
    ['Perfil na solicitação', ({ GERENTE: 'Gerente', RH: 'RH', ADMIN: 'Administrador', TECNICO: 'Técnico', TST: 'TST', ESTOQUE: 'Estoque' })[pedido.solicitantePerfil] || 'Não registrado'],
  ];
  const camposPedido = (pedido, buscar) => [['Atendimento',idPedido(pedido.id)],...(pedido.solicitacaoPaiId ? [['Pedido original',idPedido(pedido.solicitacaoPaiId)]] : []),['Status do atendimento',pedido.status],['Data do pedido',data(pedido.dataSolicitacao)],...camposAutoria(pedido),['Técnico responsável',pedido.tecnico],['Destino',local(pedido.obraDestinoId,buscar)],...(pedido.transitoEm ? [['Saída registrada',instante(pedido.transitoEm)]] : []),...(pedido.concluidaEm ? [['Recebimento confirmado',instante(pedido.concluidaEm)]] : [])];
  const observacao = (pedido) => pedido.observacao ? `<h2>Observações registradas</h2>${nota(pedido.observacao)}` : '';
  const rotulosEventos = { APROVACAO_INICIAL:'Aprovação da Gerência / RH', APROVACAO:'Aprovação do Financeiro', ALTERACAO:'Planejamento', REVISAO_PLANO:'Revisão do plano', INICIO_ATENDIMENTO:'Início das providências', ATENDIMENTO_PARCIAL:'Envio parcial', AJUSTE_ESTOQUE:'Ajuste do estoque', REJEICAO:'Rejeição' };
  const aprovacoes = (pedido) => {
    const eventos = pedido.eventosFinanceiros || [];
    const tipos = ['APROVACAO_INICIAL','APROVACAO'];
    const linhas = tipos.flatMap(tipo => {
      const evento = eventos.findLast(e => e.tipo === tipo);
      return evento ? [[rotulosEventos[tipo],instante(evento.registradoEm),evento.autorNome || evento.autorLogin || 'Não registrado']] : [];
    });
    if (!linhas.length && pedido.dataDecisao) linhas.push(['Decisão registrada (data)',data(pedido.dataDecisao),'Não registrado']);
    return linhas.length ? tabela('Autorizações',['Etapa','Data','Responsável'],linhas) : nota('Aprovação ainda não registrada.');
  };

  function ordemAtendimento(pedido,buscar) {
    const itens = pedido.materiais || [];
    const separado = itens.length > 0 && itens.every(m => m.identificacao?.trim());
    const liberado = ['Aprovada','Aguardando coleta','Em trânsito','Concluída'].includes(pedido.status);
    const plano = liberado ? pedido.planoFinanceiro || [] : [];
    const coletas = !liberado ? [] : separado ? itens.map(m => [origemPedido(pedido,buscar),m.nome,m.quantidade,codigo(m.identificacao)]) : [
      ...plano.flatMap(item => (item.origens || []).map(o => [local(o.obraOrigemId,buscar),item.nome,o.quantidade,codigo(o.identificacao)])),
      ...(liberado ? pedido.entradasCompra || [] : []).map(e => [local(e.obraOrigemId,buscar),e.nome,e.quantidade,codigo(e.identificacao)]),
    ];
    const compras = !separado && liberado ? itens.filter(m => m.quantidadeCompra > 0).map(m => [m.nome,m.quantidadeCompra,m.quantidadeEntradaEstoque || 0,Math.max(0,m.quantidadeCompra-(m.quantidadeAdquirida || 0)),Math.max(0,(m.quantidadeAdquirida || 0)-(m.quantidadeEntradaEstoque || 0))]) : [];
    const grupos = [...coletas.reduce((mapa,linha) => { const lista = mapa.get(linha[0]) || []; lista.push(linha.slice(1)); mapa.set(linha[0],lista); return mapa; },new Map())];
    const campos = [['Atendimento',idPedido(pedido.id)],...(pedido.solicitacaoPaiId ? [['Pedido original',idPedido(pedido.solicitacaoPaiId)]] : []),['Situação',pedido.status],['Recebedor',pedido.tecnico]];
    const aviso = !liberado ? 'Aguardando autorização. Não iniciar compras ou retiradas.' : pedido.status === 'Concluída' ? 'Atendimento concluído. Não executar novas compras ou retiradas com esta ordem.' : pedido.status === 'Em trânsito' ? 'Envio já confirmado. Aguardar o recebimento do destinatário.' : separado ? 'Conferir os materiais abaixo e confirmar o envio no sistema.' : 'Retirar somente as quantidades indicadas. Registrar as compras e confirmar a separação antes do envio.';
    const pendencia = !separado && liberado && !plano.length ? nota('Plano de retirada e compra ainda não definido. Consultar o Financeiro antes de executar.') : '';
    const justificativas = plano.filter(i => i.justificativa).map(i => [i.nome,i.justificativa]);
    return documento(`Ordem de atendimento ${idPedido(pedido.id)}`,`<div class="ordem-atendimento">${cabecalho('Ordem de atendimento',campos)}<div class="ordem-destino"><span>Entregar em</span><strong>${texto(local(pedido.obraDestinoId,buscar))}</strong></div><p class="ordem-instrucao">${texto(aviso)}</p>${aprovacoes(pedido)}${pendencia}${grupos.map(([origem,linhas]) => `<section class="ordem-retirada">${tabela(`${['Em trânsito','Concluída'].includes(pedido.status)?'Origem':'Retirar em'}: ${origem}`,['Material','Quantidade','Código / série'],linhas)}</section>`).join('')}${compras.length ? `<section class="ordem-compras">${tabela('Compras deste atendimento',['Material','Autorizado','Entrada registrada','Ainda comprar','Conferir entrada'],compras)}</section>` : ''}${justificativas.length ? tabela('Orientações do Financeiro',['Material','Orientação'],justificativas) : ''}${observacao(pedido)}${!separado ? nota('Envio parcial: registrar o ajuste no sistema; o restante permanece pendente.') : ''}</div>`);
  }

  function historicoEquipamento(e, historico, buscar) {
    const titulo=`Histórico do equipamento — ${e.modelo}`;
    const campos=[['Equipamento',e.modelo],['Tipo',e.tipo],['Código / série',codigo(e.serie)],['Nota fiscal',e.notaFiscal],['Status atual',e.status],['Localização / deslocamentos',descreverLocalizacao(e,buscar)],['Técnico responsável',e.tecnico]];
    const linhas=historico.map((m)=>[idPedido(m.solicitacaoId),m.quantidade ?? 'Não registrado',data(m.dataMovimentacao),m.origemNome || 'Não registrado',m.destinoNome || 'Não registrado',instante(m.saidaEm),instante(m.entradaEm),m.tecnico,m.status]);
    const manutencoes=(e.manutencoes || []).map(m=>[idPedido(m.id),m.quantidade,m.status==='ABERTA'?'Em manutenção':'Concluída',m.modelo,m.serie,m.local,m.motivo,instante(m.abertaEm),m.abertaPorNome ? `${m.abertaPorNome} (${m.abertaPorLogin || 'Conta não informada'})` : 'Não informado',instante(m.concluidaEm),m.concluidaPorNome ? `${m.concluidaPorNome} (${m.concluidaPorLogin || 'Conta não informada'})` : 'Não informado',m.observacaoConclusao]);
    const calibracoes=(e.calibracoes||[]).map(c=>[idPedido(c.id),c.historico?'Certificado anterior':ROTULOS_CALIBRACAO[c.status],c.localOrigem,c.tecnicoOrigem,c.laboratorio,c.serie,data(c.dataRetirada),data(c.dataEnvio),data(c.dataRetorno),data(c.dataCalibracao),data(c.validade),c.certificado]);
    const eventosCalibracao=(e.calibracoes||[]).flatMap(c=>(c.eventos||[]).map(ev=>[idPedido(c.id),EVENTOS_CALIBRACAO[ev.acao] || ev.acao,instante(ev.registradoEm),`${ev.autorNome} (${ev.autorLogin})`,ev.observacao]));
    return documento(titulo,cabecalho('Histórico do equipamento',campos)+tabela('Movimentações registradas',['Atendimento','Qtd. movimentada','Data registrada','Origem','Destino','Saída registrada','Recebimento confirmado','Técnico responsável','Status'],linhas)+(manutencoes.length?tabela('Manutenções registradas',['Registro','Quantidade','Situação','Material na abertura','Código / série','Local na abertura','Motivo','Abertura','Registrada por','Conclusão','Concluída por','Serviço realizado'],manutencoes):'')+(calibracoes.length?tabela('Calibrações e certificados',['Registro','Situação','Origem','Responsável na origem','Laboratório','Série','Retirada','Envio','Retorno','Calibrado em','Validade','Certificado'],calibracoes)+tabela('Rastreabilidade da calibração',['Registro','Evento','Registrado em','Autor','Observação'],eventosCalibracao):'')+nota('Data registrada é a referência do lançamento. Saída e recebimento são apresentados somente quando comprovados pelo pedido vinculado.'));
  }

  function inventarioObra(obra,equipamentos,buscar=(id)=>({nome:`Obra #${id}`})) {
    const itens=equipamentos.filter((e)=>!e.arquivado&&String(e.obraId)===String(obra.id)).map((e)=>{
      const transito=Math.min(e.quantidade ?? 1,Math.max(0,e.quantidadeEmTransito ?? 0));
      const presentes=Math.max(0,e.quantidadeNaOrigem ?? (e.quantidade ?? 1)-transito);
      return {...e,presentes,transito,reservados:Math.min(presentes,Math.max(0,(e.quantidadeReservada ?? 0)-transito))};
    });
    const detalhes=itens.map((e)=>[e.modelo,codigo(e.serie),e.notaFiscal,e.tecnico,e.presentes,e.reservados,e.transito]);
    const manutencoes=itens.filter(e=>e.quantidadeManutencao>0).map(e=>[e.modelo,codigo(e.serie),e.quantidadeManutencao,e.tecnico]);
    const entradas=equipamentos.filter((e)=>!e.arquivado).flatMap((e)=>(e.deslocamentos || []).filter((d)=>d.status==='Em trânsito'&&String(d.destinoId)===String(obra.id)).map((d)=>[idPedido(d.solicitacaoId),e.modelo,codigo(e.serie),d.quantidade,local(d.origemId,buscar),d.tecnico]));
    // A origem permanece vinculada ao registro até a confirmação do recebimento.
    return documento(`Inventário — ${obra.nome}`,cabecalho('Inventário atual da obra',camposObra(obra,itens.map((e)=>e.tecnico)))+tabela('Materiais por registro',['Material','Código / série','Nota fiscal','Responsável','Presentes','Reservadas','Saída em transporte'],detalhes)+(manutencoes.length?tabela('Unidades em manutenção — bloqueadas para novos pedidos',['Material','Código / série','Em manutenção','Responsável'],manutencoes):'')+(entradas.length?tabela('Entradas em transporte — ainda não recebidas',['Atendimento','Material','Código / série','Quantidade','Origem','Técnico de destino'],entradas):'')+nota('Reservas e manutenção já integram o saldo presente. Transporte não integra o saldo do destino até o recebimento.'));
  }

  function inventarioHistoricoObra(inventario) {
    const itens=inventario.materiais || [];
    const obra={nome:inventario.obraNome,cliente:inventario.cliente,cidade:inventario.cidade,responsaveis:inventario.responsaveisTecnicos};
    const campos=[...camposObra(obra,itens.map((e)=>e.tecnico)),['Data consultada',data(inventario.dataReferencia)],['Data do retrato armazenado',data(inventario.dataSnapshot)],['Registro do retrato',instante(inventario.registradoEm)],['Identificador do retrato',inventario.snapshotId],['Status da obra no retrato',inventario.status]];
    return documento(`Inventário histórico — ${obra.nome}`,cabecalho('Inventário histórico da obra',campos)+tabela('Materiais no retrato armazenado',['Qtd. registrada','Material','Código / série','Tipo / medida','Responsável'],itens.map((e)=>[e.quantidade,e.modelo,codigo(e.serie),[e.tipo,e.medida].filter(Boolean).join(' · '),e.tecnico]))+nota('Último retrato armazenado até a data consultada; não reconstitui a posição física durante o transporte.'));
  }

  function romaneioSeparacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const separado=itens.length>0&&itens.every((m)=>m.identificacao?.trim());
    return documento(`Romaneio — ${idPedido(pedido.id)}`,cabecalho('Romaneio de separação',camposPedido(pedido,buscar))+nota(separado?'Conferência da separação. Não comprova recebimento.':'Separação ainda não concluída. Não comprova recebimento.')+tabela(separado?'Materiais separados':'Materiais solicitados',['Quantidade','Material','Código / série','Origem da coleta'],itens.map((m)=>[m.quantidade,m.nome,codigo(m.identificacao),m.identificacao ? origemPedido(pedido,buscar) : 'Ainda não definida']))+observacao(pedido));
  }

  function auditoriaSolicitacao(pedido,buscar) {
    const itens=pedido.materiais || [];
    const compras=(pedido.compras?.length?pedido.compras:itens).filter((m)=>m.quantidadeCompra>0).map((m)=>[m.nome,m.quantidadeCompra,m.quantidadeAdquirida ?? 0,m.quantidadeEntradaEstoque ?? 0,Math.max(0,m.quantidadeCompra-(m.quantidadeEntradaEstoque ?? 0))]);
    const eventos=(pedido.eventosFinanceiros || []).map((evento)=>[rotulosEventos[evento.tipo] || evento.tipo,instante(evento.registradoEm),[evento.autorNome,evento.autorLogin].filter(Boolean).join(' · '),evento.descricao]);
    const separado=itens.length>0&&itens.every(m=>m.identificacao?.trim());
    const origens=!separado ? (pedido.planoFinanceiro || []).flatMap(item=>(item.origens || []).map(o=>[item.nome,o.quantidade,codigo(o.identificacao),local(o.obraOrigemId,buscar)])) : [];
    return documento(`Vistoria — ${idPedido(pedido.id)}`,cabecalho('Relatório de vistoria do atendimento',camposPedido(pedido,buscar))+((pedido.materiaisOriginais || []).length?tabela('Pedido original preservado',['Material','Quantidade original'],pedido.materiaisOriginais.map(m=>[m.nome,m.quantidade])):'')+tabela('Itens deste atendimento',['Material','Quantidade','Código / série','Origem da coleta'],itens.map((m)=>[m.nome,m.quantidade,codigo(m.identificacao),m.identificacao?origemPedido(pedido,buscar):'Ainda não definida pelo estoque']))+(origens.length?tabela('Retiradas planejadas',['Material','Quantidade','Código / série','Origem'],origens):'')+(compras.length?tabela('Acompanhamento de compras do pedido original',['Material','Compra solicitada','Adquirida','Entrada no estoque','Aguardando entrada'],compras):'')+(eventos.length?tabela('Decisões e ajustes registrados',['Evento','Data','Responsável','Descrição'],eventos):pedido.dataDecisao?aprovacoes(pedido):'')+observacao(pedido));
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
  return {pedidosFinanceiros,historicoEquipamento,inventarioObra,inventarioHistoricoObra,ordemAtendimento,romaneioSeparacao,auditoriaSolicitacao,listaComprasSolicitacao,listaComprasGeral,historicoObra,vistoriaTecnico,relatorioVistorias};
}
