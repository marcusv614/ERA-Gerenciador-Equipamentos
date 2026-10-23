package br.com.era.api.controller;

import br.com.era.api.exception.ApiExceptionHandler;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class LogsSegurosTests {
    @RestController static class Alvo {
        @GetMapping("/falha/{id}") Object falhar(@PathVariable String id){
            throw new DataIntegrityViolationException("senha=SEGREDO-SQL email=privado@example.invalid",
                new java.sql.SQLException("Failing row contains TOKEN-SECRETO"));
        }
    }
    @Test void preservaCodigoDoErroSemRegistrarMensagemCausaOuUriBruta() throws Exception {
        Logger logger=(Logger)LoggerFactory.getLogger(ApiExceptionHandler.class);
        ListAppender<ILoggingEvent> appender=new ListAppender<>();appender.start();logger.addAppender(appender);
        try {
            var mvc=MockMvcBuilders.standaloneSetup(new Alvo()).setControllerAdvice(new ApiExceptionHandler()).build();
            mvc.perform(get("/falha/SEGREDO-NA-URL?senha=OUTRO-SEGREDO")).andExpect(status().isConflict())
                .andExpect(jsonPath("$.codigoErro").isNotEmpty()).andExpect(jsonPath("$.trace").doesNotExist());
            assertEquals(1,appender.list.size());var registro=appender.list.getFirst();
            assertNull(registro.getThrowableProxy());
            String texto=registro.getFormattedMessage();assertTrue(texto.contains("/falha/{id}"));
            assertTrue(texto.contains("DataIntegrityViolationException"));
            for(String proibido:new String[]{"SEGREDO","TOKEN-SECRETO","privado@example.invalid","Failing row","senha="})assertFalse(texto.contains(proibido));
        } finally {logger.detachAppender(appender);appender.stop();}
    }
}
