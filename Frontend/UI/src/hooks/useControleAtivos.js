import { useEffect, useMemo, useState } from 'react';
import { obterDataAtual } from '../utils/datas';
import { obterHistoricoEquipamento } from '../utils/historicoEquipamento';
import { apiAtividades, apiEquipamentos, apiFuncionarios, apiObras, carregarDadosIniciaisApi } from '../services/api/servicoAtivosApi';

export function useControleAtivos() {
  const [obras, definirObras] = useState([]);
  const [equipamentos, definirEquipamentos] = useState([]);
  const [funcionarios, definirFuncionarios] = useState([]);
  const [solicitacoes, definirSolicitacoes] = useState([]);
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
        definirErroApi(null);
      })
      .catch((erro) => { if (deveAtualizar) definirErroApi(erro.message); })
      .finally(() => { if (deveAtualizar) definirCarregandoDados(false); });
    return () => { deveAtualizar = false; };
  }, []);

  const buscarObraPorId = (identificador) =>
    obras.find((obra) => obra.id === identificador);

  const resumoEquipamentos = useMemo(() => ({
    total: equipamentos.length,
    emCampo: equipamentos.filter(({ status }) => status === 'Em campo').length,
    emEstoque: equipamentos.filter(({ status }) => status === 'Em estoque').length,
    emManutencao: equipamentos.filter(({ status }) => status === 'Em manutenção').length,
    emTransito: equipamentos.filter(({ status }) => status === 'Em trânsito').length,
  }), [equipamentos]);

  const tecnicosCadastrados = useMemo(() => funcionarios
    .filter(({ status, cargo }) => status === 'Ativo' && !cargo.toLocaleLowerCase('pt-BR').includes('gerente'))
    .map(({ nome }) => nome)
    .sort((primeiroNome, segundoNome) => primeiroNome.localeCompare(segundoNome, 'pt-BR')),
  [funcionarios]);

  const gerenteAtual = useMemo(() => funcionarios.find(({ cargo, status }) =>
    status === 'Ativo' && cargo.toLocaleLowerCase('pt-BR').includes('gerente'))?.nome || null, [funcionarios]);

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
      materiais: [{ nome: equipamento.modelo, quantidade: dadosMovimentacao.quantidade || 1, identificacao: null, catalogoChave: equipamento.catalogoChave || null }],
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
      await apiAtividades.atualizar(identificador, dadosAtualizados);
      definirErroApi(null);
    } catch (erro) {
      definirErroApi(erro.message);
      return false;
    }
    const solicitacaoAnterior = solicitacoes.find((solicitacao) => solicitacao.id === identificador);
    const solicitacaoAtualizada = solicitacaoAnterior ? { ...solicitacaoAnterior, ...dadosAtualizados } : null;
    if (solicitacaoAtualizada?.status === 'Aprovada') {
      sincronizarMovimentacaoAprovada(solicitacaoAtualizada, solicitacaoAnterior);
    }
    definirSolicitacoes((solicitacoesAtuais) => solicitacoesAtuais.map((solicitacao) =>
      solicitacao.id === identificador
        ? { ...solicitacao, ...dadosAtualizados }
        : solicitacao));
    return true;
  }

  return {
    obras,
    equipamentos,
    funcionarios,
    solicitacoes,
    carregandoDados,
    erroApi,
    resumoEquipamentos,
    tecnicosCadastrados,
    buscarObraPorId,
    cadastrarObra,
    atualizarStatusObra,
    cadastrarEquipamento,
    cadastrarFuncionario,
    atualizarFuncionario,
    movimentarEquipamento,
    consultarHistorico,
    definirStatusSolicitacao,
    avancarMovimentacao,
    editarSolicitacao,
  };
}
