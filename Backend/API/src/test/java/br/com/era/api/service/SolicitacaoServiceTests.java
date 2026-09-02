package br.com.era.api.service;

import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Obra;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Solicitacao;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.MovimentacaoRepository;
import br.com.era.api.repository.SolicitacaoRepository;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SolicitacaoServiceTests {

    @Test
    void deveExigirTecnicoParaConfirmarRecebimentoNaObra() {
        SolicitacaoRepository solicitacoes = mock(SolicitacaoRepository.class);
        UsuarioService usuarios = mock(UsuarioService.class);
        Solicitacao solicitacao = new Solicitacao();
        solicitacao.setTipo("Movimentação");
        solicitacao.setStatus("Em trânsito");
        solicitacao.setObraDestino(new Obra());
        Usuario administrador = new Usuario();
        administrador.setPerfil(PerfilUsuario.ADMIN);

        when(solicitacoes.findById(14L)).thenReturn(Optional.of(solicitacao));
        when(usuarios.buscarPorLogin("admin")).thenReturn(administrador);

        SolicitacaoService service = new SolicitacaoService(
                solicitacoes,
                mock(EquipamentoRepository.class),
                mock(MovimentacaoRepository.class),
                mock(ObraService.class),
                mock(FuncionarioService.class),
                mock(EquipamentoService.class),
                usuarios,
                mock(CautelaService.class),
                mock(InventarioHistoricoService.class));

        RegraNegocioException erro = assertThrows(RegraNegocioException.class, () -> service.concluir(14L, "admin"));
        assertEquals("O recebimento na obra deve ser confirmado pelo técnico responsável.", erro.getMessage());
    }
}
