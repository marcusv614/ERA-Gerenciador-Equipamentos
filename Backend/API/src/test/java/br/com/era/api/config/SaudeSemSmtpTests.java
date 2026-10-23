package br.com.era.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.AutoConfigurations;
import org.springframework.boot.mail.autoconfigure.MailHealthContributorAutoConfiguration;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class SaudeSemSmtpTests {
    private final JavaMailSenderImpl remetente=mock(JavaMailSenderImpl.class);
    private final ApplicationContextRunner contexto=new ApplicationContextRunner()
        .withInitializer(new ConfigDataApplicationContextInitializer())
        .withConfiguration(AutoConfigurations.of(MailHealthContributorAutoConfiguration.class))
        .withBean(JavaMailSenderImpl.class,()->remetente);

    @Test void gmailNaoConfiguradoNaoPodeDerrubarHealthcheck(){
        contexto.withPropertyValues("RECOVERY_ENABLED=false","MAIL_USERNAME=","MAIL_PASSWORD=").run(context->{
            assertThat(context).hasNotFailed().doesNotHaveBean("mailHealthContributor");
            assertThat(context.getEnvironment().getProperty("management.health.mail.enabled",Boolean.class)).isFalse();
            assertThat(context.getEnvironment().getProperty("management.health.defaults.enabled",Boolean.class,true)).isTrue();
            assertThat(context.getEnvironment().getProperty("management.health.db.enabled",Boolean.class,true)).isTrue();
            verifyNoInteractions(remetente);
        });
    }

    @Test void oscilacaoDoGmailNaoPodeBloquearApiMesmoComRecuperacaoHabilitada(){
        contexto.withPropertyValues("RECOVERY_ENABLED=true","RECOVERY_PUBLIC_URL=https://era.example",
            "MAIL_USERNAME=teste@example.invalid","MAIL_PASSWORD=senha-ficticia").run(context->{
            assertThat(context).hasNotFailed().doesNotHaveBean("mailHealthContributor");
            verifyNoInteractions(remetente);
        });
    }

    @Test void testeDeControleConfirmaQueIndicadorSeriaAtivadoSemACorrecao(){
        contexto.withPropertyValues("management.health.mail.enabled=true").run(context->{
            assertThat(context).hasNotFailed().hasBean("mailHealthContributor");
        });
    }
}
