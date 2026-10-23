package br.com.era.api;

import org.junit.jupiter.api.Test;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.CRC32;
import static org.junit.jupiter.api.Assertions.*;

class HistoricoMigracoesTests {
    @Test
    void preservaChecksumsDasMigracoesJaAplicadas() throws Exception {
        var esperados = Map.of(
            "V36__adicionar_perfis_tst_rh_e_categoria_epi.sql", -57127539,
            "V37__tornar_contatos_funcionario_opcionais.sql", 46588798,
            "V38__adicionar_perfil_financeiro_e_fluxo_aprovacao.sql", -227939204,
            "V39__planejar_atendimento_pelo_financeiro.sql", -1018223467
        );
        for (var item : esperados.entrySet()) {
            var recurso = getClass().getResourceAsStream("/db/migration/" + item.getKey());
            assertNotNull(recurso, item.getKey());
            var crc = new CRC32();
            // Flyway calcula CRC32 por linha, sem os terminadores de linha.
            try (var leitor = new BufferedReader(new InputStreamReader(recurso, StandardCharsets.UTF_8))) {
                String linha;
                while ((linha = leitor.readLine()) != null) {
                    crc.update(linha.getBytes(StandardCharsets.UTF_8));
                }
            }
            assertEquals(item.getValue().intValue(), (int) crc.getValue(), item.getKey());
        }
    }
}
