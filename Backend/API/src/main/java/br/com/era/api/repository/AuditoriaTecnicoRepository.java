package br.com.era.api.repository;
import br.com.era.api.model.AuditoriaTecnico;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
public interface AuditoriaTecnicoRepository extends JpaRepository<AuditoriaTecnico,Long> {
    List<AuditoriaTecnico> findAllByOrderByCriadoEmDescIdDesc();
    List<AuditoriaTecnico> findByFuncionarioIdOrderByCriadoEmDescIdDesc(Long funcionarioId);
    Optional<AuditoriaTecnico> findByIdAndFuncionarioId(Long id,Long funcionarioId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AuditoriaTecnico a where a.id=:id and a.funcionario.id=:funcionarioId")
    Optional<AuditoriaTecnico> buscarParaAtualizacao(@Param("id") Long id,@Param("funcionarioId") Long funcionarioId);
}
