package br.com.era.api.repository;
import br.com.era.api.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface UsuarioRepository extends JpaRepository<Usuario,Long> { Optional<Usuario> findByLoginIgnoreCase(String login); boolean existsByLoginIgnoreCase(String login); boolean existsByFuncionarioId(Long funcionarioId); long countByPerfilAndAtivoTrue(br.com.era.api.model.PerfilUsuario perfil); }
