import { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, Eye, EyeOff, HardHat, KeyRound, LayoutDashboard, LogOut, Mail, Moon, RefreshCw, Search, ShieldCheck, Sun, UserCheck, UserPlus, Users, Warehouse, Wrench, X } from 'lucide-react';
import { SinoNotificacoes } from '../notificacoes/SinoNotificacoes';
import { useAutenticacao } from '../../contexto/ContextoAutenticacao';
import { apiUsuarios } from '../../services/api/servicoAutenticacaoApi';
import { apiFuncionarios } from '../../services/api/servicoAtivosApi';
import { ModalNovoUsuario } from '../novo-usuario-modal/NovoUsuarioModal';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { PainelControleAtivos } from '../painel/PainelControleAtivos';
import { PainelEstoque } from '../estoque/PainelEstoque';
import { PainelTecnico } from '../tecnico/PainelTecnico';
import { ListaUsuariosAdmin, ListaFuncionariosAdmin } from './ListasAdministracao';
import { DetalhesUsuarioAdmin } from './DetalhesUsuarioAdmin';
import { PERFIS_USUARIO, funcionarioAtivo, filtrarUsuariosAdmin, filtrarFuncionariosAdmin, formatarInstanteAdmin } from '../../utils/administracaoUsuarios';
import estilos from './PainelAdmin.module.css';
import { FormularioEmailRecuperacao } from '../login/TelaEmailRecuperacao';
import { EventosSegurancaAdmin } from './EventosSegurancaAdmin';

const AREAS = [
  { id:'usuarios', rotulo:'Administração', icone:ShieldCheck },
  { id:'gerencia', rotulo:'Gerência', icone:LayoutDashboard },
  { id:'rh', rotulo:'RH · EPIs', icone:Users },
  { id:'financeiro', rotulo:'Financeiro', icone:CircleDollarSign },
  { id:'estoque', rotulo:'Estoque', icone:Warehouse },
  { id:'tecnico', rotulo:'Técnico', icone:Wrench },
  { id:'tst', rotulo:'TST', icone:HardHat },
];

export function PainelAdmin() {
  const { usuario, encerrarSessao } = useAutenticacao();
  const [area, definirArea] = useState('usuarios');
  const [gerenciandoRecuperacao, definirGerenciandoRecuperacao] = useState(false);
  const [mostrandoEventos, definirMostrandoEventos] = useState(false);
  const [usuarios, definirUsuarios] = useState([]), [funcionarios, definirFuncionarios] = useState([]);
  const [carregando, definirCarregando] = useState(true), [erro, definirErro] = useState(''), [atualizadoEm, definirAtualizadoEm] = useState(null);
  const [lista, definirLista] = useState('usuarios'), [busca, definirBusca] = useState(''), [situacao, definirSituacao] = useState('todos');
  const [perfil, definirPerfil] = useState('todos'), [seguranca, definirSeguranca] = useState('todos'), [vinculo, definirVinculo] = useState('todos');
  const [criandoUsuario, definirCriandoUsuario] = useState(false), [funcionarioInicial, definirFuncionarioInicial] = useState(null);
  const [editandoUsuario, definirEditandoUsuario] = useState(null), [selecionadoId, definirSelecionadoId] = useState(null);
  const [redefinindo, definirRedefinindo] = useState(null), [confirmandoStatus, definirConfirmandoStatus] = useState(null);
  const [senhaTemporaria, definirSenhaTemporaria] = useState(''), [senhaVisivel, definirSenhaVisivel] = useState(false);
  const [processando, definirProcessando] = useState(false), [erroAcao, definirErroAcao] = useState('');
  const [modoEscuro, definirModoEscuro] = useState(() => {
    const tema = localStorage.getItem('era-tema-admin');
    return tema ? tema==='escuro' : !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  });
  const alternarTema = () => definirModoEscuro(atual => { localStorage.setItem('era-tema-admin',atual?'claro':'escuro'); return !atual; });

  const carregar = async () => {
    definirCarregando(true); definirErro('');
    try {
      const [contas, cadastros] = await Promise.all([apiUsuarios.listar(),apiFuncionarios.listar()]);
      definirUsuarios(contas); definirFuncionarios(cadastros); definirAtualizadoEm(new Date().toISOString()); return true;
    } catch (e) { definirErro(e.message); return false; }
    finally { definirCarregando(false); }
  };
  useEffect(() => {
    if (area!=='usuarios') return;
    let ativo=true;
    Promise.all([apiUsuarios.listar(),apiFuncionarios.listar()]).then(([contas,cadastros])=>{
      if (ativo) { definirUsuarios(contas); definirFuncionarios(cadastros); definirErro(''); definirAtualizadoEm(new Date().toISOString()); }
    }).catch(e=>{if(ativo)definirErro(e.message);}).finally(()=>{if(ativo)definirCarregando(false);});
    return ()=>{ativo=false;};
  },[area]);

  const usuariosFiltrados = useMemo(()=>filtrarUsuariosAdmin(usuarios,funcionarios,{busca,perfil,situacao,seguranca}),[usuarios,funcionarios,busca,perfil,situacao,seguranca]);
  const funcionariosFiltrados = useMemo(()=>filtrarFuncionariosAdmin(funcionarios,usuarios,{busca,situacao,vinculo}),[funcionarios,usuarios,busca,situacao,vinculo]);
  const funcionariosDisponiveis = funcionarios.filter(f=>funcionarioAtivo(f)&&!usuarios.some(u=>u.funcionarioId===f.id));
  const selecionado = usuarios.find(u=>u.id===selecionadoId);
  const ultimoAdmin = item => item.ativo&&item.perfil==='ADMIN'&&usuarios.filter(u=>u.ativo&&u.perfil==='ADMIN').length<=1;
  const filtrosAtivos = !!(busca||situacao!=='todos'||(lista==='usuarios'?(perfil!=='todos'||seguranca!=='todos'):vinculo!=='todos'));
  const limparFiltros = () => { definirBusca(''); definirSituacao('todos'); definirPerfil('todos'); definirSeguranca('todos'); definirVinculo('todos'); };
  const selecionarArea = id => { if(id!==area&&id==='usuarios')definirCarregando(true); definirArea(id); };
  const abrirCriacao = async (funcionario=null) => { if(await carregar()){definirFuncionarioInicial(funcionario);definirCriandoUsuario(true);} };
  const criarUsuario = async dados => { await apiUsuarios.cadastrar(dados); await carregar(); };
  const editarUsuario = async dados => {
    await apiUsuarios.atualizar(editandoUsuario.id,dados);
    if(editandoUsuario.id===usuario.id){await encerrarSessao();return;}
    await carregar();
  };
  const abrirSenha = item => { definirSelecionadoId(null); definirErroAcao(''); definirSenhaTemporaria(''); definirSenhaVisivel(false); definirRedefinindo(item); };
  const abrirStatus = item => { definirSelecionadoId(null); definirErroAcao(''); definirConfirmandoStatus(item); };
  const redefinirSenha = async evento => {
    evento.preventDefault(); if(processando)return; definirProcessando(true); definirErroAcao('');
    try { await apiUsuarios.redefinirSenha(redefinindo.id,senhaTemporaria); const propria=redefinindo.id===usuario.id; definirRedefinindo(null); definirSenhaTemporaria(''); if(propria)await encerrarSessao();else await carregar(); }
    catch(e){definirErroAcao(e.message);} finally{definirProcessando(false);}
  };
  const alternarStatus = async () => {
    if(processando)return; definirProcessando(true); definirErroAcao('');
    try{await apiUsuarios.definirStatus(confirmandoStatus.id,!confirmandoStatus.ativo);definirConfirmandoStatus(null);await carregar();}
    catch(e){definirErroAcao(e.message);}finally{definirProcessando(false);}
  };
  const estatisticas = [
    {nome:'Usuários cadastrados',valor:usuarios.length,nota:'Todos os perfis de acesso',Icone:Users,acao:()=>{limparFiltros();definirLista('usuarios');}},
    {nome:'Acessos ativos',valor:usuarios.filter(u=>u.ativo).length,nota:`${usuarios.filter(u=>!u.ativo).length} acesso(s) inativo(s)`,Icone:UserCheck,acao:()=>{limparFiltros();definirLista('usuarios');definirSituacao('ativos');}},
    {nome:'Troca de senha pendente',valor:usuarios.filter(u=>u.deveAlterarSenha).length,nota:'Troca obrigatória no próximo login',Icone:KeyRound,acao:()=>{limparFiltros();definirLista('usuarios');definirSeguranca('troca');}},
    {nome:'Funcionários sem vínculo',valor:funcionariosDisponiveis.length,nota:'Ativos disponíveis para vincular',Icone:UserPlus,acao:()=>{limparFiltros();definirLista('funcionarios');definirSituacao('ativos');definirVinculo('sem');}},
  ];
  const quantidade=lista==='usuarios'?usuariosFiltrados.length:funcionariosFiltrados.length;
  return <div className={estilos.pagina} data-theme={modoEscuro?'dark':'light'}>
    <header className={estilos.cabecalho}>
      <div className={estilos.identidade}><ShieldCheck size={23}/><span>ERA<small>Admin</small></span></div>
      <nav aria-label="Áreas administrativas">{AREAS.map(({id,rotulo,icone:Icone})=><button type="button" key={id} aria-current={area===id?'page':undefined} className={area===id?estilos.ativo:''} onClick={()=>selecionarArea(id)}><Icone size={16}/><span>{rotulo}</span></button>)}</nav>
      <div className={estilos.acoesCabecalho}><SinoNotificacoes temaEscuro={modoEscuro}/><button type="button" onClick={alternarTema} aria-label={modoEscuro?'Ativar tema claro':'Ativar tema escuro'}>{modoEscuro?<Sun size={18}/>:<Moon size={18}/>}</button><button type="button" onClick={encerrarSessao} aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={18}/></button></div>
    </header>
    {mostrandoEventos&&<EventosSegurancaAdmin usuarios={usuarios} aoFechar={()=>definirMostrandoEventos(false)}/>}
    {gerenciandoRecuperacao&&<EstruturaModal titulo="Meu e-mail de recuperação" subtitulo="Configuração exclusiva da sua conta de administrador" aoFechar={()=>definirGerenciandoRecuperacao(false)}><FormularioEmailRecuperacao aoConcluir={()=>definirGerenciandoRecuperacao(false)}/></EstruturaModal>}
    {area==='usuarios'&&<main className={estilos.conteudo}>
      <section className={estilos.titulo}><div><span className={estilos.sobretitulo}>Segurança e acessos</span><h1>Administração</h1><p>Usuários, perfis e vínculos de funcionários em um só lugar.</p><small>Conectado como <strong>{usuario.nome}</strong> · {usuario.login}</small></div><button type="button" className={estilos.primario} onClick={()=>abrirCriacao()} disabled={carregando}><UserPlus size={18}/>Criar usuário</button></section>
      <section className={estilos.recuperacaoConta} aria-label="Recuperação da sua conta"><div><strong>Recuperação da sua conta</strong><p>{usuario.recuperacao?.emailVerificado ? `E-mail confirmado: ${usuario.recuperacao.emailVerificado}` : 'Envio por Gmail ainda não habilitado no servidor. O acesso com login e senha permanece disponível.'}</p></div><button type="button" onClick={()=>definirGerenciandoRecuperacao(true)}><Mail size={17}/>Meu e-mail de recuperação</button></section>
      <div className={estilos.acoesSeguranca}><button type="button" className={estilos.atualizar} onClick={()=>definirMostrandoEventos(true)}><ShieldCheck size={17}/>Eventos de segurança</button></div>
      <section className={estilos.estatisticas} aria-label="Resumo de acessos">{estatisticas.map(({nome,valor,nota,Icone,acao})=><button type="button" key={nome} onClick={acao} disabled={carregando}><span className={estilos.estatisticaTopo}>{nome}<Icone size={18}/></span><strong>{carregando?'—':valor}</strong><small>{nota}</small></button>)}</section>
      <section className={estilos.registros} aria-label="Gestão de acessos">
        <div className={estilos.barraRegistros}><div className={estilos.abas} role="group" aria-label="Listas administrativas"><button type="button" aria-pressed={lista==='usuarios'} onClick={()=>definirLista('usuarios')}>Usuários <b>{usuarios.length}</b></button><button type="button" aria-pressed={lista==='funcionarios'} onClick={()=>definirLista('funcionarios')}>Funcionários <b>{funcionarios.length}</b></button></div><button type="button" className={estilos.atualizar} onClick={carregar} disabled={carregando}><RefreshCw size={15}/>Atualizar</button></div>
        <div className={estilos.filtros}>
          <label className={estilos.pesquisa}><Search size={17}/><input type="search" value={busca} onChange={e=>definirBusca(e.target.value)} placeholder={lista==='usuarios'?'Buscar nome, login ou funcionário…':'Buscar nome, cargo ou login vinculado…'} aria-label={lista==='usuarios'?'Pesquisar usuários':'Pesquisar funcionários'}/></label>
          <label><span>Situação</span><select aria-label="Filtrar por situação" value={situacao} onChange={e=>definirSituacao(e.target.value)}><option value="todos">Ativos e inativos, separados</option><option value="ativos">Somente ativos</option><option value="inativos">Somente inativos{lista==='funcionarios'?' / arquivados':''}</option></select></label>
          {lista==='usuarios'?<><label><span>Perfil</span><select aria-label="Filtrar por perfil" value={perfil} onChange={e=>definirPerfil(e.target.value)}><option value="todos">Todos os perfis</option>{Object.entries(PERFIS_USUARIO).map(([valor,{nome}])=><option key={valor} value={valor}>{nome}</option>)}</select></label><label><span>Segurança</span><select aria-label="Filtrar por segurança" value={seguranca} onChange={e=>definirSeguranca(e.target.value)}><option value="todos">Todas as condições</option><option value="troca">Troca de senha pendente</option><option value="bloqueados">Bloqueio temporário</option><option value="sem-vinculo">Técnico / TST sem vínculo</option></select></label></>:<label><span>Vínculo de acesso</span><select aria-label="Filtrar por vínculo" value={vinculo} onChange={e=>definirVinculo(e.target.value)}><option value="todos">Todos os vínculos</option><option value="sem">Sem usuário vinculado</option><option value="ativo">Com acesso ativo</option><option value="inativo">Com acesso inativo</option></select></label>}
        </div>
        <div className={estilos.resultados}><span role="status">{carregando?'Carregando…':`${quantidade} ${lista==='usuarios'?'usuário(s)':'funcionário(s)'} encontrado(s)`}</span>{filtrosAtivos&&<button type="button" onClick={limparFiltros}><X size={14}/>Limpar filtros</button>}</div>
        {erro&&<p className={estilos.erro} role="alert">{erro} Use “Atualizar” para tentar novamente.</p>}
        {lista==='funcionarios'&&<p className={estilos.nota}>O vínculo com funcionário é obrigatório para Técnico e TST. Outros perfis não exigem vínculo. Cadastros de funcionários são gerenciados na Gerência.</p>}
        {carregando?<div className={estilos.vazio} role="status">Carregando usuários e funcionários…</div>:quantidade?lista==='usuarios'?<ListaUsuariosAdmin usuarios={usuariosFiltrados} funcionarios={funcionarios} usuarioAtualId={usuario.id} aoGerenciar={definirSelecionadoId}/>:<ListaFuncionariosAdmin funcionarios={funcionariosFiltrados} usuarios={usuarios} aoGerenciar={definirSelecionadoId} aoCriarAcesso={abrirCriacao}/>:<div className={estilos.vazio}><Search size={24}/><strong>Nenhum resultado encontrado</strong><span>{filtrosAtivos?'Ajuste os filtros ou limpe a pesquisa.':'Nenhum registro cadastrado nesta lista.'}</span>{filtrosAtivos&&<button type="button" onClick={limparFiltros}>Limpar filtros</button>}</div>}
      </section>
      <p className={estilos.rodape}>Ativos, inativos e arquivados são exibidos em grupos separados.{atualizadoEm&&` Atualizado em ${formatarInstanteAdmin(atualizadoEm)} · Manaus.`}</p>
    </main>}
    {area==='gerencia'&&<PainelControleAtivos incorporado temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {area==='rh'&&<PainelControleAtivos incorporado perfilVisualizado="RH" temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {area==='financeiro'&&<PainelControleAtivos incorporado perfilVisualizado="FINANCEIRO" temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {area==='estoque'&&<PainelEstoque incorporado temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {area==='tecnico'&&<PainelTecnico modoAdministrador temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {area==='tst'&&<PainelTecnico modoAdministrador perfilVisualizado="TST" temaEscuro={modoEscuro} aoAlternarTema={alternarTema}/>}
    {selecionado&&<DetalhesUsuarioAdmin usuario={selecionado} funcionario={funcionarios.find(f=>f.id===selecionado.funcionarioId)} propriaConta={selecionado.id===usuario.id} ultimoAdmin={ultimoAdmin(selecionado)} aoFechar={()=>definirSelecionadoId(null)} aoEditar={()=>{definirEditandoUsuario(selecionado);definirSelecionadoId(null);}} aoSenha={()=>abrirSenha(selecionado)} aoStatus={()=>abrirStatus(selecionado)}/>}
    {criandoUsuario&&<ModalNovoUsuario funcionarioInicial={funcionarioInicial} funcionarios={funcionariosDisponiveis} aoFechar={()=>definirCriandoUsuario(false)} aoSalvar={criarUsuario}/>}
    {editandoUsuario&&<ModalNovoUsuario usuario={editandoUsuario} funcionarios={funcionarios.filter(f=>f.id===editandoUsuario.funcionarioId||(funcionarioAtivo(f)&&!usuarios.some(u=>u.id!==editandoUsuario.id&&u.funcionarioId===f.id)))} aoFechar={()=>definirEditandoUsuario(null)} aoSalvar={editarUsuario}/>}
    {redefinindo&&<EstruturaModal titulo="Redefinir senha" subtitulo={`${redefinindo.nome} · ${redefinindo.login}`} aoFechar={()=>{if(!processando)definirRedefinindo(null);}}><form className={estilos.redefinir} onSubmit={redefinirSenha}><p>A senha atual não será exibida. Defina uma nova senha temporária; a troca será obrigatória no próximo acesso e as sessões anteriores serão invalidadas.</p>{redefinindo.id===usuario.id&&<p className={estilos.aviso}>Sua sessão será encerrada após a redefinição.</p>}<label>Senha temporária<div className={estilos.campoSenha}><input type={senhaVisivel?'text':'password'} autoComplete="new-password" value={senhaTemporaria} onChange={e=>definirSenhaTemporaria(e.target.value)} minLength={8} maxLength={128} required disabled={processando}/><button type="button" onClick={()=>definirSenhaVisivel(v=>!v)} aria-label={senhaVisivel?'Ocultar senha':'Visualizar senha'}>{senhaVisivel?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label><small>Mínimo de 8 caracteres. Não pode conter o login.</small>{erroAcao&&<p className={estilos.erro} role="alert">{erroAcao}</p>}<div className={estilos.acoesModal}><button type="button" disabled={processando} onClick={()=>definirRedefinindo(null)}>Cancelar</button><button type="submit" className={estilos.primario} disabled={processando||senhaTemporaria.length<8}>{processando?'Salvando…':'Salvar senha temporária'}</button></div></form></EstruturaModal>}
    {confirmandoStatus&&<EstruturaModal titulo={confirmandoStatus.ativo?'Desativar acesso?':'Reativar acesso?'} subtitulo={`${confirmandoStatus.nome} · ${confirmandoStatus.login}`} aoFechar={()=>{if(!processando)definirConfirmandoStatus(null);}}><div className={estilos.redefinir}><p>{confirmandoStatus.ativo?'O usuário não poderá entrar no sistema. Pedidos, movimentações e demais registros serão preservados.':'O acesso será reativado. Confira também a situação do funcionário vinculado, quando houver.'}</p>{erroAcao&&<p className={estilos.erro} role="alert">{erroAcao}</p>}<div className={estilos.acoesModal}><button type="button" onClick={()=>definirConfirmandoStatus(null)} disabled={processando}>Voltar</button><button type="button" className={confirmandoStatus.ativo?estilos.perigo:estilos.primario} disabled={processando} onClick={alternarStatus}>{processando?'Salvando…':confirmandoStatus.ativo?'Confirmar desativação':'Confirmar reativação'}</button></div></div></EstruturaModal>}
  </div>;
}
