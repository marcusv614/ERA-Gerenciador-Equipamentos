import { useMemo, useState } from 'react';
import { AlertCircle, Box, Check, ChevronRight, Minus, Plus, ShoppingCart, Warehouse, X } from 'lucide-react';
import estilos from './SepararEquipamentosModal.module.css';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';

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
  const quantidadeEscolhida = (materialId, equipamentoId) => quantidades[materialId]?.[equipamentoId] || 0;
  const reservadoEmOutros = (materialId, equipamentoId) => Object.entries(quantidades).reduce((total, [outroMaterialId, escolhas]) => String(outroMaterialId) === String(materialId) ? total : total + (escolhas[equipamentoId] || 0), 0);
  const saldoParaMaterial = (material, equipamento) => Math.max(0, (equipamento.quantidadeDisponivel ?? 1) - reservadoEmOutros(material.id, equipamento.id));
  const totalEscolhido = (material) => Object.values(quantidades[material.id] || {}).reduce((total, quantidade) => total + quantidade, 0);
  const totalDisponivel = (material) => candidatos(material).reduce((total, equipamento) => total + saldoParaMaterial(material, equipamento), 0);

  const totais = useMemo(() => solicitacao.materiais.reduce((soma, material) => soma + material.quantidade, 0), [solicitacao]);
  const totalSeparado = solicitacao.materiais.reduce((soma, material) => soma + totalEscolhido(material), 0);
  const completo = solicitacao.materiais.every((material) => totalEscolhido(material) === material.quantidade);
  const origensSelecionadas = new Set(Object.values(quantidades).flatMap((escolhas) => Object.keys(escolhas)).map((id) => equipamentos.find((item) => String(item.id) === String(id))).filter(Boolean).map(localDoEquipamento));

  const alterar = (material, equipamento, diferenca) => definirQuantidades((atuais) => {
    const porMaterial = { ...(atuais[material.id] || {}) };
    const atual = porMaterial[equipamento.id] || 0;
    const outros = Object.entries(porMaterial).reduce((soma, [id, quantidade]) => String(id) === String(equipamento.id) ? soma : soma + quantidade, 0);
    const maximo = Math.min(saldoParaMaterial(material, equipamento), material.quantidade - outros);
    const proxima = Math.max(0, Math.min(maximo, atual + diferenca));
    if (proxima) porMaterial[equipamento.id] = proxima; else delete porMaterial[equipamento.id];
    return { ...atuais, [material.id]: porMaterial };
  });

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
        <div className={estilos.marca}><Warehouse /><span>Separação</span></div>
        <div className={estilos.numero}>Solicitação #{String(solicitacao.id).padStart(4, '0')}</div>
        <h2>{solicitacao.tecnico}</h2>
        <p>O sistema busca automaticamente o material no depósito e nas demais obras.</p>

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
          <div><span>Materiais solicitados</span><h1 id="titulo-separacao">Defina o que vai sair</h1></div>
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar"><X /></button>
        </header>

        <div className={estilos.materiais}>
          {solicitacao.materiais.map((material) => {
            const opcoes = candidatos(material);
            const disponivel = totalDisponivel(material);
            const separado = totalEscolhido(material);
            const faltante = Math.max(0, material.quantidade - disponivel);
            return <section className={estilos.material} key={material.id}>
              <header>
                <div><h3>{material.nome}</h3><span>{disponivel} disponível(is) em todas as localizações</span></div>
                <strong className={separado === material.quantidade ? estilos.pronto : ''}>{separado} / {material.quantidade}</strong>
              </header>

              {opcoes.length > 0 && <div className={estilos.lista}>
                {opcoes.map((equipamento) => {
                  const quantidade = quantidadeEscolhida(material.id, equipamento.id);
                  const totalMaterialAtingido = separado >= material.quantidade;
                  const saldo = saldoParaMaterial(material, equipamento);
                  return <div className={`${estilos.equipamento} ${quantidade ? estilos.selecionado : ''}`} key={equipamento.id}>
                    <span className={estilos.icone}><Box /></span>
                    <div className={estilos.dados}><strong>{equipamento.modelo}</strong><span>{identificacaoVisivel(equipamento.serie, equipamento.tipo) ? `${equipamento.serie} · ` : ''}{nomeLocal(localDoEquipamento(equipamento))}</span></div>
                    <span className={estilos.saldo}>{saldo}<small> disponíveis</small></span>
                    <div className={estilos.quantidade}>
                      <button onClick={() => alterar(material, equipamento, -1)} disabled={quantidade === 0} aria-label="Diminuir"><Minus /></button>
                      <output>{quantidade}</output>
                      <button onClick={() => alterar(material, equipamento, 1)} disabled={totalMaterialAtingido || quantidade >= saldo} aria-label="Aumentar"><Plus /></button>
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
          <span className={erro ? estilos.erro : ''}>{erro ? <><AlertCircle /> {erro}</> : completo ? <><Check /> Tudo pronto para reservar</> : `Faltam ${totais - totalSeparado} unidade(s) para concluir`}</span>
          <div><button className={estilos.cancelar} onClick={aoFechar} disabled={salvando}>Cancelar</button><button className={estilos.confirmar} disabled={!completo || salvando} onClick={confirmar}>{salvando ? 'Reservando...' : 'Confirmar separação'}</button></div>
        </footer>
      </main>
    </section>
  </div>;
}
