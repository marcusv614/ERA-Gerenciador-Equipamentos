import { ChevronDown, ChevronUp, LogOut, Moon, Plus, Search, Sun, UserPlus } from 'lucide-react';

const INFORMACOES_TELA = {
  equipamentos: ['Equipamentos', 'Onde cada instrumento está e com quem', 'Buscar modelo, série, técnico...'],
  obras: ['Obras', 'Frentes de trabalho ativas e planejadas', 'Buscar obra, cliente, cidade...'],
  funcionarios: ['Funcionários', 'Equipe, responsabilidades e materiais sob custódia', 'Buscar funcionário, cargo, e-mail...'],
  atividades: ['Atividades', 'Solicitações das equipes aguardando sua decisão', 'Buscar técnico, obra ou material...'],
  deposito: ['Depósito', 'Itens fora de campo — estoque, manutenção e trânsito', 'Buscar item, série...'],
};

export function BarraSuperior({ telaAtual, recolhida, modoEscuro, termoBusca, ehAdmin, aoSair, aoAlternarRecolhimento, aoAlternarTema, aoBuscar, aoAbrirNovoUsuario, aoAbrirNovoEquipamento, aoAbrirNovaObra, aoAbrirNovoFuncionario, estilos }) {
  const [titulo, subtitulo, textoBusca] = INFORMACOES_TELA[telaAtual];
  return <header className={`${estilos.topbar} ${recolhida ? estilos.topbarCollapsed : ''}`}>
    <div><h1 className={estilos.title}>{titulo}</h1><p className={estilos.subtitle}>{subtitulo}</p></div>
    <button type="button" onClick={aoAlternarRecolhimento} className={estilos.topbarCollapseBtn} aria-label={recolhida ? 'Expandir barra superior' : 'Retrair barra superior'} aria-expanded={!recolhida}>{recolhida ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
    <div className={estilos.topbarRight}>
      <button type="button" role="switch" aria-checked={modoEscuro} aria-label="Alternar modo escuro" onClick={aoAlternarTema} className={`${estilos.themeSwitch} ${modoEscuro ? estilos.themeSwitchActive : ''}`}><Sun size={14} className={estilos.themeIconLight} /><span className={estilos.themeTrack}><span className={estilos.themeThumb} /></span><Moon size={14} className={estilos.themeIconDark} /></button>
      <div className={estilos.searchBox}><Search size={14} className={estilos.searchIcon} /><input value={termoBusca} onChange={(evento) => aoBuscar(evento.target.value)} placeholder={textoBusca} className={estilos.searchInput} /></div>
      <button onClick={aoAbrirNovoFuncionario} className={estilos.btnGhost}><Plus size={15} /> Funcionário</button>
      {ehAdmin && <button onClick={aoAbrirNovoUsuario} className={estilos.btnGhost}><UserPlus size={15} /> Usuário</button>}
      {ehAdmin && <button onClick={aoAbrirNovoEquipamento} className={estilos.btnGhost}><Plus size={15} /> Equipamento</button>}
      {ehAdmin && <button onClick={aoAbrirNovaObra} className={estilos.btnPrimary}><Plus size={15} /> Nova obra</button>}
      <button onClick={aoSair} className={estilos.btnGhost} aria-label="Sair"><LogOut size={16} /></button>
    </div>
  </header>;
}
