package br.com.era.api.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "categorias_equipamento")
public class CategoriaEquipamento {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, unique = true, length = 120)
    private String slug;

    @Column(length = 255)
    private String descricao;

    @Column(nullable = false, length = 40)
    private String icone = "Package";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(nullable = false, columnDefinition = "jsonb")
    private List<Map<String, String>> campos = new ArrayList<>();

    @Column(nullable = false)
    private boolean sistema;

    @Column(nullable = false)
    private boolean ativa = true;

    @Column(nullable = false)
    private Integer ordem = 100;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    @PrePersist
    void criarDatas() {
        criadoEm = OffsetDateTime.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void atualizarData() {
        atualizadoEm = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getIcone() { return icone; }
    public void setIcone(String icone) { this.icone = icone; }
    public List<Map<String, String>> getCampos() { return campos; }
    public void setCampos(List<Map<String, String>> campos) { this.campos = campos; }
    public boolean isSistema() { return sistema; }
    public void setSistema(boolean sistema) { this.sistema = sistema; }
    public boolean isAtiva() { return ativa; }
    public void setAtiva(boolean ativa) { this.ativa = ativa; }
    public Integer getOrdem() { return ordem; }
    public void setOrdem(Integer ordem) { this.ordem = ordem; }
}
