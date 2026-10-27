package br.com.era.api.service;

import br.com.era.api.dto.ObraDto;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaObraServiceTests {
    final ObraRepository obras = mock(ObraRepository.class);
    final EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
    final SolicitacaoRepository pedidos = mock(SolicitacaoRepository.class);
    final FuncionarioService funcionarios = mock(FuncionarioService.class);
    final UsuarioService usuarios = mock(UsuarioService.class);
    final InventarioHistoricoService historico = mock(InventarioHistoricoService.class);
    final ObraService service = new ObraService(obras,equipamentos,pedidos,funcionarios,usuarios,historico);
    final Obra obra = new Obra();

    @BeforeEach void preparar() {
        ReflectionTestUtils.setField(obra,"id",10L); obra.setNome("Obra QA"); obra.setStatus("Concluída");
        when(obras.findById(10L)).thenReturn(Optional.of(obra));
    }
    @Test void arquivamentoExigeConclusao() {
        obra.setStatus("Em andamento");
        assertThrows(RegraNegocioException.class, () -> service.definirArquivamento(10L,true,"admin"));
        assertFalse(obra.isArquivado()); verifyNoInteractions(equipamentos,pedidos,historico);
    }
    @Test void arquivamentoExigeRetornoDosEquipamentos() {
        when(equipamentos.existsByObraIdAndArquivadoFalse(10L)).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.definirArquivamento(10L,true,"admin"));
        assertFalse(obra.isArquivado()); verifyNoInteractions(pedidos,historico);
    }
    @Test void arquivamentoExigePedidosEncerrados() {
        when(pedidos.existeAbertaParaObra(10L)).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.definirArquivamento(10L,true,"admin"));
        assertFalse(obra.isArquivado()); verifyNoInteractions(historico);
    }
    @Test void arquivarERepetirNaoDuplicaSnapshot() {
        assertTrue(service.definirArquivamento(10L,true,"admin").arquivado());
        assertTrue(service.definirArquivamento(10L,true,"admin").arquivado());
        verify(historico,times(1)).registrar(obra);
    }
    @Test void reativacaoNaoExigeRetornoDeEquipamentos() {
        obra.definirArquivamento(true,"admin");
        assertFalse(service.definirArquivamento(10L,false,"admin").arquivado());
        verifyNoInteractions(equipamentos,pedidos); verify(historico).registrar(obra);
    }
    @Test void obraOpcionalNulaRepresentaDepositoEArquivadaEhRecusada() {
        assertNull(service.buscarOpcional(null));
        obra.definirArquivamento(true,"admin");
        assertThrows(RegraNegocioException.class, () -> service.buscarOpcional(10L));
    }
    @Test void obraInexistenteTemErroDeDominio() {
        assertThrows(RecursoNaoEncontradoException.class, () -> service.buscar(99L));
    }
    @Test void tecnicoSoConsultaObrasDeSuaResponsabilidade() {
        var f = new Funcionario(); ReflectionTestUtils.setField(f,"id",3L); f.setNome("Ana");
        var u = new Usuario(); u.setPerfil(PerfilUsuario.TECNICO); u.setFuncionario(f);
        when(usuarios.buscarPorLogin("ana")).thenReturn(u);
        when(obras.findAll()).thenReturn(List.of(obra));
        assertTrue(service.idsPermitidos("ana").isEmpty());
        assertThrows(RecursoNaoEncontradoException.class, () -> service.buscarParaUsuario(10L,"ana"));
        obra.getResponsaveis().add(f);
        assertEquals(Set.of(10L),service.idsPermitidos("ana"));
        assertSame(obra,service.buscarParaUsuario(10L,"ana"));
    }
    @Test void campoSemFuncionarioNaoRecebeObras() {
        var u = new Usuario(); u.setPerfil(PerfilUsuario.TST);
        when(usuarios.buscarPorLogin("tst")).thenReturn(u); when(obras.findAll()).thenReturn(List.of(obra));
        assertTrue(service.listarParaUsuario("tst").isEmpty());
        assertThrows(RegraNegocioException.class, () -> service.validarAcessoTecnico(u,10L));
    }
    @Test void cadastroNormalizaTextosDeduplicaResponsaveisERegistraHistorico() {
        var f = new Funcionario(); f.setNome("Ana"); when(funcionarios.buscarPorNome("Ana")).thenReturn(f);
        var r = service.cadastrar(new ObraDto.Requisicao(" Obra "," Cliente "," Manaus ",LocalDate.now(),"Em andamento",List.of("Ana","Ana")));
        assertEquals("Obra",r.nome()); assertEquals("Cliente",r.cliente()); assertEquals("Manaus",r.cidade());
        assertEquals(List.of("Ana"),r.responsaveis()); verify(obras).save(any()); verify(historico).registrar(any());
    }
}
