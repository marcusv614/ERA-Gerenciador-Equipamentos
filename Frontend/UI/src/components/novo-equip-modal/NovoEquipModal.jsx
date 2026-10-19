import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, Info, Plus } from "lucide-react";
import { EstruturaModal } from "../modal-shell/ModalShell";
import { CampoFormulario } from "../field/Field";
import { tiposEquipamento } from '../../data/constantesDominio';
import { ferramentaManual, identificacaoVisivel } from '../../utils/identificacaoEquipamento';
import { obterDataAtual } from '../../utils/datas';
import styles from "./NovoEquipModal.module.css";

const CAMPOS_CATEGORIA_PERSONALIZADA = [
  { chave: 'marca', rotulo: 'Marca ou fabricante', tipo: 'text', placeholder: 'Ex.: Tramontina' },
  { chave: 'modeloFabricante', rotulo: 'Modelo do fabricante', tipo: 'text', placeholder: 'Ex.: GSB 18V-50' },
  { chave: 'serie', rotulo: 'Número de série', tipo: 'text', placeholder: 'Quando houver' },
  { chave: 'patrimonio', rotulo: 'Número patrimonial', tipo: 'text', placeholder: 'Ex.: PAT-0142' },
  { chave: 'medida', rotulo: 'Tamanho, medida ou numeração', tipo: 'text', placeholder: 'Ex.: 1/4 pol., nº 10' },
  { chave: 'lote', rotulo: 'Lote do fabricante', tipo: 'text', placeholder: 'Ex.: LT-2408' },
  { chave: 'validade', rotulo: 'Data de validade', tipo: 'date' },
  { chave: 'calibracao', rotulo: 'Validade da calibração', tipo: 'date' },
  { chave: 'tensao', rotulo: 'Tensão', tipo: 'text', placeholder: 'Ex.: 220 V' },
  { chave: 'potencia', rotulo: 'Potência', tipo: 'text', placeholder: 'Ex.: 750 W' },
  { chave: 'capacidade', rotulo: 'Capacidade', tipo: 'text', placeholder: 'Ex.: 24 fibras' },
  { chave: 'portas', rotulo: 'Quantidade de portas', tipo: 'number', placeholder: 'Ex.: 16' },
];

const CAMPOS_CATEGORIA_HISTORICA = [
  { chave: 'marca', rotulo: 'Marca ou fabricante', tipo: 'text', placeholder: 'Quando houver' },
  { chave: 'modeloFabricante', rotulo: 'Modelo do fabricante', tipo: 'text', placeholder: 'Quando houver' },
  { chave: 'medida', rotulo: 'Tamanho, medida ou numeração', tipo: 'text', placeholder: 'Quando houver' },
  { chave: 'serie', rotulo: 'Número de série', tipo: 'text', placeholder: 'Quando houver' },
];

const GUIA_CATEGORIAS = {
  'Instrumentos de teste e medição': {
    exemplos: ['OTDR', 'Power meter', 'Certificador', 'Multímetro', 'VFL'],
    orientacao: 'Use para instrumentos que medem, testam ou certificam uma rede. Registre a calibração quando houver certificado ou etiqueta válida.',
  },
  'Fusão e preparação de fibra': {
    exemplos: ['Máquina de fusão', 'Clivador', 'Decapador térmico', 'Forno de emenda'],
    orientacao: 'Use para equipamentos de preparação e emenda de fibra. A contagem de uso e a manutenção ajudam a planejar a troca de lâminas e eletrodos.',
  },
  'Equipamentos ativos de rede': {
    exemplos: ['Switch', 'Roteador', 'OLT', 'ONU/ONT', 'Rádio', 'SFP'],
    orientacao: 'Use para itens energizados que processam ou transmitem dados. Série e MAC devem ser informados somente quando estiverem legíveis.',
  },
  'Cabos e fibras': {
    exemplos: ['Cabo óptico', 'Cabo UTP', 'Cabo coaxial', 'Drop', 'Cordão óptico'],
    orientacao: 'Cadastre por tipo e apresentação comercial. Para bobinas, informe a metragem disponível; número de série não é necessário.',
  },
  'Conectividade e componentes passivos': {
    exemplos: ['Conector', 'Adaptador', 'Pigtail', 'Splitter', 'Patch cord'],
    orientacao: 'Use para componentes sem alimentação elétrica. Tipo de conector, polimento e proporção evitam separar peças incompatíveis.',
  },
  'Caixas, fechamentos e distribuição': {
    exemplos: ['CTO', 'CEO', 'DIO', 'Rack', 'Patch panel', 'Bandeja'],
    orientacao: 'Use para proteção, organização e distribuição. Capacidade, quantidade de portas e tipo de montagem são as referências mais úteis.',
  },
  'Ferramentas manuais': {
    exemplos: ['Chave de fenda', 'Alicate', 'Chave combinada', 'Cortador', 'Crimpador'],
    orientacao: 'Agrupe ferramentas iguais pelo nome e medida. Não registre número de série; marca, tamanho e isolamento são opcionais.',
  },
  'Ferramentas elétricas e máquinas': {
    exemplos: ['Furadeira', 'Parafusadeira', 'Esmerilhadeira', 'Gerador', 'Compressor'],
    orientacao: 'Use para ferramentas motorizadas. Tensão, potência e tipo de bateria ajudam a enviar acessórios compatíveis para a obra.',
  },
  'Infraestrutura, passagem e fixação': {
    exemplos: ['Eletroduto', 'Abraçadeira', 'Parafuso', 'Suporte', 'Bandeja', 'Bucha'],
    orientacao: 'Agrupe pelo material e pela dimensão. Registre a unidade de fornecimento para diferenciar peça, pacote, caixa e metro.',
  },
  'Energia e aterramento': {
    exemplos: ['Nobreak', 'Bateria', 'Retificador', 'PDU', 'DPS', 'Haste de aterramento'],
    orientacao: 'Use para alimentação e proteção elétrica. Tensão, corrente, potência e capacidade devem seguir a etiqueta quando estiver legível.',
  },
  'Segurança, EPI e acesso': {
    exemplos: ['Capacete', 'Cinturão', 'Luva', 'Escada', 'Cone', 'Sinalização'],
    orientacao: 'Use para proteção e acesso ao trabalho. Priorize CA, validade e inspeção quando existirem; nunca invente uma data ausente.',
  },
  'Consumíveis e limpeza': {
    exemplos: ['Álcool isopropílico', 'Lenço', 'Etiqueta', 'Fita', 'Protetor de fusão'],
    orientacao: 'Cadastre por embalagem ou apresentação. Lote e validade são opcionais e o número de série não deve ser usado.',
  },
};

function limparObjeto(objeto) {
  return Object.fromEntries(Object.entries(objeto || {})
    .map(([chave, valor]) => [chave, String(valor ?? '').trim()])
    .filter(([, valor]) => Boolean(valor)));
}

export function ModalNovoEquipamento({
  equipamento = null,
  obras = [],
  tecnicosCadastrados = [],
  seriesCadastradas = [],
  tiposDisponiveis = tiposEquipamento,
  categoriasDisponiveis = [],
  aoCriarCategoria,
  aoFechar,
  aoSalvar,
  aoArquivar,
}) {
  const editando = Boolean(equipamento);
  const categoriaInicial = equipamento?.tipo || categoriasDisponiveis[0]?.nome || tiposDisponiveis[0] || '';
  const [form, setForm] = useState({
    tipo: categoriaInicial,
    modelo: equipamento?.modelo || "",
    serie: identificacaoVisivel(equipamento?.serie, equipamento?.tipo) || "",
    status: equipamento?.status || "Em estoque",
    obraId: equipamento?.obraId || "",
    tecnico: equipamento?.tecnico || "",
    data: equipamento?.dataEntrada || equipamento?.data || obterDataAtual(),
    quantidade: String(equipamento?.quantidade ?? 1),
    medida: equipamento?.medida || '',
    atributos: equipamento?.atributos || {},
    fornecedor: equipamento?.fornecedor || '',
    notaFiscal: equipamento?.notaFiscal || '',
    dataCompra: equipamento?.dataCompra || '',
    observacoes: equipamento?.observacoes || '',
    auditavel: equipamento?.auditavel ?? false,
  });
  const [novaCategoria, definirNovaCategoria] = useState('');
  const [categoriaCriada, definirCategoriaCriada] = useState(null);
  const [camposNovaCategoria, definirCamposNovaCategoria] = useState(['marca', 'medida']);
  const [modalNovaCategoriaAberto, definirModalNovaCategoriaAberto] = useState(false);
  const [salvandoCategoria, definirSalvandoCategoria] = useState(false);
  const [erroCategoria, definirErroCategoria] = useState('');
  const [guiaCategoriasAberto, definirGuiaCategoriasAberto] = useState(false);
  const [categoriaGuia, definirCategoriaGuia] = useState(categoriaInicial);
  const [origemAberta, definirOrigemAberta] = useState(Boolean(equipamento?.fornecedor || equipamento?.notaFiscal || equipamento?.dataCompra));
  const [confirmandoExclusao, definirConfirmandoExclusao] = useState(false);
  const [excluindo, definirExcluindo] = useState(false);
  const [erroExclusao, definirErroExclusao] = useState('');

  const categoriasExibidas = useMemo(() => {
    const porNome = new Map();
    categoriasDisponiveis.forEach((categoria) => porNome.set(categoria.nome, categoria));
    if (categoriaCriada) porNome.set(categoriaCriada.nome, categoriaCriada);
    tiposDisponiveis.forEach((nome) => {
      if (!porNome.has(nome)) porNome.set(nome, {
        nome,
        descricao: 'Categoria já utilizada no inventário. Os dados complementares são opcionais.',
        campos: ferramentaManual(nome)
          ? CAMPOS_CATEGORIA_HISTORICA.filter(({ chave }) => chave !== 'serie')
          : CAMPOS_CATEGORIA_HISTORICA,
        historica: true,
      });
    });
    return [...porNome.values()];
  }, [categoriaCriada, categoriasDisponiveis, tiposDisponiveis]);

  const categoriaSelecionada = categoriasExibidas.find(({ nome }) => nome === form.tipo);
  const categoriaDoGuia = categoriasExibidas.find(({ nome }) => nome === categoriaGuia) || categoriaSelecionada;
  const instrucoesCategoria = GUIA_CATEGORIAS[categoriaDoGuia?.nome] || {
    exemplos: [`Itens classificados como ${categoriaDoGuia?.nome || 'esta categoria'}`],
    orientacao: categoriaDoGuia?.descricao || 'Use esta categoria somente para itens com características semelhantes.',
  };
  const camposCategoria = categoriaSelecionada?.campos || [];
  const exibeSerie = camposCategoria.some(({ chave }) => chave === 'serie');
  const exibeMedida = camposCategoria.some(({ chave }) => chave === 'medida');
  const camposAtributos = camposCategoria.filter(({ chave }) => !['serie', 'medida'].includes(chave));
  const serieNormalizada = exibeSerie ? form.serie.trim().toLocaleLowerCase('pt-BR') : '';
  const serieOriginalNormalizada = String(equipamento?.serie || '').trim().toLocaleLowerCase('pt-BR');
  const serieJaCadastrada = Boolean(serieNormalizada) && seriesCadastradas.some((serie) =>
    String(serie || '').trim().toLocaleLowerCase('pt-BR') === serieNormalizada && serieNormalizada !== serieOriginalNormalizada);
  const categoriaJaCadastrada = categoriasExibidas.some(({ nome }) =>
    nome.toLocaleLowerCase('pt-BR') === novaCategoria.trim().toLocaleLowerCase('pt-BR'));
  const tecnicosDisponiveis = equipamento?.tecnico && !tecnicosCadastrados.includes(equipamento.tecnico)
    ? [equipamento.tecnico, ...tecnicosCadastrados]
    : tecnicosCadastrados;
  const obrasDisponiveis = obras.filter(({ id, status }) =>
    status !== 'Concluída' || String(id) === String(equipamento?.obraId));
  const quantidade = Number(form.quantidade);
  const quantidadeMinima = Math.max(1, Number(equipamento?.quantidadeReservada || 0));
  const quantidadeValida = Number.isInteger(quantidade) && quantidade >= quantidadeMinima;
  const canSave = form.tipo.trim() && form.modelo.trim() && form.data && quantidadeValida && !serieJaCadastrada;

  const fecharModalNovaCategoria = () => {
    definirModalNovaCategoriaAberto(false);
    definirNovaCategoria('');
    definirCamposNovaCategoria(['marca', 'medida']);
    definirErroCategoria('');
  };

  const alternarCampoNovaCategoria = (chave) => {
    definirCamposNovaCategoria((camposAtuais) => camposAtuais.includes(chave)
      ? camposAtuais.filter((campo) => campo !== chave)
      : [...camposAtuais, chave]);
  };

  const adicionarNovaCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome || categoriaJaCadastrada || salvandoCategoria) return;
    definirSalvandoCategoria(true);
    definirErroCategoria('');
    const campos = CAMPOS_CATEGORIA_PERSONALIZADA.filter(({ chave }) => camposNovaCategoria.includes(chave));
    const categoria = aoCriarCategoria
      ? await aoCriarCategoria({ nome, descricao: 'Categoria personalizada para o inventário da empresa.', campos })
      : { nome, descricao: 'Categoria personalizada para o inventário da empresa.', campos };
    definirSalvandoCategoria(false);
    if (!categoria) {
      definirErroCategoria('Não foi possível cadastrar a categoria. Tente novamente.');
      return;
    }
    definirCategoriaCriada(categoria);
    setForm((dadosAtuais) => ({ ...dadosAtuais, tipo: categoria.nome, serie: '', medida: '', atributos: {} }));
    fecharModalNovaCategoria();
  };

  const selecionarCategoria = (tipo) => {
    setForm((dadosAtuais) => ({ ...dadosAtuais, tipo }));
  };

  const abrirGuiaCategoria = () => {
    definirCategoriaGuia(form.tipo);
    definirGuiaCategoriasAberto(true);
  };

  const valorCampoDinamico = (chave) => {
    if (chave === 'serie') return form.serie;
    if (chave === 'medida') return form.medida;
    return form.atributos[chave] || '';
  };

  const alterarCampoDinamico = (chave, valor) => {
    if (chave === 'serie' || chave === 'medida') {
      setForm((dadosAtuais) => ({ ...dadosAtuais, [chave]: valor }));
      return;
    }
    setForm((dadosAtuais) => ({
      ...dadosAtuais,
      atributos: { ...dadosAtuais.atributos, [chave]: valor },
    }));
  };

  const excluirRegistro = async () => {
    definirExcluindo(true);
    definirErroExclusao('');
    const resultado = await aoArquivar(!equipamento.arquivado);
    if (!resultado.sucesso) definirErroExclusao(resultado.mensagem || 'Não foi possível alterar o arquivamento.');
    definirExcluindo(false);
  };

  const salvar = () => {
    if (!canSave) return;
    const chavesVisiveis = new Set(camposAtributos.map(({ chave }) => chave));
    const atributosVisiveis = Object.fromEntries(Object.entries(form.atributos)
      .filter(([chave]) => chavesVisiveis.has(chave)));
    aoSalvar({
      ...form,
      tipo: form.tipo.trim(),
      modelo: form.modelo.trim(),
      serie: exibeSerie ? form.serie.trim() || null : null,
      medida: exibeMedida ? form.medida.trim() || null : null,
      atributos: limparObjeto(atributosVisiveis),
      fornecedor: form.fornecedor.trim(),
      notaFiscal: form.notaFiscal.trim(),
      dataCompra: form.dataCompra || null,
      observacoes: form.observacoes.trim(),
      obraId: form.obraId || null,
      tecnico: form.tecnico || null,
      data: form.data || null,
      quantidade,
      controleQuantidade: quantidade > 1 ? 'LOTE' : 'INDIVIDUAL',
    });
  };

  return <>
    <EstruturaModal
      titulo={editando ? 'Editar item do inventário' : 'Adicionar item ao inventário'}
      subtitulo={editando ? 'Atualize identificação, especificações e origem' : 'Cadastre equipamentos, ferramentas ou materiais'}
      aoFechar={aoFechar}
      largo
    >
      <div className={styles.form}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>1</span>
            <div><h3>Identificação</h3><p>Comece escolhendo a família do item.</p></div>
          </div>
          <div className={styles.categoryRow}>
            <CampoFormulario rotulo="Categoria">
              <select className={styles.input} value={form.tipo} onChange={(e) => selecionarCategoria(e.target.value)}>
                {categoriasExibidas.map(({ nome }) => <option key={nome} value={nome}>{nome}</option>)}
              </select>
            </CampoFormulario>
            <button type="button" className={styles.adicionarCategoria} onClick={() => definirModalNovaCategoriaAberto(true)}>
              <Plus size={15} aria-hidden="true" /> Nova categoria
            </button>
          </div>
          {categoriaSelecionada?.descricao && <div className={styles.categoryHint}><Info size={15} aria-hidden="true" /><span>{categoriaSelecionada.descricao}</span></div>}
          <button type="button" className={styles.guideLink} onClick={abrirGuiaCategoria}>
            <BookOpen size={15} aria-hidden="true" /> Como registrar itens desta categoria
          </button>
          <div className={styles.grid2}>
            <CampoFormulario rotulo="Nome do material ou equipamento">
              <input className={styles.input} placeholder="Ex.: OTDR EXFO, chave Phillips, cabo óptico" value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} required />
            </CampoFormulario>
            <CampoFormulario
              rotulo="Quantidade"
              dica={equipamento?.quantidadeReservada > 0
                ? `${equipamento.quantidadeReservada} unidade(s) já reservada(s).`
                : 'Total de unidades deste registro.'}
            >
              <input type="number" className={styles.input} min={quantidadeMinima} step="1" inputMode="numeric" value={form.quantidade} onChange={(e) => setForm((dadosAtuais) => ({ ...dadosAtuais, quantidade: e.target.value }))} required />
              {!quantidadeValida && <small className={styles.erro}>Informe um número inteiro igual ou maior que {quantidadeMinima}.</small>}
            </CampoFormulario>
          </div>
        </section>

        {camposCategoria.length > 0 && <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>2</span>
            <div><h3>Especificações</h3><p>Preencha apenas o que você souber sobre o item.</p></div>
            <span className={styles.optionalBadge}>Tudo opcional</span>
          </div>
          <div className={styles.dynamicGrid}>
            {camposCategoria.map((campo) => <CampoFormulario key={campo.chave} rotulo={campo.rotulo} dica={campo.dica}>
              <input
                type={campo.tipo || 'text'}
                className={`${styles.input} ${['serie', 'patrimonio', 'mac', 'lote'].includes(campo.chave) ? styles.mono : ''}`}
                placeholder={campo.placeholder || ''}
                min={campo.tipo === 'number' ? '0' : undefined}
                step={campo.tipo === 'number' ? '1' : undefined}
                value={valorCampoDinamico(campo.chave)}
                onChange={(e) => alterarCampoDinamico(campo.chave, e.target.value)}
              />
              {campo.chave === 'serie' && serieJaCadastrada && <small className={styles.erro}>Este número de série já está cadastrado.</small>}
            </CampoFormulario>)}
          </div>
        </section>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionNumber}>{camposCategoria.length > 0 ? '3' : '2'}</span>
            <div><h3>Localização e entrada</h3><p>Informe onde o item está e quando entrou no inventário.</p></div>
          </div>
          <div className={styles.grid2}>
            <CampoFormulario rotulo="Localização" dica={editando ? 'Mudanças de local são feitas pelo fluxo de movimentação.' : null}>
              <select
                className={styles.input}
                value={form.obraId}
                disabled={editando}
                onChange={(e) => setForm({ ...form, obraId: e.target.value, status: e.target.value ? "Em campo" : "Em estoque", tecnico: e.target.value ? form.tecnico : '' })}
              >
                <option value="">Depósito central</option>
                {obrasDisponiveis.map((obra) => <option key={obra.id} value={obra.id}>{obra.nome}</option>)}
              </select>
            </CampoFormulario>
            <CampoFormulario rotulo="Data de entrada">
              <input type="date" className={styles.input} value={form.data} max={obterDataAtual()} onChange={(e) => setForm({ ...form, data: e.target.value })} required />
            </CampoFormulario>
          </div>
          <CampoFormulario rotulo="Técnico responsável (opcional)" dica={form.obraId ? 'Use quando o item já estiver sob responsabilidade de um técnico.' : 'Disponível para itens localizados em uma obra.'}>
            <select className={styles.input} value={form.tecnico} onChange={(e) => setForm({ ...form, tecnico: e.target.value })} disabled={editando || !form.obraId}>
              <option value="">Sem técnico responsável</option>
              {tecnicosDisponiveis.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
            </select>
          </CampoFormulario>
        </section>

        <details className={styles.purchaseDetails} open={origemAberta} onToggle={(evento) => definirOrigemAberta(evento.currentTarget.open)}>
          <summary><span>Origem da entrada <small>opcional</small></span><ChevronDown size={17} aria-hidden="true" /></summary>
          <p>Use estes dados quando houver comprovante. Eles identificam esta compra ou lote específico.</p>
          <div className={styles.purchaseGrid}>
            <CampoFormulario rotulo="Fornecedor">
              <input className={styles.input} placeholder="Ex.: Distribuidora Norte" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} />
            </CampoFormulario>
            <CampoFormulario rotulo="Número da nota fiscal">
              <input className={`${styles.input} ${styles.mono}`} placeholder="Ex.: NF-12345" value={form.notaFiscal} onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })} />
            </CampoFormulario>
            <CampoFormulario rotulo="Data da compra">
              <input type="date" className={styles.input} max={obterDataAtual()} value={form.dataCompra} onChange={(e) => setForm({ ...form, dataCompra: e.target.value })} />
            </CampoFormulario>
          </div>
        </details>

        <label className={styles.auditavel}>
          <input type="checkbox" checked={form.auditavel} onChange={(evento) => setForm({ ...form, auditavel: evento.target.checked })} />
          <span><strong>Auditável</strong><small>Inclui este item nas vistorias de conservação dos materiais sob responsabilidade dos técnicos. Marque para ferramentas e equipamentos duráveis; deixe desmarcado para consumíveis.</small><b>{form.auditavel ? 'Participa das auditorias dos técnicos' : 'Não participa das auditorias dos técnicos'}</b></span>
        </label>
        <CampoFormulario rotulo="Observações (opcional)" dica="Estado de conservação, informação ausente ou outro detalhe útil.">
          <textarea className={`${styles.input} ${styles.textarea}`} rows="3" maxLength="4000" placeholder="Ex.: Ferramenta antiga, marca ilegível." value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
        </CampoFormulario>

        {editando && confirmandoExclusao && <div className={styles.confirmacaoExclusao} role="alertdialog" aria-label="Confirmar arquivamento do equipamento">
          <div><strong>{equipamento.arquivado ? 'Restaurar registro?' : 'Arquivar registro?'}</strong><span>O histórico será preservado. Itens arquivados não aparecem nos fluxos operacionais.</span></div>
          {erroExclusao && <p>{erroExclusao}</p>}
          <div><button type="button" onClick={() => { definirConfirmandoExclusao(false); definirErroExclusao(''); }} disabled={excluindo}>Cancelar</button><button type="button" onClick={excluirRegistro} disabled={excluindo}>{excluindo ? 'Salvando...' : equipamento.arquivado ? 'Restaurar' : 'Arquivar'}</button></div>
        </div>}

        <div className={styles.actions}>
          {editando && !confirmandoExclusao && <button type="button" onClick={() => definirConfirmandoExclusao(true)} className={styles.delete}>{equipamento.arquivado ? 'Restaurar registro' : 'Arquivar registro'}</button>}
          <span className={styles.actionsSpacer} />
          <button type="button" onClick={aoFechar} className={styles.cancel}>Cancelar</button>
          <button type="button" disabled={!canSave || equipamento?.arquivado} onClick={salvar} className={styles.submit}>
            {editando ? 'Salvar alterações' : 'Adicionar ao inventário'}
          </button>
        </div>
      </div>
    </EstruturaModal>

    {guiaCategoriasAberto && categoriaDoGuia && <EstruturaModal titulo="Guia de cadastro das categorias" subtitulo="Consulte exemplos e informações recomendadas" aoFechar={() => definirGuiaCategoriasAberto(false)} largo>
      <div className={styles.guide}>
        <CampoFormulario rotulo="Consultar categoria">
          <select className={styles.input} value={categoriaDoGuia.nome} onChange={(evento) => definirCategoriaGuia(evento.target.value)}>
            {categoriasExibidas.map(({ nome }) => <option key={nome} value={nome}>{nome}</option>)}
          </select>
        </CampoFormulario>

        <header className={styles.guideHero}>
          <span><BookOpen size={20} aria-hidden="true" /></span>
          <div><small>COMO REGISTRAR</small><h3>{categoriaDoGuia.nome}</h3><p>{instrucoesCategoria.orientacao}</p></div>
        </header>

        <section className={styles.guideBlock}>
          <div className={styles.guideBlockTitle}><strong>Exemplos desta categoria</strong><span>Use a categoria para itens como:</span></div>
          <div className={styles.exampleTags}>{instrucoesCategoria.exemplos.map((exemplo) => <span key={exemplo}>{exemplo}</span>)}</div>
        </section>

        <div className={styles.guideColumns}>
          <section className={styles.guideBlock}>
            <div className={styles.guideBlockTitle}><strong>Preencha sempre</strong><span>Informações básicas do inventário.</span></div>
            <ul className={styles.guideList}>
              <li>Nome claro do material ou equipamento</li>
              <li>Quantidade existente neste registro</li>
              <li>Localização atual</li>
              <li>Data de entrada no inventário</li>
            </ul>
          </section>
          <section className={styles.guideBlock}>
            <div className={styles.guideBlockTitle}><strong>Preencha se souber</strong><span>Não invente dados de itens antigos.</span></div>
            {categoriaDoGuia.campos?.length
              ? <ul className={styles.guideList}>{categoriaDoGuia.campos.map(({ chave, rotulo }) => <li key={chave}>{rotulo}</li>)}</ul>
              : <p className={styles.guideEmpty}>Esta categoria não possui campos complementares configurados.</p>}
          </section>
        </div>

        <div className={styles.guideNotice}>
          <Info size={16} aria-hidden="true" />
          <div><strong>Compra e procedência</strong><span>Fornecedor, nota fiscal e data da compra são opcionais. Preencha somente quando houver documento ou informação confiável.</span></div>
        </div>

        <button type="button" className={styles.guideClose} onClick={() => definirGuiaCategoriasAberto(false)}>Entendi</button>
      </div>
    </EstruturaModal>}

    {modalNovaCategoriaAberto && <EstruturaModal titulo="Criar categoria" subtitulo="Defina quais informações poderão ser registradas" aoFechar={fecharModalNovaCategoria} largo>
      <div className={styles.formNovaCategoria}>
        <CampoFormulario rotulo="Nome da categoria">
          <input className={styles.input} autoFocus maxLength={40} placeholder="Ex.: Materiais de sinalização" value={novaCategoria} onChange={(e) => definirNovaCategoria(e.target.value)} required />
          {categoriaJaCadastrada && <small className={styles.erro}>Essa categoria já existe. Selecione-a na lista principal.</small>}
        </CampoFormulario>
        <div className={styles.fieldsPicker}>
          <div><strong>Campos disponíveis</strong><span>Todos continuarão opcionais no cadastro do item.</span></div>
          <div className={styles.checkboxGrid}>
            {CAMPOS_CATEGORIA_PERSONALIZADA.map((campo) => <label key={campo.chave} className={styles.checkboxCard}>
              <input type="checkbox" checked={camposNovaCategoria.includes(campo.chave)} onChange={() => alternarCampoNovaCategoria(campo.chave)} />
              <span>{campo.rotulo}</span>
            </label>)}
          </div>
        </div>
        {erroCategoria && <p className={styles.categoryError} role="alert">{erroCategoria}</p>}
        <div className={styles.categoryActions}>
          <button type="button" className={styles.cancel} onClick={fecharModalNovaCategoria} disabled={salvandoCategoria}>Cancelar</button>
          <button type="button" className={styles.confirmarCategoria} disabled={!novaCategoria.trim() || categoriaJaCadastrada || salvandoCategoria} onClick={adicionarNovaCategoria}>
            {salvandoCategoria ? 'Criando...' : 'Criar e selecionar'}
          </button>
        </div>
      </div>
    </EstruturaModal>}
  </>;
}
