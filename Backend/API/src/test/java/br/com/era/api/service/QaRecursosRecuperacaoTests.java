package br.com.era.api.service;

import br.com.era.api.config.RecuperacaoProperties;
import br.com.era.api.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaRecursosRecuperacaoTests {
    @Test void hashSha256TemVetorConhecidoENaoIncluiIdentificador(){
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",LimitesRecuperacao.hash("abc"));
        assertNotEquals(LimitesRecuperacao.hash("email:a"),LimitesRecuperacao.hash("login:a"));
    }
    @ParameterizedTest @ValueSource(ints={1,4,5,6,10000})
    void limiteAceitaAteMaximoInclusive(int tentativas){
        var jdbc=mock(JdbcTemplate.class);when(jdbc.queryForObject(anyString(),eq(Integer.class),anyString())).thenReturn(tentativas);
        assertEquals(tentativas<=5,new LimitesRecuperacao(jdbc).permitir("login","qa",5));
        verify(jdbc).queryForObject(anyString(),eq(Integer.class),eq(LimitesRecuperacao.hash("login:qa")));
    }
    @Test void retornoNuloDoContadorNaoLiberaTentativa(){
        var jdbc=mock(JdbcTemplate.class);assertFalse(new LimitesRecuperacao(jdbc).permitir("login","qa",5));
    }
    @Test void smtpConfiguradoExigeRemetenteESegredo(){
        var config=new RecuperacaoProperties(true,"https://qa.example.invalid");var sender=mock(JavaMailSender.class);
        assertThrows(IllegalArgumentException.class,()->new EmailRecuperacaoService(sender,config,"","ficticio"));
        assertThrows(IllegalArgumentException.class,()->new EmailRecuperacaoService(sender,config,"qa@example.invalid",""));
        assertDoesNotThrow(()->new EmailRecuperacaoService(sender,new RecuperacaoProperties(false,null),"",""));
        verifyNoInteractions(sender);
    }
    @Test void mensagemTemRemetenteDestinoAssuntoETextoSemEnviarParaRede(){
        var sender=mock(JavaMailSender.class);var service=new EmailRecuperacaoService(sender,new RecuperacaoProperties(true,"https://qa.example.invalid"),"qa@example.invalid","ficticio");
        service.enviar("destino@example.invalid","Confirmação","Conteúdo fictício");
        var captor=ArgumentCaptor.forClass(SimpleMailMessage.class);verify(sender).send(captor.capture());
        assertEquals("qa@example.invalid",captor.getValue().getFrom());assertArrayEquals(new String[]{"destino@example.invalid"},captor.getValue().getTo());
        assertEquals("ERA — Confirmação",captor.getValue().getSubject());assertEquals("Conteúdo fictício",captor.getValue().getText());
    }
    @Test void erroDoProvedorNaoVazaCredenciaisENotificacaoAuxiliarNaoDesfazOperacao(){
        var sender=mock(JavaMailSender.class);doThrow(new MailSendException("smtp senha=segredo-ficticio destino@example.invalid")).when(sender).send(any(SimpleMailMessage.class));
        var service=new EmailRecuperacaoService(sender,new RecuperacaoProperties(false,null),"qa@example.invalid","");
        var erro=assertThrows(RegraNegocioException.class,()->service.enviar("destino@example.invalid","Assunto","Texto"));
        assertFalse(erro.getMessage().contains("segredo-ficticio"));assertFalse(erro.getMessage().contains("destino@example.invalid"));
        assertDoesNotThrow(()->service.avisarSemInterromper("destino@example.invalid","Assunto","Texto"));
    }
}
