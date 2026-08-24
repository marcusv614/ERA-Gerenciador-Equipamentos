import { PainelControleAtivos } from './components/painel/PainelControleAtivos';
import { TelaLogin } from './components/login/TelaLogin';
import { TelaAlterarSenha } from './components/login/TelaAlterarSenha';
import { ProvedorAutenticacao, useAutenticacao } from './contexto/ContextoAutenticacao';

function ConteudoAutenticado() {
  const { usuario, verificando } = useAutenticacao();
  if (verificando) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Verificando sessão...</div>;
  if (!usuario) return <TelaLogin />;
  return usuario.deveAlterarSenha ? <TelaAlterarSenha /> : <PainelControleAtivos />;
}
function App() { return <ProvedorAutenticacao><ConteudoAutenticado /></ProvedorAutenticacao>; }

export default App;
