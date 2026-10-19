import { useEffect, useMemo, useState } from 'react';
import { localizarEquipamentos } from '../utils/localizacaoEquipamentos';
import { obterDataAtual } from '../utils/datas';
import { obterHistoricoEquipamento } from '../utils/historicoEquipamento';
import { apiAtividades, apiCategoriasEquipamento, apiEquipamentos, apiFuncionarios, apiObras, carregarDadosIniciaisApi } from '../services/api/servicoAtivosApi';

export function useControleAtivos() {
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [funcionarios, definirFuncionarios] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
  const [categoriasEquipamento, definirCategoriasEquipamento] = useState([]);
  const [carregandoDados, definirCarregandoDados] = useState(true);
  const [erroApi, definirErroApi] = useState(null);

  useEffect(() => {
    let deveAtualizar = true;
    carregarDadosIniciaisApi()
      .then((dados) => {
        if (!deveAtualizar) return;
        if (Array.isArray(dados.obras)) definirObras(dados.obras);
        if (Array.isArray(dados.equipamentos)) definirEquipamentos(dados.equipamentos);
        if (Array.isArray(dados.funcionarios)) definirFuncionarios(dados.funcionarios);
        if (Array.isArray(dados.solicitacoes)) definirSolicitacoes(dados.solicitacoes);
        if (Array.isArray(dados.categoriasEquipamento)) definirCategoriasEquipamento(dados.categoriasEquipamento);
        definirErroApi(null);
      })
      .catch((erro) => { if (deveAtualizar) definirErroApi(erro.message); })
      .finally(() => { if (deveAtualizar) definirCarregandoDados(false); });
    return () => { deveAtualizar = false; };
  }, []);

  const buscarObraPorId = (identificador) =>
    obras.find((obra) => obra.id === identificador);

  useEffect(() => {
    let ativo = true;
    let atualizando = false;
    const atualizar = async () => {
      if (document.visibilityState === 'hidden' || atualizando) return;
      atualizando = true;
      try {
        const [itens, pedidos] = await Promise.all([apiEquipamentos.listar(), apiAtividades.listar()]);
        if (ativo) { definirEquipamentos(itens); definirSolicitacoes(pedidos); }
      } catch {
        // Mantém os dados atuais e tenta novamente ao retomar o painel.
      } finally { atualizando = false; }
    };
    const intervalo = window.setInterval(atualizar, 10000);
    window.addEventListener('focus', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => { ativo = false; window.clearInterval(intervalo); window.removeEventListener('focus', atualizar); document.removeEventListener('visibilitychange', atualizar); };
  }, []);

  const equipamentosLocalizados = useMemo(() => localizarEquipamentos(equipamentos, solicitacoes), [equipamentos, solicitacoes]);

  const resumoEquipamentos = useMemo(() => ({
    total: equipamentos.filter(({ arquivado }) => !arquivado).length,
    emCampo: equipamentosLocalizados.filter(({ status, arquivado }) => !arquivado && status === 'Em campo').length,
    emEstoque: equipamentosLocalizados.filter(({ status, arquivado }) => !arquivado && status === 'Em estoque').length,
    emManutencao: equipamentosLocalizados.filter(({ status, arquivado }) => !arquivado && status === 'Em manutenção').length,
    emTransito: equipamentosLocalizados.filter(({ status, quantidadeEmTransito, arquivado }) => !arquivado && (quantidadeEmTransito > 0 || status === 'Em trânsito')).length,
  }), [equipamentos, equipamentosLocalizados]);

  const tecnicosCadastrados = useMemo(() => funcionarios
    .filter(({ status, cargo, arquivado }) => !arquivado && status === 'Ativo' && !cargo.toLocaleLowerCase('pt-BR').includes('gerente'))
    .map(({ nome }) => nome)
    .sort((primeiroNome, segundoNome) => primeiroNome.localeCompare(segundoNome, 'pt-BR')),
  [funcionarios]);

  const gerenteAtual = useMemo(() => funcionarios.find(({ cargo, status, arquivado }) =>
    !arquivado && status === 'Ativo' && cargo.toLocaleLowerCase('pt-BR').includes('gerente'))?.nome || null, [funcionarios]);

  async function cadastrarObra(dadosNovaObra) {
    try {
      const obraCadastrada = await apiObras.cadastrar(dadosNovaObra);
      definirObras((obrasAtuais) => [obraCadastrada, ...obrasAtuais]);
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function atualizarStatusObra(obra, status) {
    try {
      const resposta = await apiObras.atualizar(obra.id, {
        nome: obra.nome,
        cliente: obra.cliente,
        cidade: obra.cidade,
        inicio: obra.inicio,
        status,
        responsaveis: obra.responsaveis || [],
      });
      definirObras((atuais) => atuais.map((item) => item.id === obra.id ? resposta : item));
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function cadastrarEquipamento(dadosNovoEquipamento) {
    const serieNormalizada = String(dadosNovoEquipamento.serie || '').trim().toLocaleLowerCase('pt-BR');
    const serieJaExiste = equipamentos.some(({ serie }) =>
      Boolean(serieNormalizada) && String(serie || '').trim().toLocaleLowerCase('pt-BR') === serieNormalizada);
    if (serieJaExiste) return false;

    try {
      const equipamentoCadastrado = await apiEquipamentos.cadastrar(dadosNovoEquipamento);
      definirEquipamentos((equipamentosAtuais) => [equipamentoCadastrado, ...equipamentosAtuais]);
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function cadastrarCategoriaEquipamento(dadosNovaCategoria) {
    try {
      const categoriaCadastrada = await apiCategoriasEquipamento.cadastrar(dadosNovaCategoria);
      definirCategoriasEquipamento((categoriasAtuais) => [...categoriasAtuais, categoriaCadastrada]);
      definirErroApi(null);
      return categoriaCadastrada;
    } catch (erro) {
      definirErroApi(erro.message);
      return null;
    }
  }

  async function atualizarEquipamento(identificador, dadosAtualizados) {
    const serieNormalizada = String(dadosAtualizados.serie || '').trim().toLocaleLowerCase('pt-BR');
    const serieJaExiste = equipamentos.some(({ id, serie }) => id !== identificador && Boolean(serieNormalizada) &&
      String(serie || '').trim().toLocaleLowerCase('pt-BR') === serieNormalizada);
    if (serieJaExiste) {
      definirErroApi('Já existe um equipamento com este número de série.');
      return false;
    }
    try {
      const equipamentoAtualizado = await apiEquipamentos.atualizar(identificador, dadosAtualizados);
      definirEquipamentos((atuais) => atuais.map((equipamento) =>
        equipamento.id === identificador ? equipamentoAtualizado : equipamento));
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function excluirEquipamento(identificador) {
    try {
      await apiEquipamentos.excluir(identificador);
      definirEquipamentos((atuais) => atuais.filter(({ id }) => id !== identificador));
      definirErroApi(null);
      return { sucesso: true };
    } catch (erro) {
      definirErroApi(erro.message);
      return { sucesso: false, mensagem: erro.message };
    }
  }
  async function arquivarEquipamento(id, arquivado) { try { const resposta=await apiEquipamentos.definirArquivamento(id,arquivado);definirEquipamentos((lista)=>lista.map((x)=>x.id===id?resposta:x));definirErroApi(null);return {sucesso:true}; } catch(erro){definirErroApi(erro.message);return {sucesso:false,mensagem:erro.message};} }
  async function arquivarObra(id, arquivado) { try { const resposta=await apiObras.definirArquivamento(id,arquivado);definirObras((lista)=>lista.map((x)=>x.id===id?resposta:x));definirErroApi(null);return true; } catch(erro){definirErroApi(erro.message);return false;} }
  async function arquivarFuncionario(id, arquivado) { try { const resposta=await apiFuncionarios.definirArquivamento(id,arquivado);definirFuncionarios((lista)=>lista.map((x)=>x.id===id?resposta:x));definirErroApi(null);return {sucesso:true}; } catch(erro){definirErroApi(erro.message);return {sucesso:false,mensagem:erro.message};} }

  async function cadastrarFuncionario(dadosNovoFuncionario) {
    const emailNormalizado = dadosNovoFuncionario.email.trim().toLocaleLowerCase('pt-BR');
    const nomeNormalizado = dadosNovoFuncionario.nome.trim().toLocaleLowerCase('pt-BR');
    const funcionarioJaExiste = funcionarios.some(({ email, nome }) =>
      email.trim().toLocaleLowerCase('pt-BR') === emailNormalizado ||
      nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado);
    if (funcionarioJaExiste) return false;

    try {
      const funcionarioCadastrado = await apiFuncionarios.cadastrar(dadosNovoFuncionario);
      definirFuncionarios((funcionariosAtuais) => [funcionarioCadastrado, ...funcionariosAtuais]);
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function atualizarFuncionario(funcionarioAtual, dadosAtualizados, obrasIds) {
    const idsSelecionados = new Set(obrasIds.map(String));
    const obrasAtualizadas = obras.map((obra) => {
      const outrosResponsaveis = (obra.responsaveis || []).filter((nome) => nome !== funcionarioAtual.nome);
      return {
        ...obra,
        responsaveis: idsSelecionados.has(String(obra.id))
          ? [...outrosResponsaveis, dadosAtualizados.nome]
          : outrosResponsaveis,
      };
    });
    try {
      const funcionarioAtualizado = await apiFuncionarios.atualizar(funcionarioAtual.id, { ...dadosAtualizados, obraIds: obrasIds.map(Number) });
      definirFuncionarios((atuais) => atuais.map((funcionario) => funcionario.id === funcionarioAtual.id ? funcionarioAtualizado : funcionario));
      definirObras(obrasAtualizadas);
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function movimentarEquipamento(identificador, dadosMovimentacao) {
    const equipamento = equipamentos.find(({ id }) => id === identificador);
    if (!equipamento) return false;

    const novaSolicitacao = {
      solicitante: gerenteAtual || dadosMovimentacao.tecnico,
      tecnico: dadosMovimentacao.tecnico,
      obraOrigemId: equipamento.obraId ?? null,
      obraDestinoId: dadosMovimentacao.obraId ?? null,
      dataSolicitacao: dadosMovimentacao.dataMovimentacao || obterDataAtual(),
      observacao: `Movimentação solicitada pelo gerente. Status desejado: ${dadosMovimentacao.status}.`,
      materiais: [{ nome: equipamento.modelo, quantidade: dadosMovimentacao.quantidade || 1, identificacao: equipamento.serie, catalogoChave: equipamento.catalogoChave || null }],
    };

    try {
      const solicitacaoCadastrada = await apiAtividades.cadastrar(novaSolicitacao);
      definirSolicitacoes((solicitacoesAtuais) => [solicitacaoCadastrada, ...solicitacoesAtuais]);
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  function consultarHistorico(equipamento) {
    return obterHistoricoEquipamento(equipamento, buscarObraPorId);
  }

  function sincronizarMovimentacaoAprovada(solicitacaoAtualizada, solicitacaoAnterior = null) {
    if (solicitacaoAtualizada.tipo !== 'Movimentação') return;

    const normalizarSerie = (valor) => String(valor || '').trim().toLocaleLowerCase('pt-BR');
    const seriesAtuais = new Set(solicitacaoAtualizada.materiais.map(({ identificacao }) => normalizarSerie(identificacao)).filter(Boolean));
    const seriesAnteriores = new Set((solicitacaoAnterior?.materiais || []).map(({ identificacao }) => normalizarSerie(identificacao)).filter(Boolean));
    const dataMovimentacao = solicitacaoAtualizada.dataSolicitacao || obterDataAtual();
    const destinoObraId = solicitacaoAtualizada.obraDestinoId || null;
    const origemObraId = solicitacaoAtualizada.obraOrigemId || null;

    definirEquipamentos((equipamentosAtuais) => equipamentosAtuais.map((equipamento) => {
      const serie = normalizarSerie(equipamento.serie);
      const pertenceAgora = seriesAtuais.has(serie);
      const pertenciaAntes = seriesAnteriores.has(serie);
      if (!pertenceAgora && !pertenciaAntes) return equipamento;

      const historicoSemSolicitacao = obterHistoricoEquipamento(equipamento, buscarObraPorId)
        .filter(({ solicitacaoId }) => solicitacaoId !== solicitacaoAtualizada.id);

      if (!pertenceAgora) {
        const ultimaMovimentacaoAnterior = historicoSemSolicitacao.at(-1);
        return {
          ...equipamento,
          obraId: ultimaMovimentacaoAnterior?.destinoObraId ?? origemObraId,
          tecnico: ultimaMovimentacaoAnterior?.tecnico || null,
          status: ultimaMovimentacaoAnterior?.status || (origemObraId ? 'Em campo' : 'Em estoque'),
          historico: historicoSemSolicitacao,
        };
      }

      const movimentacaoDaSolicitacao = {
        id: `solicitacao-${solicitacaoAtualizada.id}-${equipamento.id}`,
        solicitacaoId: solicitacaoAtualizada.id,
        dataMovimentacao,
        dataSaida: dataMovimentacao,
        dataEntrada: dataMovimentacao,
        origemObraId,
        destinoObraId,
        origemNome: origemObraId ? buscarObraPorId(origemObraId)?.nome : 'Depósito central',
        destinoNome: destinoObraId ? buscarObraPorId(destinoObraId)?.nome : 'Depósito central',
        tecnico: solicitacaoAtualizada.tecnico,
        status: destinoObraId ? 'Em campo' : 'Em estoque',
      };

      return {
        ...equipamento,
        obraId: destinoObraId,
        tecnico: destinoObraId ? solicitacaoAtualizada.tecnico : null,
        status: movimentacaoDaSolicitacao.status,
        data: dataMovimentacao,
        saida: dataMovimentacao,
        dataSaida: dataMovimentacao,
        dataEntrada: dataMovimentacao,
        historico: [...historicoSemSolicitacao, movimentacaoDaSolicitacao],
      };
    }));
  }

  async function definirStatusSolicitacao(identificador, status) {
    try {
      const resposta = status === 'Aprovada'
        ? await apiAtividades.aprovar(identificador)
        : await apiAtividades.rejeitar(identificador);
      definirSolicitacoes((solicitacoesAtuais) => solicitacoesAtuais.map((solicitacao) =>
        solicitacao.id === identificador ? resposta : solicitacao));
      definirErroApi(null);
      return true;
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
  }

  async function avancarMovimentacao(identificador, acao) {
    const solicitacaoAtual = solicitacoes.find(({ id }) => id === identificador);
    if (!solicitacaoAtual) return false;
    try {
      const resposta = await (acao === 'transito' ? apiAtividades.iniciarTransito(identificador) : apiAtividades.concluir(identificador));
      if (acao === 'concluir') sincronizarMovimentacaoAprovada(resposta, solicitacaoAtual);
      definirSolicitacoes((atuais) => atuais.map((solicitacao) => solicitacao.id === identificador ? resposta : solicitacao));
      definirErroApi(null);
      return true;
    } catch (erro) { definirErroApi(erro.message); return false; }
  }

  async function editarSolicitacao(identificador, dadosAtualizados) {
    try {
      const resposta = await apiAtividades.atualizar(identificador, dadosAtualizados);
      definirSolicitacoes((atuais) => atuais.map((pedido) => pedido.id === identificador ? resposta : pedido));
      definirErroApi(null);
      return true;
    } catch (erro) { definirErroApi(erro.message); return false; }
  }

  return {
    obras,
    equipamentos: equipamentosLocalizados,
    funcionarios,
    solicitacoes,
    categoriasEquipamento,
    carregandoDados,
    erroApi,
    resumoEquipamentos,
    tecnicosCadastrados,
    buscarObraPorId,
    cadastrarObra,
    atualizarStatusObra,
    cadastrarEquipamento,
    cadastrarCategoriaEquipamento,
    atualizarEquipamento,
    cadastrarFuncionario,
    atualizarFuncionario,
    movimentarEquipamento,
    excluirEquipamento,
    arquivarEquipamento,
    arquivarObra,
    arquivarFuncionario,
    consultarHistorico,
    definirStatusSolicitacao,
    avancarMovimentacao,
    editarSolicitacao,
  };
}
