package br.com.era.api.repository;

import br.com.era.api.model.NotificacaoMovimentacao;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import java.util.Optional;

public interface NotificacaoMovimentacaoRepository extends JpaRepository<NotificacaoMovimentacao,Long> {
    // Cada conta acessa apenas seus avisos. O vínculo com a obra continua obrigatório para profissionais de campo.
    String ESCOPO=" from NotificacaoMovimentacao n where n.usuario.id=:usuarioId and n.usuario.ativo=true and n.usuario.perfil=n.perfil and (n.usuario.perfil in (br.com.era.api.model.PerfilUsuario.ADMIN,br.com.era.api.model.PerfilUsuario.GERENTE,br.com.era.api.model.PerfilUsuario.RH,br.com.era.api.model.PerfilUsuario.ESTOQUE) or (n.usuario.perfil=br.com.era.api.model.PerfilUsuario.FINANCEIRO and n.solicitacao.movimentacaoDireta=false) or (n.usuario.perfil in (br.com.era.api.model.PerfilUsuario.TECNICO,br.com.era.api.model.PerfilUsuario.TST) and exists (select f.id from Funcionario f, Obra o join o.responsaveis r where f.id=n.usuario.funcionario.id and f.arquivado=false and f.status='Ativo' and o.id=n.obra.id and r.id=f.id)))";
    @Query("select n"+ESCOPO+" order by n.criadaEm desc,n.id desc")
    Page<NotificacaoMovimentacao> listar(@Param("usuarioId") Long usuarioId,Pageable pagina);
    @Query("select count(n)"+ESCOPO+" and n.lidaEm is null")
    long contarNaoLidas(@Param("usuarioId") Long usuarioId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n"+ESCOPO+" and n.id=:id")
    Optional<NotificacaoMovimentacao> buscarDoUsuario(@Param("id") Long id,@Param("usuarioId") Long usuarioId);
}
