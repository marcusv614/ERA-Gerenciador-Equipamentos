import { useMemo, useState } from 'react';
import { AlertCircle, Box, Check, ChevronRight, Minus, Plus, ShoppingCart, Warehouse, X } from 'lucide-react';
import estilos from './SepararEquipamentosModal.module.css';

const localDoEquipamento = (equipamento) => equipamento.obraId == null ? 'deposito' : String(equipamento.obraId);
const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
const statusMovimentavel = (status) => ['em estoque', 'em campo', 'disponivel'].includes(normalizar(status));

export function SepararEquipamentosModal({ solicitacao, obras, equipamentos, aoFechar, aoConfirmar, aoSolicitarCompra }) {
  const [quantidades, definirQuantidades] = useState({});
  const [erro, definirErro] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const nomeLocal = (id) => id == null || id === 'deposito' ? 'Depósito central' : obras.find((obra) => String(obra.id) === String(id))?.nome || 'Obra';
  const origemFixa = solicitacao.obraOrigemId == null ? null : String(solicitacao.obraOrigemId);
  const candidatos = (material) => equipamentos.filter((equipamento) => {
    const local = localDoEquipamento(equipamento);
    const origemPermitida = origemFixa ? local === origemFixa : local !== String(solicitacao.obraDestinoId);
    const mesmoCatalogo = material.catalogoChave
      ? equipamento.catalogoChave === material.catalogoChave
      : normalizar(equipamento.modelo) === normalizar(material.nome);
    return origemPermitida && statusMovimentavel(equipamento.status) && (equipamento.quantidadeDisponivel ?? 1) > 0 && mesmoCatalogo;
  });
  const gruposCandidatos = (material) => Object.values(candidatos(material).reduce((grupos, equipamento) => {
    const local = localDoEquipamento(equipamento);
    if (!grupos[local]) grupos[local] = { chave: local, local, equipamentos: [] };
    grupos[local].equipamentos.push(equipamento);
    return grupos;
  }, {})).sort((a, b) => nomeLocal(a.local).localeCompare(nomeLocal(b.local), 'pt-BR'));
  const quantidadeEscolhida = (materialId, equipamentoId) => quantidades[materialId]?.[equipamentoId] || 0;
  const reservadoEmOutros = (materialId, equipamentoId, estado = quantidades) => Object.entries(estado).reduce((total, [outroMaterialId, escolhas]) => String(outroMaterialId) === String(materialId) ? total : total + (escolhas[equipamentoId] || 0), 0);
  const saldoParaMaterial = (material, equipamento, estado = quantidades) => Math.max(0, (equipamento.quantidadeDisponivel ?? 1) - reservadoEmOutros(material.id, equipamento.id, estado));
  const totalEscolhido = (material) => Object.values(quantidades[material.id] || {}).reduce((total, quantidade) => total + quantidade, 0);
  const totalDisponivel = (material) => candidatos(material).reduce((total, equipamento) => total + saldoParaMaterial(material, equipamento), 0);
  const quantidadeEscolhidaGrupo = (material, grupo) => grupo.equipamentos.reduce((total, equipamento) => total + quantidadeEscolhida(material.id, equipamento.id), 0);
  const saldoGrupo = (material, grupo) => grupo.equipamentos.reduce((total, equipamento) => total + saldoParaMaterial(material, equipamento), 0);

  const totais = useMemo(() => solicitacao.materiais.reduce((soma, material) => soma + material.quantidade, 0), [solicitacao]);
  const totalSeparado = solicitacao.materiais.reduce((soma, material) => soma + totalEscolhido(material), 0);
  const completo = solicitacao.materiais.every((material) => totalEscolhido(material) === material.quantidade);
  const origensSelecionadas = new Set(Object.values(quantidades).flatMap((escolhas) => Object.keys(escolhas)).map((id) => equipamentos.find((item) => String(item.id) === String(id))).filter(Boolean).map(localDoEquipamento));

  const definirQuantidadeGrupo = (material, grupo, valor) => definirQuantidades((atuais) => {
    const porMaterial = { ...(atuais[material.id] || {}) };
    const idsGrupo = new Set(grupo.equipamentos.map(({ id }) => String(id)));
    const outros = Object.entries(porMaterial).reduce((soma, [id, quantidade]) => idsGrupo.has(String(id)) ? soma : soma + quantidade, 0);
    grupo.equipamentos.forEach(({ id }) => delete porMaterial[id]);
    const maximoDisponivel = grupo.equipamentos.reduce((soma, equipamento) => soma + saldoParaMaterial(material, equipamento, atuais), 0);
    let restante = Math.max(0, Math.min(maximoDisponivel, material.quantidade - outros, Number.isFinite(Number(valor)) ? Math.trunc(Number(valor)) : 0));
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
    let restante = material.quantidade;
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
    const selecionados = solicitacao.materiais.flatMap((material) => Object.entries(quantidades[material.id] || {}).map(([equipamentoId, quantidade]) => {
      const equipamento = equipamentos.find((item) => String(item.id) === String(equipamentoId));
      return { origem: localDoEquipamento(equipamento), material: { nome: material.nome, quantidade, identificacao: equipamento.serie, catalogoChave: material.catalogoChave || null } };
    }));
    const atendimentos = Object.values(selecionados.reduce((grupos, item) => { (grupos[item.origem] ||= { obraOrigemId: item.origem === 'deposito' ? null : Number(item.origem), materiais: [] }).materiais.push(item.material); return grupos; }, {}));
    definirErro(''); definirSalvando(true);
    try { await aoConfirmar(atendimentos); }
    catch (falha) { definirErro(falha.message || 'Não foi possível reservar os equipamentos.'); }
    finally { definirSalvando(false); }
  };

  return <div className={estilos.fundo} onMouseDown={(evento) => evento.target === evento.currentTarget && aoFechar()}>
    <section className={estilos.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-separacao">
      <aside className={estilos.resumo}>
        <div className={estilos.marca}><Warehouse /><span>Atendimento</span></div>
        <div className={estilos.numero}>Solicitação #{String(solicitacao.id).padStart(4, '0')}</div>
        <h2>{solicitacao.tecnico}</h2>
        <p>Veja o que existe no depósito, o que precisa ser buscado em outra obra e o que deve ser comprado.</p>

        <div className={estilos.rota}>
          <div><small>Origens</small><strong>{origensSelecionadas.size || 'A definir'}</strong></div>
          <ChevronRight />
          <div><small>Destino</small><strong>{nomeLocal(solicitacao.obraDestinoId)}</strong></div>
        </div>

        <div className={estilos.total}>
          <span>Progresso</span>
          <strong>{totalSeparado} <small>de {totais}</small></strong>
          <div><i style={{ width: `${totais ? (totalSeparado / totais) * 100 : 0}%` }} /></div>
        </div>
      </aside>

      <main className={estilos.conteudo}>
        <header>
          <div><span>Materiais solicitados</span><h1 id="titulo-separacao">Ver disponibilidade</h1></div>
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar"><X /></button>
        </header>

        <div className={estilos.materiais}>
          {solicitacao.materiais.map((material) => {
            const opcoes = gruposCandidatos(material);
            const disponivel = totalDisponivel(material);
            const separado = totalEscolhido(material);
            const faltante = Math.max(0, material.quantidade - disponivel);
            return <section className={estilos.material} key={material.id}>
              <header>
                <div><h3>{material.nome}</h3><span>{disponivel} disponível(is) em todas as localizações</span></div>
                <div className={estilos.acoesMaterial}><button type="button" onClick={() => preencherTudo(material)} disabled={!disponivel || separado === material.quantidade}>Preencher tudo</button><strong className={separado === material.quantidade ? estilos.pronto : ''}>{separado} / {material.quantidade}</strong></div>
              </header>

              {opcoes.length > 0 && <div className={estilos.lista}>
                {opcoes.map((grupo) => {
                  const quantidade = quantidadeEscolhidaGrupo(material, grupo);
                  const totalMaterialAtingido = separado >= material.quantidade;
                  const saldo = saldoGrupo(material, grupo);
                  return <div className={`${estilos.equipamento} ${quantidade ? estilos.selecionado : ''}`} key={grupo.chave}>
                    <span className={estilos.icone}><Box /></span>
                    <div className={estilos.dados}><strong>{material.nome}</strong><span>{nomeLocal(grupo.local)}</span></div>
                    <span className={estilos.saldo}>{saldo}<small> disponíveis</small></span>
                    <div className={estilos.quantidade}>
                      <button onClick={() => alterarGrupo(material, grupo, -1)} disabled={quantidade === 0} aria-label="Diminuir"><Minus /></button>
                      <input type="number" min="0" max={Math.min(saldo, material.quantidade - (separado - quantidade))} value={quantidade} onFocus={(evento) => evento.target.select()} onChange={(evento) => definirQuantidadeGrupo(material, grupo, evento.target.value)} aria-label={`Quantidade de ${material.nome} a separar em ${nomeLocal(grupo.local)}`} />
                      <button onClick={() => alterarGrupo(material, grupo, 1)} disabled={totalMaterialAtingido || quantidade >= saldo} aria-label="Aumentar"><Plus /></button>
                    </div>
                  </div>;
                })}
              </div>}

              {faltante > 0 && <div className={estilos.falta}>
                <AlertCircle />
                <div><strong>Faltam {faltante} unidade(s)</strong><span>Não há saldo suficiente no depósito nem nas obras.</span></div>
                <button onClick={() => aoSolicitarCompra(material, faltante)} disabled={material.quantidadeCompra === faltante}><ShoppingCart /> {material.quantidadeCompra === faltante ? 'Compra solicitada' : 'Enviar para compra'}</button>
              </div>}

              {!opcoes.length && !faltante && <div className={estilos.vazio}><Box /> Nenhum equipamento compatível.</div>}
            </section>;
          })}
        </div>

        <footer>
          <span className={erro ? estilos.erro : ''}>{erro ? <><AlertCircle /> {erro}</> : completo ? <><Check /> Tudo pronto para atender</> : `Faltam ${totais - totalSeparado} unidade(s) para concluir`}</span>
          <div><button className={estilos.cancelar} onClick={aoFechar} disabled={salvando}>Cancelar</button><button className={estilos.confirmar} disabled={!completo || salvando} onClick={confirmar}>{salvando ? 'Confirmando...' : 'Confirmar materiais'}</button></div>
        </footer>
      </main>
    </section>
  </div>;
}
