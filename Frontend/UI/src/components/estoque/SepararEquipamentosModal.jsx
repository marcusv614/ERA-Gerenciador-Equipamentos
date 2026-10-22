import { useRef, useState } from 'react';
import { useDialogo } from '../../hooks/useDialogo';
import { AlertCircle, Building2, Check, MapPin, RotateCcw, Search, ShoppingCart, Truck, Warehouse, X } from 'lucide-react';
import { alterarCompraPlano, alterarOrigemPlano, candidatosPlano, dadosPlanoFinanceiro, iniciarPlano, localEquipamento, nomeLocalPlano, preencherTransportePlano, resumoMaterialPlano, saldoPlano } from '../../utils/planoFinanceiro';
import estilos from './SepararEquipamentosModal.module.css';

const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

export function SepararEquipamentosModal({ solicitacao, obras, equipamentos, aoFechar, aoSalvarPlano }) {
  const referencia = useRef(null);
  const [plano, definirPlano] = useState(() => iniciarPlano(solicitacao));
  const [busca, definirBusca] = useState('');
  const [filtro, definirFiltro] = useState('todos');
  const [erro, definirErro] = useState('');
  const [salvando, definirSalvando] = useState(false);
  useDialogo(referencia, salvando ? () => {} : aoFechar);

  const itens = solicitacao.materiais.map((material) => {
    const candidatos = candidatosPlano(material, solicitacao, equipamentos, obras);
    const resumo = resumoMaterialPlano(material, plano, candidatos);
    const grupos = new Map();
    candidatos.forEach((equipamento) => {
      const local = localEquipamento(equipamento);
      if (!grupos.has(local)) grupos.set(local, { local, nome: nomeLocalPlano(local, obras), equipamentos: [] });
      grupos.get(local).equipamentos.push(equipamento);
    });
    return { material, candidatos, resumo, grupos: [...grupos.values()] };
  });
  const completos = itens.filter(({ resumo }) => resumo.completo).length;
  const completo = completos === itens.length;
  const transporte = itens.reduce((soma, { resumo }) => soma + resumo.transporte, 0);
  const compra = itens.reduce((soma, { resumo }) => soma + resumo.compra, 0);
  const termo = normalizar(busca.trim());
  const visiveis = itens.filter(({ resumo }) => filtro === 'todos' || (filtro === 'pendentes' ? !resumo.completo : resumo.completo))
    .map((item) => ({ ...item, grupos: normalizar(item.material.nome).includes(termo) ? item.grupos : item.grupos.filter((g) => normalizar([g.nome, ...g.equipamentos.flatMap((e) => [e.serie, e.tecnico])].join(' ')).includes(termo)) }))
    .filter((item) => !termo || normalizar(item.material.nome).includes(termo) || item.grupos.length);
  const atualizar = (alterar) => { definirErro(''); definirPlano(alterar); };
  const limpar = (material) => atualizar((atual) => ({ ...atual, [material.id]: { origens: {}, compra: material.quantidadeEntradaEstoque || 0, justificativa: '' } }));
  const removerOrigem = (materialId, equipamentoId) => atualizar((atual) => {
    const origens = { ...atual[materialId].origens }; delete origens[equipamentoId];
    return { ...atual, [materialId]: { ...atual[materialId], origens } };
  });

  const confirmar = async (evento) => {
    evento.preventDefault();
    if (!completo || salvando) return;
    definirErro(''); definirSalvando(true);
    try {
      const dados = dadosPlanoFinanceiro(solicitacao, plano, equipamentos, obras);
      if (await aoSalvarPlano(solicitacao.id, dados) === false) throw new Error('Não foi possível salvar o plano. Tente novamente.');
    } catch (falha) { definirErro(falha.message || 'Não foi possível salvar o plano financeiro.'); }
    finally { definirSalvando(false); }
  };

  return <div className={estilos.fundo} onMouseDown={(evento) => !salvando && evento.target === evento.currentTarget && aoFechar()}>
    <section ref={referencia} tabIndex={-1} className={estilos.modal} role="dialog" aria-modal="true" aria-labelledby="titulo-separacao" aria-busy={salvando}>
      <form className={estilos.formulario} onSubmit={confirmar}>
        <fieldset className={estilos.bloqueio} disabled={salvando}>
          <header className={estilos.cabecalho}>
            <div className={estilos.titulo}>
              <span className={estilos.identificacao}>Solicitação #{String(solicitacao.id).padStart(4, '0')} · Financeiro</span>
              <h1 id="titulo-separacao">Planejar transporte e compra</h1>
              <p>{solicitacao.tecnico}</p>
            </div>
            <button type="button" className={estilos.fechar} onClick={aoFechar} aria-label="Fechar"><X size={20} /></button>
            <div className={estilos.destino}><MapPin size={22} /><div><span>Entregar em</span><strong>{nomeLocalPlano(solicitacao.obraDestinoId, obras)}</strong></div></div>
          </header>

          <div className={estilos.ferramentas}>
            <label className={estilos.pesquisa}><Search size={18} /><input type="search" value={busca} onChange={(evento) => definirBusca(evento.target.value)} placeholder="Buscar material, local ou identificação" aria-label="Buscar material, local ou identificação" /></label>
            <select aria-label="Filtrar itens do plano" value={filtro} onChange={(evento) => definirFiltro(evento.target.value)}><option value="todos">Todos os materiais ({itens.length})</option><option value="pendentes">Com pendência ({itens.length - completos})</option><option value="prontos">Planejados ({completos})</option></select>
          </div>

          <div className={estilos.materiais}>
            {visiveis.map(({ material, candidatos, grupos, resumo }) => {
              const item = plano[material.id];
              const candidatosVisiveis = grupos.flatMap((grupo) => grupo.equipamentos);
              const disponivel = candidatosVisiveis.reduce((soma, e) => soma + Math.max(0, saldoPlano(material.id, e, plano) - (item.origens[e.id] || 0)), 0);
              return <section className={estilos.material} key={material.id} aria-labelledby={`material-plano-${material.id}`}>
                <header className={estilos.materialCabecalho}>
                  <div><h2 id={`material-plano-${material.id}`}>{material.nome}</h2><p><strong>{material.quantidade} un.</strong> solicitadas</p></div>
                  <span className={`${estilos.estado} ${resumo.completo ? estilos.pronto : ''}`}>{resumo.completo ? <><Check size={15} /> Planejado</> : resumo.faltante ? `Faltam definir ${resumo.faltante} un.` : 'Revisar plano'}</span>
                </header>

                <div className={estilos.decisao}>
                  <section className={estilos.transporte} aria-label={`Origens de ${material.nome}`}>
                    <div className={estilos.secaoCabecalho}><h3><Truck size={18} /> De onde retirar</h3><button type="button" className={estilos.atalho} disabled={!disponivel || resumo.faltante === 0} onClick={() => atualizar((atual) => preencherTransportePlano(atual, material, candidatosVisiveis))}>Usar saldo disponível</button></div>
                    <p className={estilos.ajuda}>Selecione a quantidade em cada local. O depósito aparece primeiro.</p>
                    {grupos.map((grupo) => {
                      const saldo = grupo.equipamentos.reduce((soma, e) => soma + saldoPlano(material.id, e, plano), 0);
                      return <section className={estilos.local} key={grupo.local}>
                        <header className={estilos.localCabecalho}>
                          <span className={estilos.localIcone}>{grupo.local === 'deposito' ? <Warehouse size={20} /> : <Building2 size={20} />}</span>
                          <div><span>{grupo.local === 'deposito' ? 'Estoque' : 'Obra de origem'}</span><h4>{grupo.nome}</h4></div>
                          <span className={estilos.saldo}><strong>{saldo}</strong><small>disponíveis</small></span>
                        </header>
                        {grupo.equipamentos.map((equipamento) => {
                          const quantidade = item.origens[equipamento.id] || 0;
                          const maximo = Math.max(0, Math.min(saldoPlano(material.id, equipamento, plano), material.quantidade - resumo.compra - resumo.transporte + quantidade));
                          return <div className={`${estilos.equipamento} ${quantidade ? estilos.selecionado : ''}`} key={equipamento.id}>
                            <div className={estilos.dados}><strong>{equipamento.serie || `Registro #${equipamento.id}`}</strong><span>{equipamento.tecnico ? `Com ${equipamento.tecnico}` : 'Sem responsável vinculado'} · {saldoPlano(material.id, equipamento, plano)} un. disponíveis</span></div>
                            <label className={estilos.quantidade}><span>Transportar</span><input type="number" min="0" max={maximo} step="1" value={quantidade} aria-invalid={quantidade > maximo || undefined} aria-label={`Quantidade de ${material.nome} a transportar de ${grupo.nome} (${equipamento.serie || equipamento.id})`} onFocus={(evento) => evento.target.select()} onChange={(evento) => atualizar((atual) => alterarOrigemPlano(atual, material, equipamento, evento.target.value))} /><small>un.</small></label>
                          </div>;
                        })}
                      </section>;
                    })}
                    {!grupos.length && <div className={estilos.vazio}><MapPin size={20} /><p>{candidatos.length ? 'Nenhuma origem corresponde à busca.' : 'Nenhum saldo disponível em outro local. Planeje a compra para atender este material.'}</p></div>}
                    {resumo.invalidas.length > 0 && <div className={estilos.alerta} role="alert"><AlertCircle size={18} /><div><strong>Revise as origens do plano salvo</strong><p>O local, o estado ou o saldo de um equipamento mudou.</p>{resumo.invalidas.map(([id]) => <button type="button" key={id} onClick={() => removerOrigem(material.id, id)}>Remover seleção {equipamentos.find((e) => String(e.id) === id)?.serie || `#${id}`}</button>)}</div></div>}
                  </section>

                  <section className={estilos.compraPlanejada} aria-label={`Compra de ${material.nome}`}>
                    <h3><ShoppingCart size={18} /> O que comprar</h3>
                    <label className={estilos.campoCompra}><span>Quantidade para compra</span><div><input type="number" min={material.quantidadeEntradaEstoque || 0} max={Math.max(material.quantidadeEntradaEstoque || 0, material.quantidade - resumo.transporte)} step="1" value={resumo.compra} onChange={(evento) => atualizar((atual) => alterarCompraPlano(atual, material, evento.target.value))} aria-label={`Quantidade de ${material.nome} para comprar`} /><span>un.</span></div></label>
                    <button type="button" className={estilos.atalho} disabled={!resumo.faltante} onClick={() => atualizar((atual) => alterarCompraPlano(atual, material, material.quantidade - resumo.transporte))}>Comprar as {resumo.faltante || '—'} un. restantes</button>
                    {material.quantidadeEntradaEstoque > 0 && <p className={estilos.recebido}><Check size={16} /> {material.quantidadeEntradaEstoque} un. já recebidas, incluídas acima. Não serão compradas novamente.</p>}
                    {resumo.compra > 0 ? <label className={estilos.justificativa}><span>Motivo da compra <b>*</b></span><textarea required maxLength={1000} rows={3} value={item.justificativa} placeholder="Ex.: preservar os equipamentos em uso na obra de origem." onChange={(evento) => atualizar((atual) => ({ ...atual, [material.id]: { ...atual[material.id], justificativa: evento.target.value } }))} /><small>Obrigatório para autorizar a compra, mesmo havendo saldo em outra obra.</small></label> : <p className={estilos.ajuda}>Pode comprar para manter os equipamentos em uso na obra de origem.</p>}
                  </section>
                </div>
                <footer className={estilos.resumoItem}><span><Truck size={16} /> <strong>{resumo.transporte}</strong> transportar</span><span><ShoppingCart size={16} /> <strong>{resumo.compra}</strong> compra</span><button type="button" className={estilos.limpar} onClick={() => limpar(material)}><RotateCcw size={14} /> Limpar plano</button></footer>
              </section>;
            })}
            {!visiveis.length && <div className={estilos.vazio}><Search size={22} /><p>Nenhum material corresponde aos filtros.</p><button type="button" className={estilos.atalho} onClick={() => { definirBusca(''); definirFiltro('todos'); }}>Limpar filtros</button></div>}
          </div>

          <footer className={estilos.rodape}>
            {erro && <p role="alert" className={estilos.erro}><AlertCircle size={18} />{erro}</p>}
            <div className={estilos.resumoPlano} aria-live="polite"><strong>{completos} de {itens.length} materiais planejados</strong><span>{transporte} un. para transporte · {compra} un. para compra</span></div>
            <div className={estilos.acoes}><button type="button" className={estilos.cancelar} onClick={aoFechar}>Cancelar</button><button type="submit" className={estilos.confirmar} disabled={!completo || salvando}>{salvando ? 'Salvando...' : 'Salvar plano financeiro'}</button></div>
            <small>Salvar registra as instruções. A aprovação continua na solicitação.</small>
          </footer>
        </fieldset>
      </form>
    </section>
  </div>;
}
