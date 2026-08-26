import { useEffect, useMemo, useState } from 'react';
import { Boxes, KeyRound, LayoutDashboard, LogOut, ShieldCheck, UserPlus, Users, Warehouse, Wrench } from 'lucide-react';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiUsuarios } from '../../services/api/servicoAutenticacaoApi';
import { apiFuncionarios } from '../../services/api/servicoAtivosApi';
import { ModalNovoUsuario } from '../novo-usuario-modal/NovoUsuarioModal';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { PainelControleAtivos } from '../painel/PainelControleAtivos';
import { PainelEstoque } from '../estoque/PainelEstoque';
import { PainelTecnico } from '../tecnico/PainelTecnico';
import estilos from './PainelAdmin.module.css';

const AREAS = [
  { id: 'usuarios', rotulo: 'Administração', icone: ShieldCheck },
  { id: 'gerencia', rotulo: 'Gerência', icone: LayoutDashboard },
  { id: 'estoque', rotulo: 'Estoque', icone: Warehouse },
  { id: 'tecnico', rotulo: 'Visão técnica', icone: Wrench },
];

export function PainelAdmin() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [area, definirArea] = useState('usuarios');
  const [usuarios, definirUsuarios] = useState([]);
  const [funcionarios, definirFuncionarios] = useState([]);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [mensagem, definirMensagem] = useState('');
  const [criandoUsuario, definirCriandoUsuario] = useState(false);
  const [redefinindo, definirRedefinindo] = useState(null);
  const [senhaTemporaria, definirSenhaTemporaria] = useState('');

  const carregar = async () => {
    definirErro('');
    try {
      const [usuariosRecebidos, funcionariosRecebidos] = await Promise.all([apiUsuarios.listar(), apiFuncionarios.listar()]);
      definirUsuarios(usuariosRecebidos);
      definirFuncionarios(funcionariosRecebidos);
    } catch (excecao) {
      definirErro(excecao.message);
    } finally {
      definirCarregando(false);
    }
  };

  useEffect(() => {
    let ativo = true;
    Promise.all([apiUsuarios.listar(), apiFuncionarios.listar()])
      .then(([usuariosRecebidos, funcionariosRecebidos]) => {
        if (!ativo) return;
        definirUsuarios(usuariosRecebidos);
        definirFuncionarios(funcionariosRecebidos);
      })
      .catch((excecao) => { if (ativo) definirErro(excecao.message); })
      .finally(() => { if (ativo) definirCarregando(false); });
    return () => { ativo = false; };
  }, []);

  const funcionariosSemAcesso = useMemo(() => funcionarios.filter((funcionario) =>
    !usuarios.some((item) => item.funcionarioId === funcionario.id)), [funcionarios, usuarios]);

  const criarUsuario = async (dados) => {
    await apiUsuarios.cadastrar(dados);
    definirMensagem('Acesso criado. O usuário deverá trocar a senha temporária no primeiro login.');
    await carregar();
  };

  const alternarStatus = async (item) => {
    try {
      await apiUsuarios.definirStatus(item.id, !item.ativo);
      definirMensagem(item.ativo ? 'Usuário desativado e acesso bloqueado.' : 'Usuário reativado.');
      await carregar();
    } catch (excecao) { definirErro(excecao.message); }
  };

  const redefinirSenha = async () => {
    try {
      await apiUsuarios.redefinirSenha(redefinindo.id, senhaTemporaria);
      definirMensagem('Senha temporária redefinida. O usuário deverá alterá-la no próximo acesso.');
      definirRedefinindo(null); definirSenhaTemporaria('');
      await carregar();
    } catch (excecao) { definirErro(excecao.message); }
  };

  return <div className={estilos.pagina}>
    <header className={estilos.cabecalho}>
      <div className={estilos.identidade}><ShieldCheck /><div><small>Painel do administrador</small><strong>{usuario.nome}</strong></div></div>
      <nav aria-label="Áreas administrativas">{AREAS.map(({ id, rotulo, icone: Icone }) => <button type="button" key={id} className={area === id ? estilos.ativo : ''} onClick={() => definirArea(id)}><Icone /> {rotulo}</button>)}</nav>
      <button type="button" className={estilos.sair} onClick={encerrarSessao}><LogOut /> Sair</button>
    </header>

    {area === 'usuarios' && <main className={estilos.conteudo}>
      <section className={estilos.titulo}><div><span><Users /> Segurança e acessos</span><h1>Usuários do sistema</h1><p>Crie credenciais, atribua perfis e controle quem pode acessar o ERA.</p></div><button type="button" onClick={() => definirCriandoUsuario(true)}><UserPlus /> Criar usuário</button></section>
      {mensagem && <p className={estilos.sucesso}>{mensagem}</p>}
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      {carregando ? <p>Carregando usuários...</p> : <section className={estilos.grade}>
        {usuarios.map((item) => <article key={item.id} className={estilos.usuario}>
          <div className={estilos.usuarioTopo}><span><Users /></span><div><strong>{item.nome}</strong><small>{item.login}</small></div><b data-ativo={item.ativo}>{item.ativo ? 'Ativo' : 'Inativo'}</b></div>
          <dl><div><dt>Perfil</dt><dd>{item.perfil}</dd></div><div><dt>Funcionário</dt><dd>{item.funcionarioId ? `#${item.funcionarioId}` : 'Sem vínculo'}</dd></div><div><dt>Senha</dt><dd>{item.deveAlterarSenha ? 'Troca obrigatória' : 'Definida'}</dd></div></dl>
          <footer><button type="button" onClick={() => { definirRedefinindo(item); definirSenhaTemporaria(''); }}><KeyRound /> Redefinir senha</button><button type="button" disabled={item.id === usuario.id} title={item.id === usuario.id ? 'Você não pode desativar sua própria conta' : undefined} className={item.ativo ? estilos.desativar : estilos.reativar} onClick={() => alternarStatus(item)}>{item.ativo ? 'Desativar' : 'Reativar'}</button></footer>
        </article>)}
      </section>}
      {!funcionariosSemAcesso.length && <p className={estilos.aviso}>Todos os técnicos cadastrados já possuem um usuário vinculado. Ainda é possível criar acessos administrativos, gerenciais ou de estoque.</p>}
    </main>}

    {area === 'gerencia' && <PainelControleAtivos />}
    {area === 'estoque' && <PainelEstoque />}
    {area === 'tecnico' && <><p className={estilos.modoAuditoria}><Boxes /> Visão técnica em modo de auditoria: solicitações devem ser criadas pelo próprio técnico.</p><PainelTecnico modoAdministrador /></>}

    {criandoUsuario && <ModalNovoUsuario funcionarios={funcionariosSemAcesso} aoFechar={() => definirCriandoUsuario(false)} aoSalvar={criarUsuario} />}
    {redefinindo && <EstruturaModal titulo="Redefinir senha" subtitulo={`Crie uma senha temporária para ${redefinindo.nome}`} aoFechar={() => definirRedefinindo(null)}><div className={estilos.redefinir}><label>Senha temporária <input type="password" autoComplete="new-password" value={senhaTemporaria} onChange={(evento) => definirSenhaTemporaria(evento.target.value)} minLength={8} maxLength={128} /></label><small>Mínimo de 8 caracteres e não pode conter o login.</small><div><button type="button" onClick={() => definirRedefinindo(null)}>Cancelar</button><button type="button" disabled={senhaTemporaria.length < 8} onClick={redefinirSenha}>Redefinir senha</button></div></div></EstruturaModal>}
  </div>;
}
