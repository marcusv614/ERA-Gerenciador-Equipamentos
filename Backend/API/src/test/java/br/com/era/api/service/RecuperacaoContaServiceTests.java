package br.com.era.api.service;

import br.com.era.api.config.RecuperacaoProperties;
import br.com.era.api.dto.RecuperacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.regex.Pattern;
import static br.com.era.api.model.TokenRecuperacao.Finalidade.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class RecuperacaoContaServiceTests {
    final UsuarioRepository usuarios=mock(UsuarioRepository.class);
    final TokenRecuperacaoRepository tokens=mock(TokenRecuperacaoRepository.class);
    final PasswordEncoder encoder=mock(PasswordEncoder.class);
    final EmailRecuperacaoService email=mock(EmailRecuperacaoService.class);
    final LimitesRecuperacao limites=mock(LimitesRecuperacao.class);
    final JdbcTemplate jdbc=mock(JdbcTemplate.class);
    final RecuperacaoContaService service=new RecuperacaoContaService(usuarios,tokens,encoder,email,limites,new RecuperacaoProperties(true,"https://era.example"),jdbc,mock(AuditoriaSegurancaService.class));
    Usuario admin;
    @BeforeEach void preparar(){
        admin=new Usuario();ReflectionTestUtils.setField(admin,"id",1L);
        admin.setLogin("admin");admin.setSenhaHash("hash-atual");admin.setPerfil(PerfilUsuario.ADMIN);admin.setDeveAlterarSenha(false);
        when(usuarios.buscarIdParaAtualizacao(1L)).thenReturn(Optional.of(admin));
        when(usuarios.findById(1L)).thenReturn(Optional.of(admin));
        when(usuarios.buscarLoginParaAtualizacao("admin")).thenReturn(Optional.of(admin));
        when(encoder.matches("Senha#Atual123", "hash-atual")).thenReturn(true);
        when(encoder.encode(anyString())).thenReturn("novo-hash");
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(true);
    }
    @Test void exigeCadastroSomenteDeAdministradorSemEmailConfirmado(){
        assertTrue(service.exigeCadastro(admin));
        for(PerfilUsuario perfil:PerfilUsuario.values()){
            admin.setPerfil(perfil);assertEquals(perfil==PerfilUsuario.ADMIN,service.exigeCadastro(admin));
        }
        admin.setPerfil(PerfilUsuario.ADMIN);confirmarEndereco();assertFalse(service.exigeCadastro(admin));
    }
    @Test void recursoDesabilitadoNaoBloqueiaAdministrador(){
        var desligado=new RecuperacaoContaService(usuarios,tokens,encoder,email,limites,new RecuperacaoProperties(false,""),jdbc,mock(AuditoriaSegurancaService.class));
        assertFalse(desligado.exigeCadastro(admin));
        desligado.processarSolicitacao("admin");verifyNoInteractions(email);
        assertThrows(RegraNegocioException.class,()->desligado.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro()));
    }
    @Test void codigoSoConfirmaEmailDepoisDeValidacaoEMantemHashNoBanco(){
        long versao=admin.getVersaoSessao();
        service.cadastrarEmail(1L,versao,cadastro());
        assertNull(admin.getEmailRecuperacao());
        TokenRecuperacao token=tokenSalvo();String codigo=codigoEnviado();
        assertNotEquals(codigo,token.getTokenHash());assertEquals(64,token.getTokenHash().length());
        assertEquals("novo@gmail.com",token.getEmail());
        when(tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(1L,CONFIRMAR_EMAIL)).thenReturn(Optional.of(token));
        service.confirmarEmail(1L,versao,codigo);
        assertEquals("novo@gmail.com",admin.getEmailRecuperacao());assertFalse(service.exigeCadastro(admin));
        assertFalse(token.valido(OffsetDateTime.now()));
        assertThrows(RegraNegocioException.class,()->service.confirmarEmail(1L,versao,codigo));
    }
    @Test void trocaDeEmailPreservaAnteriorAteConfirmarENotificaAntigo(){
        confirmarEndereco();service.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro());
        assertEquals("original@gmail.com",admin.getEmailRecuperacao());
        TokenRecuperacao token=tokenSalvo();String codigo=codigoEnviado();
        when(tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(1L,CONFIRMAR_EMAIL)).thenReturn(Optional.of(token));
        service.confirmarEmail(1L,admin.getVersaoSessao(),codigo);
        verify(email).avisarSemInterromper(eq("original@gmail.com"),anyString(),anyString());
        verify(tokens).invalidar(eq(1L),eq(REDEFINIR_SENHA),any());
    }
    @Test void cincoErrosInvalidamCodigo(){
        service.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro());TokenRecuperacao token=tokenSalvo();String correto=codigoEnviado();
        String errado=correto.equals("00000000")?"11111111":"00000000";
        when(tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(1L,CONFIRMAR_EMAIL)).thenReturn(Optional.of(token));
        for(int i=0;i<5;i++)assertThrows(RecuperacaoContaService.CodigoInvalidoException.class,()->service.confirmarEmail(1L,admin.getVersaoSessao(),errado));
        assertFalse(token.valido(OffsetDateTime.now()));
        assertThrows(RegraNegocioException.class,()->service.confirmarEmail(1L,admin.getVersaoSessao(),correto));assertNull(admin.getEmailRecuperacao());
    }
    @Test void exigeSenhaAtualELimitaEnvios(){
        assertThrows(RegraNegocioException.class,()->service.cadastrarEmail(1L,admin.getVersaoSessao(),new RecuperacaoDto.CadastrarEmail("novo@gmail.com","incorreta")));
        verifyNoInteractions(email,tokens);
        when(limites.permitir(anyString(),anyString(),anyInt())).thenReturn(false);
        assertThrows(RegraNegocioException.class,()->service.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro()));verifyNoInteractions(email,tokens);
    }
    @Test void naoPermiteCadastroComSenhaTemporariaOuSessaoAntiga(){
        long versao=admin.getVersaoSessao();admin.setDeveAlterarSenha(true);
        assertThrows(AccessDeniedException.class,()->service.cadastrarEmail(1L,versao,cadastro()));
        assertThrows(RegraNegocioException.class,()->service.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro()));verifyNoInteractions(email);
    }
    @Test void contaNaoAdminOuInativaNaoRecebeRecuperacao(){
        for(PerfilUsuario perfil:PerfilUsuario.values()){
            if(perfil==PerfilUsuario.ADMIN)continue;
            admin.setPerfil(perfil);service.processarSolicitacao("admin");
            assertThrows(AccessDeniedException.class,()->service.cadastrarEmail(1L,admin.getVersaoSessao(),cadastro()));
        }
        admin.setPerfil(PerfilUsuario.ADMIN);confirmarEndereco();admin.setAtivo(false);service.processarSolicitacao("admin");
        verifyNoInteractions(email,tokens);
    }
    @Test void contaSemEmailOuInexistenteNaoRecebeRecuperacao(){
        service.processarSolicitacao("admin");service.processarSolicitacao("inexistente");verifyNoInteractions(email,tokens);
    }
    @Test void linkTem256BitsSemSegredoPersistidoEOrigemControlada(){
        confirmarEndereco();service.processarSolicitacao("admin");
        TokenRecuperacao token=tokenSalvo();String segredo=segredoEnviado();
        assertEquals(43,segredo.length());assertEquals(LimitesRecuperacao.hash(segredo),token.getTokenHash());
        assertEquals(REDEFINIR_SENHA,token.getFinalidade());
    }
    @Test void redefineSenhaRevogaSessoesConsomeLinkENaoAutentica(){
        TokenRecuperacao token=prepararLink();long versao=admin.getVersaoSessao();
        service.redefinir(new RecuperacaoDto.Redefinir("a".repeat(43),"Nova#Segura1234567"));
        assertEquals("novo-hash",admin.getSenhaHash());assertTrue(admin.getVersaoSessao()>versao);
        assertFalse(admin.isDeveAlterarSenha());assertNotNull(admin.getSenhaAlteradaEm());
        assertFalse(token.valido(OffsetDateTime.now()));
        assertThrows(RegraNegocioException.class,()->service.redefinir(new RecuperacaoDto.Redefinir("a".repeat(43),"Outra#Senha1234567")));
        verify(email).avisarSemInterromper(eq("original@gmail.com"),eq("Senha redefinida"),anyString());
    }
    @Test void rejeitaTokenExpiradoSemAlterarSenha(){
        TokenRecuperacao token=prepararLink();ReflectionTestUtils.setField(token,"expiraEm",OffsetDateTime.now().minusSeconds(1));
        rejeitaLink();assertEquals("hash-atual",admin.getSenhaHash());
    }
    @Test void rejeitaTokenAposTrocaDeSenhaDesativacaoOuTrocaDePerfil(){
        prepararLink();admin.setSenhaHash("hash-manual");rejeitaLink();
        prepararLink();admin.setAtivo(false);rejeitaLink();
        admin.setAtivo(true);prepararLink();admin.setPerfil(PerfilUsuario.RH);rejeitaLink();
        assertNull(admin.getEmailRecuperacao());assertNull(admin.getEmailRecuperacaoVerificadoEm());
    }
    @Test void rejeitaTokenDeOutroEmailOuFinalidade(){
        prepararLink();admin.confirmarEmailRecuperacao("outro@gmail.com",OffsetDateTime.now());rejeitaLink();
        TokenRecuperacao token=prepararLink();ReflectionTestUtils.setField(token,"finalidade",CONFIRMAR_EMAIL);rejeitaLink();
    }
    @Test void rejeitaSenhaFracaReutilizadaOuComLoginSemConsumirToken(){
        TokenRecuperacao token=prepararLink();
        for(String senha:new String[]{"curta","admin#123456","x".repeat(129)})assertThrows(RegraNegocioException.class,()->service.redefinir(new RecuperacaoDto.Redefinir("a".repeat(43),senha)));
        when(encoder.matches("Senha#Atual123","hash-atual")).thenReturn(true);
        assertThrows(RegraNegocioException.class,()->service.redefinir(new RecuperacaoDto.Redefinir("a".repeat(43),"Senha#Atual123")));
        assertTrue(token.valido(OffsetDateTime.now()));
    }
    @Test void configuracaoPrivadaExibeApenasEmailDoProprioAdmin(){
        assertTrue(service.configuracao(1L,admin.getVersaoSessao()).obrigatorio());
        confirmarEndereco();assertEquals("original@gmail.com",service.configuracao(1L,admin.getVersaoSessao()).emailVerificado());
        assertThrows(AccessDeniedException.class,()->service.configuracao(1L,admin.getVersaoSessao()-1));
    }
    @Test void validacaoDeOrigemExigeHttpsERejeitaCredenciaisParametrosFragmento(){
        for(String url:new String[]{"http://site.example","https://user:senha@site.example","https://site.example?q=1","https://site.example/#teste","https://site.example/caminho",""})
            assertThrows(IllegalArgumentException.class,()->new RecuperacaoProperties(true,url));
        assertDoesNotThrow(()->new RecuperacaoProperties(true,"https://era.example/"));
        assertDoesNotThrow(()->new RecuperacaoProperties(true,"http://localhost:8088"));
    }
    private void confirmarEndereco(){admin.confirmarEmailRecuperacao("original@gmail.com",OffsetDateTime.now());}
    private RecuperacaoDto.CadastrarEmail cadastro(){return new RecuperacaoDto.CadastrarEmail("Novo@gmail.com","Senha#Atual123");}
    private TokenRecuperacao tokenSalvo(){var captor=ArgumentCaptor.forClass(TokenRecuperacao.class);verify(tokens,atLeastOnce()).save(captor.capture());return captor.getValue();}
    private String codigoEnviado(){var texto=ArgumentCaptor.forClass(String.class);verify(email,atLeastOnce()).enviar(anyString(),anyString(),texto.capture());var matcher=Pattern.compile("código de confirmação é: ([0-9]{8})").matcher(texto.getValue());assertTrue(matcher.find());return matcher.group(1);}
    private String segredoEnviado(){var texto=ArgumentCaptor.forClass(String.class);verify(email).enviar(anyString(),anyString(),texto.capture());var matcher=Pattern.compile("https://era\\.example/#recuperacao=([A-Za-z0-9_-]{43})").matcher(texto.getValue());assertTrue(matcher.find());return matcher.group(1);}
    private TokenRecuperacao prepararLink(){
        confirmarEndereco();String hash=LimitesRecuperacao.hash("a".repeat(43));
        TokenRecuperacao token=new TokenRecuperacao(admin,REDEFINIR_SENHA,admin.getEmailRecuperacao(),hash,OffsetDateTime.now());
        when(tokens.buscarUsuarioPeloHash(hash)).thenReturn(Optional.of(1L));when(tokens.buscarParaAtualizacao(hash)).thenReturn(Optional.of(token));return token;
    }
    private void rejeitaLink(){assertThrows(RegraNegocioException.class,()->service.redefinir(new RecuperacaoDto.Redefinir("a".repeat(43),"Nova#Segura1234567")));}
}
