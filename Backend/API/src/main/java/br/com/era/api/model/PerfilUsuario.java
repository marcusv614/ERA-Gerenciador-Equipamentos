package br.com.era.api.model;

public enum PerfilUsuario {
    ADMIN, GERENTE, RH, FINANCEIRO, ESTOQUE, TECNICO, TST;

    public boolean ehProfissionalDeCampo() {
        return this == TECNICO || this == TST;
    }
}
