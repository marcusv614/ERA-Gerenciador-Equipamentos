import { useMemo, useRef, useState } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { CampoFormulario } from '../field/Field';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { agruparItensPedido, catalogoParaEdicao, dadosEdicaoPedido, pedidoEmAtendimento } from '../../utils/edicaoSolicitacao';
import styles from './EditarSolicitacaoModal.module.css';

export function ModalEditarSolicitacao({ solicitacao, obras = [], equipamentos, tecnicosCadastrados, erroApi, aoFechar, aoSalvar }) {
  const protegido = pedidoEmAtendimento(solicitacao);
  const [tecnico, definirTecnico] = useState(solicitacao.tecnico);
  const [destinoId, definirDestino] = useState(String(solicitacao.obraDestinoId ?? ''));
  const [itens, definirItens] = useState(() => agruparItensPedido(solicitacao.materiais));
  const [modelo, definirModelo] = useState('');
  const [observacao, definirObservacao] = useState(solicitacao.observacao || '');
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState('');
  const emEnvio = useRef(false);
  const catalogo = useMemo(() => catalogoParaEdicao(equipamentos, destinoId || null), [equipamentos, destinoId]);
  const tecnicos = [...new Set([solicitacao.tecnico, ...tecnicosCadastrados].filter(Boolean))];
  const obrasDisponiveis = obras.filter((obra) => !obra.arquivado && obra.status !== 'Concluída' || String(obra.id) === destinoId);
  const nomeLocal = (id) => id == null ? 'Depósito central' : obras.find((obra) => String(obra.id) === String(id))?.nome || 'Obra não disponível';
  const destinos = obrasDisponiveis.some((obra) => String(obra.id) === destinoId) || !destinoId ? obrasDisponiveis : [{ id: destinoId, nome: nomeLocal(Number(destinoId)) }, ...obrasDisponiveis];
  const valido = protegido || (tecnico && destinoId && itens.length > 0 && itens.length <= 200 && itens.every((item) => Number.isInteger(item.quantidade) && item.quantidade > 0 && item.quantidade <= 2147483647 && catalogo.some(({ chave }) => chave === item.chave)));
  const quantidade = (chave, valor) => {
    const numero = Number(valor);
    if (!Number.isInteger(numero) || numero < 1 || numero > 2147483647) return;
    definirItens((atuais) => atuais.map((item) => item.chave === chave ? { ...item, quantidade: numero } : item));
  };
  const adicionar = () => {
    const grupo = catalogo.find(({ chave }) => chave === modelo);
    if (!grupo || itens.some(({ chave }) => chave === modelo)) return;
    definirItens((atuais) => [...atuais, { ...grupo, quantidade: 1 }]); definirModelo('');
  };
  const salvar = async () => {
    if (!valido || emEnvio.current) return;
    emEnvio.current = true; definirSalvando(true); definirErro('');
    try {
      const sucesso = await aoSalvar(solicitacao.id, dadosEdicaoPedido(solicitacao, tecnico, destinoId ? Number(destinoId) : null, itens, observacao));
      if (sucesso === false) definirErro('Não foi possível salvar as alterações. Tente novamente.');
    } catch (e) { definirErro(e.message || 'Não foi possível salvar as alterações.'); }
    finally { emEnvio.current = false; definirSalvando(false); }
  };

  return <EstruturaModal titulo="Editar solicitação" subtitulo={`Pedido #${solicitacao.id} · ${solicitacao.status}`} aoFechar={salvando ? () => {} : aoFechar} largo>
    <div className={styles.formulario}>
      <p className={styles.explicacao}>{protegido ? 'O estoque já iniciou o atendimento. Você pode atualizar a observação; técnico, destino, materiais, reservas e compras serão preservados.' : 'Edite os materiais e a obra que vai recebê-los. O estoque define os equipamentos e os locais de coleta durante a separação.'}</p>
      <div className={styles.dadosGerais}>
        <CampoFormulario rotulo="Técnico responsável pelo recebimento"><select disabled={protegido || salvando} className={styles.campo} value={tecnico} onChange={(e) => definirTecnico(e.target.value)}>{tecnicos.map((nome) => <option key={nome}>{nome}</option>)}</select></CampoFormulario>
        <CampoFormulario rotulo={solicitacao.obraDestinoId == null && protegido ? 'Destino da retirada' : 'Obra de destino'}>
          {protegido ? <p className={styles.valorFixo}>{nomeLocal(solicitacao.obraDestinoId)}</p> : <select disabled={salvando} className={styles.campo} value={destinoId} onChange={(e) => definirDestino(e.target.value)}><option value="">Selecione a obra que receberá os materiais</option>{destinos.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}</select>}
        </CampoFormulario>
      </div>
      <section className={styles.secaoMateriais}>
        <header><div><strong>Itens solicitados</strong><small>{protegido ? 'Seleção registrada pelo estoque.' : 'Saldo total no depósito e nas outras obras. Quantidades acima do saldo serão avaliadas pelo estoque.'}</small></div><b>{itens.length}</b></header>
        <div className={styles.listaMateriais}>{itens.map((item) => {
          const grupo = catalogo.find(({ chave }) => chave === item.chave);
          return <div className={`${styles.material} ${!grupo && !protegido ? styles.materialPendente : ''}`} key={item.chave}>
            <span className={styles.icone}><Package /></span><div className={styles.nomeItem}><strong>{item.nome}</strong><small>{protegido ? 'Quantidade preservada' : grupo ? `${grupo.tipo} · ${grupo.disponivel} disponível(is) nas origens elegíveis` : 'Material não disponível no catálogo ativo; remova ou substitua.'}</small>
              {protegido && solicitacao.materiais.filter((m) => (m.catalogoChave || m.nome) === (item.catalogoChave || item.nome)).map((m) => <small key={m.id}>{m.quantidade}× · {m.identificacao || 'Aguardando seleção'} · {m.identificacao ? `Coleta: ${nomeLocal(solicitacao.obraOrigemId)}` : `Compra solicitada: ${m.quantidadeCompra || 0}`}</small>)}
            </div>
            <div className={styles.quantidade}><input type="number" min="1" max="2147483647" step="1" aria-label={`Quantidade de ${item.nome}`} value={item.quantidade} disabled={protegido || salvando || !grupo} onChange={(e) => quantidade(item.chave, e.target.value)} /></div>
            {!protegido && <button type="button" disabled={salvando} className={styles.remover} onClick={() => definirItens((atuais) => atuais.filter(({ chave }) => chave !== item.chave))} aria-label={`Remover ${item.nome}`}><Trash2 /></button>}
          </div>;
        })}{!itens.length && <p className={styles.semMateriais}>Adicione pelo menos um material do catálogo.</p>}</div>
        {!protegido && <div className={styles.novoItem}><label><span>Adicionar material do catálogo</span><select disabled={salvando} className={styles.campo} value={modelo} onChange={(e) => definirModelo(e.target.value)}><option value="">Selecione um material</option>{catalogo.filter((grupo) => !itens.some(({ chave }) => chave === grupo.chave)).map((grupo) => <option key={grupo.chave} value={grupo.chave}>{grupo.nome} · {grupo.tipo} · saldo {grupo.disponivel}</option>)}</select></label><button type="button" disabled={!modelo || salvando || itens.length >= 200} onClick={adicionar}><Plus />Adicionar</button></div>}
      </section>
      <CampoFormulario rotulo="Observação"><textarea maxLength={4000} disabled={salvando} className={`${styles.campo} ${styles.observacao}`} value={observacao} onChange={(e) => definirObservacao(e.target.value)} /></CampoFormulario>
      {erro && <p role="alert" className={styles.erro}>{erroApi || erro}</p>}
      <div className={styles.acoes}><button type="button" disabled={salvando} className={styles.cancelar} onClick={aoFechar}>Cancelar</button><button type="button" className={styles.salvar} disabled={!valido || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button></div>
    </div>
  </EstruturaModal>;
}
