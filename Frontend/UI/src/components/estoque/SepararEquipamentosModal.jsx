import { useMemo, useRef, useState } from 'react';
import { useDialogo } from '../../hooks/useDialogo';
import { AlertCircle, Box, Check, ChevronRight, Minus, Plus, ShoppingCart, Warehouse, X } from 'lucide-react';
import estilos from './SepararEquipamentosModal.module.css';

const localDoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const statusMovimentavel = (status) => ['em estoque', 'em campo', 'disponivel'].includes(normalizar(status));

export function SepararEquipamentosModal({ solicitacao, obras, equipamentos, aoFechar, aoSalvarPlano }) {
  const referencia = useRef(null);
  const [quantidades, definirQuantidades] = useState(() => Object.fromEntries((solicitacao.planoFinanceiro || []).map((item) => [item.materialId,Object.fromEntries(item.origens.map((origem) => [origem.equipamentoId,origem.quantidade]))])));
  const [compras, definirCompras] = useState(() => Object.fromEntries(solicitacao.planoFinanceiro?.length ? solicitacao.planoFinanceiro.map((item) => [item.materialId,item.quantidadeCompra]) : solicitacao.materiais.map((item) => [item.id,item.quantidadeCompra || 0])));
  const [justificativas, definirJustificativas] = useState(() => Object.fromEntries((solicitacao.planoFinanceiro || []).map((item) => [item.materialId,item.justificativa || ''])));
  const [erro, definirErro] = useState('');
  const [salvando, definirSalvando] = useState(false);
  useDialogo(referencia, salvando ? () => {} : aoFechar);
  const nomeLocal = (id) => id == null || id === 'deposito' ? 'Depósito central' : obras.find((obra) => String(obra.id) === String(id))?.nome || 'Obra';
  const origemFixa = solicitacao.obraOrigemId == null ? null : String(solicitacao.obraOrigemId);
  const candidatos = (material) => equipamentos.filter((equipamento) => {
    const local = localDoEquipamento(equipamento);
    const origemPermitida = origemFixa ? local === origemFixa : local !== String(solicitacao.obraDestinoId);
    const mesmoCatalogo = material.catalogoChave
      ? equipamento.catalogoChave === material.catalogoChave
      : normalizar(equipamento.modelo) === normalizar(material.nome);
    const recebidoNestePedido = equipamento.observacoes === `Adquirido para a solicitação #${solicitacao.id}` && material.quantidadeEntradaEstoque > 0;
    return !equipamento.arquivado && !recebidoNestePedido && origemPermitida && statusMovimentavel(equipamento.status) && (equipamento.quantidadeDisponivel ?? 1) > 0 && mesmoCatalogo;
  });
  const gruposCandidatos = (material) => candidatos(material).map((equipamento) => ({ chave:String(equipamento.id),local:localDoEquipamento(equipamento),equipamentos:[equipamento] }))
    .sort((a,b) => nomeLocal(a.local).localeCompare(nomeLocal(b.local),'pt-BR'));
  const quantidadeEscolhida = (materialId, equipamentoId) => quantidades[materialId]?.[equipamentoId] || 0;
  const reservadoEmOutros = (materialId, equipamentoId, estado = quantidades) => Object.entries(estado).reduce((total, [outroMaterialId, escolhas]) => String(outroMaterialId) === String(materialId) ? total : total + (escolhas[equipamentoId] || 0), 0);
  const saldoParaMaterial = (material, equipamento, estado = quantidades) => Math.max(0, (equipamento.quantidadeDisponivel ?? 1) - reservadoEmOutros(material.id, equipamento.id, estado));
  const totalEscolhido = (material) => Object.values(quantidades[material.id] || {}).reduce((total, quantidade) => total + quantidade, 0);
  const totalDisponivel = (material) => candidatos(material).reduce((total, equipamento) => total + saldoParaMaterial(material, equipamento), 0);
  const quantidadeEscolhidaGrupo = (material, grupo) => grupo.equipamentos.reduce((total, equipamento) => total + quantidadeEscolhida(material.id, equipamento.id), 0);
  const saldoGrupo = (material, grupo) => grupo.equipamentos.reduce((total, equipamento) => total + saldoParaMaterial(material, equipamento), 0);

  const totais = useMemo(() => solicitacao.materiais.reduce((soma, material) => soma + material.quantidade, 0), [solicitacao]);
  const totalSeparado = solicitacao.materiais.reduce((soma, material) => soma + totalEscolhido(material), 0);
  const totalCompra = solicitacao.materiais.reduce((soma, material) => soma + (compras[material.id] || 0), 0);
  const completo = solicitacao.materiais.every((material) => totalEscolhido(material) + (compras[material.id] || 0) === material.quantidade && (!(compras[material.id] > 0) || justificativas[material.id]?.trim()));
  const origensSelecionadas = new Set(Object.values(quantidades).flatMap((escolhas) => Object.keys(escolhas)).map((id) => equipamentos.find((item) => String(item.id) === String(id))).filter(Boolean).map(localDoEquipamento));

  const definirQuantidadeGrupo = (material, grupo, valor) => definirQuantidades((atuais) => {
    const porMaterial = { ...(atuais[material.id] || {}) };
    const idsGrupo = new Set(grupo.equipamentos.map(({ id }) => String(id)));
    const outros = Object.entries(porMaterial).reduce((soma, [id, quantidade]) => idsGrupo.has(String(id)) ? soma : soma + quantidade, 0);
    grupo.equipamentos.forEach(({ id }) => delete porMaterial[id]);
    const maximoDisponivel = grupo.equipamentos.reduce((soma, equipamento) => soma + saldoParaMaterial(material, equipamento, atuais), 0);
    let restante = Math.max(0, Math.min(maximoDisponivel, material.quantidade - (compras[material.id] || 0) - outros, Number.isFinite(Number(valor)) ? Math.trunc(Number(valor)) : 0));
    grupo.equipamentos.forEach((equipamento) => {
      if (!restante) return;
      const quantidade = Math.min(restante, saldoParaMaterial(material, equipamento, atuais));
      if (quantidade > 0) porMaterial[equipamento.id] = quantidade;
      restante -= quantidade;
    });
    return { ...atuais, [material.id]: porMaterial };
  });
  const alterarGrupo = (material, grupo, diferenca) => definirQuantidadeGrupo(material, grupo, quantidadeEscolhidaGrupo(material, grupo) + diferenca);

  const preencherTudo = (material) => {
    let restante = material.quantidade - (compras[material.id] || 0);
    const escolhas = {};
    candidatos(material).forEach((equipamento) => {
      if (!restante) return;
      const disponivel = saldoParaMaterial(material, equipamento);
      const quantidade = Math.min(disponivel, restante);
      if (quantidade > 0) escolhas[equipamento.id] = quantidade;
      restante -= quantidade;
    });
    definirQuantidades((atuais) => ({ ...atuais, [material.id]: escolhas }));
  };

  const confirmar = async () => {
    if (!completo || salvando) return;
    const materiais = solicitacao.materiais.map((material) => ({ materialId:material.id, quantidadeCompra:compras[material.id] || 0, justificativa:justificativas[material.id]?.trim() || '', origens:Object.entries(quantidades[material.id] || {}).filter(([,quantidade]) => quantidade > 0).map(([equipamentoId,quantidade]) => ({ equipamentoId:Number(equipamentoId),quantidade })) }));
    definirErro(''); definirSalvando(true);
    try { await aoSalvarPlano(solicitacao.id,{ materiais }); }
    catch (falha) { definirErro(falha.message || 'Não foi possível reservar os equipamentos.'); }
    finally { definirSalvando(false); }
  };

  return <div className={estilos.fundo} onMouseDown={(evento) => !salvando && evento.target === evento.currentTarget && aoFechar()}>
    <section ref={referencia} tabIndex={-1} className={estilos.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-separacao" aria-busy={salvando}>
      <fieldset className={estilos.bloqueio} disabled={salvando}>
      <aside className={estilos.resumo}>
        <div className={estilos.marca}><Warehouse /><span>Decisão financeira</span></div>
        <div className={estilos.numero}>Solicitação #{String(solicitacao.id).padStart(4, '0')}</div>
        <h2>{solicitacao.tecnico}</h2>
        <p>Defina o que o estoque deve transportar e comprar. Você pode preservar os materiais em uso nas obras e autorizar a compra de novas unidades.</p>

        <div className={estilos.rota}>
          <div><small>Origens</small><strong>{origensSelecionadas.size || 'A definir'}</strong></div>
          <ChevronRight />
          <div><small>Destino</small><strong>{nomeLocal(solicitacao.obraDestinoId)}</strong></div>
        </div>

        <div className={estilos.total}>
          <span>Progresso</span>
          <strong>{totalSeparado + totalCompra} <small>de {totais}</small></strong>
          <div><i style={{ width: `${totais ? ((totalSeparado + totalCompra) / totais) * 100 : 0}%` }} /></div>
        </div>
      </aside>

      <main className={estilos.conteudo}>
        <header>
          <div><span>Materiais solicitados</span><h1 id="titulo-separacao">Planejar transporte e compra</h1></div>
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar"><X /></button>
        </header>

        <div className={estilos.materiais}>
          {solicitacao.materiais.map((material) => {
            const opcoes = gruposCandidatos(material);
            const disponivel = totalDisponivel(material);
            const separado = totalEscolhido(material);
            const compra = compras[material.id] || 0;
            const faltante = Math.max(0, material.quantidade - separado - compra);
            return <section className={estilos.material} key={material.id}>
              <header>
                <div><h3>{material.nome}</h3><span>{disponivel} disponível(is) em todas as localizações</span></div>
                <div className={estilos.acoesMaterial}><button type="button" onClick={() => { definirQuantidades((atuais) => ({ ...atuais,[material.id]:{} })); definirCompras((atuais) => ({ ...atuais,[material.id]:material.quantidadeEntradaEstoque || 0 })); }}>Limpar</button><button type="button" onClick={() => preencherTudo(material)} disabled={!disponivel || separado + compra === material.quantidade}>Preencher transporte</button><strong className={separado + compra === material.quantidade ? estilos.pronto : ''}>{separado} transporte + {compra} compra / {material.quantidade}</strong></div>
              </header>

              {opcoes.length > 0 && <div className={estilos.lista}>
                {opcoes.map((grupo) => {
                  const quantidade = quantidadeEscolhidaGrupo(material, grupo);
                  const totalMaterialAtingido = separado + compra >= material.quantidade;
                  const saldo = saldoGrupo(material, grupo);
                  return <div className={`${estilos.equipamento} ${quantidade ? estilos.selecionado : ''}`} key={grupo.chave}>
                    <span className={estilos.icone}><Box /></span>
                    <div className={estilos.dados}><strong>{material.nome}</strong><span>{nomeLocal(grupo.local)}</span><span>{grupo.equipamentos[0].serie} · {grupo.equipamentos[0].tecnico || 'Sem responsável vinculado'}</span></div>
                    <span className={estilos.saldo}>{saldo}<small> disponíveis</small></span>
                    <div className={estilos.quantidade}>
                      <button onClick={() => alterarGrupo(material, grupo, -1)} disabled={quantidade === 0} aria-label="Diminuir"><Minus /></button>
                      <input type="number" min="0" max={Math.min(saldo, material.quantidade - compra - (separado - quantidade))} value={quantidade} onFocus={(evento) => evento.target.select()} onChange={(evento) => definirQuantidadeGrupo(material, grupo, evento.target.value)} aria-label={`Quantidade de ${material.nome} a transportar de ${nomeLocal(grupo.local)}`} />
                      <button onClick={() => alterarGrupo(material, grupo, 1)} disabled={totalMaterialAtingido || quantidade >= saldo} aria-label="Aumentar"><Plus /></button>
                    </div>
                  </div>;
                })}
              </div>}

              <div className={estilos.compraPlanejada}>
                <label><span><ShoppingCart size={16} /> Quantidade para compra</span><input type="number" min={material.quantidadeEntradaEstoque || 0} max={material.quantidade - separado} value={compra} onChange={(evento) => definirCompras((atuais) => ({ ...atuais,[material.id]:Math.max(material.quantidadeEntradaEstoque || 0,Math.min(material.quantidade - separado,Math.trunc(Number(evento.target.value)) || 0)) }))} aria-label={`Quantidade de ${material.nome} para comprar`} /></label>
                {material.quantidadeEntradaEstoque > 0 && <small>{material.quantidadeEntradaEstoque} unidade(s) já recebida(s). Estão incluídas na compra acima e não serão compradas novamente.</small>}
                <small>A compra é permitida mesmo com saldo em outra obra. Deixe em zero o transporte dos equipamentos que devem permanecer no local.</small>
                {compra > 0 && <label><span>Justificativa da compra</span><textarea required maxLength={1000} value={justificativas[material.id] || ''} placeholder="Ex.: equipamento da obra A em uso, sem liberação para retirada." onChange={(evento) => definirJustificativas((atuais) => ({ ...atuais,[material.id]:evento.target.value }))} /></label>}
                {faltante > 0 && <small>Defina o atendimento das {faltante} unidade(s) restantes.</small>}
              </div>

              {!opcoes.length && !faltante && <div className={estilos.vazio}><Box /> Nenhum equipamento compatível.</div>}
            </section>;
          })}
        </div>

        <footer>
          <span className={erro ? estilos.erro : ''}>{erro ? <><AlertCircle /> {erro}</> : completo ? <><Check /> Plano completo para aprovação</> : 'Defina as origens, compras e justificativas de todos os materiais.'}</span>
          <div><button className={estilos.cancelar} onClick={aoFechar} disabled={salvando}>Cancelar</button><button className={estilos.confirmar} disabled={!completo || salvando} onClick={confirmar}>{salvando ? 'Salvando...' : 'Salvar plano financeiro'}</button></div>
        </footer>
      </main>
      </fieldset>
    </section>
  </div>;
}
