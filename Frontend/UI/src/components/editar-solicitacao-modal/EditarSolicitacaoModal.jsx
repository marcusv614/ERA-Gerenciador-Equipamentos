import { useMemo, useState } from 'react';
import { Minus, Package, Plus, Trash2 } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import styles from './EditarSolicitacaoModal.module.css';

const normalizar = (valor) => String(valor || '').trim().toLocaleLowerCase('pt-BR');
const statusMovimentavel = (status) => ['em estoque', 'em campo', 'disponível', 'disponivel'].includes(normalizar(status));
const agruparPedido = (materiais, equipamentos) => Object.values(materiais.reduce((grupos, material) => {
  const equipamento = equipamentos.find((item) => normalizar(item.serie) === normalizar(material.identificacao));
  const nome = equipamento?.modelo || material.nome;
  const chave = material.catalogoChave || equipamento?.catalogoChave || normalizar(nome);
  if (!grupos[chave]) grupos[chave] = { chave, nome, quantidade: 0, catalogoChave: material.catalogoChave || equipamento?.catalogoChave };
  grupos[chave].quantidade += material.quantidade;
  return grupos;
}, {}));

export function ModalEditarSolicitacao({ solicitacao, obras, equipamentos, tecnicosCadastrados, aoFechar, aoSalvar }) {
  const [tecnico, definirTecnico] = useState(solicitacao.tecnico);
  const [obraOrigemId, definirObraOrigemId] = useState(solicitacao.obraOrigemId == null ? 'deposito' : String(solicitacao.obraOrigemId));
  const [obraDestinoId, definirObraDestinoId] = useState(solicitacao.obraDestinoId == null ? 'deposito' : String(solicitacao.obraDestinoId));
  const [itens, definirItens] = useState(() => agruparPedido(solicitacao.materiais, equipamentos));
  const [modeloParaAdicionar, definirModeloParaAdicionar] = useState('');
  const [observacao, definirObservacao] = useState(solicitacao.observacao || '');
  const obrasDisponiveis = obras.filter(({ status }) => status !== 'Concluída');

  const reservadosNaSolicitacao = useMemo(() => solicitacao.materiais.reduce((totais, material) => {
    if (material.identificacao) totais[normalizar(material.identificacao)] = (totais[normalizar(material.identificacao)] || 0) + material.quantidade;
    return totais;
  }, {}), [solicitacao.materiais]);

  const pedidoParaObra = obraOrigemId === 'deposito' && obraDestinoId !== 'deposito';
  const gruposCatalogo = useMemo(() => Object.values(equipamentos.reduce((grupos, equipamento) => {
      const chave = equipamento.catalogoChave || normalizar(equipamento.modelo);
      if (!grupos[chave]) grupos[chave] = { chave, nome: equipamento.modelo, tipo: equipamento.tipo, disponivel: 0, equipamentos: [], catalogoChave: equipamento.catalogoChave };
      const estaNaOrigem = String(equipamento.obraId || 'deposito') === obraOrigemId;
      const movimentavel = statusMovimentavel(equipamento.status);
      const saldo = estaNaOrigem && movimentavel
        ? (equipamento.quantidadeDisponivel ?? equipamento.quantidade ?? 1) + (reservadosNaSolicitacao[normalizar(equipamento.serie)] || 0)
        : 0;
      const limite = equipamento.controleQuantidade === 'LOTE' ? saldo : Math.min(1, saldo);
      if (limite > 0) {
        grupos[chave].disponivel += limite;
        grupos[chave].equipamentos.push({ ...equipamento, limiteEdicao: limite });
      }
      return grupos;
    }, {})).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [equipamentos, obraOrigemId, reservadosNaSolicitacao]);
  const gruposDisponiveis = useMemo(() => pedidoParaObra ? gruposCatalogo : gruposCatalogo.filter((grupo) => grupo.disponivel > 0), [gruposCatalogo, pedidoParaObra]);

  const grupoPorChave = (chave) => gruposDisponiveis.find((grupo) => grupo.chave === chave);
  const opcoesParaAdicionar = gruposDisponiveis.filter((grupo) => !itens.some((item) => item.chave === grupo.chave));
  const alterarOrigem = (valor) => { definirObraOrigemId(valor); definirItens(agruparPedido(solicitacao.materiais, equipamentos)); definirModeloParaAdicionar(''); };
  const alterarQuantidade = (item, diferenca) => definirItens((atuais) => atuais.map((atual) => {
    if (atual.chave !== item.chave) return atual;
    const limite = pedidoParaObra ? Number.MAX_SAFE_INTEGER : (grupoPorChave(item.chave)?.disponivel || 1);
    return { ...atual, quantidade: Math.min(limite, Math.max(1, atual.quantidade + diferenca)) };
  }));
  const removerItem = (chave) => definirItens((atuais) => atuais.filter((item) => item.chave !== chave));
  const adicionarItem = () => {
    const grupo = grupoPorChave(modeloParaAdicionar);
    if (!grupo) return;
    definirItens((atuais) => [...atuais, { chave: grupo.chave, nome: grupo.nome, quantidade: 1, catalogoChave: grupo.catalogoChave }]);
    definirModeloParaAdicionar('');
  };

  const materiais = pedidoParaObra ? itens.map((item) => ({
    nome: item.nome,
    identificacao: null,
    quantidade: item.quantidade,
    catalogoChave: item.catalogoChave || item.chave,
  })) : itens.flatMap((item) => {
    const grupo = grupoPorChave(item.chave);
    if (!grupo) return [];
    let restante = item.quantidade;
    return grupo.equipamentos.flatMap((equipamento) => {
      if (restante <= 0) return [];
      const quantidade = Math.min(restante, equipamento.limiteEdicao);
      restante -= quantidade;
      return [{ nome: equipamento.modelo, identificacao: equipamento.serie, quantidade, catalogoChave: item.catalogoChave || equipamento.catalogoChave }];
    });
  });
  const itensValidos = itens.length > 0 && itens.every((item) => {
    const grupo = grupoPorChave(item.chave);
    return grupo && item.quantidade >= 1 && (pedidoParaObra || item.quantidade <= grupo.disponivel);
  });
  const podeSalvar = tecnico && obraOrigemId !== obraDestinoId && itensValidos;

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Movimentação · ${String(solicitacao.id).toUpperCase()}`} aoFechar={aoFechar} largo>
    <div className={styles.formulario}>
      <div className={styles.dadosGerais}>
        <CampoFormulario rotulo="Técnico solicitante"><select className={styles.campo} value={tecnico} onChange={(evento) => definirTecnico(evento.target.value)}>{tecnicosCadastrados.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
        <CampoFormulario rotulo="Obra de origem"><select className={styles.campo} value={obraOrigemId} onChange={(evento) => alterarOrigem(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
        <CampoFormulario rotulo="Obra de destino"><select className={styles.campo} value={obraDestinoId} onChange={(evento) => definirObraDestinoId(evento.target.value)}><option value="deposito">Depósito central</option>{obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select></CampoFormulario>
      </div>

      <section className={styles.secaoMateriais}>
        <header><div><strong>Itens solicitados</strong><small>{pedidoParaObra ? 'O saldo é informativo; o excedente será encaminhado para aquisição pelo estoque.' : 'A quantidade não pode ultrapassar o saldo disponível na origem.'}</small></div><b>{itens.length}</b></header>
        <div className={styles.listaMateriais}>
          {itens.map((item) => {
            const grupo = grupoPorChave(item.chave);
            return <div className={`${styles.material} ${!grupo ? styles.materialPendente : ''}`} key={item.chave}>
              <span className={styles.icone}><Package /></span>
              <div className={styles.nomeItem}><strong>{item.nome}</strong>{grupo ? <small>{grupo.tipo} · {grupo.disponivel} disponível{pedidoParaObra && item.quantidade > grupo.disponivel ? ` · faltam ${item.quantidade - grupo.disponivel}` : ''}</small> : <small>Item não encontrado no catálogo</small>}</div>
              <div className={styles.quantidade}><button type="button" disabled={!grupo || item.quantidade <= 1} onClick={() => alterarQuantidade(item, -1)} aria-label={`Diminuir quantidade de ${item.nome}`}><Minus /></button><b>{item.quantidade}</b><button type="button" disabled={!grupo || (!pedidoParaObra && item.quantidade >= grupo.disponivel)} onClick={() => alterarQuantidade(item, 1)} aria-label={`Aumentar quantidade de ${item.nome}`}><Plus /></button></div>
              <button type="button" className={styles.remover} onClick={() => removerItem(item.chave)} aria-label={`Remover ${item.nome}`}><Trash2 /></button>
            </div>;
          })}
          {!itens.length && <div className={styles.semMateriais}><Package /><div><strong>Nenhum item solicitado</strong><small>Adicione abaixo um item disponível.</small></div></div>}
        </div>
        <div className={styles.novoItem}>
          <label><span>Adicionar novo item</span><select className={styles.campo} value={modeloParaAdicionar} onChange={(evento) => definirModeloParaAdicionar(evento.target.value)}><option value="">{pedidoParaObra ? 'Selecione um item do catálogo' : 'Selecione um item disponível'}</option>{opcoesParaAdicionar.map((grupo) => <option key={grupo.chave} value={grupo.chave}>{grupo.nome} · saldo {grupo.disponivel}</option>)}</select></label>
          <button type="button" onClick={adicionarItem} disabled={!modeloParaAdicionar}><Plus /> Adicionar</button>
        </div>
        {!gruposDisponiveis.length && <p className={styles.aviso}>{pedidoParaObra ? 'Não existem itens cadastrados no catálogo.' : 'Não existem itens disponíveis na origem selecionada.'}</p>}
      </section>

      <CampoFormulario rotulo="Observação"><textarea className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(evento) => definirObservacao(evento.target.value)} /></CampoFormulario>
      <div className={styles.acoes}><button type="button" className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!podeSalvar} onClick={() => aoSalvar(solicitacao.id, { tecnico, obraOrigemId: obraOrigemId === 'deposito' ? null : Number(obraOrigemId), obraDestinoId: obraDestinoId === 'deposito' ? null : Number(obraDestinoId), materiais, observacao: observacao.trim() })}>Salvar alterações</button></div>
    </div>
  </EstruturaModal>;
}
