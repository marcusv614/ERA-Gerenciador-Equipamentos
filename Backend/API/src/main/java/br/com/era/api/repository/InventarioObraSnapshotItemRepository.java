package br.com.era.api.repository;
import br.com.era.api.model.InventarioObraSnapshotItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface InventarioObraSnapshotItemRepository extends JpaRepository<InventarioObraSnapshotItem,Long> { List<InventarioObraSnapshotItem> findBySnapshotIdOrderByModeloAscSerieAsc(Long snapshotId); }
