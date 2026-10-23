package br.com.era.api.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class LimitesRecuperacao {
    private final JdbcTemplate jdbc;
    public LimitesRecuperacao(JdbcTemplate jdbc){this.jdbc=jdbc;}
    @Transactional(propagation=Propagation.REQUIRES_NEW)
    public boolean permitir(String contexto,String identificador,int maximo) {
        Integer total=jdbc.queryForObject("""
            INSERT INTO recuperacao_limites(chave,janela,tentativas) VALUES (?,CURRENT_TIMESTAMP,1)
            ON CONFLICT(chave) DO UPDATE SET
              tentativas=CASE WHEN recuperacao_limites.janela < CURRENT_TIMESTAMP - INTERVAL '1 hour'
                THEN 1 ELSE LEAST(recuperacao_limites.tentativas+1,10000) END,
              janela=CASE WHEN recuperacao_limites.janela < CURRENT_TIMESTAMP - INTERVAL '1 hour'
                THEN CURRENT_TIMESTAMP ELSE recuperacao_limites.janela END
            RETURNING tentativas
            """,Integer.class,hash(contexto+":"+identificador));
        return total!=null&&total<=maximo;
    }
    @Scheduled(fixedDelay=86400000,initialDelay=60000)
    public void limparExpirados(){
        jdbc.update("DELETE FROM recuperacao_limites WHERE janela < CURRENT_TIMESTAMP - INTERVAL '2 days'");
        jdbc.update("DELETE FROM recuperacao_tokens WHERE expira_em < CURRENT_TIMESTAMP - INTERVAL '7 days'");
    }
    public static String hash(String texto){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(texto.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
