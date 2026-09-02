package br.com.era.api.service;

import java.text.Normalizer;
import java.util.Locale;

public final class CatalogoChave {
    private CatalogoChave() {}

    public static String criar(String tipo, String modelo, String medida) {
        return normalizar(tipo) + "|" + normalizar(modelo) + "|" + normalizar(medida);
    }

    public static String normalizar(String valor) {
        if (valor == null) return "";
        return Normalizer.normalize(valor.trim(), Normalizer.Form.NFD)
            .replaceAll("\\p{M}+", "")
            .replaceAll("\\s+", " ")
            .toLowerCase(Locale.ROOT);
    }
}
