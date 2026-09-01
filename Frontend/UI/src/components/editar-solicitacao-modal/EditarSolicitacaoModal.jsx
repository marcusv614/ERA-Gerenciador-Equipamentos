import { useMemo, useState } from 'react';
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from './EditarSolicitacaoModal.module.css';

export function ModalEditarSolicitacao({ solicitacao, obras, equipamentos, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [tecnico, definirTecnico] = useState(solicitacao.tecnico);
  const [obraOrigemId, definirObraOrigemId] = useState(solicitacao.obraOrigemId == null ? 'deposito' : String(solicitacao.obraOrigemId));
  const [obraDestinoId, definirObraDestinoId] = useState(solicitacao.obraDestinoId == null ? 'deposito' : String(solicitacao.obraDestinoId));
  const [itens, definirItens] = useState(() => solicitacao.materiais.filter(({ identificacao }) => identificacao).map((material) => ({ identificacao: material.identificacao, quantidade: material.quantidade })));
  const [serieParaAdicionar, definirSerieParaAdicionar] = useState('');
  const [observacao, definirObservacao] = useState(solicitacao.observacao || '');
  const obrasDisponiveis = obras.filter(({ status }) => status !== 'Concluída');

  const reservadosNaSolicitacao = useMemo(() => solicitacao.materiais.reduce((totais, material) => {
    if (material.identificacao) totais[material.identificacao.toLocaleLowerCase('pt-BR')] = (totais[material.identificacao.toLocaleLowerCase('pt-BR')] || 0) + material.quantidade;
    return totais;
  }, {}), [solicitacao.materiais]);

  const equipamentosDisponiveis = useMemo(() => equipamentos
    .filter((equipamento) => String(equipamento.obraId || 'deposito') === obraOrigemId)
    .map((equipamento) => {
      const saldoEdicao = (equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1) + (reservadosNaSolicitacao[equipamento.serie.toLocaleLowerCase('pt-BR')] || 0);
      return { ...equipamento, limiteEdicao: equipamento.controleQuantidade === 'LOTE' ? saldoEdicao : Math.min(1, saldoEdicao) };
    })
    .filter((equipamento) => equipamento.limiteEdicao > 0 && !String(equipamento.status).toLocaleLowerCase('pt-BR').includes('manuten'))
    .sort((a, b) => a.modelo.localeCompare(b.modelo, 'pt-BR')), [equipamentos, obraOrigemId, reservadosNaSolicitacao]);

  const equipamentoPorSerie = (serie) => equipamentosDisponiveis.find((equipamento) => equipamento.serie === serie);
  const opcoesParaAdicionar = equipamentosDisponiveis.filter((equipamento) => !itens.some((item) => item.identificacao === equipamento.serie));
  const alterarOrigem = (valor) => { definirObraOrigemId(valor); definirItens([]); definirSerieParaAdicionar(''); };
  const adicionarItem = () => {
    if (!serieParaAdicionar) return;
    definirItens((atuais) => [...atuais, { identificacao: serieParaAdicionar, quantidade: 1 }]);
    definirSerieParaAdicionar('');
  };
  const removerItem = (serie) => definirItens((atuais) => atuais.filter((item) => item.identificacao !== serie));
  const alterarQuantidade = (item, diferenca) => definirItens((atuais) => atuais.map((atual) => {
    if (atual.identificacao !== item.identificacao) return atual;
    const limite = equipamentoPorSerie(item.identificacao)?.limiteEdicao || 1;
    return { ...atual, quantidade: Math.min(limite, Math.max(1, atual.quantidade + diferenca)) };
  }));
  const materiais = itens.map((item) => {
    const equipamento = equipamentoPorSerie(item.identificacao);
    return equipamento ? { nome: equipamento.modelo, identificacao: equipamento.serie, quantidade: item.quantidade } : null;
  }).filter(Boolean);
  const itensValidos = itens.length > 0 && materiais.length === itens.length && itens.every((item) => item.quantidade <= equipamentoPorSerie(item.identificacao)?.limiteEdicao);
  const podeSalvar = tecnico && obraOrigemId !== obraDestinoId && itensValidos;

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Movimentação · ${String(solicitacao.id).toUpperCase()}`} aoFechar={aoFechar} largo>
    <div className={styles.formulario}>
      <div className={styles.dadosGerais}>
        <CampoFormulario rotulo="Técnico solicitante"><select className={styles.campo} value={tecnico} onChange={(evento) => definirTecnico(evento.target.value)}>{tecnicosCadastrados.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
        <CampoFormulario rotulo="Obra de origem"><select className={styles.campo} value={obraOrigemId} onChange={(evento) => alterarOrigem(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
        <CampoFormulario rotulo="Obra de destino"><select className={styles.campo} value={obraDestinoId} onChange={(evento) => definirObraDestinoId(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      </div>

      <section className={styles.pedidoOriginal}>
        <span>Pedido original</span>
        <div>{solicitacao.materiais.map((material) => <small key={material.id}>{material.quantidade}× {material.nome}{material.identificacao ? ` · ${material.identificacao}` : ''}</small>)}</div>
      </section>

      <section className={styles.secaoMateriais}>
        <header><div><strong>Itens que serão atendidos</strong><small>Somente equipamentos disponíveis na origem</small></div><b>{itens.length}</b></header>
        <div className={styles.listaMateriais}>
          {itens.map((item) => {
            const equipamento = equipamentoPorSerie(item.identificacao);
            if (!equipamento) return <div className={`${styles.material} ${styles.materialIndisponivel}`} key={item.identificacao}><span className={styles.icone}><Package /></span><div className={styles.identificacao}><strong>Série {item.identificacao}</strong><small>Este item não está disponível na origem selecionada.</small></div><button type="button" className={styles.remover} onClick={() => removerItem(item.identificacao)} aria-label={`Remover série ${item.identificacao}`}><Trash2 /></button></div>;
            return <div className={styles.material} key={item.identificacao}>
              <span className={styles.icone}><Package /></span>
              <div className={styles.identificacao}><strong>{equipamento.modelo}</strong><small>{equipamento.tipo} · Série {equipamento.serie}</small><em>{equipamento.limiteEdicao} disponível</em></div>
              <div className={styles.quantidade}><button type="button" disabled={item.quantidade <= 1} onClick={() => alterarQuantidade(item, -1)} aria-label={`Diminuir quantidade de ${equipamento.modelo}`}><Minus /></button><b>{item.quantidade}</b><button type="button" disabled={item.quantidade >= equipamento.limiteEdicao} onClick={() => alterarQuantidade(item, 1)} aria-label={`Aumentar quantidade de ${equipamento.modelo}`}><Plus /></button></div>
              <button type="button" className={styles.remover} onClick={() => removerItem(item.identificacao)} aria-label={`Remover ${equipamento.modelo}`}><Trash2 /></button>
            </div>;
          })}
          {!itens.length && <div className={styles.semMateriais}><Package /><div><strong>Nenhum item definido</strong><small>Escolha abaixo um equipamento disponível.</small></div></div>}
        </div>
        <div className={styles.novoItem}>
          <label><span>Adicionar item do estoque</span><select className={styles.campo} value={serieParaAdicionar} onChange={(evento) => definirSerieParaAdicionar(evento.target.value)}><option value="">Selecione modelo e série</option>{opcoesParaAdicionar.map((equipamento) => <option key={equipamento.id} value={equipamento.serie}>{equipamento.modelo} · {equipamento.serie} · saldo {equipamento.limiteEdicao}</option>)}</select></label>
          <button type="button" onClick={adicionarItem} disabled={!serieParaAdicionar}><Plus /> Adicionar</button>
        </div>
        {!equipamentosDisponiveis.length && <p className={styles.aviso}>Não existem itens disponíveis na origem selecionada.</p>}
      </section>

      <CampoFormulario rotulo="Observação"><textarea className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} /></CampoFormulario>
      <div className={styles.acoes}><button type="button" className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!podeSalvar} onClick={() => aoSalvar(solicitacao.id, { tecnico, obraOrigemId: obraOrigemId === 'deposito' ? null : Number(obraOrigemId), obraDestinoId: obraDestinoId === 'deposito' ? null : Number(obraDestinoId), materiais, observacao: observacao.trim() })}>Salvar alterações</button></div>
    </div>
  </EstruturaModal>;
}
