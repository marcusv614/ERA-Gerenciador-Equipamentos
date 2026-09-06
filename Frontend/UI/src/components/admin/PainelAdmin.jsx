import { useEffect, useMemo, useState } from 'react';
import { Boxes, KeyRound, LayoutDashboard, LogOut, Moon, Pencil, Search, ShieldCheck, Sun, UserPlus, Users, Warehouse, Wrench } from 'lucide-react';
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
  { id: 'tecnico', rotulo: 'Técnico', icone: Wrench },
];

const normalizarBusca = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function PainelAdmin() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [area, definirArea] = useState('usuarios');
  const [usuarios, definirUsuarios] = useState([]);
  const [funcionarios, definirFuncionarios] = useState([]);
  const [carregando, definirCarregando] = useState(true);
  const [erro, definirErro] = useState('');
  const [mensagem, definirMensagem] = useState('');
  const [criandoUsuario, definirCriandoUsuario] = useState(false);
  const [editandoUsuario, definirEditandoUsuario] = useState(null);
  const [redefinindo, definirRedefinindo] = useState(null);
  const [senhaTemporaria, definirSenhaTemporaria] = useState('');
  const [termoBusca, definirTermoBusca] = useState('');
  const [modoEscuro, definirModoEscuro] = useState(() => {
    const temaSalvo = localStorage.getItem('era-tema-admin');
    return temaSalvo ? temaSalvo === 'escuro' : window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });

  const alternarTema = () => definirModoEscuro((atual) => {
    const novoTema = !atual;
    localStorage.setItem('era-tema-admin', novoTema ? 'escuro' : 'claro');
    return novoTema;
  });

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

  const funcionariosSemAcesso = useMemo(() => funcionarios.filter((funcionario) => !funcionario.arquivado &&
    !usuarios.some((item) => item.funcionarioId === funcionario.id)), [funcionarios, usuarios]);
  const usuariosFiltrados = useMemo(() => {
    const termo = normalizarBusca(termoBusca.trim());
    if (!termo) return usuarios;
    return usuarios.filter((item) => normalizarBusca([
      item.nome,
      item.login,
      item.perfil,
      item.perfil === 'TECNICO' ? 'tecnico' : '',
      item.perfil === 'ESTOQUE' ? 'estoquista' : '',
      item.perfil === 'GERENTE' ? 'gerente' : '',
      item.perfil === 'ADMIN' ? 'administrador' : '',
      item.funcionarioId ? `funcionario ${item.funcionarioId}` : '',
    ].join(' ')).includes(termo));
  }, [termoBusca, usuarios]);

  const criarUsuario = async (dados) => {
    await apiUsuarios.cadastrar(dados);
    definirMensagem('Acesso criado. O usuário deverá trocar a senha temporária no primeiro login.');
    await carregar();
  };

  const editarUsuario = async (dados) => {
    await apiUsuarios.atualizar(editandoUsuario.id, dados);
    if (editandoUsuario.id === usuario.id) {
      await encerrarSessao();
      return;
    }
    definirMensagem('Usuário atualizado com sucesso. Uma nova senha exigirá troca no próximo login.');
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

  return <div className={estilos.pagina} data-theme={modoEscuro ? 'dark' : 'light'}>
    <header className={estilos.cabecalho}>
      <div className={estilos.identidade}><ShieldCheck /><div><small>Painel do administrador</small><strong>{usuario.nome}</strong></div></div>
      <nav aria-label="Áreas administrativas">{AREAS.map(({ id, rotulo, icone: Icone }) => <button type="button" key={id} className={area === id ? estilos.ativo : ''} onClick={() => definirArea(id)}><Icone /> {rotulo}</button>)}</nav>
      <button type="button" className={estilos.tema} onClick={alternarTema} aria-label={modoEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={modoEscuro ? 'Tema claro' : 'Tema escuro'}>{modoEscuro ? <Sun /> : <Moon />}</button>
      <button type="button" className={estilos.sair} onClick={encerrarSessao} aria-label="Sair do sistema" title="Sair do sistema"><LogOut /> <span>Sair</span></button>
    </header>

    {area === 'usuarios' && <main className={estilos.conteudo}>
      <section className={estilos.titulo}><div><span><Users /> Segurança e acessos</span><h1>Usuários do sistema</h1><p>Crie credenciais, atribua perfis e controle acessos.</p></div><button type="button" onClick={() => definirCriandoUsuario(true)}><UserPlus /> Criar usuário</button></section>
      <div className={estilos.pesquisa}><Search aria-hidden="true" /><input type="search" value={termoBusca} onChange={(evento) => definirTermoBusca(evento.target.value)} placeholder="Pesquisar por nome, login, perfil ou funcionário" aria-label="Pesquisar usuários" /><span>{usuariosFiltrados.length} {usuariosFiltrados.length === 1 ? 'resultado' : 'resultados'}</span></div>
      {mensagem && <p className={estilos.sucesso}>{mensagem}</p>}
      {erro && <p className={estilos.erro} role="alert">{erro}</p>}
      {carregando ? <p>Carregando usuários...</p> : <section className={estilos.grade}>
        {usuariosFiltrados.map((item) => <article key={item.id} className={estilos.usuario}>
          <div className={estilos.usuarioTopo}><span><Users /></span><div><strong>{item.nome}</strong><small>{item.login}</small></div><b data-ativo={item.ativo}>{item.ativo ? 'Ativo' : 'Inativo'}</b></div>
          <dl><div><dt>Perfil</dt><dd>{item.perfil}</dd></div><div><dt>Senha</dt><dd>{item.deveAlterarSenha ? 'Troca obrigatória' : 'Definida'}</dd></div></dl>
          <footer><button type="button" onClick={() => definirEditandoUsuario(item)}><Pencil /> Editar</button><button type="button" onClick={() => { definirRedefinindo(item); definirSenhaTemporaria(''); }}><KeyRound /> Redefinir senha</button><button type="button" disabled={item.id === usuario.id} title={item.id === usuario.id ? 'Você não pode desativar sua própria conta' : undefined} className={item.ativo ? estilos.desativar : estilos.reativar} onClick={() => alternarStatus(item)}>{item.ativo ? 'Desativar' : 'Reativar'}</button></footer>
        </article>)}
      </section>}
      {!carregando && termoBusca && !usuariosFiltrados.length && <p className={estilos.semResultados}>Nenhum usuário encontrado para “{termoBusca}”.</p>}
      {!funcionariosSemAcesso.length && <p className={estilos.aviso}>Todos os técnicos cadastrados já possuem um usuário vinculado. Ainda é possível criar acessos administrativos, gerenciais ou de estoque.</p>}
    </main>}

    {area === 'gerencia' && <PainelControleAtivos temaEscuro={modoEscuro} aoAlternarTema={alternarTema} />}
    {area === 'estoque' && <PainelEstoque incorporado temaEscuro={modoEscuro} aoAlternarTema={alternarTema} />}
    {area === 'tecnico' && <><p className={estilos.modoAuditoria}><Boxes /> Visão técnica em modo de auditoria: solicitações devem ser criadas pelo próprio técnico.</p><PainelTecnico modoAdministrador temaEscuro={modoEscuro} aoAlternarTema={alternarTema} /></>}

    {criandoUsuario && <ModalNovoUsuario funcionarios={funcionariosSemAcesso} aoFechar={() => definirCriandoUsuario(false)} aoSalvar={criarUsuario} />}
    {editandoUsuario && <ModalNovoUsuario usuario={editandoUsuario} funcionarios={funcionarios.filter((funcionario) => !funcionario.arquivado && !usuarios.some((item) => item.id !== editandoUsuario.id && item.funcionarioId === funcionario.id))} aoFechar={() => definirEditandoUsuario(null)} aoSalvar={editarUsuario} />}
    {redefinindo && <EstruturaModal titulo="Redefinir senha" subtitulo={`Crie uma senha temporária para ${redefinindo.nome}`} aoFechar={() => definirRedefinindo(null)}><div className={estilos.redefinir}><label>Senha temporária <input type="password" autoComplete="new-password" value={senhaTemporaria} onChange={(evento) => definirSenhaTemporaria(evento.target.value)} minLength={8} maxLength={128} /></label><small>Mínimo de 8 caracteres e não pode conter o login.</small><div><button type="button" onClick={() => definirRedefinindo(null)}>Cancelar</button><button type="button" disabled={senhaTemporaria.length < 8} onClick={redefinirSenha}>Redefinir senha</button></div></div></EstruturaModal>}
  </div>;
}
