package br.com.era.api.repository;

import br.com.era.api.model.TokenRecuperacao;
import br.com.era.api.model.TokenRecuperacao.Finalidade;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.OffsetDateTime;
import java.util.Optional;

public interface TokenRecuperacaoRepository extends JpaRepository<TokenRecuperacao,Long> {
    Optional<TokenRecuperacao> findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(Long usuarioId,Finalidade finalidade);
    @Query("select t.usuarioId from TokenRecuperacao t where t.tokenHash=:hash")
    Optional<Long> buscarUsuarioPeloHash(@Param("hash") String hash);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from TokenRecuperacao t where t.tokenHash=:hash")
    Optional<TokenRecuperacao> buscarParaAtualizacao(@Param("hash") String hash);
    @Modifying
    @Query("update TokenRecuperacao t set t.usadoEm=:agora where t.usuarioId=:id and t.finalidade=:finalidade and t.usadoEm is null")
    void invalidar(@Param("id") Long id,@Param("finalidade") Finalidade finalidade,@Param("agora") OffsetDateTime agora);
}
