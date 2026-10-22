package br.com.era.api.repository;
import br.com.era.api.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
public interface UsuarioRepository extends JpaRepository<Usuario,Long> {
    java.util.List<Usuario> findByAtivoTrueAndPerfilIn(java.util.Collection<br.com.era.api.model.PerfilUsuario> perfis);
    @Query("select distinct u from Usuario u join u.funcionario f, Obra o join o.responsaveis r where o.id=:obraId and r.id=f.id and u.ativo=true and f.arquivado=false and f.status='Ativo' and u.perfil=:perfil")
    java.util.List<Usuario> buscarResponsaveisParaAviso(@Param("obraId") Long obraId,@Param("perfil") br.com.era.api.model.PerfilUsuario perfil);
    Optional<Usuario> findByLoginIgnoreCase(String login);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where lower(u.login)=lower(:login)")
    Optional<Usuario> buscarLoginParaAtualizacao(@Param("login") String login);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from Usuario u where u.id=:id")
    Optional<Usuario> buscarIdParaAtualizacao(@Param("id") Long id);
    Optional<Usuario> findByFuncionarioId(Long funcionarioId); boolean existsByLoginIgnoreCase(String login); boolean existsByLoginIgnoreCaseAndIdNot(String login,Long id); boolean existsByFuncionarioId(Long funcionarioId); boolean existsByFuncionarioIdAndIdNot(Long funcionarioId,Long id); long countByPerfilAndAtivoTrue(br.com.era.api.model.PerfilUsuario perfil);
}
