package br.com.era.api.service;

import br.com.era.api.dto.CalibracaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CalibracaoServiceTests {
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final MovimentacaoRepository movimentos=mock(MovimentacaoRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final InventarioHistoricoService inventario=mock(InventarioHistoricoService.class);
    final EquipamentoService servicoEquipamento=new EquipamentoService(equipamentos,movimentos,mock(ObraService.class),mock(FuncionarioService.class),usuarios,inventario);
    final CalibracaoService service=new CalibracaoService(equipamentos,servicoEquipamento,usuarios,movimentos,inventario);
    final Equipamento e=new Equipamento();
    final Obra obra=new Obra();
    final Funcionario tecnico=new Funcionario();
    final LocalDate hoje=LocalDate.now(java.time.ZoneId.of("America/Manaus"));
    CalibracaoServiceTests(){
        e.setTipo("Fluke");e.setModelo("DSX-5000");e.setSerie("FLUKE-1");e.setStatus("Em campo");e.setQuantidade(1);e.setControleQuantidade("INDIVIDUAL");
        ReflectionTestUtils.setField(e,"id",1L);ReflectionTestUtils.setField(obra,"id",2L);obra.setNome("Obra A");tecnico.setNome("Ana");e.setObra(obra);e.setTecnico(tecnico);
        when(equipamentos.buscarParaAtualizacao(1L)).thenReturn(Optional.of(e));when(equipamentos.saveAndFlush(e)).thenReturn(e);
        for(var perfil:PerfilUsuario.values()){Usuario u=new Usuario();u.setNome(perfil.name());u.setLogin(perfil.name());u.setPerfil(perfil);when(usuarios.buscarPorLogin(perfil.name())).thenReturn(u);}
    }
    CalibracaoEquipamento solicitar(){service.solicitar(1L,new CalibracaoDto.Solicitacao("Laboratório A","Calibração periódica"),"GERENTE");var c=e.getCalibracoes().getFirst();ReflectionTestUtils.setField(c,"id",10L);return c;}
    void enviar(){service.retirar(1L,10L,new CalibracaoDto.Retirada(hoje),"ESTOQUE");service.enviar(1L,10L,new CalibracaoDto.Envio("Laboratório A",hoje,hoje.plusDays(10)),"ESTOQUE");}
    @Test void retiradaUsaDiaDeManausMesmoQuandoBancoDevolveInstanteEmUtc(){
        var c=solicitar();var dia=LocalDate.now(java.time.ZoneId.of("America/Manaus")).minusDays(1);
        var instante=dia.atTime(23,30).atZone(java.time.ZoneId.of("America/Manaus")).toOffsetDateTime().withOffsetSameInstant(java.time.ZoneOffset.UTC);
        ReflectionTestUtils.setField(c,"criadoEm",instante);
        service.retirar(1L,10L,new CalibracaoDto.Retirada(dia),"ESTOQUE");
        assertEquals(dia,c.getDataRetirada());
    }
    @Test void envioDoDepositoUsaDiaDeManausMesmoQuandoBancoDevolveUtc(){
        e.setObra(null);var c=solicitar();var dia=LocalDate.now(java.time.ZoneId.of("America/Manaus")).minusDays(1);
        ReflectionTestUtils.setField(c,"criadoEm",dia.atTime(23,30).atZone(java.time.ZoneId.of("America/Manaus")).toOffsetDateTime().withOffsetSameInstant(java.time.ZoneOffset.UTC));
        service.enviar(1L,10L,new CalibracaoDto.Envio("Lab",dia,null),"ESTOQUE");
        assertEquals(dia,c.getDataEnvio());
    }
    @Test void retiradaRealmenteAnteriorContinuaBloqueadaMesmoComOffsetUtc(){
        var c=solicitar();var dia=LocalDate.now(java.time.ZoneId.of("America/Manaus")).minusDays(1);
        ReflectionTestUtils.setField(c,"criadoEm",dia.atTime(23,30).atZone(java.time.ZoneId.of("America/Manaus")).toOffsetDateTime().withOffsetSameInstant(java.time.ZoneOffset.UTC));
        assertThrows(RegraNegocioException.class,()->service.retirar(1L,10L,new CalibracaoDto.Retirada(dia.minusDays(1)),"ESTOQUE"));
        assertNull(c.getDataRetirada());
    }
    @Test void retiradaEnvioRetornoPreservamOrigemDatasAutoriaECertificado(){
        var c=solicitar();assertEquals(0,e.getQuantidadeDisponivel());assertEquals("Em campo",e.getStatus());assertSame(obra,e.getObra());assertEquals("Ana",c.getTecnicoOrigem());
        enviar();assertNull(e.getObra());assertNull(e.getTecnico());assertEquals("Em calibração",e.getStatus());assertEquals(0,e.getQuantidadeDisponivel());
        verify(inventario).registrar(obra);verify(movimentos).save(argThat(m->m.getObraOrigem()==obra&&m.getObraDestino()==null&&m.getQuantidade()==1));
        var resposta=service.retornar(1L,10L,new CalibracaoDto.Retorno(hoje,hoje,hoje.plusMonths(8),"CERT-2026","Aprovado"),"ESTOQUE");
        assertEquals("Em estoque",resposta.status());assertEquals(1,resposta.quantidadeDisponivel());assertEquals("Obra A",resposta.calibracoes().getFirst().localOrigem());
        assertEquals(hoje.plusMonths(8),c.getValidade());assertEquals("CERT-2026",c.getCertificado());assertEquals(4,c.getEventos().size());
        assertEquals("GERENTE",c.getEventos().getFirst().autorLogin());assertEquals("ESTOQUE",c.getEventos().getLast().autorLogin());
        assertThrows(RegraNegocioException.class,()->service.retornar(1L,10L,new CalibracaoDto.Retorno(hoje,hoje,hoje.plusYears(1),"OUTRO",null),"ESTOQUE"));
    }
    @Test void gerenteSolicitaMasNaoConfirmaMovimentosFisicos(){solicitar();assertThrows(AccessDeniedException.class,()->service.retirar(1L,10L,new CalibracaoDto.Retirada(hoje),"GERENTE"));assertThrows(AccessDeniedException.class,()->service.solicitar(1L,new CalibracaoDto.Solicitacao(null,null),"TECNICO"));}
    @Test void naoEnviaSemConfirmarRetiradaNemRetornaSemEnvio(){solicitar();assertThrows(RegraNegocioException.class,()->service.enviar(1L,10L,new CalibracaoDto.Envio("Lab",hoje,null),"ESTOQUE"));assertThrows(RegraNegocioException.class,()->service.retornar(1L,10L,new CalibracaoDto.Retorno(hoje,hoje,hoje.plusYears(1),"X",null),"ESTOQUE"));}
    @Test void calibraSomenteFlukeIndividualSemReservaOuManutencao(){
        e.setTipo("OTDR");assertThrows(RegraNegocioException.class,this::solicitar);e.setTipo("Fluke");e.setQuantidade(2);assertThrows(RegraNegocioException.class,this::solicitar);
        e.setQuantidade(1);e.setQuantidadeReservada(1);assertThrows(RegraNegocioException.class,this::solicitar);e.setQuantidadeReservada(0);
        e.getManutencoes().add(new ManutencaoEquipamento(e,1,"Defeito",usuarios.buscarPorLogin("GERENTE")));assertThrows(RegraNegocioException.class,this::solicitar);
    }
    @Test void bloqueiaSolicitacaoDuplicadaEManutencaoDuranteCalibracao(){solicitar();assertThrows(RegraNegocioException.class,this::solicitar);assertThrows(RegraNegocioException.class,()->servicoEquipamento.abrirManutencao(1L,new br.com.era.api.dto.ManutencaoDto.Abertura(1,"Defeito"),"GERENTE"));}
    @Test void cancelaAntesDoEnvioSemInventarRetornoOuRemoverOrigem(){var c=solicitar();service.cancelar(1L,10L,new CalibracaoDto.Cancelamento("Reagendado"),"GERENTE");assertEquals("CANCELADA",c.getStatus());assertSame(obra,e.getObra());assertEquals(1,e.getQuantidadeDisponivel());verify(movimentos,never()).save(any());}
    @Test void naoCancelaEquipamentoQueContinuaNoLaboratorio(){solicitar();enviar();assertThrows(RegraNegocioException.class,()->service.cancelar(1L,10L,new CalibracaoDto.Cancelamento("Cancelar"),"GERENTE"));assertEquals(0,e.getQuantidadeDisponivel());}
    @Test void datasDoCertificadoPrecisamRespeitarEnvioRetornoEValidade(){
        solicitar();enviar();
        assertThrows(RegraNegocioException.class,()->service.retornar(1L,10L,new CalibracaoDto.Retorno(hoje,hoje,hoje.minusDays(1),"X",null),"ESTOQUE"));
        assertThrows(RegraNegocioException.class,()->service.retornar(1L,10L,new CalibracaoDto.Retorno(hoje,hoje.minusDays(1),hoje.plusYears(1),"X",null),"ESTOQUE"));
    }
    @Test void certificadoAnteriorNaoInventaMovimentacaoNemRetorno(){
        var r=service.registrarCertificado(1L,new CalibracaoDto.Certificado("Lab","ANT-1",hoje.minusMonths(3),hoje.plusMonths(6),"Transcrição do certificado"),"GERENTE");
        assertSame(obra,e.getObra());assertEquals(1,e.getQuantidadeDisponivel());assertNull(r.calibracoes().getFirst().dataRetorno());assertNull(r.calibracoes().getFirst().dataEnvio());
        assertTrue(r.calibracoes().getFirst().historico());assertEquals("CERTIFICADO_ANTERIOR",r.calibracoes().getFirst().eventos().getFirst().acao());verify(movimentos,never()).save(any());verifyNoInteractions(inventario);
    }
    @Test void noDepositoNaoExigeRetiradaFicticia(){e.setObra(null);e.setTecnico(null);e.setStatus("Em estoque");var c=solicitar();assertEquals("AGUARDANDO_ENVIO",c.getStatus());service.enviar(1L,10L,new CalibracaoDto.Envio("Lab",hoje,null),"ESTOQUE");assertEquals("EM_CALIBRACAO",c.getStatus());verify(movimentos,never()).save(any());}
}
