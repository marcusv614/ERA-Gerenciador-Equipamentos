import { PainelControleAtivos } from './components/painel/PainelControleAtivos';
import { TelaLogin } from './components/login/TelaLogin';
import { TelaAlterarSenha } from './components/login/TelaAlterarSenha';
import { ProvedorAutenticacao, useAutenticacao } from './contexto/ContextoAutenticacao';
import { PainelTecnico } from './components/tecnico/PainelTecnico';
import { PainelEstoque } from './components/estoque/PainelEstoque';
import { PainelAdmin } from './components/admin/PainelAdmin';
import { Notificacoes } from './components/notificacoes/Notificacoes';
import { ExportarRelatorioModal } from './components/painel/ExportarRelatorioModal';
import { useEffect, useState } from 'react';
import { TelaEmailRecuperacao } from './components/login/TelaEmailRecuperacao';
import { TelaRecuperarSenha } from './components/login/TelaRecuperarSenha';
import { tokenRecuperacaoDoFragmento } from './utils/recuperacaoConta';

function ConteudoAutenticado() {
  const { usuario, verificando } = useAutenticacao();
  const [tokenRecuperacao, definirTokenRecuperacao] = useState(()=>tokenRecuperacaoDoFragmento(window.location.hash));
  useEffect(()=>{
    const limparFragmento = () => window.history.replaceState(null, '', window.location.pathname + window.location.search);
    const ler = () => { const token = tokenRecuperacaoDoFragmento(window.location.hash); if (token) { definirTokenRecuperacao(token); limparFragmento(); } };
    if (tokenRecuperacaoDoFragmento(window.location.hash)) limparFragmento();
    window.addEventListener('hashchange', ler);
    return ()=>window.removeEventListener('hashchange', ler);
  }, []);
  if (verificando) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Verificando sessão...</div>;
  if (tokenRecuperacao) return <TelaRecuperarSenha key={tokenRecuperacao} token={tokenRecuperacao} aoVoltar={()=>definirTokenRecuperacao('')}/>;
  if (!usuario) return <TelaLogin />;
  if (usuario.deveAlterarSenha) return <TelaAlterarSenha />;
  if (usuario.perfil === 'ADMIN' && (usuario.recuperacao?.obrigatorio || usuario.recuperacao?.erro)) return <TelaEmailRecuperacao />;
  if (usuario.perfil === 'ADMIN') return <PainelAdmin />;
  if (['TECNICO', 'TST'].includes(usuario.perfil)) return <PainelTecnico />;
  if (usuario.perfil === 'ESTOQUE') return <PainelEstoque />;
  return <PainelControleAtivos />;
}
function ExportacaoAutenticada() {
  const { usuario } = useAutenticacao();
  return usuario && !usuario.deveAlterarSenha && !usuario.recuperacao?.obrigatorio && !usuario.recuperacao?.erro && !['TECNICO', 'TST'].includes(usuario.perfil) ? <ExportarRelatorioModal key={usuario.id || usuario.login}/> : null;
}
function App() { return <ProvedorAutenticacao><ConteudoAutenticado /><Notificacoes /><ExportacaoAutenticada /></ProvedorAutenticacao>; }

export default App;
