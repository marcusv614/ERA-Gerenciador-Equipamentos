package br.com.era.api.repository;
import br.com.era.api.model.Solicitacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;
public interface SolicitacaoRepository extends JpaRepository<Solicitacao,Long> {
    List<Solicitacao> findByTecnicoIdOrderByCriadoEmDesc(Long tecnicoId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Solicitacao s where s.id=:id")
    Optional<Solicitacao> buscarParaAtualizacao(@Param("id") Long id);
    @Query("select (count(s)>0) from Solicitacao s where (s.tecnico.id=:id or s.solicitante.id=:id) and s.status not in ('Concluída','Rejeitada')") boolean existeAbertaParaFuncionario(@Param("id") Long id);
    @Query("select (count(s)>0) from Solicitacao s where (s.obraOrigem.id=:id or s.obraDestino.id=:id) and s.status not in ('Concluída','Rejeitada')") boolean existeAbertaParaObra(@Param("id") Long id);
}
