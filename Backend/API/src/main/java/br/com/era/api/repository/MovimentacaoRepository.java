package br.com.era.api.repository;
import br.com.era.api.model.Movimentacao;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface MovimentacaoRepository extends JpaRepository<Movimentacao,Long> {
    boolean existsByEquipamentoId(Long equipamentoId);
    List<Movimentacao> findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(Long equipamentoId);
    List<Movimentacao> findByObraOrigemIdOrObraDestinoIdOrderByDataMovimentacaoAscIdAsc(Long origemId,Long destinoId);
    Optional<Movimentacao> findBySolicitacaoIdAndEquipamentoId(Long solicitacaoId,Long equipamentoId);
    List<Movimentacao> findBySolicitacaoId(Long solicitacaoId);
}
