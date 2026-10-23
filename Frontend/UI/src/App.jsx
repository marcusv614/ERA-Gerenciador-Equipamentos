import { PainelControleAtivos } from './components/painel/PainelControleAtivos';
import { TelaLogin } from './components/login/TelaLogin';
import { TelaAlterarSenha } from './components/login/TelaAlterarSenha';
import { ProvedorAutenticacao, useAutenticacao } from './contexto/ContextoAutenticacao';
import { PainelTecnico } from './components/tecnico/PainelTecnico';
import { PainelEstoque } from './components/estoque/PainelEstoque';
import { PainelAdmin } from './components/admin/PainelAdmin';
import { Notificacoes } from './components/notificacoes/Notificacoes';
import { ExportarRelatorioModal } from './components/painel/ExportarRelatorioModal';

function ConteudoAutenticado() {
  const { usuario, verificando } = useAutenticacao();
  if (verificando) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Verificando sessão...</div>;
  if (!usuario) return <TelaLogin />;
  if (usuario.deveAlterarSenha) return <TelaAlterarSenha />;
  if (usuario.perfil === 'ADMIN') return <PainelAdmin />;
  if (['TECNICO', 'TST'].includes(usuario.perfil)) return <PainelTecnico />;
  if (usuario.perfil === 'ESTOQUE') return <PainelEstoque />;
  return <PainelControleAtivos />;
}
function ExportacaoAutenticada() {
  const { usuario } = useAutenticacao();
  return usuario && !usuario.deveAlterarSenha && !['TECNICO', 'TST'].includes(usuario.perfil) ? <ExportarRelatorioModal key={usuario.id || usuario.login}/> : null;
}
function App() { return <ProvedorAutenticacao><ConteudoAutenticado /><Notificacoes /><ExportacaoAutenticada /></ProvedorAutenticacao>; }

export default App;
