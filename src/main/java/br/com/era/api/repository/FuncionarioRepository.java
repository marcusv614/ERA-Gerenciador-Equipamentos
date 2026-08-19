package br.com.era.api.repository;
import br.com.era.api.model.Funcionario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface FuncionarioRepository extends JpaRepository<Funcionario,Long> {
    boolean existsByEmailIgnoreCase(String email);
    Optional<Funcionario> findByNomeIgnoreCase(String nome);
}
