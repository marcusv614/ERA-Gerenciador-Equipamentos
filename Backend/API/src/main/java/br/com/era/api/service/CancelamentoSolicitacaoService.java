package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import br.com.era.api.exception.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.*;

/** Suspensão é imediata; saldo só é liberado depois das conferências necessárias. */
@Service
public class CancelamentoSolicitacaoService {
    private final SolicitacaoRepository pedidos;
    private final EquipamentoRepository equipamentos;
    private final UsuarioService usuarios;
    private final NotificacaoMovimentacaoService avisos;
    public CancelamentoSolicitacaoService(SolicitacaoRepository p,EquipamentoRepository e,UsuarioService u,NotificacaoMovimentacaoService n){pedidos=p;equipamentos=e;usuarios=u;avisos=n;}
    public record Estado(String status,String statusAnterior,String motivo,boolean financeiroConfirmou,boolean estoqueConferiu,
        boolean exigeEstoque,boolean podeSolicitar,boolean podeConfirmarFinanceiro,boolean podeConferirEstoque,List<Solicitacao.EventoFinanceiro> historico) {}
    private Solicitacao buscar(Long id){return pedidos.buscarParaAtualizacao(id).filter(s->"Movimentação".equals(s.getTipo())).orElseThrow(()->new RecursoNaoEncontradoException("Solicitação não encontrada."));}
    private boolean epi(Solicitacao s){return !s.getMateriais().isEmpty()&&s.getMateriais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));}
    private void escopo(Solicitacao s,Usuario u){
        if(!u.isAtivo())throw new AccessDeniedException("Conta inativa.");
        if(u.getPerfil()==PerfilUsuario.ESTOQUE&&Set.of("Pendente","Aguardando financeiro").contains(s.getStatus()))throw new RecursoNaoEncontradoException("Solicitação não encontrada.");
        if(u.getPerfil()==PerfilUsuario.RH&&!epi(s))throw new RecursoNaoEncontradoException("Solicitação não encontrada.");
        if(u.getPerfil().ehProfissionalDeCampo()&&(u.getFuncionario()==null||!Objects.equals(u.getFuncionario().getId(),s.getTecnico().getId())||(u.getPerfil()==PerfilUsuario.TST)!=epi(s)))throw new RecursoNaoEncontradoException("Solicitação não encontrada.");
        if(u.getPerfil()==PerfilUsuario.FINANCEIRO&&(s.isMovimentacaoDireta()||"Pendente".equals(s.getStatus())))throw new RecursoNaoEncontradoException("Solicitação não encontrada.");
    }
    private boolean gestor(Solicitacao s,Usuario u){return u.getPerfil()==PerfilUsuario.ADMIN||(epi(s)?u.getPerfil()==PerfilUsuario.RH:u.getPerfil()==PerfilUsuario.GERENTE);}
    private boolean financeiro(Solicitacao s,Usuario u){return u.getPerfil()==PerfilUsuario.ADMIN||(s.isMovimentacaoDireta()?gestor(s,u):u.getPerfil()==PerfilUsuario.FINANCEIRO);}
    private boolean estoque(Usuario u){return Set.of(PerfilUsuario.ADMIN,PerfilUsuario.ESTOQUE).contains(u.getPerfil());}
    private boolean exigeEstoque(Solicitacao s){return "Em trânsito".equals(s.getStatusAntesCancelamento())||s.getMateriais().stream().anyMatch(m->m.getIdentificacao()!=null||m.getQuantidadeAdquirida()>0||m.getQuantidadeEntradaEstoque()>0)||s.getEventosFinanceiros().stream().anyMatch(e->"INICIO_ATENDIMENTO".equals(e.tipo()));}
    private boolean podeSolicitar(Solicitacao s,Usuario u){
        if(!Set.of("Pendente","Aguardando financeiro","Aprovada","Aguardando coleta","Em trânsito").contains(s.getStatus()))return false;
        return gestor(s,u)||financeiro(s,u)||estoque(u)||("Pendente".equals(s.getStatus())&&Objects.equals(u.getLogin(),s.getSolicitanteLogin()));
    }
    private Estado estado(Solicitacao s,Usuario u){boolean suspenso="Cancelamento solicitado".equals(s.getStatus());return new Estado(s.getStatus(),s.getStatusAntesCancelamento(),s.getMotivoCancelamento(),s.isFinanceiroCancelamentoConfirmado(),s.isEstoqueCancelamentoConfirmado(),exigeEstoque(s),podeSolicitar(s,u),suspenso&&financeiro(s,u)&&!s.isFinanceiroCancelamentoConfirmado(),suspenso&&estoque(u)&&exigeEstoque(s)&&!s.isEstoqueCancelamentoConfirmado(),s.getEventosFinanceiros().stream().filter(e->e.tipo().startsWith("CANCELAMENTO")).toList());}
    @Transactional public Estado consultar(Long id,String login){var s=buscar(id);var u=usuarios.buscarPorLogin(login);escopo(s,u);return estado(s,u);}
    @Transactional public Estado solicitar(Long id,String motivo,String login){
        var s=buscar(id);var u=usuarios.buscarPorLogin(login);escopo(s,u);validarMotivo(motivo);
        if(Set.of("Cancelada","Cancelamento solicitado").contains(s.getStatus()))return estado(s,u);
        if(!podeSolicitar(s,u))throw new AccessDeniedException("Pedido encerrado ou sem permissão. Para entregas concluídas, registre uma devolução vinculada por transporte direto.");
        s.setStatusAntesCancelamento(s.getStatus());s.setMotivoCancelamento(motivo.trim());s.setStatus("Cancelamento solicitado");
        s.registrarEventoFinanceiro("CANCELAMENTO_SOLICITADO","Atendimento suspenso. Estado anterior: "+s.getStatusAntesCancelamento()+". Motivo: "+motivo.trim(),u);
        boolean inicial="Pendente".equals(s.getStatusAntesCancelamento());
        s.setFinanceiroCancelamentoConfirmado((inicial&&!estoque(u))||financeiro(s,u));
        avisos.notificarCancelamento(s,"CANCELAMENTO_SOLICITADO","Cancelamento solicitado: "+motivo.trim());
        finalizarSePossivel(s,u);return estado(s,u);
    }
    @Transactional public Estado confirmar(Long id,String motivo,boolean conferenciaFisica,String login){
        var s=buscar(id);var u=usuarios.buscarPorLogin(login);escopo(s,u);validarMotivo(motivo);
        if("Cancelada".equals(s.getStatus()))return estado(s,u);
        if(!"Cancelamento solicitado".equals(s.getStatus()))throw new RegraNegocioException("Solicite o cancelamento antes de confirmar.");
        if(conferenciaFisica){
            if(!estoque(u))throw new AccessDeniedException("Somente Estoque ou ADMIN pode confirmar a conferência física.");
            if(!s.isEstoqueCancelamentoConfirmado()){
                s.setEstoqueCancelamentoConfirmado(true);
                s.registrarEventoFinanceiro("CANCELAMENTO_CONFERENCIA","Estoque confirmou interrupção das providências e retorno de todos os itens à origem registrada; compras recebidas permanecem no depósito. Conferência: "+motivo.trim(),u);
            }
        }else{
            if(!financeiro(s,u))throw new AccessDeniedException("A confirmação cabe ao Financeiro (ou gestor no transporte direto).");
            if(!s.isFinanceiroCancelamentoConfirmado()){
                s.setFinanceiroCancelamentoConfirmado(true);
                s.registrarEventoFinanceiro("CANCELAMENTO_FINANCEIRO","Compra pendente tratada; notas e compras realizadas preservadas. Parecer: "+motivo.trim(),u);
            }
        }
        finalizarSePossivel(s,u);return estado(s,u);
    }
    private void validarMotivo(String motivo){if(motivo==null||motivo.trim().length()<5||motivo.length()>1000)throw new RegraNegocioException("Informe um motivo ou parecer entre 5 e 1000 caracteres.");}
    private void finalizarSePossivel(Solicitacao s,Usuario u){
        if(!s.isFinanceiroCancelamentoConfirmado()||(exigeEstoque(s)&&!s.isEstoqueCancelamentoConfirmado()))return;
        // Cada atendimento é independente: não alterar filhos nem entregas já concluídas.
        Map<Long,Integer> reservas=new TreeMap<>();
        if(s.isReservasPlanoAtivas()){
            s.getPlanoFinanceiro().forEach(p->p.origens().forEach(o->reservas.merge(o.equipamentoId(),o.quantidade(),Math::addExact)));
            s.getEntradasCompra().forEach(o->reservas.merge(o.equipamentoId(),o.quantidade(),Math::addExact));
        }else for(var m:s.getMateriais())if(m.getIdentificacao()!=null&&!m.getIdentificacao().isBlank()){
            var e=equipamentos.buscarPorSerieParaAtualizacao(m.getIdentificacao()).orElseThrow(()->new RegraNegocioException("Confira o equipamento reservado antes de cancelar."));
            reservas.merge(e.getId(),m.getQuantidade(),Math::addExact);
        }
        for(var r:reservas.entrySet()){
            var e=equipamentos.buscarParaAtualizacao(r.getKey()).orElseThrow();
            if(e.getQuantidadeReservada()<r.getValue())throw new RegraNegocioException("Reserva inconsistente; nenhuma baixa foi aplicada. Confira o estoque.");
            e.setQuantidadeReservada(e.getQuantidadeReservada()-r.getValue());
        }
        s.setReservasPlanoAtivas(false);s.setStatus("Cancelada");s.setDataDecisao(LocalDate.now());
        s.registrarEventoFinanceiro("CANCELAMENTO_CONFIRMADO","Cancelamento confirmado somente deste atendimento. Reservas liberadas; compras, notas, entregas anteriores e pedidos vinculados preservados.",u);
        avisos.notificarCancelamento(s,"CANCELAMENTO_CONFIRMADO","Pedido cancelado. Consulte o motivo e as conferências no histórico.");
    }
}
