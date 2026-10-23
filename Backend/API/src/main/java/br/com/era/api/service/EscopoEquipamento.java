package br.com.era.api.service;

import java.text.Normalizer;
import java.util.Locale;

/** Regras centrais que separam EPIs dos demais materiais do catálogo. */
public final class EscopoEquipamento {
    public static final String CATEGORIA_EPI = "EPI";

    private EscopoEquipamento() {}
    public static boolean pedidoContemEpi(br.com.era.api.model.Solicitacao pedido) {
        return pedido.getMateriais().stream().anyMatch(m->catalogoEhEpi(m.getCatalogoChave()))
            ||pedido.getMateriaisOriginais().stream().anyMatch(m->catalogoEhEpi(m.catalogoChave()))
            ||pedido.getCompras().stream().anyMatch(m->catalogoEhEpi(m.catalogoChave()));
    }

    public static boolean ehEpi(String categoria) {
        String normalizada=normalizar(categoria);
        return "epi".equals(normalizada)||"seguranca, epi e acesso".equals(normalizada);
    }

    public static boolean catalogoEhEpi(String catalogoChave) {
        if (catalogoChave == null || catalogoChave.isBlank()) return false;
        int separador = catalogoChave.indexOf('|');
        String categoria = separador < 0 ? catalogoChave : catalogoChave.substring(0, separador);
        return ehEpi(categoria);
    }

    private static String normalizar(String valor) {
        return Normalizer.normalize(String.valueOf(valor == null ? "" : valor), Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .trim()
                .toLowerCase(Locale.ROOT);
    }
}
