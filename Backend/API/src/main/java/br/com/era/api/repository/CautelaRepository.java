package br.com.era.api.repository;
import br.com.era.api.model.Cautela;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CautelaRepository extends JpaRepository<Cautela,Long> {
    boolean existsBySolicitacaoId(Long solicitacaoId);
    List<Cautela> findBySolicitacaoIdOrderByEmitidaEmDesc(Long solicitacaoId);
    List<Cautela> findAllByOrderByEmitidaEmDesc();
}
