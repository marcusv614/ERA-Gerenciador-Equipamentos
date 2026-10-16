package br.com.era.api.service;

import br.com.era.api.dto.CategoriaEquipamentoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.CategoriaEquipamento;
import br.com.era.api.repository.CategoriaEquipamentoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class CategoriaEquipamentoService {
    private static final Set<String> TIPOS_PERMITIDOS = Set.of("text", "number", "date");
    private static final Set<String> CHAVES_PERMITIDAS = Set.of(
            "marca", "modeloFabricante", "serie", "patrimonio", "medida", "lote", "validade",
            "calibracao", "tensao", "potencia", "capacidade", "portas", "mac", "material",
            "tipoConector", "alimentacao", "corrente", "velocidade", "comprimentoOnda");

    private final CategoriaEquipamentoRepository repository;

    public CategoriaEquipamentoService(CategoriaEquipamentoRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CategoriaEquipamentoDto.Resposta> listar() {
        return repository.findByAtivaTrueOrderByOrdemAscNomeAsc().stream().map(this::resposta).toList();
    }

    @Transactional
    public CategoriaEquipamentoDto.Resposta cadastrar(CategoriaEquipamentoDto.Requisicao dados) {
        String nome = dados.nome().trim();
        if (repository.existsByNomeIgnoreCase(nome)) {
            throw new RegraNegocioException("Essa categoria já está cadastrada.");
        }

        CategoriaEquipamento categoria = new CategoriaEquipamento();
        categoria.setNome(nome);
        categoria.setSlug(slugDisponivel(nome));
        categoria.setDescricao(textoOpcional(dados.descricao()));
        categoria.setIcone("Package");
        categoria.setSistema(false);
        categoria.setOrdem(1000);
        categoria.setCampos(validarCampos(dados.campos()));
        return resposta(repository.save(categoria));
    }

    private List<Map<String, String>> validarCampos(List<CategoriaEquipamentoDto.Campo> campos) {
        if (campos == null) return List.of();
        Set<String> chavesRecebidas = new java.util.HashSet<>();
        return campos.stream().map(campo -> {
            String chave = campo.chave().trim();
            String tipo = campo.tipo().trim().toLowerCase(Locale.ROOT);
            if (!CHAVES_PERMITIDAS.contains(chave) || !TIPOS_PERMITIDOS.contains(tipo)) {
                throw new RegraNegocioException("A configuração da categoria contém um campo inválido.");
            }
            if (!chavesRecebidas.add(chave)) {
                throw new RegraNegocioException("A configuração da categoria contém campos repetidos.");
            }
            Map<String, String> configuracao = new LinkedHashMap<>();
            configuracao.put("chave", chave);
            configuracao.put("rotulo", campo.rotulo().trim());
            configuracao.put("tipo", tipo);
            if (campo.placeholder() != null && !campo.placeholder().isBlank()) configuracao.put("placeholder", campo.placeholder().trim());
            if (campo.dica() != null && !campo.dica().isBlank()) configuracao.put("dica", campo.dica().trim());
            return configuracao;
        }).toList();
    }

    private String slugDisponivel(String nome) {
        String base = Normalizer.normalize(nome, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
        if (base.isBlank()) base = "categoria";
        String slug = base;
        int sufixo = 2;
        while (repository.existsBySlug(slug)) slug = base + "-" + sufixo++;
        return slug;
    }

    private CategoriaEquipamentoDto.Resposta resposta(CategoriaEquipamento categoria) {
        List<CategoriaEquipamentoDto.Campo> campos = categoria.getCampos().stream()
                .map(campo -> new CategoriaEquipamentoDto.Campo(
                        campo.get("chave"), campo.get("rotulo"), campo.get("tipo"),
                        campo.get("placeholder"), campo.get("dica")))
                .toList();
        return new CategoriaEquipamentoDto.Resposta(categoria.getId(), categoria.getNome(), categoria.getSlug(),
                categoria.getDescricao(), categoria.getIcone(), campos, categoria.isSistema());
    }

    private String textoOpcional(String valor) {
        return valor == null || valor.isBlank() ? null : valor.trim();
    }
}
