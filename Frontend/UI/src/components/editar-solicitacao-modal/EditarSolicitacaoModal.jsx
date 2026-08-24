import { useState } from 'react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from './EditarSolicitacaoModal.module.css';

function materiaisParaTexto(materiais) {
  return materiais.map(({ quantidade, nome, identificacao }) => `${quantidade} | ${nome}${identificacao ? ` | ${identificacao}` : ''}`).join('\n');
}

function textoParaMateriais(texto) {
  return texto.split('\n').map((linha) => linha.trim()).filter(Boolean).map((linha, indice) => {
    const [quantidadeInformada, nomeInformado, identificacaoInformada] = linha.split('|').map((parte) => parte?.trim());
    const quantidade = Math.max(1, Number.parseInt(quantidadeInformada, 10) || 1);
    return { id: `material_${Date.now()}_${indice}`, quantidade, nome: nomeInformado || quantidadeInformada, identificacao: identificacaoInformada || undefined };
  });
}

export function ModalEditarSolicitacao({ solicitacao, obras, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [tecnico, definirTecnico] = useState(solicitacao.tecnico);
  const pedidoSemOrigem = !solicitacao.obraOrigemId && solicitacao.materiais.some(({ identificacao }) => !identificacao);
  const [obraOrigemId, definirObraOrigemId] = useState(pedidoSemOrigem ? 'nao_definida' : solicitacao.obraOrigemId || 'deposito');
  const [obraDestinoId, definirObraDestinoId] = useState(solicitacao.obraDestinoId || 'deposito');
  const [materiais, definirMateriais] = useState(materiaisParaTexto(solicitacao.materiais));
  const [observacao, definirObservacao] = useState(solicitacao.observacao || '');
  const obrasDisponiveis = obras.filter(({ status }) => status !== 'Concluída');
  const materiaisPreenchidos = textoParaMateriais(materiais);
  const pedidoGenerico = obraOrigemId === 'nao_definida' && obraDestinoId !== 'deposito' && materiaisPreenchidos.every(({ identificacao }) => !identificacao);
  const atendimentoDefinido = obraOrigemId !== 'nao_definida' && obraOrigemId !== obraDestinoId && materiaisPreenchidos.every(({ identificacao }) => identificacao);
  const podeSalvar = tecnico && materiaisPreenchidos.length > 0 && (pedidoGenerico || atendimentoDefinido);

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Movimentação · ${String(solicitacao.id).toUpperCase()}`} aoFechar={aoFechar}>
    <div className={styles.formulario}>
      <CampoFormulario rotulo="Técnico solicitante"><select className={styles.campo} value={tecnico} onChange={(evento) => definirTecnico(evento.target.value)}>{tecnicosCadastrados.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de origem"><select className={styles.campo} value={obraOrigemId} onChange={(evento) => definirObraOrigemId(evento.target.value)}><option value="nao_definida" disabled>Defina a origem</option><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Obra de destino"><select className={styles.campo} value={obraDestinoId} onChange={(evento) => definirObraDestinoId(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      <CampoFormulario rotulo="Materiais" dica="Use uma linha por item: quantidade | nome | identificação. A série é obrigatória para reservar o item."><textarea className={`${styles.campo} ${styles.materiais}`} value={materiais} onChange={(evento) => definirMateriais(evento.target.value)} /></CampoFormulario>
      <CampoFormulario rotulo="Observação"><textarea className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} /></CampoFormulario>
      <div className={styles.acoes}><button type="button" className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!podeSalvar} onClick={() => aoSalvar(solicitacao.id, { tecnico, obraOrigemId: ['deposito', 'nao_definida'].includes(obraOrigemId) ? null : obraOrigemId, obraDestinoId: obraDestinoId === 'deposito' ? null : obraDestinoId, materiais: materiaisPreenchidos, observacao: observacao.trim() })}>Salvar alterações</button></div>
    </div>
  </EstruturaModal>;
}
