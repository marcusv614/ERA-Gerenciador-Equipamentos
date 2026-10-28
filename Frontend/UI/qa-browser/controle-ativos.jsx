import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useControleAtivos } from '../src/hooks/useControleAtivos';

const acoes=['cadastrarObra','atualizarStatusObra','cadastrarEquipamento','cadastrarCategoriaEquipamento','atualizarEquipamento','excluirEquipamento','arquivarEquipamento','arquivarObra','arquivarFuncionario','cadastrarFuncionario','atualizarFuncionario','movimentarEquipamento','consultarHistorico','buscarObraPorId','definirStatusSolicitacao','avancarMovimentacao','editarSolicitacao','salvarPlanoFinanceiro','cadastrarSolicitacao','receberEquipamentoAtualizado'];

export default function ControleAtivosQa() {
  const perfil=new URLSearchParams(location.search).get('perfil')||'ADMIN';
  const controle=useControleAtivos(perfil);
  const [acao,definirAcao]=useState(acoes[0]),[argumentos,definirArgumentos]=useState('[]');
  const [resultado,definirResultado]=useState(null),[concluidas,definirConcluidas]=useState(0);
  const executar=async()=>{
    try {
      const valor=await controle[acao](...JSON.parse(argumentos));
      definirResultado({retorno:valor??null,indefinido:valor===undefined});
    } catch(erro){definirResultado({excecao:erro.message});}
    finally{definirConcluidas(n=>n+1);}
  };
  return <main>
    <label htmlFor="acao">Ação</label><select id="acao" value={acao} onChange={e=>definirAcao(e.target.value)}>{acoes.map(a=><option key={a}>{a}</option>)}</select>
    <label htmlFor="argumentos">Argumentos</label><textarea id="argumentos" value={argumentos} onChange={e=>definirArgumentos(e.target.value)} />
    <button onClick={executar}>Executar ação</button>
    <output aria-label="Concluídas">{concluidas}</output><output aria-label="Retorno">{JSON.stringify(resultado)}</output>
    <output aria-label="Estado">{JSON.stringify({obras:controle.obras,equipamentos:controle.equipamentos,funcionarios:controle.funcionarios,solicitacoes:controle.solicitacoes,categorias:controle.categoriasEquipamento,resumo:controle.resumoEquipamentos,tecnicos:controle.tecnicosCadastrados,carregando:controle.carregandoDados,erro:controle.erroApi})}</output>
  </main>;
}
createRoot(document.getElementById('root')).render(<ControleAtivosQa />);
