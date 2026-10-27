package br.com.era.api.service;

import br.com.era.api.dto.FuncionarioDto;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaFuncionarioServiceTests {
    final FuncionarioRepository repository=mock(FuncionarioRepository.class);
    final ObraRepository obras=mock(ObraRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final UsuarioRepository contas=mock(UsuarioRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final InventarioHistoricoService historico=mock(InventarioHistoricoService.class);
    final FuncionarioService service=new FuncionarioService(repository,obras,equipamentos,pedidos,contas,usuarios,historico);
    final Funcionario funcionario=new Funcionario();
    @BeforeEach void preparar(){
        ReflectionTestUtils.setField(funcionario,"id",1L); funcionario.setNome("Ana"); funcionario.setCargo("TST"); funcionario.setStatus("Ativo");
        when(repository.findById(1L)).thenReturn(Optional.of(funcionario));
        when(repository.save(any())).thenAnswer(i->i.getArgument(0));
    }
    @Test void cadastroNormalizaContatoEAplicaStatusPadrao(){
        var r=service.cadastrar(new FuncionarioDto.Requisicao(" Ana "," TST "," ANA@EXAMPLE.INVALID "," 123 ",null));
        assertEquals("Ana",r.nome());assertEquals("TST",r.cargo());assertEquals("ana@example.invalid",r.email());assertEquals("123",r.telefone());assertEquals("Ativo",r.status());
    }
    @Test void emailDuplicadoNaoPersiste(){
        when(repository.existsByEmailIgnoreCase("ana@example.invalid")).thenReturn(true);
        assertThrows(RegraNegocioException.class,()->service.cadastrar(new FuncionarioDto.Requisicao("Ana","TST","ANA@EXAMPLE.INVALID",null,null)));
        verify(repository,never()).save(any());
    }
    @Test void editarPreservaStatusQuandoOmitidoEAceitaEmailDaPropriaConta(){
        when(repository.findByEmailIgnoreCase("ana@example.invalid")).thenReturn(Optional.of(funcionario));
        var r=service.atualizar(1L,new FuncionarioDto.Atualizacao(" Ana "," TST "," ANA@EXAMPLE.INVALID "," ",null,null));
        assertEquals("Ativo",r.status());assertNull(r.telefone());assertEquals("ana@example.invalid",r.email());
    }
    @Test void editarRecusaEmailDeOutroFuncionario(){
        var outro=new Funcionario();ReflectionTestUtils.setField(outro,"id",2L);
        when(repository.findByEmailIgnoreCase("outra@example.invalid")).thenReturn(Optional.of(outro));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,new FuncionarioDto.Atualizacao("Ana","TST","outra@example.invalid",null,null,null)));
    }
    @Test void atualizarResponsabilidadesRegistraSomenteObrasAfetadas(){
        var antiga=new Obra();ReflectionTestUtils.setField(antiga,"id",10L);antiga.getResponsaveis().add(funcionario);
        var nova=new Obra();ReflectionTestUtils.setField(nova,"id",20L);
        var alheia=new Obra();ReflectionTestUtils.setField(alheia,"id",30L);
        when(obras.findAll()).thenReturn(List.of(antiga,nova,alheia));
        service.atualizar(1L,new FuncionarioDto.Atualizacao("Ana","TST",null,null,"Ativo",List.of(20L)));
        assertFalse(antiga.getResponsaveis().contains(funcionario));assertTrue(nova.getResponsaveis().contains(funcionario));
        verify(historico).registrar(antiga);verify(historico).registrar(nova);verify(historico,never()).registrar(alheia);
    }
    @Test void arquivamentoComEquipamentoEhBloqueado(){
        when(equipamentos.existsByTecnicoIdAndArquivadoFalse(1L)).thenReturn(true);
        assertThrows(RegraNegocioException.class,()->service.definirArquivamento(1L,true,"admin"));
        assertFalse(funcionario.isArquivado());verifyNoInteractions(pedidos,obras,contas,historico);
    }
    @Test void arquivamentoComPedidoAbertoEhBloqueado(){
        when(pedidos.existeAbertaParaFuncionario(1L)).thenReturn(true);
        assertThrows(RegraNegocioException.class,()->service.definirArquivamento(1L,true,"admin"));
        assertFalse(funcionario.isArquivado());verifyNoInteractions(obras,contas,historico);
    }
    @Test void arquivamentoDesativaContaRemoveResponsabilidadeEIdempotenciaPreservaHistorico(){
        var conta=new Usuario();var obra=new Obra();obra.getResponsaveis().add(funcionario);
        when(obras.findAll()).thenReturn(List.of(obra));when(contas.findByFuncionarioId(1L)).thenReturn(Optional.of(conta));
        assertTrue(service.definirArquivamento(1L,true,"admin").arquivado());
        service.definirArquivamento(1L,true,"admin");
        assertFalse(conta.isAtivo());assertEquals("Inativo",funcionario.getStatus());assertTrue(obra.getResponsaveis().isEmpty());
        verify(historico,times(1)).registrar(obra);
    }
    @Test void reativarRegistroNaoReativaContaAutomaticamente(){
        funcionario.definirArquivamento(true,"admin");
        assertFalse(service.definirArquivamento(1L,false,"admin").arquivado());verifyNoInteractions(contas,equipamentos,pedidos);
    }
    @Test void buscaPorNomeNaoRetornaArquivadoENaoInventaFuncionario(){
        funcionario.definirArquivamento(true,"admin");when(repository.findByNomeIgnoreCase("Ana")).thenReturn(Optional.of(funcionario));
        assertThrows(RecursoNaoEncontradoException.class,()->service.buscarPorNome("Ana"));
        assertThrows(RecursoNaoEncontradoException.class,()->service.buscar(99L));
    }
    @Test void rhListaSomenteTstComContaAtivaENaoArquivado(){
        var rh=new Usuario();rh.setPerfil(PerfilUsuario.RH);when(usuarios.buscarPorLogin("rh")).thenReturn(rh);
        var tst=new Usuario();tst.setPerfil(PerfilUsuario.TST);tst.setFuncionario(funcionario);
        var outro=new Funcionario();ReflectionTestUtils.setField(outro,"id",2L);
        var tecnico=new Usuario();tecnico.setPerfil(PerfilUsuario.TECNICO);tecnico.setFuncionario(outro);
        when(repository.findAll()).thenReturn(List.of(funcionario,outro));when(contas.findAll()).thenReturn(List.of(tst,tecnico));
        assertEquals(1,service.listarParaUsuario("rh").size());
        tst.setAtivo(false);assertTrue(service.listarParaUsuario("rh").isEmpty());
        tst.setAtivo(true);funcionario.definirArquivamento(true,"admin");assertTrue(service.listarParaUsuario("rh").isEmpty());
    }
    @Test void adminConsultaArquivadosGerenciaSomenteAtivos(){
        funcionario.definirArquivamento(true,"admin");when(repository.findAll()).thenReturn(List.of(funcionario));
        var u=new Usuario();u.setPerfil(PerfilUsuario.ADMIN);when(usuarios.buscarPorLogin("qa")).thenReturn(u);
        assertEquals(1,service.listarParaUsuario("qa").size());u.setPerfil(PerfilUsuario.GERENTE);assertTrue(service.listarParaUsuario("qa").isEmpty());
        assertTrue(service.listar().isEmpty());
    }
}
