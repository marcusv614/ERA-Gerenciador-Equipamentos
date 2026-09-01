import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Movimentação · ${String(solicitacao.id).toUpperCase()}`} aoFechar={aoFechar}>
    <div className={styles.formulario}>
      <CampoFormulario rotulo="Técnico solicitante"><select className={styles.campo} value={tecnico} onChange={(evento) => definirTecnico(evento.target.value)}>{tecnicosCadastrados.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de origem"><select className={styles.campo} value={obraOrigemId} onChange={(evento) => alterarOrigem(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de destino"><select className={styles.campo} value={obraDestinoId} onChange={(evento) => definirObraDestinoId(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Itens da solicitação" dica="Selecione somente itens disponíveis na origem. O saldo inclui o que já estava reservado nesta solicitação.">
        <div className={styles.listaMateriais}>
          {itens.map((item, indice) => {
            const equipamento = equipamentoPorSerie(item.identificacao);
            const seriesUsadas = new Set(itens.filter((outro) => outro.chave !== item.chave).map((outro) => outro.identificacao));
            return <div className={styles.material} key={item.chave}>
              <label><span>Item {indice + 1}</span><select className={styles.campo} value={item.identificacao} onChange={(evento) => alterarItem(item.chave, 'identificacao', evento.target.value)}><option value="">Selecione um item disponível</option>{equipamentosDisponiveis.filter((opcao) => !seriesUsadas.has(opcao.serie) || opcao.serie === item.identificacao).map((opcao) => <option key={opcao.id} value={opcao.serie}>{opcao.modelo} · Série {opcao.serie} · {opcao.saldoEdicao} disponível</option>)}</select></label>
              <label className={styles.quantidade}><span>Quantidade disponível: {equipamento?.limiteEdicao || 0}</span><input className={styles.campo} type="number" min="1" max={equipamento?.limiteEdicao || 1} value={item.quantidade} disabled={!equipamento} onChange={(evento) => alterarItem(item.chave, 'quantidade', evento.target.value)} /></label>
              <button type="button" className={styles.remover} onClick={() => removerItem(item.chave)} aria-label={`Remover item ${indice + 1}`}><Trash2 /></button>
            </div>;
          })}
          {!itens.length && <p className={styles.semMateriais}>Nenhum item selecionado.</p>}
        </div>
      </CampoFormulario>
      <button type="button" className={styles.adicionar} onClick={adicionarItem} disabled={!equipamentosDisponiveis.length || itens.length >= equipamentosDisponiveis.length}><Plus /> Adicionar novo item</button>
      {!equipamentosDisponiveis.length && <p className={styles.aviso}>Não existem itens disponíveis na origem selecionada.</p>}
      <CampoFormulario rotulo="Observação"><textarea className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} /></CampoFormulario>
      <div className={styles.acoes}><button type="button" className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!podeSalvar} onClick={() => aoSalvar(solicitacao.id, { tecnico, obraOrigemId: obraOrigemId === 'deposito' ? null : Number(obraOrigemId), obraDestinoId: obraDestinoId === 'deposito' ? null : Number(obraDestinoId), materiais, observacao: observacao.trim() })}>Salvar alterações</button></div>
    </div>
  </EstruturaModal>;
}
