import { useMemo, useState } from 'react';

export function useFiltrosPainel({ obras, equipamentos, funcionarios }) {
  const [termoBusca, definirTermoBusca] = useState('');
  const [tipoSelecionado, definirTipoSelecionado] = useState('Todos');
  const [statusSelecionado, definirStatusSelecionado] = useState('Todos');

  const equipamentosFiltrados = useMemo(() => {
    const termoNormalizado = termoBusca.trim().toLocaleLowerCase('pt-BR');
    return equipamentos.filter((equipamento) => {
      const correspondeAoTipo =
        tipoSelecionado === 'Todos' || equipamento.tipo === tipoSelecionado;
      const correspondeAoStatus =
        statusSelecionado === 'Todos' || equipamento.status === statusSelecionado;
      const correspondeABusca = !termoNormalizado || [
        equipamento.modelo,
        equipamento.serie,
        equipamento.tipo,
        equipamento.medida,
        equipamento.observacoes,
        equipamento.tecnico,
      ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termoNormalizado));

      return correspondeAoTipo && correspondeAoStatus && correspondeABusca;
    });
  }, [equipamentos, statusSelecionado, termoBusca, tipoSelecionado]);

  const obrasFiltradas = useMemo(() => {
    const termoNormalizado = termoBusca.trim().toLocaleLowerCase('pt-BR');
    if (!termoNormalizado) return obras;
    return obras.filter((obra) => [
      obra.nome,
      obra.cliente,
      obra.cidade,
      obra.responsaveis?.join(' '),
      obra.status,
    ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termoNormalizado)));
  }, [obras, termoBusca]);

  const funcionariosFiltrados = useMemo(() => {
    const termoNormalizado = termoBusca.trim().toLocaleLowerCase('pt-BR');
    if (!termoNormalizado) return funcionarios;
    return funcionarios.filter((funcionario) => [
      funcionario.nome,
      funcionario.cargo,
      funcionario.email,
      funcionario.telefone,
      funcionario.status,
    ].some((valor) => valor?.toLocaleLowerCase('pt-BR').includes(termoNormalizado)));
  }, [funcionarios, termoBusca]);

  const equipamentosDoDeposito = useMemo(() => {
    const termoNormalizado = termoBusca.trim().toLocaleLowerCase('pt-BR');
    return equipamentos.filter((equipamento) =>
      equipamento.obraId === null && (
        !termoNormalizado ||
        equipamento.modelo.toLocaleLowerCase('pt-BR').includes(termoNormalizado) ||
        equipamento.serie.toLocaleLowerCase('pt-BR').includes(termoNormalizado)
      ));
  }, [equipamentos, termoBusca]);

  return {
    termoBusca,
    definirTermoBusca,
    tipoSelecionado,
    definirTipoSelecionado,
    statusSelecionado,
    definirStatusSelecionado,
    equipamentosFiltrados,
    obrasFiltradas,
    funcionariosFiltrados,
    equipamentosDoDeposito,
  };
}
