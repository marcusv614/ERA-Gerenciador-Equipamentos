import { useEffect, useState } from 'react';
import { EstruturaModal } from '../modal-shell/ModalShell';
import { clienteHttp, obterDadosResposta } from '../../services/api/clienteHttp';
import { formatarInstanteAdmin } from '../../utils/administracaoUsuarios';
import estilos from './PainelAdmin.module.css';

const TIPOS = {
  LOGIN_SUCESSO: 'Login concluído', LOGIN_FALHA: 'Login recusado', LOGIN_BLOQUEADO: 'Login bloqueado',
  USUARIO_CRIADO: 'Usuário criado', USUARIO_EDITADO: 'Usuário editado', USUARIO_ATIVADO: 'Acesso ativado',
  USUARIO_DESATIVADO: 'Acesso desativado', SENHA_REDEFINIDA: 'Senha redefinida pelo Admin', SENHA_ALTERADA: 'Senha alterada pelo usuário',
  SENHA_RECUPERADA: 'Senha recuperada por e-mail', EMAIL_RECUPERACAO_CONFIRMADO: 'E-mail de recuperação confirmado',
};

export function EventosSegurancaAdmin({ usuarios, aoFechar }) {
  const [tipo, definirTipo] = useState(''), [inicio, definirInicio] = useState(''), [fim, definirFim] = useState('');
  const [pagina, definirPagina] = useState(0), [versao, definirVersao] = useState(0);
  const [resultado, definirResultado] = useState({ itens: [], temMais: false });
  const [carregando, definirCarregando] = useState(true), [erro, definirErro] = useState('');
  const intervaloInvalido = inicio && fim && inicio > fim;
  useEffect(() => {
    if (inicio && fim && inicio > fim) return;
    let ativo = true;
    const params = { pagina, ...(tipo && { tipo }), ...(inicio && { inicio: `${inicio}T00:00:00-04:00` }), ...(fim && { fim: `${fim}T23:59:59.999999-04:00` }) };
    clienteHttp.get('/usuarios/eventos-seguranca', { params }).then(obterDadosResposta).then(dados => {
      if (ativo) { definirResultado(dados); definirErro(''); }
    }).catch(e => { if (ativo) definirErro(e.message); }).finally(() => { if (ativo) definirCarregando(false); });
    return () => { ativo = false; };
  }, [tipo, inicio, fim, pagina, versao]);
  const filtrar = (alterar, valor) => { definirCarregando(true); definirErro(''); definirPagina(0); alterar(valor); };
  const nome = id => id ? usuarios.find(u => u.id === id)?.nome || `Usuário #${id}` : 'Não identificado / sistema';
  return <EstruturaModal titulo="Eventos de segurança" subtitulo="Consulta exclusiva do administrador · horários de Manaus" aoFechar={aoFechar} largo>
    <section className={estilos.eventosSeguranca}>
      <p className={estilos.nota}>Logins e mudanças de acesso registrados a partir da atualização. Senhas, tokens, e-mails digitados e IPs não são guardados nesta trilha. Os nomes abaixo são consultados no cadastro atual.</p>
      <div className={estilos.filtros}>
        <label>Evento<select value={tipo} onChange={e=>filtrar(definirTipo,e.target.value)}><option value="">Todos os eventos</option>{Object.entries(TIPOS).map(([valor,rotulo])=><option key={valor} value={valor}>{rotulo}</option>)}</select></label>
        <label>De<input type="date" value={inicio} onChange={e=>filtrar(definirInicio,e.target.value)}/></label>
        <label>Até<input type="date" value={fim} onChange={e=>filtrar(definirFim,e.target.value)}/></label>
      </div>
      {intervaloInvalido ? <p className={estilos.erro} role="alert">A data final não pode ser anterior à inicial.</p> : erro ? <p className={estilos.erro} role="alert">{erro}</p> : carregando ? <p role="status">Carregando eventos…</p> : resultado.itens.length ? <ol className={estilos.listaEventos}>{resultado.itens.map(evento=><li key={evento.id}>
        <div><strong>{TIPOS[evento.tipo] || evento.tipo}</strong><time>{formatarInstanteAdmin(evento.registradoEm)}</time></div>
        <span>Responsável: {nome(evento.atorId)}</span><span>Conta: {nome(evento.alvoId)}</span>
      </li>)}</ol> : <p role="status">Nenhum evento encontrado neste recorte.</p>}
      <div className={estilos.acoesModal}>
        <button type="button" onClick={()=>{definirCarregando(true);definirVersao(v=>v+1);}} disabled={carregando || !!intervaloInvalido}>Atualizar</button>
        <button type="button" disabled={carregando || pagina===0 || !!intervaloInvalido} onClick={()=>{definirCarregando(true);definirPagina(p=>p-1);}}>Anterior</button>
        <span>Página {pagina+1}</span><button type="button" disabled={carregando || !resultado.temMais || !!intervaloInvalido} onClick={()=>{definirCarregando(true);definirPagina(p=>p+1);}}>Próxima</button>
      </div>
    </section>
  </EstruturaModal>;
}
