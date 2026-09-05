import { ChevronDown, ChevronUp, LogOut, Menu, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { useState } from 'react';

const INFORMACOES_TELA = {
  equipamentos: ['Equipamentos', 'Onde cada instrumento está e com quem', 'Buscar modelo, série, técnico...'],
  obras: ['Obras', 'Frentes de trabalho ativas e planejadas', 'Buscar obra, cliente, cidade...'],
  funcionarios: ['Funcionários', 'Equipe, responsabilidades e materiais sob custódia', 'Buscar funcionário, cargo, e-mail...'],
  atividades: ['Atividades', 'Solicitações das equipes aguardando sua decisão', 'Buscar técnico, obra ou material...'],
  deposito: ['Depósito', 'Itens fora de campo — estoque, manutenção e trânsito', 'Buscar item, série...'],
};

export function BarraSuperior({ telaAtual, recolhida, modoEscuro, termoBusca, resultadoBusca, ehAdmin, aoSair, aoAlternarRecolhimento, aoAlternarTema, aoBuscar, aoAbrirNovoEquipamento, aoAbrirNovaObra, aoAbrirNovoFuncionario, estilos }) {
  const [titulo, subtitulo, textoBusca] = INFORMACOES_TELA[telaAtual];
  const [acoesAbertas, definirAcoesAbertas] = useState(false);
  const buscaAtiva = Boolean(termoBusca.trim());
  return <header className={`${estilos.topbar} ${recolhida ? estilos.topbarCollapsed : ''}`}>
    <div><h1 className={estilos.title}>{titulo}</h1><p className={estilos.subtitle}>{subtitulo}</p></div>
    <button type="button" onClick={aoAlternarRecolhimento} className={estilos.topbarCollapseBtn} aria-label={recolhida ? 'Expandir barra superior' : 'Retrair barra superior'} aria-expanded={!recolhida}>{recolhida ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
    <div className={estilos.topbarRight}>
      <button type="button" aria-label={modoEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={modoEscuro ? 'Tema claro' : 'Tema escuro'} onClick={aoAlternarTema} className={estilos.themeButton}>{modoEscuro ? <Sun size={17} /> : <Moon size={17} />}</button>
      <div className={`${estilos.searchBox} ${buscaAtiva ? estilos.searchBoxActive : ''} ${buscaAtiva && resultadoBusca === 0 ? estilos.searchBoxEmpty : ''}`}>
        <Search size={15} className={estilos.searchIcon} />
        <input value={termoBusca} onChange={(evento) => aoBuscar(evento.target.value)} placeholder={textoBusca} className={estilos.searchInput} aria-label={`Pesquisar em ${titulo.toLocaleLowerCase('pt-BR')}`} />
        {buscaAtiva && <span className={estilos.searchResult} aria-live="polite">{resultadoBusca} {resultadoBusca === 1 ? 'resultado' : 'resultados'}</span>}
        {buscaAtiva && <button type="button" className={estilos.searchClear} onClick={() => aoBuscar('')} aria-label="Limpar pesquisa" title="Limpar pesquisa"><X size={14} /></button>}
      </div>
      {ehAdmin && <button type="button" className={estilos.mobileActionsToggle} onClick={() => definirAcoesAbertas((abertas) => !abertas)} aria-expanded={acoesAbertas} aria-controls="acoes-rapidas-mobile">{acoesAbertas ? <X size={17} /> : <Menu size={17} />}<span>Ações</span></button>}
      {ehAdmin && <div id="acoes-rapidas-mobile" className={`${estilos.quickActions} ${acoesAbertas ? estilos.quickActionsOpen : ''}`}>
        <button onClick={aoAbrirNovoFuncionario} className={estilos.btnGhost}><Plus size={15} /> Funcionário</button>
        <button onClick={aoAbrirNovoEquipamento} className={estilos.btnGhost}><Plus size={15} /> Equipamento</button>
        <button onClick={aoAbrirNovaObra} className={estilos.btnPrimary}><Plus size={15} /> Nova obra</button>
      </div>}
      <button type="button" onClick={aoSair} className={estilos.btnGhost} aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={16} /></button>
    </div>
  </header>;
}
