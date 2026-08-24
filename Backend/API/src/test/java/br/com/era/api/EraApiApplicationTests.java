package br.com.era.api;

import org.junit.jupiter.api.Test;
import br.com.era.api.model.Movimentacao;
import static org.junit.jupiter.api.Assertions.*;

class EraApiApplicationTests {

	@Test
	void devePreservarMovimentacaoCanceladaParaAuditoria() {
		Movimentacao movimentacao = new Movimentacao();
		movimentacao.cancelar();
		assertFalse(movimentacao.isAtiva());
		assertEquals("Cancelada", movimentacao.getStatus());
		movimentacao.reativar();
		assertTrue(movimentacao.isAtiva());
	}

}
