package br.com.era.api.service;

import java.text.Normalizer;
import java.util.Locale;
import java.util.regex.Pattern;

public final class CatalogoChave {
    private static final Pattern ACENTOS = Pattern.compile("\\p{M}+");
    private static final Pattern ESPACOS = Pattern.compile("\\s+");
    private CatalogoChave() {}

    public static String criar(String tipo, String modelo, String medida) {
        return normalizar(tipo) + "|" + normalizar(modelo) + "|" + normalizar(medida);
    }

    public static String normalizar(String valor) {
        if (valor == null) return "";
        String semAcentos = ACENTOS.matcher(Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)).replaceAll("");
        return ESPACOS.matcher(semAcentos).replaceAll(" ").toLowerCase(Locale.ROOT);
    }
}
