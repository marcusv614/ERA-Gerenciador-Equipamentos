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
    @Test void loginDesconhecidoNaoRegistraLoginDigitado(){
        service.registrarFalha("valor-que-pode-conter-dado-pessoal");
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.LOGIN_FALHA,null,null);
    }
    @Test void quintoErroGeraEventoDeBloqueio(){
        var usuario=new Usuario();org.springframework.test.util.ReflectionTestUtils.setField(usuario,"id",9L);usuario.setTentativasFalhas(4);
        when(repository.buscarLoginParaAtualizacao("tecnico")).thenReturn(Optional.of(usuario));service.registrarFalha("tecnico");
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.LOGIN_BLOQUEADO,null,9L);assertEquals(5,usuario.getTentativasFalhas());
    }
    @Test void listaMetadadosAdministrativosSemExporCredenciais() {
        var u=new Usuario();u.setNome("Administrador");u.setLogin("admin");u.setPerfil(PerfilUsuario.ADMIN);u.setSenhaHash("SEGREDO-QUE-NAO-DEVE-SER-EXPOSTO");
        var login=java.time.OffsetDateTime.parse("2026-10-23T09:00:00-04:00");u.setUltimoLogin(login);u.setBloqueadoAte(login.plusMinutes(15));
        when(repository.findAll()).thenReturn(java.util.List.of(u));
        var resposta=service.listar().getFirst();assertEquals(login,resposta.ultimoLogin());assertEquals(login.plusMinutes(15),resposta.bloqueadoAte());
        var campos=java.util.Arrays.stream(UsuarioDto.Resposta.class.getRecordComponents()).map(java.lang.reflect.RecordComponent::getName).toList();
        assertTrue(campos.contains("criadoEm"));assertTrue(campos.contains("senhaAlteradaEm"));
        org.junit.jupiter.api.Assertions.assertFalse(campos.stream().anyMatch(c->java.util.Set.of("senha","senhaHash","senhaTemporaria","versaoSessao").contains(c)));
    }
    @Test
    void impedeTrocaDeSenhaQuandoRedefinicaoOcorreDuranteARequisicao() {
        Usuario usuario=new Usuario();usuario.setLogin("tecnico");usuario.setSenhaHash("hash");
        long versaoAnterior=usuario.getVersaoSessao();
        usuario.setSenhaHash("hash-redefinido");
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(usuario));
        assertThrows(org.springframework.security.access.AccessDeniedException.class,()->service.alterarSenha(
            1L,new br.com.era.api.dto.AutenticacaoDto.AlterarSenha(null,"NovaUmaFrase#Senha123456456789"),versaoAnterior));
        assertEquals("hash-redefinido",usuario.getSenhaHash());
    }

    @Test
    void tentativaDuranteBloqueioNaoProrrogaBloqueioIndefinidamente() {
        Usuario usuario=new Usuario();usuario.setTentativasFalhas(5);
        var limite=java.time.OffsetDateTime.now().plusMinutes(10);usuario.setBloqueadoAte(limite);
        when(repository.buscarLoginParaAtualizacao("tecnico")).thenReturn(Optional.of(usuario));
        service.registrarFalha("tecnico");
        assertEquals(limite,usuario.getBloqueadoAte());assertEquals(5,usuario.getTentativasFalhas());
    }

    @Test
    void trocaObrigatoriaDispensaRepetirSenhaTemporaria() {
        Usuario usuario = new Usuario(); usuario.setLogin("tecnico"); usuario.setSenhaHash("hash-antigo"); usuario.setDeveAlterarSenha(true);
        usuario.setPerfil(PerfilUsuario.TECNICO);
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(usuario));
        when(encoder.encode("NovaUmaFrase#Senha123456456789")).thenReturn("hash-novo");
        service.alterarSenha(1L, new br.com.era.api.dto.AutenticacaoDto.AlterarSenha(null,"NovaUmaFrase#Senha123456456789"),usuario.getVersaoSessao());
        assertEquals("hash-novo",usuario.getSenhaHash());
        org.junit.jupiter.api.Assertions.assertFalse(usuario.isDeveAlterarSenha());
        org.junit.jupiter.api.Assertions.assertNotNull(usuario.getSenhaAlteradaEm());
    }
    @Test
    void trocaNormalContinuaExigindoSenhaAtual() {
        Usuario usuario = new Usuario(); usuario.setLogin("tecnico"); usuario.setSenhaHash("hash-antigo"); usuario.setDeveAlterarSenha(false);
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(usuario));
        assertThrows(RegraNegocioException.class,()->service.alterarSenha(1L,new br.com.era.api.dto.AutenticacaoDto.AlterarSenha(null,"NovaUmaFrase#Senha123456456789"),usuario.getVersaoSessao()));
        assertEquals("hash-antigo",usuario.getSenhaHash());
    }
    @Test
    void trocaObrigatoriaRejeitaReutilizarSenhaTemporaria() {
        Usuario usuario = new Usuario(); usuario.setLogin("tecnico"); usuario.setSenhaHash("hash-antigo"); usuario.setDeveAlterarSenha(true);
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(usuario));
        when(encoder.matches("Temporaria#123456789","hash-antigo")).thenReturn(true);
        assertThrows(RegraNegocioException.class,()->service.alterarSenha(1L,new br.com.era.api.dto.AutenticacaoDto.AlterarSenha(null,"Temporaria#123456789"),usuario.getVersaoSessao()));
        assertTrue(usuario.isDeveAlterarSenha());
    }
    private final UsuarioRepository repository = mock(UsuarioRepository.class);
    private final FuncionarioRepository funcionarios = mock(FuncionarioRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuditoriaSegurancaService auditoria=mock(AuditoriaSegurancaService.class);
    private final UsuarioService service = new UsuarioService(repository, funcionarios, encoder,auditoria);

    @Test
    void deveCriarAcessoTecnicoVinculadoComSenhaHasheada() {
        Funcionario tecnico = new Funcionario();
        tecnico.setNome("Técnico Teste");
        when(repository.existsByLoginIgnoreCase("tecnico@era.com")).thenReturn(false);
        when(funcionarios.findById(10L)).thenReturn(Optional.of(tecnico));
        when(encoder.encode("UmaFrase#Senha123456")).thenReturn("hash-argon2");
        when(repository.save(any(Usuario.class))).thenAnswer(invocacao -> invocacao.getArgument(0));

        UsuarioDto.Resposta resposta = service.cadastrar(new UsuarioDto.Cadastro(
            10L, "Técnico Teste", "TECNICO@ERA.COM", "UmaFrase#Senha123456", PerfilUsuario.TECNICO
        ));

        assertEquals(PerfilUsuario.TECNICO, resposta.perfil());
        assertTrue(resposta.deveAlterarSenha());
        verify(encoder).encode("UmaFrase#Senha123456");
        verify(repository).save(any(Usuario.class));
    }

    @Test
    void deveRejeitarSenhaComMenosDeOitoCaracteres() {
        when(repository.existsByLoginIgnoreCase("tecnico")).thenReturn(false);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.cadastrar(
            new UsuarioDto.Cadastro(null, "Gerente", "gerente", "1234567", PerfilUsuario.GERENTE)
        ));

        assertTrue(erro.getMessage().contains("8 a 128"));
    }

    @Test
    void deveExigirFuncionarioParaPerfilTecnico() {
        when(repository.existsByLoginIgnoreCase("tecnico")).thenReturn(false);

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.cadastrar(
            new UsuarioDto.Cadastro(null, "Técnico", "tecnico", "UmaFrase#Senha123456", PerfilUsuario.TECNICO)
        ));

        assertTrue(erro.getMessage().contains("vinculado"));
    }

    @Test
    void deveImpedirAdministradorDeDesativarPropriaConta() {
        Usuario administrador = new Usuario();
        administrador.setLogin("admin");
        administrador.setPerfil(PerfilUsuario.ADMIN);
        administrador.setAtivo(true);
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(administrador));

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
        when(repository.buscarIdParaAtualizacao(2L)).thenReturn(Optional.of(usuario));
        when(repository.existsByLoginIgnoreCaseAndIdNot("novo.login", 2L)).thenReturn(false);
        when(repository.existsByFuncionarioIdAndIdNot(10L, 2L)).thenReturn(false);
        when(funcionarios.findById(10L)).thenReturn(Optional.of(tecnico));
        when(encoder.encode("UmaSenha#Nova123456")).thenReturn("novo-hash");

        UsuarioDto.Resposta resposta = service.atualizar(2L, new UsuarioDto.Atualizacao(
            10L, "Nome atualizado", "NOVO.LOGIN", PerfilUsuario.TECNICO, "UmaSenha#Nova123456"
        ));

        assertEquals("novo.login", resposta.login());
        assertEquals(PerfilUsuario.TECNICO, resposta.perfil());
        assertTrue(resposta.deveAlterarSenha());
        verify(encoder).encode("UmaSenha#Nova123456");
    }

    @Test
    void deveImpedirRebaixamentoDoUltimoAdministradorAtivo() {
        Usuario administrador = new Usuario();
        administrador.setLogin("admin");
        administrador.setPerfil(PerfilUsuario.ADMIN);
        administrador.setAtivo(true);
        when(repository.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(administrador));
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

        assertTrue(erro.getMessage().contains("8 a 128"));
    }
}
