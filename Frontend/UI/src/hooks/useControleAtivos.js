import { useEffect, useMemo, useState } from 'react';
import {
  equipamentosIniciais,
  funcionariosIniciais,
  obrasIniciais,
  solicitacoesIniciais,
} from '../data/mockData';
import { obterDataAtual } from '../utils/datas';
import { obterHistoricoEquipamento } from '../utils/historicoEquipamento';
import { apiHabilitada } from '../services/api/clienteHttp';
import { apiAtividades, apiEquipamentos, apiFuncionarios, apiObras, carregarDadosIniciaisApi } from '../services/api/servicoAtivosApi';

export function useControleAtivos() {
  const [obras, definirObras] = useState(obrasIniciais);
  const [equipamentos, definirEquipamentos] = useState(equipamentosIniciais);
  const [funcionarios, definirFuncionarios] = useState(funcionariosIniciais);
  const [solicitacoes, definirSolicitacoes] = useState(solicitacoesIniciais);
  const [carregandoDados, definirCarregandoDados] = useState(apiHabilitada);
  const [erroApi, definirErroApi] = useState(null);

  useEffect(() => {
    if (!apiHabilitada) return undefined;
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
    if (apiHabilitada) {
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
    definirObras((obrasAtuais) => [
      { id: `o${obrasAtuais.length + 1}_${Date.now()}`, ...dadosNovaObra },
      ...obrasAtuais,
    ]);
    return true;
  }

  async function cadastrarEquipamento(dadosNovoEquipamento) {
    const serieNormalizada = dadosNovoEquipamento.serie.trim().toLocaleLowerCase('pt-BR');
    const serieJaExiste = equipamentos.some(({ serie }) =>
      serie.trim().toLocaleLowerCase('pt-BR') === serieNormalizada);
    if (serieJaExiste) return false;

    if (apiHabilitada) {
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

    const dataCadastro = dadosNovoEquipamento.data || obterDataAtual();
    definirEquipamentos((equipamentosAtuais) => [
      {
        id: `e${equipamentosAtuais.length + 1}_${Date.now()}`,
        ...dadosNovoEquipamento,
        data: dataCadastro,
        dataEntrada: dataCadastro,
      },
      ...equipamentosAtuais,
    ]);
    return true;
  }

  async function cadastrarFuncionario(dadosNovoFuncionario) {
    const emailNormalizado = dadosNovoFuncionario.email.trim().toLocaleLowerCase('pt-BR');
    const nomeNormalizado = dadosNovoFuncionario.nome.trim().toLocaleLowerCase('pt-BR');
    const funcionarioJaExiste = funcionarios.some(({ email, nome }) =>
      email.trim().toLocaleLowerCase('pt-BR') === emailNormalizado ||
      nome.trim().toLocaleLowerCase('pt-BR') === nomeNormalizado);
    if (funcionarioJaExiste) return false;

    if (apiHabilitada) {
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

    definirFuncionarios((funcionariosAtuais) => [{
      id: `f${funcionariosAtuais.length + 1}_${Date.now()}`,
      ...dadosNovoFuncionario,
      status: 'Ativo',
    }, ...funcionariosAtuais]);
    return true;
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
      materiais: [{ nome: equipamento.modelo, quantidade: dadosMovimentacao.quantidade || 1, identificacao: equipamento.serie }],
    };

    if (apiHabilitada) {
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
    definirSolicitacoes((solicitacoesAtuais) => [{
      id: `s${Date.now()}`,
      tipo: 'Movimentação',
      status: 'Pendente',
      ...novaSolicitacao,
    }, ...solicitacoesAtuais]);
    return true;
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
    if (apiHabilitada) {
      try {
        if (status === 'Aprovada') await apiAtividades.aprovar(identificador);
        if (status === 'Rejeitada') await apiAtividades.rejeitar(identificador);
        definirErroApi(null);
      } catch (erro) {
        definirErroApi(erro.message);
        return false;
      }
    }
    const solicitacaoAtual = solicitacoes.find((solicitacao) => solicitacao.id === identificador);
    if (status === 'Aprovada' && solicitacaoAtual?.status !== 'Aprovada') {
      sincronizarMovimentacaoAprovada({ ...solicitacaoAtual, status });
    }
    definirSolicitacoes((solicitacoesAtuais) => solicitacoesAtuais.map((solicitacao) =>
      solicitacao.id === identificador
        ? { ...solicitacao, status, dataDecisao: obterDataAtual() }
        : solicitacao));
    return true;
  }

  async function editarSolicitacao(identificador, dadosAtualizados) {
    if (apiHabilitada) {
      try {
        await apiAtividades.atualizar(identificador, dadosAtualizados);
        definirErroApi(null);
      } catch (erro) {
        definirErroApi(erro.message);
        return false;
      }
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
    apiHabilitada,
    carregandoDados,
    erroApi,
    resumoEquipamentos,
    tecnicosCadastrados,
    buscarObraPorId,
    cadastrarObra,
    cadastrarEquipamento,
    cadastrarFuncionario,
    movimentarEquipamento,
    consultarHistorico,
    definirStatusSolicitacao,
    editarSolicitacao,
  };
}
