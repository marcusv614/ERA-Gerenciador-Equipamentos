package br.com.era.api.repository;
import br.com.era.api.model.InventarioObraSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;
public interface InventarioObraSnapshotRepository extends JpaRepository<InventarioObraSnapshot,Long> {
    Optional<InventarioObraSnapshot> findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(Long obraId,LocalDate data);
}
