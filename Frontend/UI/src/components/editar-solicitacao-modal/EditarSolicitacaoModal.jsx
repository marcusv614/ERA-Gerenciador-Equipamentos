import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from './EditarSolicitacaoModal.module.css';

let proximaChave = 0;
const novaChave = () => `novo_${proximaChave++}`;

export function ModalEditarSolicitacao({ solicitacao, obras, equipamentos, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [tecnico, definirTecnico] = useState(solicitacao.tecnico);
  const [obraOrigemId, definirObraOrigemId] = useState(solicitacao.obraOrigemId == null ? 'deposito' : String(solicitacao.obraOrigemId));
  const [obraDestinoId, definirObraDestinoId] = useState(solicitacao.obraDestinoId == null ? 'deposito' : String(solicitacao.obraDestinoId));
  const [itens, definirItens] = useState(() => solicitacao.materiais.map((material, indice) => ({ chave: `existente_${material.id || indice}`, identificacao: material.identificacao || '', quantidade: material.quantidade })));
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
      return { ...equipamento, saldoEdicao, limiteEdicao: equipamento.controleQuantidade === 'LOTE' ? saldoEdicao : Math.min(1, saldoEdicao) };
    })
    .filter((equipamento) => equipamento.saldoEdicao > 0 && !String(equipamento.status).toLocaleLowerCase('pt-BR').includes('manuten'))
    .sort((a, b) => a.modelo.localeCompare(b.modelo, 'pt-BR')), [equipamentos, obraOrigemId, reservadosNaSolicitacao]);

  const alterarOrigem = (valor) => { definirObraOrigemId(valor); definirItens([]); };
  const alterarItem = (chave, campo, valor) => definirItens((atuais) => atuais.map((item) => item.chave === chave ? { ...item, [campo]: valor } : item));
  const alterarQuantidade = (item, diferenca) => {
    const equipamento = equipamentoPorSerie(item.identificacao);
    if (!equipamento) return;
    alterarItem(item.chave, 'quantidade', Math.min(equipamento.limiteEdicao, Math.max(1, Number(item.quantidade) + diferenca)));
  };
  const adicionarItem = () => definirItens((atuais) => [...atuais, { chave: novaChave(), identificacao: '', quantidade: 1 }]);
  const removerItem = (chave) => definirItens((atuais) => atuais.filter((item) => item.chave !== chave));
  const equipamentoPorSerie = (serie) => equipamentosDisponiveis.find((equipamento) => equipamento.serie === serie);
  const materiais = itens.map((item) => {
    const equipamento = equipamentoPorSerie(item.identificacao);
    return equipamento ? { nome: equipamento.modelo, identificacao: equipamento.serie, quantidade: Number(item.quantidade) } : null;
  }).filter(Boolean);
  const itensValidos = itens.length > 0 && materiais.length === itens.length && itens.every((item) => {
    const equipamento = equipamentoPorSerie(item.identificacao);
    return equipamento && Number(item.quantidade) >= 1 && Number(item.quantidade) <= equipamento.limiteEdicao;
  });
  const podeSalvar = tecnico && obraOrigemId !== obraDestinoId && itensValidos;

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Movimentação · ${String(solicitacao.id).toUpperCase()}`} aoFechar={aoFechar} largo>
    <div className={styles.formulario}>
      <CampoFormulario rotulo="Técnico solicitante"><select className={styles.campo} value={tecnico} onChange={(evento) => definirTecnico(evento.target.value)}>{tecnicosCadastrados.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de origem"><select className={styles.campo} value={obraOrigemId} onChange={(evento) => alterarOrigem(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de destino"><select className={styles.campo} value={obraDestinoId} onChange={(evento) => definirObraDestinoId(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <div className={styles.grupoMateriais}>
        <span className={styles.rotuloMateriais}>Itens da solicitação</span>
        <small className={styles.dicaMateriais}>Selecione somente itens disponíveis na origem. O saldo inclui o que já estava reservado nesta solicitação.</small>
        <div className={styles.listaMateriais}>
          {itens.map((item, indice) => {
            const equipamento = equipamentoPorSerie(item.identificacao);
            const seriesUsadas = new Set(itens.filter((outro) => outro.chave !== item.chave).map((outro) => outro.identificacao));
            return <div className={styles.material} key={item.chave}>
              <header><strong>Item {indice + 1}</strong><div><span className={styles.saldo}>Disponível: <b>{equipamento?.limiteEdicao || 0}</b></span><button type="button" className={styles.remover} onClick={() => removerItem(item.chave)} aria-label={`Remover item ${indice + 1}`}><Trash2 /></button></div></header>
              <label><span>Equipamento</span><select className={styles.campo} value={item.identificacao} onChange={(evento) => { alterarItem(item.chave, 'identificacao', evento.target.value); alterarItem(item.chave, 'quantidade', 1); }}><option value="">Selecione um item disponível</option>{equipamentosDisponiveis.filter((opcao) => !seriesUsadas.has(opcao.serie) || opcao.serie === item.identificacao).map((opcao) => <option key={opcao.id} value={opcao.serie}>{opcao.modelo} · Série {opcao.serie} · {opcao.limiteEdicao} disponível</option>)}</select></label>
              <div className={styles.quantidade}><span>Quantidade solicitada</span><div><button type="button" disabled={!equipamento || Number(item.quantidade) <= 1} onClick={() => alterarQuantidade(item, -1)} aria-label={`Diminuir quantidade do item ${indice + 1}`}><Minus /></button><b>{item.quantidade}</b><button type="button" disabled={!equipamento || Number(item.quantidade) >= equipamento.limiteEdicao} onClick={() => alterarQuantidade(item, 1)} aria-label={`Aumentar quantidade do item ${indice + 1}`}><Plus /></button></div></div>
            </div>;
          })}
          {!itens.length && <p className={styles.semMateriais}>Nenhum item selecionado.</p>}
        </div>
        <button type="button" className={styles.adicionar} onClick={adicionarItem} disabled={!equipamentosDisponiveis.length || itens.length >= equipamentosDisponiveis.length}><Plus /> Adicionar novo item</button>
      </div>
      {!equipamentosDisponiveis.length && <p className={styles.aviso}>Não existem itens disponíveis na origem selecionada.</p>}
      <CampoFormulario rotulo="Observação"><textarea className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} /></CampoFormulario>
      <div className={styles.acoes}><button type="button" className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!podeSalvar} onClick={() => aoSalvar(solicitacao.id, { tecnico, obraOrigemId: obraOrigemId === 'deposito' ? null : Number(obraOrigemId), obraDestinoId: obraDestinoId === 'deposito' ? null : Number(obraDestinoId), materiais, observacao: observacao.trim() })}>Salvar alterações</button></div>
    </div>
  </EstruturaModal>;
}
