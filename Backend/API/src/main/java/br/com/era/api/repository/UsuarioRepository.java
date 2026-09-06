package br.com.era.api.repository;
import br.com.era.api.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UsuarioRepository extends JpaRepository<Usuario,Long> { Optional<Usuario> findByLoginIgnoreCase(String login); Optional<Usuario> findByFuncionarioId(Long funcionarioId); boolean existsByLoginIgnoreCase(String login); boolean existsByLoginIgnoreCaseAndIdNot(String login,Long id); boolean existsByFuncionarioId(Long funcionarioId); boolean existsByFuncionarioIdAndIdNot(Long funcionarioId,Long id); long countByPerfilAndAtivoTrue(br.com.era.api.model.PerfilUsuario perfil); }
