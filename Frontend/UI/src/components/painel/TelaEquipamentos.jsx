import { ArrowLeftRight, Download, FileText, MapPin, Pencil, Wrench } from 'lucide-react';
import { IndicadorStatus } from '../status-badge/StatusBadge';
import { iconePorTipoEquipamento, statusEquipamento } from '../../data/constantesDominio';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';

const classePorTipo = { Fluke: 'tipoFluke', OTDR: 'tipoOtdr', Outro: 'tipoOutro' };

export function TelaEquipamentos({ equipamentos, tiposDisponiveis, buscarObraPorId, tipoSelecionado, statusSelecionado, podeEditar, aoSelecionarTipo, aoSelecionarStatus, aoAbrirHistorico, aoImprimirHistorico, aoEditar, aoMover, estilos }) {
  const grupos = [{ titulo: 'Ferramentas ativas', itens: equipamentos.filter((e) => !e.arquivado) }, { titulo: 'Ferramentas arquivadas', itens: equipamentos.filter((e) => e.arquivado) }];
  return <>
    <div className={estilos.filters}>
      <select className={estilos.filterSelect} value={tipoSelecionado} onChange={(evento) => aoSelecionarTipo(evento.target.value)} aria-label="Filtrar por subcategoria">
        <option value="Todos">Todas as subcategorias</option>
        {tiposDisponiveis.map((tipo) => <option key={tipo} value={tipo}>{tipo === 'Outro' ? 'Outros' : tipo}</option>)}
      </select>
      <span className={estilos.filterDivider} />
      {['Todos', ...statusEquipamento].map((status) => <button key={status} onClick={() => aoSelecionarStatus(status)} className={`${estilos.filterChip} ${statusSelecionado === status ? estilos.filterChipStatusActive : ''}`}>{status}</button>)}
    </div>
    <div className={estilos.registrosAgrupados}>{grupos.map((grupo) => grupo.itens.length > 0 && <section key={grupo.titulo} className={estilos.registroGrupo}><header><strong>{grupo.titulo}</strong><b>{grupo.itens.length}</b></header><div className={estilos.equipGrid}>
      {grupo.itens.map((equipamento) => {
        const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;
        const obra = equipamento.obraId ? buscarObraPorId(equipamento.obraId) : null;
        return <div key={equipamento.id} className={`${estilos.equipCard} ${equipamento.arquivado ? estilos.registroArquivado : ''}`}>
          <div className={estilos.equipHead}><div className={estilos.equipIdent}><div className={`${estilos.equipIconBox} ${estilos[classePorTipo[equipamento.tipo]] || ''}`}><IconeTipo size={16} /></div><div className={estilos.equipTitleWrap}><div className={estilos.equipModel}>{equipamento.modelo}</div>{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <div className={estilos.equipSerie}>{equipamento.serie}</div>}{(equipamento.medida || equipamento.quantidade > 1 || equipamento.observacoes) && <div className={estilos.equipTecnico}>{equipamento.tipo} · {equipamento.medida || 'Sem medida'} · {equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1} disponíveis{equipamento.quantidadeReservada > 0 ? ` · ${equipamento.quantidadeReservada} reservadas` : ''}{equipamento.observacoes ? ` · ${equipamento.observacoes}` : ''}</div>}</div></div>
            <div className={estilos.equipHeadActions}>{equipamento.arquivado ? <span className={estilos.seloArquivado}>Arquivado</span> : <IndicadorStatus status={equipamento.status} />}<div className={estilos.equipActions}>{podeEditar && <button onClick={() => aoEditar(equipamento)} className={estilos.iconBtn} title="Editar equipamento"><Pencil size={14} /></button>}<button onClick={() => aoAbrirHistorico(equipamento)} className={estilos.iconBtn} title="Histórico"><FileText size={14} /></button><button onClick={() => aoImprimirHistorico(equipamento)} className={estilos.iconBtn} title="Exportar PDF"><Download size={14} /></button></div></div>
          </div>
          <div className={estilos.equipFooter}><div className={estilos.equipLocation}><MapPin size={12} className={estilos.equipLocPin} /><span className={estilos.equipLocationText}>{obra ? obra.nome : 'Depósito central'}</span></div>{!equipamento.arquivado && <button onClick={() => aoMover(equipamento)} className={estilos.moverBtn}><ArrowLeftRight size={11} /> Mover</button>}</div>
          {equipamento.tecnico && <div className={estilos.equipTecnico}>Com {equipamento.tecnico}</div>}
        </div>;
      })}</div></section>)}
      {equipamentos.length === 0 && <div className={estilos.emptyState}>Nenhum equipamento encontrado com esses filtros.</div>}
    </div>
  </>;
}
