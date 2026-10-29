package br.com.era.api.repository;

import br.com.era.api.model.CalibracaoEquipamento;
import br.com.era.api.model.Equipamento;
import br.com.era.api.model.ManutencaoEquipamento;
import jakarta.persistence.EntityManager;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;

/** Projeção sem registrar milhares de equipamentos no contexto de persistência. */
public class EquipamentoConsultasImpl implements EquipamentoConsultas {
    private final EntityManager entityManager;

    public EquipamentoConsultasImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Equipamento> listarParaConsulta() {
        List<Equipamento> itens = entityManager.createQuery("""
            select new br.com.era.api.model.Equipamento(
                e.id, e.tipo, e.modelo, e.serie, e.status, e.medida,
                e.quantidade, e.quantidadeReservada, e.controleQuantidade,
                e.observacoes, e.notaFiscal, e.fornecedor, e.dataCompra,
                e.atributos, o, t, e.dataEntrada, e.dataSaida, e.arquivado, e.auditavel)
            from Equipamento e left join e.obra o left join e.tecnico t
            """, Equipamento.class).getResultList();
        if (itens.isEmpty()) return itens;
        Map<Long, Equipamento> porId = new HashMap<>();
        for (Equipamento item : itens) porId.put(item.getId(), item);
        // Consultas separadas evitam o produto cartesiano entre os dois históricos.
        for (Object[] linha : entityManager.createQuery("""
            select m.equipamento.id, m from ManutencaoEquipamento m
            order by m.criadoEm desc, m.id desc
            """, Object[].class).getResultList()) {
            Equipamento item = porId.get((Long) linha[0]);
            if (item != null) item.getManutencoes().add((ManutencaoEquipamento) linha[1]);
        }
        for (Object[] linha : entityManager.createQuery("""
            select c.equipamento.id, c from CalibracaoEquipamento c
            order by c.criadoEm desc, c.id desc
            """, Object[].class).getResultList()) {
            Equipamento item = porId.get((Long) linha[0]);
            if (item != null) item.getCalibracoes().add((CalibracaoEquipamento) linha[1]);
        }
        return itens;
    }
}
