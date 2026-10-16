package br.com.era.api.repository;

import br.com.era.api.model.CategoriaEquipamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CategoriaEquipamentoRepository extends JpaRepository<CategoriaEquipamento, Long> {
    List<CategoriaEquipamento> findByAtivaTrueOrderByOrdemAscNomeAsc();
    boolean existsByNomeIgnoreCase(String nome);
    boolean existsBySlug(String slug);
}
