import { ChevronDown, ChevronUp, LogOut, Moon, Plus, Search, Sun, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { SinoNotificacoes } from '../notificacoes/SinoNotificacoes';

const INFORMACOES_TELA = {
  auditorias: ['Vistorias', 'Código, técnico, fiscal, obra ou material...'],
  equipamentos: ['Equipamentos', 'Buscar modelo, série, técnico...'],
  obras: ['Obras', 'Buscar obra, cliente, cidade...'],
  funcionarios: ['Funcionários', 'Buscar funcionário, cargo, e-mail...'],
  atividades: ['Solicitações', 'Código, obra, técnico, material ou série...'],
  deposito: ['Depósito', 'Buscar item, série...'],
};

export function BarraSuperior({ aoVerPedidos, telaAtual, recolhida, modoEscuro, termoBusca, resultadoBusca, ehAdmin, aoSair, aoAlternarRecolhimento, aoAlternarTema, aoBuscar, aoAbrirNovoEquipamento, aoAbrirNovaObra, aoAbrirNovoFuncionario, estilos, mostrarNotificacoes = true, financeiro = false }) {
  const [titulo, buscaOriginal] = INFORMACOES_TELA[telaAtual];
  const textoBusca=financeiro?'Código, técnico, obra, material ou aprovador…':buscaOriginal;
  const [acoesAbertas, definirAcoesAbertas] = useState(false);
  const cabecalho = useRef(null);
  useEffect(() => {
    if (!acoesAbertas) return;
    const fecharAoSair = (evento) => { if (!cabecalho.current?.contains(evento.target)) definirAcoesAbertas(false); };
    const fecharComTeclado = (evento) => { if (evento.key === 'Escape') { definirAcoesAbertas(false); cabecalho.current?.querySelector('[aria-controls="acoes-rapidas-mobile"]')?.focus(); } };
    document.addEventListener('pointerdown', fecharAoSair);
    document.addEventListener('keydown', fecharComTeclado);
    return () => { document.removeEventListener('pointerdown', fecharAoSair); document.removeEventListener('keydown', fecharComTeclado); };
  }, [acoesAbertas]);
  const buscaAtiva = Boolean(termoBusca.trim());
  return <header ref={cabecalho} className={`${estilos.topbar} ${recolhida ? estilos.topbarCollapsed : ''}`}>
    <div><span className={estilos.pageEyebrow}>{financeiro ? 'Análises e aprovações' : 'Controle de ativos'}</span><h1 className={estilos.title}>{titulo}</h1></div>
    <button type="button" onClick={aoAlternarRecolhimento} className={estilos.topbarCollapseBtn} aria-label={recolhida ? 'Expandir barra superior' : 'Retrair barra superior'} aria-expanded={!recolhida}>{recolhida ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
    <div className={estilos.topbarRight}>
      {mostrarNotificacoes && <SinoNotificacoes temaEscuro={modoEscuro} aoVerPedidos={aoVerPedidos} />}
      <button type="button" aria-label={modoEscuro ? 'Ativar tema claro' : 'Ativar tema escuro'} title={modoEscuro ? 'Tema claro' : 'Tema escuro'} onClick={aoAlternarTema} className={estilos.themeButton}>{modoEscuro ? <Sun size={17} /> : <Moon size={17} />}</button>
      <div className={`${estilos.searchBox} ${buscaAtiva ? estilos.searchBoxActive : ''} ${buscaAtiva && resultadoBusca === 0 ? estilos.searchBoxEmpty : ''}`}>
        <Search size={15} className={estilos.searchIcon} />
        <input value={termoBusca} onChange={(evento) => aoBuscar(evento.target.value)} placeholder={textoBusca} className={estilos.searchInput} aria-label={`Pesquisar em ${titulo.toLocaleLowerCase('pt-BR')}`} />
        {buscaAtiva && <button type="button" className={estilos.searchClear} onClick={() => aoBuscar('')} aria-label="Limpar pesquisa" title="Limpar pesquisa"><X size={14} /></button>}
      </div>
      {ehAdmin && <button type="button" className={estilos.mobileActionsToggle} onClick={() => definirAcoesAbertas((abertas) => !abertas)} aria-label={acoesAbertas ? 'Fechar ações rápidas' : 'Abrir ações rápidas'} title={acoesAbertas ? 'Fechar ações rápidas' : 'Ações rápidas'} aria-expanded={acoesAbertas} aria-controls="acoes-rapidas-mobile">{acoesAbertas ? <X size={17} /> : <Plus size={17} />}<span>Criar</span></button>}
      {ehAdmin && <div id="acoes-rapidas-mobile" className={`${estilos.quickActions} ${acoesAbertas ? estilos.quickActionsOpen : ''}`}>
        <button onClick={() => { definirAcoesAbertas(false); aoAbrirNovoFuncionario(); }} className={estilos.btnGhost}><Plus size={15} /> Funcionário</button>
        <button onClick={() => { definirAcoesAbertas(false); aoAbrirNovoEquipamento(); }} className={estilos.btnGhost}><Plus size={15} /> Equipamento</button>
        <button onClick={() => { definirAcoesAbertas(false); aoAbrirNovaObra(); }} className={estilos.btnPrimary}><Plus size={15} /> Nova obra</button>
      </div>}
      <button type="button" onClick={aoSair} className={estilos.btnGhost} aria-label="Sair do sistema" title="Sair do sistema"><LogOut size={16} /></button>
    </div>
  </header>;
}
