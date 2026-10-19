import { useRef, useState } from 'react';
import { Check, Wrench } from 'lucide-react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { apiEquipamentos } from '../../services/api/servicoAtivosApi';
import css from './ManutencaoEquipModal.module.css';

const instante = valor => valor ? new Date(valor).toLocaleString('pt-BR', { timeZone: 'America/Manaus' }) : 'Não informado';

export function ModalManutencaoEquipamento({ equipamento, aoFechar, aoAtualizar, buscarObraPorId }) {
  const [registro, definirRegistro] = useState(equipamento);
  const [quantidade, definirQuantidade] = useState('1');
  const [motivo, definirMotivo] = useState('');
  const [concluindo, definirConcluindo] = useState(null);
  const [observacao, definirObservacao] = useState('');
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const emEnvio = useRef(false);
  const disponivel = registro.quantidadeDisponivel ?? 0;
  const qtd = Number(quantidade);
  const valido = Number.isInteger(qtd) && qtd >= 1 && qtd <= disponivel && motivo.trim();
  const historico = [...(registro.manutencoes || [])].sort((a, b) => b.id - a.id);
  const executar = async acao => {
    if (emEnvio.current) return;
    emEnvio.current = true; definirSalvando(true); definirErro('');
    try {
      const atualizado = await acao();
      definirRegistro(atualizado); aoAtualizar(atualizado);
      definirMotivo(''); definirQuantidade('1'); definirConcluindo(null); definirObservacao('');
    } catch (e) { definirErro(e.message || 'Não foi possível registrar a manutenção.'); }
    finally { emEnvio.current = false; definirSalvando(false); }
  };
  return <EstruturaModal titulo="Manutenção do equipamento" subtitulo={`${registro.modelo} · ${registro.serie}`} largo aoFechar={salvando ? () => {} : aoFechar}>
    <div className={css.conteudo}>
      <p className={css.local}>Local atual: <strong>{registro.obraId == null ? 'Depósito central' : buscarObraPorId?.(registro.obraId)?.nome || 'Obra'}</strong>{registro.tecnico ? ` · Com ${registro.tecnico}` : ''}. Use a movimentação para registrar mudanças de local.</p>
      <div className={css.resumo}><span>Total cadastrado<strong>{registro.quantidade}</strong></span><span>Disponível<strong>{disponivel}</strong></span><span>Em manutenção<strong>{registro.quantidadeManutencao || 0}</strong></span><span>Reservado<strong>{registro.quantidadeReservada || 0}</strong></span></div>
      {erro && <p role="alert" className={css.erro}>{erro}</p>}
      {!registro.arquivado && <section className={css.nova} aria-label="Enviar para manutenção">
        <h3><Wrench size={18} /> Enviar para manutenção</h3>
        <p>As unidades selecionadas ficarão bloqueadas para novos pedidos até a conclusão da manutenção.</p>
        <div className={css.campos}><label>Quantidade<input type="number" min="1" max={disponivel} step="1" value={quantidade} disabled={salvando || disponivel < 1} onChange={e => { const valor = e.currentTarget.value; if (valor === '' || (Number.isInteger(Number(valor)) && Number(valor) >= 1 && Number(valor) <= disponivel)) definirQuantidade(valor); }} /></label><label>Motivo da manutenção<textarea rows={3} maxLength={4000} value={motivo} disabled={salvando || disponivel < 1} onChange={e => definirMotivo(e.target.value)} placeholder="Descreva a falha ou o serviço necessário" /></label></div>
        {disponivel < 1 && <p role="status">Nenhuma unidade disponível. As unidades reservadas, em transporte ou em manutenção estão bloqueadas.</p>}
        <button type="button" className={css.primario} disabled={salvando || !valido} onClick={() => executar(() => apiEquipamentos.abrirManutencao(registro.id, { quantidade: qtd, motivo: motivo.trim() }))}>Enviar para manutenção</button>
      </section>}
      <section className={css.historico} aria-label="Histórico de manutenção"><h3>Histórico de manutenção</h3>
        {!historico.length && <p>Nenhuma manutenção registrada.</p>}
        {historico.map(m => <article key={m.id} className={css.registro}>
          <header><strong>Manutenção #{String(m.id).padStart(4, '0')} · {m.quantidade} unidade(s)</strong><b data-aberta={m.status === 'ABERTA'}>{m.status === 'ABERTA' ? 'Em manutenção' : 'Concluída'}</b></header>
          <p className={css.motivo}>{m.motivo}</p>
          <small>{m.local}{m.tecnico ? ` · Com ${m.tecnico}` : ''}</small>
          <small>Abertura: {instante(m.abertaEm)} · {m.abertaPorNome || 'Responsável não informado'}{m.abertaPorLogin ? ` (${m.abertaPorLogin})` : ''}</small>
          {m.status === 'CONCLUIDA' ? <><p className={css.motivo}><strong>Serviço realizado:</strong> {m.observacaoConclusao}</p><small>Conclusão: {instante(m.concluidaEm)} · {m.concluidaPorNome} ({m.concluidaPorLogin})</small></> : concluindo === m.id ? <div className={css.confirmacao}>
            <label>Serviço realizado / resultado<textarea rows={3} maxLength={4000} value={observacao} disabled={salvando} onChange={e => definirObservacao(e.target.value)} /></label>
            <p>Ao concluir, as {m.quantidade} unidade(s) deste registro serão liberadas para novos pedidos.</p>
            <div className={css.acoes}><button type="button" className={css.secundario} disabled={salvando} onClick={() => definirConcluindo(null)}>Cancelar</button><button type="button" className={css.primario} disabled={salvando || !observacao.trim()} onClick={() => executar(() => apiEquipamentos.concluirManutencao(registro.id, m.id, { observacao: observacao.trim() }))}><Check size={16} />Confirmar conclusão</button></div>
          </div> : <button type="button" className={css.secundario} disabled={salvando} onClick={() => { definirConcluindo(m.id); definirObservacao(''); }}>Concluir manutenção</button>}
        </article>)}
      </section>
    </div>
  </EstruturaModal>;
}
