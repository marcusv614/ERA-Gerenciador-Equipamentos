package br.com.era.api.repository;
import br.com.era.api.model.Equipamento;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;
public interface EquipamentoRepository extends JpaRepository<Equipamento,Long> {
    boolean existsBySerieIgnoreCase(String serie);
    Optional<Equipamento> findBySerieIgnoreCase(String serie);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Equipamento e where lower(e.serie)=lower(:serie)")
    Optional<Equipamento> buscarPorSerieParaAtualizacao(@Param("serie") String serie);
    List<Equipamento> findByObraIsNullOrderByModeloAsc();
    List<Equipamento> findByObraIdOrderByModeloAscSerieAsc(Long obraId);
    boolean existsByTecnicoIdAndArquivadoFalse(Long tecnicoId);
    boolean existsByObraIdAndArquivadoFalse(Long obraId);
}
