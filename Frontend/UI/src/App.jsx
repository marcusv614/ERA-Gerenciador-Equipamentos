import { PainelControleAtivos } from './components/painel/PainelControleAtivos';
import { TelaLogin } from './components/login/TelaLogin';
import { TelaAlterarSenha } from './components/login/TelaAlterarSenha';
import { ProvedorAutenticacao, useAutenticacao } from './contexto/ContextoAutenticacao';
import { PainelTecnico } from './components/tecnico/PainelTecnico';

function ConteudoAutenticado() {
  const { usuario, verificando } = useAutenticacao();
  if (verificando) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Verificando sessão...</div>;
  if (!usuario) return <TelaLogin />;
  if (usuario.deveAlterarSenha) return <TelaAlterarSenha />;
  return usuario.perfil === 'TECNICO' ? <PainelTecnico /> : <PainelControleAtivos />;
}
function App() { return <ProvedorAutenticacao><ConteudoAutenticado /></ProvedorAutenticacao>; }

export default App;
