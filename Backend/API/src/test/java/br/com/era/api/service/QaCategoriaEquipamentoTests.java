package br.com.era.api.service;

import br.com.era.api.dto.CategoriaEquipamentoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.CategoriaEquipamento;
import br.com.era.api.repository.CategoriaEquipamentoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaCategoriaEquipamentoTests {
    final CategoriaEquipamentoRepository repository = mock(CategoriaEquipamentoRepository.class);
    final CategoriaEquipamentoService service = new CategoriaEquipamentoService(repository);

    @BeforeEach void preparar() {
        when(repository.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test void categoriaNormalizaNomeSlugDescricaoECampos() {
        var campo = new CategoriaEquipamentoDto.Campo(" marca ", " Marca ", " TEXT ", " Exemplo ", " Dica ");
        var resposta = service.cadastrar(new CategoriaEquipamentoDto.Requisicao("  Máquinas & Medição  ", " Descrição ", List.of(campo)));
        assertEquals("Máquinas & Medição", resposta.nome());
        assertEquals("maquinas-medicao", resposta.slug());
        assertEquals("Descrição", resposta.descricao());
        assertEquals(new CategoriaEquipamentoDto.Campo("marca", "Marca", "text", "Exemplo", "Dica"), resposta.campos().getFirst());
        assertFalse(resposta.sistema());
        assertEquals("Package", resposta.icone());
    }

    @Test void colisaoDeSlugUsaPrimeiroSufixoLivre() {
        when(repository.existsBySlug("medicao")).thenReturn(true);
        when(repository.existsBySlug("medicao-2")).thenReturn(true);
        assertEquals("medicao-3", service.cadastrar(new CategoriaEquipamentoDto.Requisicao("Medição", null, null)).slug());
    }

    @Test void nomeSemCaracteresLatinosTemSlugDeFallback() {
        assertEquals("categoria", service.cadastrar(new CategoriaEquipamentoDto.Requisicao("工具", " ", null)).slug());
    }

    @Test void nomeDuplicadoNaoPersiste() {
        when(repository.existsByNomeIgnoreCase("Ferramentas")).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new CategoriaEquipamentoDto.Requisicao(" Ferramentas ", null, null)));
        verify(repository, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"text", "number", "date"})
    void tiposPermitidosSaoAceitos(String tipo) {
        var campo = new CategoriaEquipamentoDto.Campo("validade", "Validade", tipo, " ", null);
        var resposta = service.cadastrar(new CategoriaEquipamentoDto.Requisicao("Categoria", null, List.of(campo)));
        assertEquals(tipo, resposta.campos().getFirst().tipo());
        assertNull(resposta.campos().getFirst().placeholder());
    }

    @ParameterizedTest @ValueSource(strings = {"script", "html", "boolean", ""})
    void tiposDesconhecidosNaoPersistem(String tipo) {
        var campo = new CategoriaEquipamentoDto.Campo("marca", "Marca", tipo, null, null);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new CategoriaEquipamentoDto.Requisicao("Categoria", null, List.of(campo))));
        verify(repository, never()).save(any());
    }

    @Test void chaveNaoPermitidaNaoPersiste() {
        var campo = new CategoriaEquipamentoDto.Campo("senhaHash", "Senha", "text", null, null);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new CategoriaEquipamentoDto.Requisicao("Categoria", null, List.of(campo))));
        verify(repository, never()).save(any());
    }

    @Test void chaveDuplicadaAposTrimNaoPersiste() {
        var a = new CategoriaEquipamentoDto.Campo("marca", "Marca", "text", null, null);
        var b = new CategoriaEquipamentoDto.Campo(" marca ", "Outra", "text", null, null);
        assertThrows(RegraNegocioException.class, () -> service.cadastrar(new CategoriaEquipamentoDto.Requisicao("Categoria", null, List.of(a,b))));
        verify(repository, never()).save(any());
    }

    @Test void listagemUsaSomenteCategoriasAtivasOrdenadas() {
        var categoria = new CategoriaEquipamento(); categoria.setNome("Ativa"); categoria.setSlug("ativa");
        when(repository.findByAtivaTrueOrderByOrdemAscNomeAsc()).thenReturn(List.of(categoria));
        assertEquals("Ativa", service.listar().getFirst().nome());
        verify(repository).findByAtivaTrueOrderByOrdemAscNomeAsc();
    }
}
