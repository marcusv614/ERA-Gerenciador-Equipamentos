import { useState } from 'react';
import { ArrowLeftRight, Calendar, CalendarSearch, Download, FileText, LoaderCircle, MapPin, PackageOpen, Printer, Wrench, X } from 'lucide-react';
import { IndicadorStatusObra } from '../obra-status-badge/ObraStatusBadge';
import { formatarData, obterDataAtual } from '../../utils/datas';
import { iconePorTipoEquipamento } from '../../data/mockData';
import { apiObras } from '../../services/api/servicoAtivosApi';
import { imprimirCautelaHistoricaObra } from '../../services/documentosEquipamentos';
import { identificacaoVisivel } from '../../utils/identificacaoEquipamento';

const classePorTipo = { Fluke: 'tipoFluke', OTDR: 'tipoOtdr', Outro: 'tipoOutro' };

function mensagemDoErro(erro) {
  return erro?.response?.data?.message || erro?.response?.data?.mensagem || erro?.message || 'Não foi possível consultar o inventário desta data.';
}

export function TelaObras({ obras, equipamentos, aoMoverEquipamento, aoImprimirCautela, aoImprimirHistorico, estilos }) {
  const [obraAberta, definirObraAberta] = useState(null);
  const [dataConsulta, definirDataConsulta] = useState(obterDataAtual());
  const [resultado, definirResultado] = useState(null);
  const [erro, definirErro] = useState('');
  const [carregando, definirCarregando] = useState(false);

  function alternarConsulta(obraId) {
    definirObraAberta((atual) => atual === obraId ? null : obraId);
    definirDataConsulta(obterDataAtual());
    definirResultado(null);
    definirErro('');
  }

  async function consultar(obraId) {
    definirCarregando(true);
    definirErro('');
    definirResultado(null);
    try {
      definirResultado(await apiObras.consultarInventarioHistorico(obraId, dataConsulta));
    } catch (falha) {
      definirErro(mensagemDoErro(falha));
    } finally {
      definirCarregando(false);
    }
  }

  return <div className={estilos.obraList}>{obras.map((obra) => {
    const equipamentosDaObra = equipamentos.filter(({ obraId }) => obraId === obra.id);
    const quantidadeNaObra = equipamentosDaObra.reduce((total, equipamento) => total + Number(equipamento.quantidade || 1), 0);
    const consultaAberta = obraAberta === obra.id;
    return <div key={obra.id} className={estilos.obraCard}>
      <div className={estilos.obraHead}>
        <div><div className={estilos.obraTitleRow}><h3 className={estilos.obraTitle}>{obra.nome}</h3><IndicadorStatusObra status={obra.status} /></div><div className={estilos.obraMeta}><span className={estilos.obraClient}>{obra.cliente}</span><span className={estilos.obraMetaItem}><MapPin size={11} />{obra.cidade}</span><span className={estilos.obraMetaItem}><Calendar size={11} />{formatarData(obra.inicio)}</span><span>Resp.: {obra.responsaveis?.join(', ') || '—'}</span></div></div>
        <div className={estilos.obraActionsGroup}><span className={estilos.obraCount}>{quantidadeNaObra} {quantidadeNaObra === 1 ? 'unidade' : 'unidades'}</span><div className={estilos.obraExportActions}><button type="button" className={estilos.obraExportBtn} onClick={() => aoImprimirCautela(obra)}><FileText size={13} /> Inventário atual</button><button type="button" className={estilos.obraExportBtnSecondary} onClick={() => aoImprimirHistorico(obra)}><Download size={13} /> Movimentações</button><button type="button" className={`${estilos.obraExportBtnSecondary} ${consultaAberta ? estilos.obraConsultaBtnAtivo : ''}`} onClick={() => alternarConsulta(obra.id)}><CalendarSearch size={13} /> Por data</button></div></div>
      </div>

      {consultaAberta && <section className={estilos.obraConsultaHistorica} aria-label={`Inventário histórico de ${obra.nome}`}>
        <div className={estilos.obraConsultaTopo}><div><strong>Inventário por data</strong><span>Consulte os materiais e responsáveis registrados em um dia específico.</span></div><button type="button" onClick={() => alternarConsulta(obra.id)} aria-label="Fechar consulta"><X size={17} /></button></div>
        <div className={estilos.obraConsultaForm}>
          <label><span>Data de referência</span><input type="date" value={dataConsulta} max={obterDataAtual()} onChange={(evento) => { definirDataConsulta(evento.target.value); definirResultado(null); definirErro(''); }} /></label>
          <button type="button" onClick={() => consultar(obra.id)} disabled={!dataConsulta || carregando}>{carregando ? <LoaderCircle className={estilos.girando} size={16} /> : <CalendarSearch size={16} />}{carregando ? 'Consultando...' : 'Consultar'}</button>
        </div>
        {erro && <p className={estilos.obraConsultaErro}>{erro}</p>}
        {resultado && <div className={estilos.obraHistoricoResultado}>
          <div className={estilos.obraHistoricoCabecalho}><div><span>Retrato de {formatarData(resultado.dataReferencia)}</span><strong>{resultado.materiais.reduce((total, item) => total + Number(item.quantidade || 1), 0)} unidades em {resultado.materiais.length} {resultado.materiais.length === 1 ? 'registro' : 'registros'}</strong></div><button type="button" onClick={() => imprimirCautelaHistoricaObra(resultado)}><Printer size={16} /> Exportar cautela</button></div>
          <dl className={estilos.obraHistoricoDados}><div><dt>Cliente</dt><dd>{resultado.cliente || '—'}</dd></div><div><dt>Localização</dt><dd>{resultado.cidade || '—'}</dd></div><div><dt>Status da obra</dt><dd>{resultado.status || '—'}</dd></div><div><dt>Responsáveis técnicos</dt><dd>{resultado.responsaveisTecnicos?.join(', ') || '—'}</dd></div></dl>
          <div className={estilos.obraHistoricoLista}>{resultado.materiais.length ? resultado.materiais.map((item) => <article key={`${item.equipamentoId}-${item.serie}`} className={estilos.obraHistoricoItem}><PackageOpen size={17} /><div><strong>{item.modelo}</strong><span>{item.tipo || 'Equipamento'}{identificacaoVisivel(item.serie, item.tipo) ? ` · Série ${item.serie}` : ''}</span></div><b>{item.quantidade || 1} un.</b></article>) : <div className={estilos.obraHistoricoVazio}><PackageOpen size={22} /><span>Nenhum material estava registrado nesta obra.</span></div>}</div>
        </div>}
      </section>}

      {equipamentosDaObra.length > 0 && <div className={estilos.obraEquipList}>{equipamentosDaObra.map((equipamento) => {
        const IconeTipo = iconePorTipoEquipamento[equipamento.tipo] || Wrench;
        return <div key={equipamento.id} className={estilos.obraEquipRow}><div className={estilos.obraEquipInfo}><div className={`${estilos.obraEquipTile} ${estilos[classePorTipo[equipamento.tipo]] || ''}`}><IconeTipo size={14} /></div><div className={estilos.obraEquipText}><div className={estilos.obraEquipTopRow}><span className={estilos.obraEquipNome}>{equipamento.modelo}</span><span className={estilos.obraEquipMov}>mov. {formatarData(equipamento.saida)}</span></div>{identificacaoVisivel(equipamento.serie, equipamento.tipo) && <div className={estilos.obraEquipSerie}>{equipamento.serie}</div>}</div></div><span className={estilos.obraEquipQuantidade}><small>Quantidade</small><strong>{equipamento.quantidade || 1} <i>un.</i></strong></span><button onClick={() => aoMoverEquipamento(equipamento)} className={estilos.obraMoverBtn}><ArrowLeftRight size={11} /> Mover</button></div>;
      })}</div>}
    </div>;
  })}{obras.length === 0 && <div className={estilos.emptyState}>Nenhuma obra encontrada.</div>}</div>;
}
