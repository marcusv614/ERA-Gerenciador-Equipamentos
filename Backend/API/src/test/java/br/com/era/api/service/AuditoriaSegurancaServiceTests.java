package br.com.era.api.service;

import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.PerfilUsuario;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.OffsetDateTime;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AuditoriaSegurancaServiceTests {
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final AuditoriaSegurancaService service=new AuditoriaSegurancaService(jdbc);
    @AfterEach void limpar(){SecurityContextHolder.clearContext();}
    @Test void registraSomenteTipoEIdsComParametros(){
        service.registrar(AuditoriaSegurancaService.Tipo.LOGIN_FALHA,null,10L);
        verify(jdbc).update(eq("INSERT INTO eventos_seguranca(tipo,ator_id,alvo_id) VALUES (?,?,?)"),
            eq(new Object[]{"LOGIN_FALHA",null,10L}),any(int[].class));
    }
    @Test void somenteAdminPodeConsultar(){
        assertThrows(AccessDeniedException.class,()->service.listar(null,null,null,0));
        for(PerfilUsuario perfil:PerfilUsuario.values())if(perfil!=PerfilUsuario.ADMIN){autenticar(perfil);assertThrows(AccessDeniedException.class,()->service.listar(null,null,null,0));}
        verifyNoInteractions(jdbc);
    }
    @Test void consultaTemLimiteEOrdenacaoEstaveis(){
        autenticar(PerfilUsuario.ADMIN);
        when(jdbc.query(anyString(),any(RowMapper.class),any(Object[].class))).thenReturn(List.of());
        var resultado=service.listar(AuditoriaSegurancaService.Tipo.LOGIN_FALHA,OffsetDateTime.parse("2026-10-23T00:00:00-04:00"),null,2);
        assertTrue(resultado.itens().isEmpty());assertFalse(resultado.temMais());assertEquals(2,resultado.pagina());
        verify(jdbc).query(contains("tipo=? AND registrado_em>=? ORDER BY registrado_em DESC,id DESC LIMIT 51 OFFSET ?"),any(RowMapper.class),any(Object[].class));
    }
    @Test void rejeitaIntervaloInvertidoEPaginaInvalida(){
        autenticar(PerfilUsuario.ADMIN);
        assertThrows(RegraNegocioException.class,()->service.listar(null,null,null,-1));
        assertThrows(RegraNegocioException.class,()->service.listar(null,null,null,10001));
        var agora=OffsetDateTime.now();assertThrows(RegraNegocioException.class,()->service.listar(null,agora,agora.minusDays(1),0));verifyNoInteractions(jdbc);
    }
    private void autenticar(PerfilUsuario perfil){SecurityContextHolder.getContext().setAuthentication(UsernamePasswordAuthenticationToken.authenticated("teste",null,List.of(new SimpleGrantedAuthority("ROLE_"+perfil.name()))));}
}
