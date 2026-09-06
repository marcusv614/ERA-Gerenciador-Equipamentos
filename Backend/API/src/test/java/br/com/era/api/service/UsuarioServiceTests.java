package br.com.era.api.service;

import br.com.era.api.dto.UsuarioDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.FuncionarioRepository;
import br.com.era.api.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UsuarioServiceTests {
    private final UsuarioRepository repository = mock(UsuarioRepository.class);
    private final FuncionarioRepository funcionarios = mock(FuncionarioRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final UsuarioService service = new UsuarioService(repository, funcionarios, encoder);

    @Test
    void deveCriarAcessoTecnicoVinculadoComSenhaHasheada() {
        Funcionario tecnico = new Funcionario();
        tecnico.setNome("Técnico Teste");
        when(repository.existsByLoginIgnoreCase("tecnico@era.com")).thenReturn(false);
        when(funcionarios.findById(10L)).thenReturn(Optional.of(tecnico));
        when(encoder.encode("Senha#123")).thenReturn("hash-argon2");
        when(repository.save(any(Usuario.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        UsuarioDto.Resposta resposta = service.cadastrar(new UsuarioDto.Cadastro(
            10L, "Técnico Teste", "TECNICO@ERA.COM", "Senha#123", PerfilUsuario.TECNICO
        ));

        assertEquals(PerfilUsuario.TECNICO, resposta.perfil());
        assertTrue(resposta.deveAlterarSenha());
        verify(encoder).encode("Senha#123");
        verify(repository).save(any(Usuario.class));
    }

    @Test
    void deveRejeitarSenhaComMenosDeOitoCaracteres() {
        when(repository.existsByLoginIgnoreCase("tecnico")).thenReturn(false);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.cadastrar(
            new UsuarioDto.Cadastro(null, "Gerente", "gerente", "1234567", PerfilUsuario.GERENTE)
        ));

        assertTrue(erro.getMessage().contains("8 caracteres"));
    }

    @Test
    void deveExigirFuncionarioParaPerfilTecnico() {
        when(repository.existsByLoginIgnoreCase("tecnico")).thenReturn(false);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.cadastrar(
            new UsuarioDto.Cadastro(null, "Técnico", "tecnico", "Senha#123", PerfilUsuario.TECNICO)
        ));

        assertTrue(erro.getMessage().contains("vinculado"));
    }

    @Test
    void deveImpedirAdministradorDeDesativarPropriaConta() {
        Usuario administrador = new Usuario();
        administrador.setLogin("admin");
        administrador.setPerfil(PerfilUsuario.ADMIN);
        administrador.setAtivo(true);
        when(repository.findById(1L)).thenReturn(Optional.of(administrador));

        RegraNegocioException erro = assertThrows(RegraNegocioException.class,
            () -> service.definirStatus(1L, false, "admin"));

        assertTrue(erro.getMessage().contains("própria conta"));
    }

    @Test
    void deveAtualizarLoginPerfilVinculoESenha() {
        Usuario usuario = new Usuario();
        usuario.setNome("Usuário antigo");
        usuario.setLogin("antigo");
        usuario.setPerfil(PerfilUsuario.GERENTE);
        usuario.setAtivo(true);
        Funcionario tecnico = new Funcionario();
        tecnico.setNome("Técnico atualizado");
        when(repository.findById(2L)).thenReturn(Optional.of(usuario));
        when(repository.existsByLoginIgnoreCaseAndIdNot("novo.login", 2L)).thenReturn(false);
        when(repository.existsByFuncionarioIdAndIdNot(10L, 2L)).thenReturn(false);
        when(funcionarios.findById(10L)).thenReturn(Optional.of(tecnico));
        when(encoder.encode("Senha#Nova123")).thenReturn("novo-hash");

        UsuarioDto.Resposta resposta = service.atualizar(2L, new UsuarioDto.Atualizacao(
            10L, "Nome atualizado", "NOVO.LOGIN", PerfilUsuario.TECNICO, "Senha#Nova123"
        ));

        assertEquals("novo.login", resposta.login());
        assertEquals(PerfilUsuario.TECNICO, resposta.perfil());
        assertTrue(resposta.deveAlterarSenha());
        verify(encoder).encode("Senha#Nova123");
    }

    @Test
    void deveImpedirRebaixamentoDoUltimoAdministradorAtivo() {
        Usuario administrador = new Usuario();
        administrador.setLogin("admin");
        administrador.setPerfil(PerfilUsuario.ADMIN);
        administrador.setAtivo(true);
        when(repository.findById(1L)).thenReturn(Optional.of(administrador));
        when(repository.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)).thenReturn(1L);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.atualizar(
            1L, new UsuarioDto.Atualizacao(null, "Administrador", "admin", PerfilUsuario.GERENTE, null)
        ));

        assertTrue(erro.getMessage().contains("último administrador"));
    }

    @Test
    void deveValidarSenhaDoAdministradorInicial() {
        when(repository.existsByLoginIgnoreCase("admin")).thenReturn(false);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class,
                () -> service.criarAdminInicial("Administrador", "admin", "1234567"));

        assertTrue(erro.getMessage().contains("8 caracteres"));
    }
}
