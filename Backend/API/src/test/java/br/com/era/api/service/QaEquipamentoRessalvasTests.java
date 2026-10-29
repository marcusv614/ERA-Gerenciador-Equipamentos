package br.com.era.api.service;

import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class QaEquipamentoRessalvasTests {
    private final EquipamentoRepository equipamentos = mock(EquipamentoRepository.class);
    private final MovimentacaoRepository movimentos = mock(MovimentacaoRepository.class);
    private final ObraService obras = mock(ObraService.class);
    private final FuncionarioService funcionarios = mock(FuncionarioService.class);
    private final UsuarioService usuarios = mock(UsuarioService.class);
    private final InventarioHistoricoService inventario = mock(InventarioHistoricoService.class);
    private final EquipamentoService service = new EquipamentoService(equipamentos,movimentos,obras,funcionarios,usuarios,inventario);

    private Equipamento equipamento(long id, String tipo) {
        Equipamento e = new Equipamento(); ReflectionTestUtils.setField(e,"id",id);
        e.setTipo(tipo); e.setModelo("Modelo"); e.setSerie("SERIE-"+id); e.setStatus("Em estoque");
        when(equipamentos.buscarParaAtualizacao(id)).thenReturn(Optional.of(e));
        when(equipamentos.findById(id)).thenReturn(Optional.of(e));
        when(equipamentos.save(e)).thenReturn(e);
        return e;
    }
    private Usuario perfil(PerfilUsuario perfil) {
        Usuario u = new Usuario(); u.setPerfil(perfil); u.setNome("Autor"); u.setLogin("autor");
        when(usuarios.buscarPorLogin("autor")).thenReturn(u); return u;
    }
    private Obra obra(long id) {
        Obra o = new Obra(); ReflectionTestUtils.setField(o,"id",id); o.setNome("Obra "+id); return o;
    }
    private EquipamentoDto.Requisicao edicao(Equipamento e, String modelo, String serie, Integer quantidade) {
        return new EquipamentoDto.Requisicao(e.getTipo(),modelo,serie,e.getStatus(),e.getObra()==null?null:e.getObra().getId(),
            e.getTecnico()==null?null:e.getTecnico().getNome(),null,null,null,e.getMedida(),quantidade,null,null,null,null,null,null,null);
    }
    private Movimentacao movimento(Equipamento e, Obra origem, Obra destino) {
        return service.novaMovimentacao(e,null,origem,destino,null,"Em campo",1,LocalDate.of(2026,10,27));
    }
    private void manutencao(Equipamento e) {
        e.getManutencoes().add(new ManutencaoEquipamento(e,2,"Reparo",perfil(PerfilUsuario.ADMIN)));
    }

    @ParameterizedTest @ValueSource(strings = {"calibracao","manutencao","reserva","obra","tecnico","transito"})
    void arquivamentoRecusaPendenciasSemAlterarEstado(String pendencia) {
        Equipamento e = equipamento(1,"Ferramentas"); e.setQuantidade(10);
        switch(pendencia) {
            case "calibracao" -> e.getCalibracoes().add(new CalibracaoEquipamento(e,"Lab",null,perfil(PerfilUsuario.ADMIN),false));
            case "manutencao" -> manutencao(e);
            case "reserva" -> e.setQuantidadeReservada(1);
            case "obra" -> e.setObra(obra(10));
            case "tecnico" -> e.setTecnico(new Funcionario());
            case "transito" -> e.setStatus("Em trânsito");
        }
        assertThrows(RegraNegocioException.class, () -> service.definirArquivamento(1L,true,"autor"));
        assertFalse(e.isArquivado()); verify(equipamentos,never()).delete(any());
    }
    @Test void arquivamentoERestauracaoSaoIdempotentesEPreservamHistorico() {
        Equipamento e = equipamento(1,"Ferramentas");
        var m = movimento(e,obra(10),null);
        when(movimentos.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(1L)).thenReturn(List.of(m));
        assertTrue(service.definirArquivamento(1L,true,"autor").arquivado());
        assertTrue(service.definirArquivamento(1L,true,"autor").arquivado());
        var restaurado = service.definirArquivamento(1L,false,"autor");
        assertFalse(restaurado.arquivado()); assertEquals(1,restaurado.historico().size());
        assertFalse(service.definirArquivamento(1L,false,"autor").arquivado());
        verify(equipamentos,never()).delete(any()); verifyNoInteractions(inventario);
    }
    @ParameterizedTest @ValueSource(strings = {"calibracao","manutencao","reserva"})
    void exclusaoPreservaHistoricosEPendencias(String pendencia) {
        Equipamento e = equipamento(1,"Ferramentas");
        if(pendencia.equals("calibracao")) e.getCalibracoes().add(new CalibracaoEquipamento(e,"Lab",null,perfil(PerfilUsuario.ADMIN),true));
        if(pendencia.equals("manutencao")) manutencao(e);
        if(pendencia.equals("reserva")) e.setQuantidadeReservada(1);
        assertThrows(RegraNegocioException.class, () -> service.excluir(1L));
        verify(equipamentos,never()).delete(any()); verify(equipamentos,never()).flush();
    }
    @Test void exclusaoEmObraAtualizaSnapshotDepoisDoFlush() {
        Equipamento e = equipamento(1,"Ferramentas"); Obra o = obra(10); e.setObra(o);
        service.excluir(1L);
        var ordem = inOrder(equipamentos,inventario); ordem.verify(equipamentos).delete(e);
        ordem.verify(equipamentos).flush(); ordem.verify(inventario).registrar(o);
    }
    @ParameterizedTest @ValueSource(strings = {"serie","modelo","quantidade"})
    void edicaoPreservaSerieEUnidadeDeCalibracao(String alteracao) {
        Equipamento e = equipamento(1,"Fluke");
        e.getCalibracoes().add(new CalibracaoEquipamento(e,"Lab",null,perfil(PerfilUsuario.ADMIN),!alteracao.equals("modelo")));
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(e,
            alteracao.equals("modelo")?"Outro":e.getModelo(),alteracao.equals("serie")?"OUTRA":e.getSerie(),alteracao.equals("quantidade")?2:1)));
        verify(equipamentos,never()).save(e);
    }
    @ParameterizedTest @CsvSource({"reserva,serie","reserva,modelo","manutencao,serie","manutencao,modelo"})
    void edicaoNaoTrocaIdentificacaoComPendencias(String pendencia,String campo) {
        Equipamento e = equipamento(1,"Ferramentas"); e.setQuantidade(10);
        if(pendencia.equals("reserva"))e.setQuantidadeReservada(1); else manutencao(e);
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(e,
            campo.equals("modelo")?"Outro":e.getModelo(),campo.equals("serie")?"OUTRA":e.getSerie(),10)));
        verify(equipamentos,never()).save(e);
    }
    @Test void quantidadeNaoPodeConsumirUnidadesEmManutencao() {
        Equipamento e = equipamento(1,"Ferramentas"); e.setQuantidade(10); e.setQuantidadeReservada(2); manutencao(e);
        var erro = assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(e,e.getModelo(),e.getSerie(),3)));
        assertTrue(erro.getMessage().contains("reservadas e em manutenção")); verify(equipamentos,never()).save(e);
    }
    @Test void edicaoRejeitaSerieDeOutroAtivoMasAceitaPropriaSerie() {
        Equipamento e = equipamento(1,"Ferramentas"), outro = equipamento(2,"Ferramentas");
        when(equipamentos.findBySerieIgnoreCase(e.getSerie())).thenReturn(Optional.of(outro));
        assertThrows(RegraNegocioException.class, () -> service.atualizar(1L,edicao(e,e.getModelo(),e.getSerie(),1)));
        when(equipamentos.findBySerieIgnoreCase(e.getSerie())).thenReturn(Optional.of(e));
        assertEquals(e.getSerie(),service.atualizar(1L,edicao(e,e.getModelo(),e.getSerie(),1)).serie());
    }
    @Test void quantidadeEmObraAtualizaSnapshotSomenteQuandoMuda() {
        Equipamento e = equipamento(1,"Ferramentas"); Obra o = obra(10); e.setObra(o); e.setStatus("Em campo");
        service.atualizar(1L,edicao(e,e.getModelo(),null,3));
        assertEquals(3,e.getQuantidade()); assertEquals("LOTE",e.getControleQuantidade());
        service.atualizar(1L,edicao(e,e.getModelo(),null,null));
        verify(inventario,times(1)).registrar(o);
    }
    @ParameterizedTest @EnumSource(PerfilUsuario.class)
    void disponibilidadeFinanceiraExigePerfilEExcluiArquivados(PerfilUsuario p) {
        perfil(p); Equipamento e = equipamento(1,"Ferramentas"), arquivado = equipamento(2,"EPI");
        arquivado.definirArquivamento(true,"autor"); e.setQuantidade(5); e.setQuantidadeReservada(2);
        when(equipamentos.findAll()).thenReturn(List.of(e,arquivado));
        if(p==PerfilUsuario.ADMIN||p==PerfilUsuario.FINANCEIRO) {
            var lista = service.disponibilidadeFinanceira("autor"); assertEquals(1,lista.size());
            assertEquals(3,lista.getFirst().quantidadeDisponivel()); assertEquals(1L,lista.getFirst().id());
        } else assertThrows(AccessDeniedException.class, () -> service.disponibilidadeFinanceira("autor"));
    }
    @ParameterizedTest @EnumSource(PerfilUsuario.class)
    void catalogoRespeitaSetorRemoveDuplicatasEArquivados(PerfilUsuario p) {
        perfil(p); Equipamento ferramenta = equipamento(1,"Ferramentas"), epi = equipamento(2,"EPI"), arquivado = equipamento(3,"Fluke");
        arquivado.definirArquivamento(true,"autor");
        when(equipamentos.findAll()).thenReturn(List.of(ferramenta,epi,ferramenta,arquivado));
        var tipos = service.listarCatalogoParaUsuario("autor").stream().map(EquipamentoDto.ItemCatalogo::tipo).toList();
        assertEquals(p==PerfilUsuario.RH||p==PerfilUsuario.TST?List.of("EPI"):p==PerfilUsuario.TECNICO?List.of("Ferramentas"):List.of("Ferramentas","EPI"),tipos);
    }
    @ParameterizedTest @EnumSource(value = PerfilUsuario.class, names = {"TECNICO","TST"})
    void historicoDeCampoOcultaOutrasObrasELocalAtual(PerfilUsuario p) {
        perfil(p); Equipamento e = equipamento(1,p==PerfilUsuario.TST?"EPI":"Ferramentas");
        Obra permitida = obra(10), restrita = obra(20); e.setObra(restrita);
        Funcionario tecnico = new Funcionario(); tecnico.setNome("Responsável de outra obra"); e.setTecnico(tecnico);
        // ObraService produz HashSet por Collectors.toSet(), inclusive nas viagens ao depósito.
        when(obras.idsPermitidos("autor")).thenReturn(new HashSet<>(List.of(10L)));
        var ida = movimento(e,permitida,restrita); var volta = movimento(e,null,permitida); var privado = movimento(e,restrita,null);
        when(movimentos.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(1L)).thenReturn(List.of(ida,volta,privado));
        when(movimentos.findByEquipamentoIdInOrderByDataMovimentacaoAscIdAsc(List.of(1L))).thenReturn(List.of(ida,volta,privado));
        when(equipamentos.listarParaConsulta()).thenReturn(List.of(e));
        var resposta = service.listarParaUsuario("autor").getFirst();
        assertNull(resposta.obraId()); assertNull(resposta.tecnico()); assertEquals(2,resposta.historico().size());
        var historico = service.historicoParaUsuario(1L,"autor");
        assertEquals(2,historico.size()); assertEquals(10L,historico.getFirst().origemObraId());
        assertNull(historico.getFirst().destinoObraId()); assertEquals("Local restrito",historico.getFirst().destinoNome());
        assertNull(historico.get(1).origemObraId()); assertEquals(10L,historico.get(1).destinoObraId());
        assertEquals(historico,service.restringirHistoricoParaUsuario(List.of(ida,volta,privado),"autor"));
    }
    @ParameterizedTest @EnumSource(value = PerfilUsuario.class, names = {"TECNICO","TST","RH"})
    void historicoDeOutroSetorNaoRevelaExistencia(PerfilUsuario p) {
        perfil(p); Equipamento e = equipamento(1,p==PerfilUsuario.TECNICO?"EPI":"Ferramentas");
        assertThrows(RecursoNaoEncontradoException.class, () -> service.historicoParaUsuario(e.getId(),"autor"));
    }
    @Test void tecnicoSemVinculoAtualOuHistoricoNaoAcessaAtivo() {
        perfil(PerfilUsuario.TECNICO); equipamento(1,"Ferramentas");
        when(obras.idsPermitidos("autor")).thenReturn(new HashSet<>());
        assertThrows(RecursoNaoEncontradoException.class, () -> service.historicoParaUsuario(1L,"autor"));
    }
    @Test void entradaDeCompraCopiaCatalogoSemCompartilharAtributos() {
        Equipamento referencia = equipamento(1,"EPI"); referencia.setAtributos(new LinkedHashMap<>(Map.of("cor","azul"))); referencia.setAuditavel(true);
        when(equipamentos.findAll()).thenReturn(List.of(referencia));
        when(equipamentos.save(any())).thenAnswer(i -> i.getArgument(0));
        var compra = service.registrarEntradaCompra("Modelo","epi|modelo|",4," NF-10 ",null,30L);
        assertTrue(compra.getSerie().startsWith("ERA-")); assertEquals("NF-10",compra.getNotaFiscal());
        assertEquals("LOTE",compra.getControleQuantidade()); assertEquals(4,compra.getQuantidadeDisponivel());
        assertTrue(compra.isAuditavel()); assertNull(compra.getObra()); assertEquals(referencia.getAtributos(),compra.getAtributos());
        compra.getAtributos().put("cor","verde"); assertEquals("azul",referencia.getAtributos().get("cor"));
    }
    @Test void compraRejeitaIdentificacaoDuplicadaECatalogoArquivado() {
        when(equipamentos.existsBySerieIgnoreCase("REPETIDA")).thenReturn(true);
        assertThrows(RegraNegocioException.class, () -> service.registrarEntradaCompra("Modelo","epi|modelo|",1,"NF"," REPETIDA ",1L));
        Equipamento e = equipamento(1,"EPI"); e.definirArquivamento(true,"autor"); when(equipamentos.findAll()).thenReturn(List.of(e));
        assertThrows(RegraNegocioException.class, () -> service.registrarEntradaCompra("Modelo","epi|modelo|",1,"NF","NOVA",1L));
        verify(equipamentos,never()).save(any());
    }
}
