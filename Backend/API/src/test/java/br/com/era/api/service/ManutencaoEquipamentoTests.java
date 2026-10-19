package br.com.era.api.service;

import br.com.era.api.dto.*;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ManutencaoEquipamentoTests {
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final EquipamentoService service=new EquipamentoService(equipamentos,mock(MovimentacaoRepository.class),mock(ObraService.class),mock(FuncionarioService.class),usuarios,mock(InventarioHistoricoService.class));
    final Equipamento e=new Equipamento();
    ManutencaoEquipamentoTests() {
        e.setTipo("Ferramentas");e.setModelo("Escada");e.setSerie("ESC-1");e.setStatus("Em estoque");e.setQuantidade(10);e.setControleQuantidade("LOTE");
        ReflectionTestUtils.setField(e,"id",1L);
        when(equipamentos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(e));
        Usuario autor=new Usuario();autor.setPerfil(PerfilUsuario.GERENTE);autor.setNome("Maria Gerente");autor.setLogin("maria");when(usuarios.buscarPorLogin("maria")).thenReturn(autor);
        when(equipamentos.saveAndFlush(e)).thenAnswer(i->{long id=1;for(var m:e.getManutencoes())ReflectionTestUtils.setField(m,"id",id++);return e;});
    }
    @Test void bloqueiaSomenteQuantidadeSelecionadaEPreservaLocal() {
        Obra obra=new Obra();obra.setNome("Obra A");ReflectionTestUtils.setField(obra,"id",5L);e.setObra(obra);e.setStatus("Em campo");e.setQuantidadeReservada(3);
        var resposta=service.abrirManutencao(1L,new ManutencaoDto.Abertura(2,"Degrau com avaria"),"maria");
        assertEquals(2,resposta.quantidadeManutencao());assertEquals(5,resposta.quantidadeDisponivel());assertEquals(10,resposta.quantidade());assertEquals(5L,resposta.obraId());assertEquals("Em campo",resposta.status());
        assertEquals("maria",resposta.manutencoes().getFirst().abertaPorLogin());assertEquals("Obra A",resposta.manutencoes().getFirst().local());
    }
    @Test void manutencaoTotalMudaSituacaoEConclusaoLiberaAsUnidades() {
        service.abrirManutencao(1L,new ManutencaoDto.Abertura(10,"Revisão"),"maria");assertEquals("Em manutenção",e.getStatus());assertEquals(0,e.getQuantidadeDisponivel());
        var resposta=service.concluirManutencao(1L,1L,new ManutencaoDto.Conclusao("Peças substituídas e teste aprovado"),"maria");
        assertEquals("Em estoque",resposta.status());assertEquals(10,resposta.quantidadeDisponivel());assertEquals(0,resposta.quantidadeManutencao());assertEquals("CONCLUIDA",resposta.manutencoes().getFirst().status());
        assertNotNull(resposta.manutencoes().getFirst().concluidaEm());assertEquals("maria",resposta.manutencoes().getFirst().concluidaPorLogin());
        assertThrows(RegraNegocioException.class,()->service.concluirManutencao(1L,1L,new ManutencaoDto.Conclusao("Repetida"),"maria"));
    }
    @Test void mantemOutrosRegistrosAbertosAoConcluirUmServico() {
        service.abrirManutencao(1L,new ManutencaoDto.Abertura(2,"Avaria"),"maria");service.abrirManutencao(1L,new ManutencaoDto.Abertura(3,"Revisão"),"maria");
        service.concluirManutencao(1L,1L,new ManutencaoDto.Conclusao("Reparado"),"maria");assertEquals(3,e.getQuantidadeManutencao());assertEquals(7,e.getQuantidadeDisponivel());
    }
    @Test void rejeitaExcedenteEUnidadesReservadasParaTransporte() {
        e.setQuantidadeReservada(7);
        assertThrows(RegraNegocioException.class,()->service.abrirManutencao(1L,new ManutencaoDto.Abertura(4,"Revisão"),"maria"));
        service.abrirManutencao(1L,new ManutencaoDto.Abertura(3,"Revisão"),"maria");
        assertThrows(RegraNegocioException.class,()->service.abrirManutencao(1L,new ManutencaoDto.Abertura(1,"Revisão"),"maria"));
        assertEquals(0,e.getQuantidadeDisponivel());
    }
    @Test void rejeitaEquipamentoArquivadoETecnico() {
        e.definirArquivamento(true,"admin");assertThrows(RegraNegocioException.class,()->service.abrirManutencao(1L,new ManutencaoDto.Abertura(1,"Revisão"),"maria"));
        Usuario tecnico=new Usuario();tecnico.setPerfil(PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(tecnico);
        assertThrows(AccessDeniedException.class,()->service.abrirManutencao(1L,new ManutencaoDto.Abertura(1,"Revisão"),"tecnico"));
        assertThrows(AccessDeniedException.class,()->service.concluirManutencao(1L,1L,new ManutencaoDto.Conclusao("Reparado"),"tecnico"));
    }
    @Test void naoConcluiRegistroDeOutroEquipamento() {
        service.abrirManutencao(1L,new ManutencaoDto.Abertura(1,"Revisão"),"maria");
        assertThrows(RecursoNaoEncontradoException.class,()->service.concluirManutencao(1L,99L,new ManutencaoDto.Conclusao("Reparado"),"maria"));assertEquals(1,e.getQuantidadeManutencao());
    }
    @Test void protegeQuantidadeIdentificacaoEArquivamentoDuranteManutencao() {
        service.abrirManutencao(1L,new ManutencaoDto.Abertura(4,"Revisão"),"maria");
        assertThrows(RegraNegocioException.class,()->service.definirArquivamento(1L,true,"maria"));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,new EquipamentoDto.Requisicao("Ferramentas","Escada","ESC-1","Em estoque",null,null,null,null,null,null,3,null,"LOTE",null,null,null,null,true)));
        assertThrows(RegraNegocioException.class,()->service.atualizar(1L,new EquipamentoDto.Requisicao("Ferramentas","Escada","SERIE-NOVA","Em estoque",null,null,null,null,null,null,10,null,"LOTE",null,null,null,null,true)));
    }
}
