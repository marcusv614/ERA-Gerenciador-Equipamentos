package br.com.era.api.service;

import br.com.era.api.config.RecuperacaoProperties;
import br.com.era.api.exception.RegraNegocioException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailRecuperacaoService {
    private static final Logger LOG=LoggerFactory.getLogger(EmailRecuperacaoService.class);
    private final JavaMailSender sender;
    private final String remetente;
    public EmailRecuperacaoService(JavaMailSender sender,RecuperacaoProperties config,
        @Value("${spring.mail.username:}") String remetente,@Value("${spring.mail.password:}") String senha){
        this.sender=sender;this.remetente=remetente;
        if(config.habilitada()&&(remetente.isBlank()||senha.isBlank()))
            throw new IllegalArgumentException("Configure MAIL_USERNAME e MAIL_PASSWORD antes de habilitar a recuperação.");
    }
    public void enviar(String destino,String assunto,String texto){
        var mensagem=new SimpleMailMessage();mensagem.setFrom(remetente);mensagem.setTo(destino);
        mensagem.setSubject("ERA — "+assunto);mensagem.setText(texto);
        try{sender.send(mensagem);}
        catch(MailException e){
            // Não registrar exceção SMTP: alguns provedores incluem endereço, conteúdo ou credenciais.
            LOG.warn("Não foi possível enviar uma mensagem de recuperação. Confira a configuração SMTP.");
            throw new RegraNegocioException("Não foi possível enviar o e-mail. Confira a configuração do remetente ou tente novamente mais tarde.");
        }
    }
    public void avisarSemInterromper(String destino,String assunto,String texto){
        try{enviar(destino,assunto,texto);}catch(RegraNegocioException ignored){/* Alteração já concluída; não desfazer por falha de aviso. */}
    }
}
