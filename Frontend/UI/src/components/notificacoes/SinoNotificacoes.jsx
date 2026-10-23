import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Bell, Check, MapPin, Package, X } from 'lucide-react';
import { notificacoesApi } from '../../services/api/notificacoesApi';
import estilos from './SinoNotificacoes.module.css';
import { tituloNotificacao } from '../../utils/titulosNotificacao';

const horario = (valor) => new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(valor));

export function SinoNotificacoes({ temaEscuro = false, aoVerPedidos }) {
  const [aberto, definirAberto] = useState(false);
  const [caixa, definirCaixa] = useState({ itens: [], naoLidas: 0, temMais: false });
  const [pagina, definirPagina] = useState(0);
  const [carregando, definirCarregando] = useState(false);
  const [lendo, definirLendo] = useState(null);
  const [erro, definirErro] = useState('');
  const [tentativa, definirTentativa] = useState(0);
  const botao = useRef(null), painel = useRef(null), sequencia = useRef(0);
  const tituloId = useId(), painelId = useId();

  useEffect(() => {
    let ativo = true;
    const atualizar = async () => {
      const ordem = ++sequencia.current;
      definirCarregando(true);
      try {
        const resposta = await notificacoesApi.listar(pagina);
        if (ativo && ordem === sequencia.current) { definirCaixa(resposta); definirErro(''); }
      } catch (e) { if (ativo && ordem === sequencia.current) definirErro(e.message || 'Não foi possível carregar os avisos.'); }
      finally { if (ativo && ordem === sequencia.current) definirCarregando(false); }
    };
    atualizar();
    const intervalo = setInterval(() => { if (!document.hidden) atualizar(); }, 15000);
    window.addEventListener('focus', atualizar);
    return () => { ativo = false; clearInterval(intervalo); window.removeEventListener('focus', atualizar); };
  }, [pagina, tentativa]);

  const fechar = () => { definirAberto(false); botao.current?.focus(); };
  useEffect(() => {
    if (!aberto) return;
    painel.current?.querySelector('button')?.focus();
    const fora = (e) => { if (!painel.current?.contains(e.target) && !botao.current?.contains(e.target)) definirAberto(false); };
    const teclado = (e) => { if (e.key === 'Escape') { definirAberto(false); botao.current?.focus(); } };
    document.addEventListener('pointerdown', fora); document.addEventListener('keydown', teclado);
    return () => { document.removeEventListener('pointerdown', fora); document.removeEventListener('keydown', teclado); };
  }, [aberto]);

  const ler = async (aviso) => {
    definirLendo(aviso.id);
    try {
      const lida = await notificacoesApi.marcarLida(aviso.id);
      // Desconsidera uma consulta iniciada antes da leitura para não reverter o selo.
      sequencia.current++;
      definirCaixa(atual => ({ ...atual, naoLidas: Math.max(0, atual.naoLidas - (aviso.lidaEm ? 0 : 1)), itens: atual.itens.map(n => n.id === aviso.id ? lida : n) }));
      definirErro(''); definirCarregando(false); return true;
    } catch (e) { definirErro(e.message || 'Não foi possível registrar a leitura.'); return false; }
    finally { definirLendo(null); }
  };
  const verEntrega = async (aviso) => {
    if (!aviso.lidaEm && !await ler(aviso)) return;
    fechar(); aoVerPedidos(aviso.solicitacaoId);
  };

  return <span className={estilos.sino} data-sino-notificacoes>
    <button ref={botao} type="button" aria-label={`Notificações${caixa.naoLidas ? `: ${caixa.naoLidas} não lidas` : ''}`} aria-haspopup="dialog" aria-expanded={aberto} aria-controls={aberto ? painelId : undefined} onClick={() => { definirAberto(!aberto); if (!aberto) { definirPagina(0); definirTentativa(n => n + 1); } }}>
      <Bell size={19} />{caixa.naoLidas > 0 && <b className={estilos.contador} aria-hidden="true">{caixa.naoLidas > 99 ? '99+' : caixa.naoLidas}</b>}
    </button>
    {aberto && createPortal(<section ref={painel} id={painelId} className={`${estilos.painel} ${temaEscuro ? estilos.escuro : ''}`} role="dialog" aria-labelledby={tituloId}>
      <header><h2 id={tituloId}>Notificações</h2><button type="button" onClick={fechar} aria-label="Fechar notificações"><X size={20} /></button></header>
      {erro && <div className={estilos.erro} role="alert"><span>{erro}</span><button type="button" onClick={() => definirTentativa(n => n + 1)}>Tentar novamente</button></div>}
      <div className={estilos.lista} aria-busy={carregando}>
        {!caixa.itens.length && <p className={estilos.vazio}>{carregando ? 'Carregando…' : erro ? 'Tente novamente.' : 'Nenhum aviso por aqui.'}</p>}
        {caixa.itens.map(aviso => <article key={aviso.id} className={aviso.lidaEm ? estilos.lida : estilos.nova}>
          <div className={estilos.linha}><strong><Package size={18} />{tituloNotificacao(aviso)}</strong>{!aviso.lidaEm && <span aria-label="Não lida" />}</div>
          <h3><MapPin size={16} />{aviso.obraNome}</h3>{aviso.mensagem&&<p>{aviso.mensagem}</p>}
          <time className={estilos.referencia} dateTime={aviso.criadaEm}>Registrado em {horario(aviso.criadaEm)}</time>
          <p>Pedido #{aviso.solicitacaoId} · Situação atual: {aviso.status}</p>
          <footer>{aoVerPedidos && (aviso.tipo !== 'ENVIO' || aviso.destinatario) ? <button type="button" className={estilos.verEntrega} disabled={lendo !== null} onClick={() => verEntrega(aviso)}>{lendo === aviso.id ? 'Abrindo…' : 'Ver pedido'}<ArrowRight size={18} /></button> : !aviso.lidaEm ? <button type="button" disabled={lendo !== null} onClick={() => ler(aviso)}><Check size={18} />{lendo === aviso.id ? 'Salvando…' : 'Entendi'}</button> : <span className={estilos.visto}><Check size={16} />Visto</span>}</footer>
        </article>)}
      </div>
      {(pagina > 0 || caixa.temMais) && <nav aria-label="Páginas de notificações"><button type="button" disabled={pagina === 0 || carregando} onClick={() => definirPagina(n => n - 1)}>Anteriores</button><span>Página {pagina + 1}</span><button type="button" disabled={!caixa.temMais || carregando} onClick={() => definirPagina(n => n + 1)}>Próximas</button></nav>}
    </section>, document.body)}
  </span>;
}
