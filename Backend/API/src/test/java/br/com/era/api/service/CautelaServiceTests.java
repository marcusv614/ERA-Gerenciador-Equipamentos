package br.com.era.api.service;

import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.CautelaRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CautelaServiceTests {

    @Test
    void deveImpedirTecnicoDeConsultarDadosParaExportacaoDaCautela() {
        CautelaRepository repository = mock(CautelaRepository.class);
        UsuarioService usuarios = mock(UsuarioService.class);
        Usuario tecnico = new Usuario();
        tecnico.setPerfil(PerfilUsuario.TECNICO);
        when(usuarios.buscarPorLogin("tecnico")).thenReturn(tecnico);
        CautelaService service = new CautelaService(repository, usuarios);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class,
                () -> service.listar(null, "tecnico"));

        assertEquals("O perfil técnico não possui permissão para exportar cautelas.", erro.getMessage());
        verifyNoInteractions(repository);
    }
}
