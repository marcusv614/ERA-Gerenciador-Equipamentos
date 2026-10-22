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
import java.util.ArrayList;
import java.util.EnumSet;

@Service
public class NotificacaoMovimentacaoService {
    private final NotificacaoMovimentacaoRepository repository;
    private final UsuarioRepository contas;
    private final UsuarioService usuarios;
    public NotificacaoMovimentacaoService(NotificacaoMovimentacaoRepository repository,UsuarioRepository contas,UsuarioService usuarios){this.repository=repository;this.contas=contas;this.usuarios=usuarios;}
    public record Aviso(Long id,Long solicitacaoId,Long obraId,String obraNome,boolean destinatario,List<NotificacaoMovimentacao.Item> materiais,OffsetDateTime criadaEm,OffsetDateTime lidaEm,String status) {}
    public record Caixa(List<Aviso> itens,long naoLidas,boolean temMais) {}
    @Transactional public void notificarEnvio(Solicitacao pedido) {
        if(pedido.getObraDestino()==null)return;
        PerfilUsuario perfil=contas.findByFuncionarioId(pedido.getTecnico().getId()).filter(Usuario::isAtivo).map(Usuario::getPerfil).orElse(null);
        var destinatarios=new ArrayList<Usuario>();
        if(perfil!=null&&perfil.ehProfissionalDeCampo())destinatarios.addAll(contas.buscarResponsaveisParaAviso(pedido.getObraDestino().getId(),perfil));
        var perfis=EnumSet.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE);
        if(!pedido.isMovimentacaoDireta())perfis.add(PerfilUsuario.FINANCEIRO);
        boolean epi=!pedido.getMateriais().isEmpty()&&pedido.getMateriais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()));
        if(epi&&perfil==PerfilUsuario.TST)perfis.add(PerfilUsuario.RH);
        destinatarios.addAll(contas.findByAtivoTrueAndPerfilIn(perfis));
        repository.saveAll(destinatarios.stream().map(u->new NotificacaoMovimentacao(u,pedido)).toList());
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
    private Aviso resposta(NotificacaoMovimentacao n){return new Aviso(n.getId(),n.getSolicitacaoId(),n.getObraId(),n.getObraNome(),n.isDestinatario(),n.getMateriais(),n.getCriadaEm(),n.getLidaEm(),n.getStatus());}
}
