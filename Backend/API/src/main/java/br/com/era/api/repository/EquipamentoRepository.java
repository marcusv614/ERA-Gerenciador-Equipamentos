package br.com.era.api.repository;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.era.api.model.Equipamento;
import jakarta.persistence.LockModeType;
public interface EquipamentoRepository extends JpaRepository<Equipamento,Long> {
    List<Equipamento> findByTecnicoIdAndAuditavelTrueAndArquivadoFalseOrderByModeloAscSerieAsc(Long tecnicoId);
    boolean existsBySerieIgnoreCase(String serie);
    Optional<Equipamento> findBySerieIgnoreCase(String serie);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Equipamento e where e.id=:id")
    Optional<Equipamento> buscarParaAtualizacao(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Equipamento e where lower(e.serie)=lower(:serie)")
    Optional<Equipamento> buscarPorSerieParaAtualizacao(@Param("serie") String serie);
    List<Equipamento> findByObraIsNullOrderByModeloAsc();
    List<Equipamento> findByObraIdOrderByModeloAscSerieAsc(Long obraId);
    boolean existsByTecnicoIdAndArquivadoFalse(Long tecnicoId);
    boolean existsByObraIdAndArquivadoFalse(Long obraId);
}
