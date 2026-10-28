package br.com.era.api.service;

import br.com.era.api.dto.UsuarioDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaUsuarioGestaoTests {
    private final UsuarioRepository contas = mock(UsuarioRepository.class);
    private final FuncionarioRepository funcionarios = mock(FuncionarioRepository.class);
    private final PasswordEncoder encoder = mock(PasswordEncoder.class);
    private final AuditoriaSegurancaService auditoria = mock(AuditoriaSegurancaService.class);
    private final UsuarioService service = new UsuarioService(contas, funcionarios, encoder, auditoria);
    private static final String SENHA = "UmaFrase#Senha123456";

    @BeforeEach void atorAutenticado() { when(auditoria.atorAtual()).thenReturn(99L); }

    private Usuario usuario(PerfilUsuario perfil) {
        Usuario u = new Usuario();
        ReflectionTestUtils.setField(u, "id", 1L);
        u.setNome("Pessoa"); u.setLogin("pessoa"); u.setPerfil(perfil); u.setSenhaHash("hash");
        when(contas.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(u));
        return u;
    }
    private Funcionario funcionario(boolean arquivado) {
        Funcionario f = new Funcionario(); f.setNome("Pessoa");
        ReflectionTestUtils.setField(f, "id", 10L);
        ReflectionTestUtils.setField(f, "arquivado", arquivado);
        return f;
    }
    private UsuarioDto.Atualizacao edicao(PerfilUsuario perfil, Long vinculo) {
        return new UsuarioDto.Atualizacao(vinculo, " Pessoa ", " PESSOA ", perfil, null);
    }

    @ParameterizedTest @EnumSource(value = PerfilUsuario.class, names = {"TECNICO", "TST"})
    void cadastroEEdicaoExigemVinculoParaCampo(PerfilUsuario perfil) {
        usuario(PerfilUsuario.GERENTE);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new UsuarioDto.Cadastro(null,"Pessoa","pessoa",SENHA,perfil)));
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(perfil,null)));
        verify(contas,never()).save(any()); verifyNoInteractions(auditoria);
    }
    @Test void cadastroRejeitaLoginNormalizadoDuplicadoAntesDeGerarHash() {
        when(contas.existsByLoginIgnoreCase("pessoa")).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new UsuarioDto.Cadastro(null,"Pessoa"," PESSOA ",SENHA,PerfilUsuario.GERENTE)));
        verifyNoInteractions(encoder,auditoria);
    }
    @Test void edicaoRejeitaLoginDeOutraConta() {
        Usuario u = usuario(PerfilUsuario.GERENTE);
        when(contas.existsByLoginIgnoreCaseAndIdNot("pessoa",1L)).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(PerfilUsuario.RH,null)));
        assertEquals(PerfilUsuario.GERENTE,u.getPerfil()); verifyNoInteractions(auditoria);
    }
    @Test void cadastroEEdicaoRejeitamFuncionarioJaVinculado() {
        usuario(PerfilUsuario.GERENTE);
        when(contas.existsByFuncionarioId(10L)).thenReturn(true);
        when(contas.existsByFuncionarioIdAndIdNot(10L,1L)).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new UsuarioDto.Cadastro(10L,"Pessoa","pessoa",SENHA,PerfilUsuario.TST)));
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(PerfilUsuario.TST,10L)));
        verifyNoInteractions(funcionarios,encoder,auditoria);
    }
    @ParameterizedTest @ValueSource(booleans = {true,false})
    void cadastroEEdicaoRejeitamFuncionarioArquivadoOuAusente(boolean arquivado) {
        usuario(PerfilUsuario.GERENTE);
        when(funcionarios.findById(10L)).thenReturn(arquivado ? Optional.of(funcionario(true)) : Optional.empty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service.cadastrar(new UsuarioDto.Cadastro(10L,"Pessoa","pessoa",SENHA,PerfilUsuario.TECNICO)));
        assertThrows(RecursoNaoEncontradoException.class, () -> service.atualizar(1L,edicao(PerfilUsuario.TECNICO,10L)));
        verify(contas,never()).save(any()); verifyNoInteractions(auditoria);
    }
    @ParameterizedTest @ValueSource(longs = {0,1})
    void ultimoAdministradorNaoPodeSerDesativado(long quantidade) {
        Usuario u = usuario(PerfilUsuario.ADMIN);
        when(contas.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)).thenReturn(quantidade);
        assertThrows(RegraNegocioException.class, () -> service.definirStatus(1L,false,"outro"));
        assertTrue(u.isAtivo()); verifyNoInteractions(auditoria);
    }
    @Test void outroAdministradorPermiteRebaixarERemoverVinculoSemTrocarSenha() {
        Usuario u = usuario(PerfilUsuario.ADMIN); u.setFuncionario(funcionario(false));
        u.setDeveAlterarSenha(false);
        when(contas.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)).thenReturn(2L);
        long versao = u.getVersaoSessao();
        var resposta = service.atualizar(1L,edicao(PerfilUsuario.GERENTE,null));
        assertEquals(PerfilUsuario.GERENTE,resposta.perfil()); assertNull(resposta.funcionarioId());
        assertEquals("Pessoa",resposta.nome()); assertEquals("pessoa",resposta.login());
        assertEquals("hash",u.getSenhaHash()); assertFalse(resposta.deveAlterarSenha());
        assertTrue(u.getVersaoSessao()>versao);
        verifyNoInteractions(encoder);
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.USUARIO_EDITADO,99L,1L);
    }
    @Test void administradorInativoPodeMudarPerfilSemContarAtivos() {
        Usuario u = usuario(PerfilUsuario.ADMIN); u.setAtivo(false);
        assertEquals(PerfilUsuario.RH,service.atualizar(1L,edicao(PerfilUsuario.RH,null)).perfil());
        verify(contas,never()).countByPerfilAndAtivoTrue(any());
    }
    @Test void administradorPodeManterPerfilMesmoSendoUnico() {
        usuario(PerfilUsuario.ADMIN);
        assertEquals(PerfilUsuario.ADMIN,service.atualizar(1L,edicao(PerfilUsuario.ADMIN,null)).perfil());
        verify(contas,never()).countByPerfilAndAtivoTrue(any());
    }
    @Test void desativacaoRevogaSessaoEReativacaoLimpaBloqueio() {
        Usuario u = usuario(PerfilUsuario.ADMIN);
        when(contas.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)).thenReturn(2L);
        long versao = u.getVersaoSessao();
        assertFalse(service.definirStatus(1L,false,"outro").ativo());
        assertTrue(u.getVersaoSessao()>versao);
        u.setTentativasFalhas(5); u.setBloqueadoAte(OffsetDateTime.now().plusMinutes(10));
        assertTrue(service.definirStatus(1L,true,"outro").ativo());
        assertEquals(0,u.getTentativasFalhas()); assertNull(u.getBloqueadoAte());
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.USUARIO_DESATIVADO,99L,1L);
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.USUARIO_ATIVADO,99L,1L);
    }
    @Test void redefinicaoRevogaSessaoLimpaBloqueioEExigeTroca() {
        Usuario u = usuario(PerfilUsuario.GERENTE); u.setDeveAlterarSenha(false);
        u.setTentativasFalhas(5); u.setBloqueadoAte(OffsetDateTime.now().plusMinutes(10));
        long versao = u.getVersaoSessao(); when(encoder.encode(SENHA)).thenReturn("novo-hash");
        assertTrue(service.redefinirSenha(1L,SENHA).deveAlterarSenha());
        assertEquals("novo-hash",u.getSenhaHash()); assertTrue(u.getVersaoSessao()>versao);
        assertEquals(0,u.getTentativasFalhas()); assertNull(u.getBloqueadoAte());
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.SENHA_REDEFINIDA,99L,1L);
    }
    @ParameterizedTest @ValueSource(booleans = {true,false})
    void sucessoRejeitaContaInativaOuVersaoRevogada(boolean inativo) {
        Usuario u = usuario(PerfilUsuario.GERENTE); u.setAtivo(!inativo);
        assertThrows(BadCredentialsException.class, () -> service.registrarSucesso(1L,u.getVersaoSessao()+(inativo?0:1)));
        assertNull(u.getUltimoLogin());
    }
    @Test void sucessoLimpaFalhasERegistraHorario() {
        Usuario u = usuario(PerfilUsuario.TST); u.setTentativasFalhas(4); u.setBloqueadoAte(OffsetDateTime.now().minusMinutes(1));
        assertSame(u,service.registrarSucesso(1L,u.getVersaoSessao()));
        assertNotNull(u.getUltimoLogin()); assertEquals(0,u.getTentativasFalhas()); assertNull(u.getBloqueadoAte());
    }
    @Test void bloqueioExpiradoReiniciaContagemNaPrimeiraFalha() {
        Usuario u = usuario(PerfilUsuario.TST); u.setTentativasFalhas(5); u.setBloqueadoAte(OffsetDateTime.now().minusMinutes(1));
        when(contas.buscarLoginParaAtualizacao("pessoa")).thenReturn(Optional.of(u));
        service.registrarFalha(" PESSOA ");
        assertEquals(1,u.getTentativasFalhas()); assertNull(u.getBloqueadoAte());
        verify(auditoria).registrar(AuditoriaSegurancaService.Tipo.LOGIN_FALHA,null,1L);
    }
    @ParameterizedTest @EnumSource(PerfilUsuario.class)
    void perfilAtivoDeCampoDependeDoPerfilEDoStatus(PerfilUsuario perfil) {
        Usuario u = usuario(perfil); Funcionario f = funcionario(false);
        when(contas.findByFuncionarioId(10L)).thenReturn(Optional.of(u));
        assertTrue(service.funcionarioTemPerfilAtivo(f,perfil));
        assertFalse(service.funcionarioTemPerfilAtivo(null,perfil));
        if(perfil.ehProfissionalDeCampo()) assertEquals(perfil,service.perfilAtivoDoFuncionario(f));
        else assertThrows(RegraNegocioException.class, () -> service.perfilAtivoDoFuncionario(f));
        u.setAtivo(false);
        assertFalse(service.funcionarioTemPerfilAtivo(f,perfil));
        assertThrows(RegraNegocioException.class, () -> service.perfilAtivoDoFuncionario(f));
    }
    @Test void administradorInicialUsaNomePadraoELoginNormalizado() {
        when(contas.save(any())).thenAnswer(i -> i.getArgument(0));
        when(encoder.encode(SENHA)).thenReturn("hash");
        service.criarAdminInicial(" "," ADMIN ",SENHA);
        var captor = org.mockito.ArgumentCaptor.forClass(Usuario.class); verify(contas).save(captor.capture());
        assertEquals("Administrador ERA",captor.getValue().getNome()); assertEquals("admin",captor.getValue().getLogin());
        assertEquals(PerfilUsuario.ADMIN,captor.getValue().getPerfil()); assertTrue(captor.getValue().isDeveAlterarSenha());
    }
}
