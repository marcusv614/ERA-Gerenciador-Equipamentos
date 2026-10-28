package br.com.era.api.service;

import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.EnumSet;

@Service
public class NotificacaoMovimentacaoService {
    private final NotificacaoMovimentacaoRepository repository;
    private final UsuarioRepository contas;
    private final UsuarioService usuarios;
    public NotificacaoMovimentacaoService(NotificacaoMovimentacaoRepository repository,UsuarioRepository contas,UsuarioService usuarios){this.repository=repository;this.contas=contas;this.usuarios=usuarios;}
    public record Aviso(Long id,Long solicitacaoId,Long obraId,String obraNome,boolean destinatario,List<NotificacaoMovimentacao.Item> materiais,OffsetDateTime criadaEm,OffsetDateTime lidaEm,String status,String tipo,String mensagem) {}
    private boolean epi(Solicitacao s){return !s.getMateriais().isEmpty()&&s.getMateriais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));}
    private PerfilUsuario gestor(Solicitacao s){return epi(s)?PerfilUsuario.RH:PerfilUsuario.GERENTE;}
    private void enviar(Solicitacao s,String tipo,String mensagem,java.util.Collection<PerfilUsuario> perfis,boolean solicitante){
        var destinatarios=new java.util.LinkedHashMap<Long,Usuario>();
        if(!perfis.isEmpty())contas.findByAtivoTrueAndPerfilIn(perfis).stream().filter(Usuario::isAtivo).filter(u->perfis.contains(u.getPerfil())).forEach(u->destinatarios.put(u.getId(),u));
        if(solicitante)contas.findByFuncionarioId(s.getTecnico().getId()).filter(Usuario::isAtivo).filter(u->u.getPerfil()==(epi(s)?PerfilUsuario.TST:PerfilUsuario.TECNICO)).ifPresent(u->destinatarios.put(u.getId(),u));
        repository.saveAll(destinatarios.values().stream().map(u->{
            var existente=repository.findByUsuarioIdAndSolicitacaoIdAndTipo(u.getId(),s.getId(),tipo);
            if(existente.isPresent()){existente.get().renovar(u,s,mensagem);return existente.get();}
            return new NotificacaoMovimentacao(u,s,tipo,mensagem);
        }).toList());
    }
    @Transactional public void notificarNovoPedido(Solicitacao s){
        if("Pendente".equals(s.getStatus()))enviar(s,"NOVO_PEDIDO","Novo pedido de "+(epi(s)?"EPI":"materiais")+" de "+s.getTecnico().getNome()+". Analise para aprovar, editar ou rejeitar.",EnumSet.of(gestor(s)),false);
        else if(s.isMovimentacaoDireta())notificarPlanoLiberado(s);
        else notificarAnaliseFinanceira(s);
    }
    @Transactional public void notificarAnaliseFinanceira(Solicitacao s){
        enviar(s,"ANALISE_FINANCEIRA","Pedido aprovado pelo setor responsável. Defina o plano de transporte e compra e confirme a análise financeira.",EnumSet.of(PerfilUsuario.FINANCEIRO),false);
    }
    @Transactional public void notificarPlanoLiberado(Solicitacao s){
        enviar(s,"ATENDIMENTO_LIBERADO",s.isMovimentacaoDireta()?"Transporte direto autorizado. Confira a origem e providencie a movimentação; não exige análise financeira.":"Plano aprovado pelo Financeiro. Confira as origens e execute somente as compras e transportes autorizados.",EnumSet.of(PerfilUsuario.ESTOQUE),false);
    }
    @Transactional public void notificarRejeicao(Solicitacao s,boolean financeira){
        enviar(s,"PEDIDO_REJEITADO",financeira?"O Financeiro rejeitou o pedido. Consulte a observação e o histórico antes de fazer uma nova solicitação.":"Seu pedido foi rejeitado pelo setor responsável. Consulte a observação antes de solicitar novamente.",financeira?EnumSet.of(gestor(s)):EnumSet.noneOf(PerfilUsuario.class),true);
    }
    @Transactional public void notificarAlteracaoFinanceira(Solicitacao s){
        var perfis=EnumSet.of(gestor(s));if("Aprovada".equals(s.getStatus()))perfis.add(PerfilUsuario.ESTOQUE);
        enviar(s,"AJUSTE_FINANCEIRO","O Financeiro alterou o pedido, o planejamento ou uma observação. Revise o histórico atualizado antes de acompanhar ou executar o atendimento.",perfis,false);
    }
    @Transactional public void notificarRecebimento(Solicitacao s){
        enviar(s,"RECEBIMENTO_CONFIRMADO",s.getObraDestino()==null?"Retorno ao depósito confirmado pelo Estoque. A movimentação está registrada no histórico.":"Recebimento confirmado por "+s.getTecnico().getNome()+". A entrega e a movimentação estão registradas no histórico.",EnumSet.of(gestor(s),PerfilUsuario.ESTOQUE),false);
    }
    @Transactional public void notificarCancelamento(Solicitacao s,String tipo,String mensagem){
        boolean encerrado="CANCELAMENTO_CONFIRMADO".equals(tipo);
        var perfis=EnumSet.noneOf(PerfilUsuario.class);
        String anterior=s.getStatusAntesCancelamento();
        if(encerrado)perfis.add(gestor(s));
        if(!s.isMovimentacaoDireta()&&!"Pendente".equals(anterior))perfis.add(PerfilUsuario.FINANCEIRO);
        if(s.isMovimentacaoDireta()&&!encerrado)perfis.add(gestor(s));
        boolean estoque=java.util.Set.of("Aprovada","Aguardando coleta","Em trânsito").contains(java.util.Objects.toString(anterior,""));
        if(estoque)perfis.add(PerfilUsuario.ESTOQUE);
        enviar(s,tipo,mensagem,perfis,encerrado);
    }
    public record Caixa(List<Aviso> itens,long naoLidas,boolean temMais) {}
    @Transactional public void notificarEnvio(Solicitacao pedido) {
        if(pedido.getObraDestino()==null)return;
        PerfilUsuario perfil=contas.findByFuncionarioId(pedido.getTecnico().getId()).filter(Usuario::isAtivo).map(Usuario::getPerfil).orElse(null);
        if(perfil==null||perfil!=(epi(pedido)?PerfilUsuario.TST:PerfilUsuario.TECNICO))return;
        var destinatarios=contas.buscarResponsaveisParaAviso(pedido.getObraDestino().getId(),perfil);
        repository.saveAll(destinatarios.stream().filter(Usuario::isAtivo).filter(u->u.getPerfil()==perfil).map(u->new NotificacaoMovimentacao(u,pedido)).toList());
    }
    private Usuario titular(String login){Usuario u=usuarios.buscarPorLogin(login);if(!u.isAtivo())throw new AccessDeniedException("Esta conta não pode acessar notificações.");return u;}
    @Transactional(readOnly=true) public Caixa listar(String login,int pagina){
        Usuario u=titular(login);var resultado=repository.listar(u.getId(),PageRequest.of(Math.max(0,Math.min(pagina,10000)),20));
        return new Caixa(resultado.map(this::resposta).getContent(),repository.contarNaoLidas(u.getId()),resultado.hasNext());
    }
    @Transactional public Aviso marcarLida(String login,Long id){
        Usuario u=titular(login);var n=repository.buscarDoUsuario(id,u.getId()).orElseThrow(()->new RecursoNaoEncontradoException("Notificação não encontrada."));
        n.marcarLida();return resposta(n);
    }
    private Aviso resposta(NotificacaoMovimentacao n){return new Aviso(n.getId(),n.getSolicitacaoId(),n.getObraId(),n.getObraNome(),n.isDestinatario(),n.getMateriais(),n.getCriadaEm(),n.getLidaEm(),n.getStatus(),n.getTipo(),n.getMensagem());}
}
