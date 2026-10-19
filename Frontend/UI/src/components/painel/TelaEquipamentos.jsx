import { useState } from 'react';
import { ArrowLeftRight, Download, FileText, LayoutGrid, List, MapPin, Pencil, Wrench } from 'lucide-react';
import { descreverLocalizacao } from '../../utils/localizacaoEquipamentos';
import { IndicadorStatus } from '../status-badge/StatusBadge';
import { iconePorTipoEquipamento, statusEquipamento } from '../../data/constantesDominio';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import css from './TelaEquipamentos.module.css';

const classePorTipo = { Fluke: 'tipoFluke', OTDR: 'tipoOtdr', Outro: 'tipoOutro' };
const CHAVE_VISUALIZACAO = 'era-equipamentos-visualizacao';
function visualizacaoInicial() {
  try { return localStorage.getItem(CHAVE_VISUALIZACAO) === 'lista' ? 'lista' : 'cartoes'; }
  catch { return 'cartoes'; }
}

function BotaoMover({ equipamento, aoMover, estilos }) {
  if (equipamento.arquivado || !(equipamento.quantidadeDisponivel > 0)) return null;
  return <button type="button" onClick={() => aoMover(equipamento)} className={estilos.moverBtn} aria-label={`Mover ${equipamento.modelo}`}><ArrowLeftRight size={11} aria-hidden="true" /> Mover</button>;
}

function BotaoManutencao({ equipamento, aoManutencao, estilos }) {
  if (!aoManutencao || equipamento.arquivado) return null;
  return <button type="button" onClick={() => aoManutencao(equipamento)} className={estilos.moverBtn} aria-label={`Manutenção de ${equipamento.modelo}`}><Wrench size={12} aria-hidden="true" />Manutenção</button>;
}

function AcoesEquipamento({ equipamento, podeEditar, aoEditar, aoAbrirHistorico, aoImprimirHistorico, aoMover, aoManutencao, estilos, incluirMover = false }) {
  return <div className={`${estilos.equipActions} ${incluirMover ? css.acoesLista : ''}`}>
    {podeEditar && <button type="button" onClick={() => aoEditar(equipamento)} className={`${estilos.iconBtn} ${estilos.equipEditBtn}`} title="Editar equipamento" aria-label={`Editar ${equipamento.modelo}`}><Pencil size={14} aria-hidden="true" /><span>Editar</span></button>}
    <button type="button" onClick={() => aoAbrirHistorico(equipamento)} className={estilos.iconBtn} title="Histórico" aria-label={`Histórico de ${equipamento.modelo}`}><FileText size={14} aria-hidden="true" /></button>
    <button type="button" onClick={() => aoImprimirHistorico(equipamento)} className={estilos.iconBtn} title="Exportar PDF" aria-label={`Exportar PDF de ${equipamento.modelo}`}><Download size={14} aria-hidden="true" /></button>
    {incluirMover && <><BotaoMover equipamento={equipamento} aoMover={aoMover} estilos={estilos} /><BotaoManutencao equipamento={equipamento} aoManutencao={aoManutencao} estilos={estilos} /></>}
  </div>;
}

function ListaEquipamentos({ grupo, buscarObraPorId, acoes, estilos }) {
  return <div className={css.lista}>
    <table className={css.tabela} role="table" aria-label={grupo.titulo}>
      <thead role="rowgroup"><tr role="row"><th scope="col" role="columnheader">Equipamento</th><th scope="col" role="columnheader">Situação</th><th scope="col" role="columnheader">Quantidades</th><th scope="col" role="columnheader">Localização / responsável</th><th scope="col" role="columnheader">Ações</th></tr></thead>
      <tbody role="rowgroup">{grupo.itens.map((equipamento) => {
        const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;
        return <tr key={equipamento.id} role="row" className={equipamento.arquivado ? css.arquivado : ''}>
          <td role="cell" className={css.identificacao}><div className={estilos.equipIdent}>
            <div className={`${estilos.equipIconBox} ${estilos[classePorTipo[equipamento.tipo]] || ''}`}><IconeTipo size={16} aria-hidden="true" /></div>
            <div className={estilos.equipTitleWrap}><div className={estilos.equipModel}>{equipamento.modelo}</div>
              {identificacaoVisivel(equipamento.serie, equipamento.tipo) && <div className={estilos.equipSerie}>{equipamento.serie}</div>}
              <div className={estilos.equipTecnico}>{equipamento.tipo}{equipamento.medida ? ` · ${equipamento.medida}` : ''}{equipamento.observacoes ? ` · ${equipamento.observacoes}` : ''}</div>
            </div>
          </div></td>
          <td role="cell" data-coluna="Situação">{equipamento.arquivado ? <span className={estilos.seloArquivado}>Arquivado</span> : <IndicadorStatus status={equipamento.status} />}</td>
          <td role="cell" data-coluna="Quantidades"><div className={css.quantidades}>
            <span><small>Total cadastrado</small><strong>{equipamento.quantidade ?? 1}</strong></span>
            <span><small>Disponível</small><strong>{equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1}</strong></span>
            {equipamento.quantidadeReservada > 0 && <span><small>Reservado</small><strong>{equipamento.quantidadeReservada}</strong></span>}
            {equipamento.quantidadeManutencao > 0 && <span><small>Em manutenção</small><strong>{equipamento.quantidadeManutencao}</strong></span>}
          </div></td>
          <td role="cell" data-coluna="Localização"><div className={css.localizacao}>
            <span><MapPin size={13} aria-hidden="true" />{descreverLocalizacao(equipamento, buscarObraPorId)}</span>
            {equipamento.tecnico && <small>Com {equipamento.tecnico}</small>}
            {equipamento.notaFiscal && <small>NF {equipamento.notaFiscal}</small>}
          </div></td>
          <td role="cell" data-coluna="Ações"><AcoesEquipamento equipamento={equipamento} {...acoes} incluirMover /></td>
        </tr>;
      })}</tbody>
    </table>
  </div>;
}

export function TelaEquipamentos({ equipamentos, tiposDisponiveis, buscarObraPorId, tipoSelecionado, statusSelecionado, podeEditar, aoSelecionarTipo, aoSelecionarStatus, aoAbrirHistorico, aoImprimirHistorico, aoEditar, aoMover, aoManutencao, estilos }) {
  const [visualizacao, definirVisualizacao] = useState(visualizacaoInicial);
  const alterarVisualizacao = (modo) => {
    definirVisualizacao(modo);
    try { localStorage.setItem(CHAVE_VISUALIZACAO, modo); } catch { /* A preferência permanece nesta tela. */ }
  };
  const acoes = { podeEditar, aoEditar, aoAbrirHistorico, aoImprimirHistorico, aoMover, aoManutencao, estilos };
  const grupos = [{ titulo: 'Ferramentas ativas', itens: equipamentos.filter((e) => !e.arquivado) }, { titulo: 'Ferramentas arquivadas', itens: equipamentos.filter((e) => e.arquivado) }];
  return <>
    <div className={css.barraFiltros}><div className={estilos.filters}>
      <select className={estilos.filterSelect} value={tipoSelecionado} onChange={(evento) => aoSelecionarTipo(evento.target.value)} aria-label="Filtrar por subcategoria">
        <option value="Todos">Todas as subcategorias</option>
        {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo === 'Outro' ? 'Outros' : tipo}</option>)}
      </select>
      <span className={estilos.filterDivider} />
      {['Todos', ...statusEquipamento].map((status) => <button type="button" key={status} aria-pressed={statusSelecionado === status} onClick={() => aoSelecionarStatus(status)} className={`${estilos.filterChip} ${statusSelecionado === status ? estilos.filterChipStatusActive : ''}`}>{status}</button>)}
    </div><div className={css.alternador} role="group" aria-label="Visualização dos equipamentos">
      <button type="button" aria-pressed={visualizacao === 'cartoes'} onClick={() => alterarVisualizacao('cartoes')}><LayoutGrid size={16} aria-hidden="true" />Cartões</button>
      <button type="button" aria-pressed={visualizacao === 'lista'} onClick={() => alterarVisualizacao('lista')}><List size={16} aria-hidden="true" />Lista</button>
    </div></div>
    <div className={estilos.registrosAgrupados}>{grupos.map((grupo) => grupo.itens.length > 0 && <section key={grupo.titulo} className={estilos.registroGrupo}><header><strong>{grupo.titulo}</strong><b>{grupo.itens.length}</b></header>{visualizacao === 'lista' ? <ListaEquipamentos grupo={grupo} buscarObraPorId={buscarObraPorId} acoes={acoes} estilos={estilos} /> : <div className={estilos.equipGrid}>
      {grupo.itens.map((equipamento) => {
        const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;

        return <div key={equipamento.id} className={`${estilos.equipCard} ${equipamento.arquivado ? estilos.registroArquivado : ''}`}>
          <div className={estilos.equipHead}><div className={estilos.equipIdent}><div className={`${estilos.equipIconBox} ${estilos[classePorTipo[equipamento.tipo]] || ''}`}><IconeTipo size={16} /></div><div className={estilos.equipTitleWrap}><div className={estilos.equipModel}>{equipamento.modelo}</div>{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <div className={estilos.equipSerie}>{equipamento.serie}</div>}<div className={estilos.equipTecnico}>{equipamento.tipo}{equipamento.medida ? ` · ${equipamento.medida}` : ''}{equipamento.observacoes ? ` · ${equipamento.observacoes}` : ''}</div></div></div>
            <div className={estilos.equipHeadActions}>{equipamento.arquivado ? <span className={estilos.seloArquivado}>Arquivado</span> : <IndicadorStatus status={equipamento.status} />}<AcoesEquipamento equipamento={equipamento} {...acoes} /></div>
          </div>
          <div className={estilos.equipQuantidade} aria-label="Quantidade do equipamento">
            <span><small>Total cadastrado</small><strong>{equipamento.quantidade ?? 1}</strong></span>
            <span><small>Disponível</small><strong>{equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1}</strong></span>
            {equipamento.quantidadeReservada > 0 && <span><small>Reservado</small><strong>{equipamento.quantidadeReservada}</strong></span>}
            {equipamento.quantidadeManutencao > 0 && <span><small>Em manutenção</small><strong>{equipamento.quantidadeManutencao}</strong></span>}
          </div>
          <div className={`${estilos.equipFooter} ${css.rodape}`}><div className={estilos.equipLocation}><MapPin size={12} className={estilos.equipLocPin} /><span className={estilos.equipLocationText}>{descreverLocalizacao(equipamento, buscarObraPorId)}{equipamento.notaFiscal ? ` · NF ${equipamento.notaFiscal}` : ''}</span></div><div className={css.acoesRodape}><BotaoMover equipamento={equipamento} aoMover={aoMover} estilos={estilos} /><BotaoManutencao equipamento={equipamento} aoManutencao={aoManutencao} estilos={estilos} /></div></div>
          {equipamento.tecnico && <div className={estilos.equipTecnico}>Com {equipamento.tecnico}</div>}
        </div>;
      })}</div>}</section>)}
      {equipamentos.length === 0 && <div className={estilos.emptyState}>Nenhum equipamento encontrado com esses filtros.</div>}
    </div>
  </>;
}
