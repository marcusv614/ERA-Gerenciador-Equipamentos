import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useFiltrosPainel } from '../src/hooks/useFiltrosPainel';
import { useControleAtivos } from '../src/hooks/useControleAtivos';
import { useOperacaoEstoque } from '../src/components/estoque/useOperacaoEstoque';
import { SinoNotificacoes } from '../src/components/notificacoes/SinoNotificacoes';
import { Notificacoes } from '../src/components/notificacoes/Notificacoes';
import { notificarSucesso } from '../src/services/notificacoes';
import { clienteHttp } from '../src/services/api/clienteHttp';

function Filtros() {
  const filtros=useFiltrosPainel({
    equipamentos:[
      {id:1,tipo:'Ferramentas',modelo:'Alicate',serie:'QA-1',status:'Em estoque',obraId:null,notaFiscal:'NF-100',quantidadeManutencao:1},
      {id:2,tipo:'EPI',modelo:'Capacete',serie:'QA-2',status:'Em campo',obraId:1,quantidadeCalibracao:1},
      {id:3,tipo:'Ferramentas',modelo:'Escada',serie:'QA-3',status:'Em estoque',obraId:null,arquivado:true},
    ],
    obras:[{id:1,nome:'Aurora',cidade:'Manaus',responsaveis:['Ana'],status:'Em andamento'},{id:2,nome:'Arquivo',arquivado:true}],
    funcionarios:[{id:1,nome:'Ana',cargo:'Técnica',email:'ana@example.invalid'},{id:2,nome:'Beto',cargo:'Estoquista',arquivado:true}],
  });
  return <section>
    <label>Busca<input value={filtros.termoBusca} onChange={e=>filtros.definirTermoBusca(e.target.value)} /></label>
    <label>Tipo<select value={filtros.tipoSelecionado} onChange={e=>filtros.definirTipoSelecionado(e.target.value)}>{['Todos','Ferramentas','EPI'].map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Status<select value={filtros.statusSelecionado} onChange={e=>filtros.definirStatusSelecionado(e.target.value)}>{['Todos','Em estoque','Em manutenção','Em calibração'].map(s=><option key={s}>{s}</option>)}</select></label>
    {['equipamentosFiltrados','obrasFiltradas','funcionariosFiltrados','equipamentosDoDeposito'].map(k=><output key={k} aria-label={k}>{JSON.stringify(filtros[k].map(x=>x.id))}</output>)}
  </section>;
}
function Operacao() {
  const [mensagem,definirMensagem]=useState(null),[resultado,definirResultado]=useState(null);
  const {processando,executar}=useOperacaoEstoque(definirMensagem);
  return <section>
    <button onClick={async()=>definirResultado(await executar(()=>clienteHttp.post('/qa/operacao')))}>Executar operação</button>
    <button onClick={async()=>definirResultado(await executar(()=>Promise.reject({})))}>Falhar sem mensagem</button>
    <output aria-label="Processando">{String(processando)}</output>
    <output aria-label="Resultado">{JSON.stringify(resultado?{sucesso:resultado.sucesso,erro:resultado.erro}:null)}</output>
    {mensagem&&<p role="alert">{mensagem.texto}</p>}
  </section>;
}
function Ativos({perfil}) {
  const controle=useControleAtivos(perfil);
  return <section>
    <output aria-label="Estado dos ativos">{JSON.stringify({carregando:controle.carregandoDados,erro:controle.erroApi,obras:controle.obras,equipamentos:controle.equipamentos,funcionarios:controle.funcionarios,resumo:controle.resumoEquipamentos,tecnicos:controle.tecnicosCadastrados})}</output>
    <button onClick={()=>controle.cadastrarEquipamento({tipo:'Ferramentas',modelo:'Ferramenta QA',serie:'QA-NOVA',status:'Em estoque',quantidade:1})}>Cadastrar equipamento</button>
  </section>;
}
function Controle() {
  const [perfil,definirPerfil]=useState('ADMIN'),[montado,montar]=useState(true);
  return <section>
    <label>Perfil<select value={perfil} onChange={e=>definirPerfil(e.target.value)}>{['ADMIN','FINANCEIRO','RH'].map(p=><option key={p}>{p}</option>)}</select></label>
    <button onClick={()=>montar(false)}>Desmontar ativos</button>{montado&&<Ativos perfil={perfil} />}
  </section>;
}
function Avisos() {
  const [pedido,definirPedido]=useState(null);
  return <section><SinoNotificacoes aoVerPedidos={new URLSearchParams(location.search).has('navegar')?definirPedido:undefined} /><output aria-label="Pedido aberto">{pedido}</output><button>Fora do painel</button></section>;
}
function Toasts() {
  const [numero,definirNumero]=useState(0);
  return <section style={{paddingTop:500}}><button onClick={()=>{notificarSucesso(`Aviso ${numero+1}`);definirNumero(numero+1);}}>Notificar sucesso</button><Notificacoes /></section>;
}
export default function Interacoes() {
  const cenario=new URLSearchParams(location.search).get('cenario');
  return <main>{cenario==='filtros'?<Filtros />:cenario==='operacao'?<Operacao />:cenario==='controle'?<Controle />:cenario==='sino'?<Avisos />:<Toasts />}</main>;
}
createRoot(document.getElementById('root')).render(<Interacoes />);
