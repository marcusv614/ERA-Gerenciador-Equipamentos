package br.com.era.api.service;

import br.com.era.api.dto.AuditoriaTecnicoDto;
import br.com.era.api.exception.*;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.LocalDate;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuditoriaTecnicoServiceTests {
    final AuditoriaTecnicoRepository auditorias=mock(AuditoriaTecnicoRepository.class);
    final EquipamentoRepository equipamentos=mock(EquipamentoRepository.class);
    final SolicitacaoRepository pedidos=mock(SolicitacaoRepository.class);
    final FuncionarioService funcionarios=mock(FuncionarioService.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final AuditoriaTecnicoService service=new AuditoriaTecnicoService(auditorias,equipamentos,pedidos,funcionarios,usuarios);
    final Funcionario tecnico=new Funcionario();
    final Usuario gerente=new Usuario();
    final Equipamento equipamento=new Equipamento();
    AuditoriaTecnico salva;
    AuditoriaTecnicoServiceTests(){
        tecnico.setNome("Ana");ReflectionTestUtils.setField(tecnico,"id",1L);
        gerente.setNome("Maria");gerente.setLogin("gerente");gerente.setPerfil(PerfilUsuario.GERENTE);
        equipamento.setTipo("Ferramentas");equipamento.setModelo("Alicate");equipamento.setSerie("FER-1");equipamento.setQuantidade(3);equipamento.setTecnico(tecnico);equipamento.setAuditavel(true);equipamento.setStatus("Em campo");ReflectionTestUtils.setField(equipamento,"id",10L);
        Obra obra=new Obra();obra.setNome("Obra A");equipamento.setObra(obra);
        when(usuarios.buscarPorLogin("gerente")).thenReturn(gerente);when(funcionarios.buscar(1L)).thenReturn(tecnico);
        when(equipamentos.findByTecnicoIdAndAuditavelTrueAndArquivadoFalseOrderByModeloAscSerieAsc(1L)).thenReturn(List.of(equipamento));
        when(pedidos.findByStatus("Em trânsito")).thenReturn(List.of());
        when(auditorias.saveAndFlush(any())).thenAnswer(i->{salva=i.getArgument(0);ReflectionTestUtils.setField(salva,"id",20L);return salva;});
        when(auditorias.buscarParaAtualizacao(20L,1L)).thenAnswer(i->Optional.ofNullable(salva));
    }
    void criar(){service.criar(1L,new AuditoriaTecnicoDto.Criacao(List.of(10L)),"gerente");}
    AuditoriaTecnicoDto.Registro registro(int bom,int avaria,int quebrado,boolean concluir){return new AuditoriaTecnicoDto.Registro(0L,LocalDate.now(),"Fiscal João","Observação geral",concluir,List.of(new AuditoriaTecnicoDto.ItemRegistro(10L,bom,avaria,quebrado,"Cabo rachado")));}
    @Test void fichaGuardaIdentificacaoLocalResponsavelEQuantidadeSemAvaliarAutomaticamente(){
        criar();var item=salva.getItens().getFirst();
        assertEquals("Obra A",item.local());assertEquals(3,item.quantidade());assertEquals(0,item.bom());
        assertEquals("Ana",salva.getTecnicoNome());assertEquals("Maria",salva.getCriadoPorNome());assertEquals("gerente",salva.getCriadoPorLogin());
        equipamento.setModelo("Outro nome");equipamento.setQuantidade(99);tecnico.setNome("Outro técnico");
        assertEquals("Alicate",item.modelo());assertEquals(3,item.quantidade());assertEquals("Ana",salva.getTecnicoNome());
    }
    @Test void naoAceitaItemNaoAuditavel(){equipamento.setAuditavel(false);assertThrows(RegraNegocioException.class,this::criar);verify(auditorias,never()).saveAndFlush(any());}
    @Test void naoAceitaItemDeOutroTecnico(){Funcionario outro=new Funcionario();ReflectionTestUtils.setField(outro,"id",2L);equipamento.setTecnico(outro);assertThrows(RegraNegocioException.class,this::criar);}
    @Test void naoAceitaItemArquivadoOuTotalmenteEmTransito(){equipamento.definirArquivamento(true,"admin");assertThrows(RegraNegocioException.class,this::criar);equipamento.definirArquivamento(false,"admin");equipamento.setStatus("Em trânsito");assertThrows(RegraNegocioException.class,this::criar);}
    @Test void naoIncluiUnidadesEmTransitoMasMantemReservadasNoLocal(){
        Solicitacao pedido=new Solicitacao();pedido.substituirMateriais(List.of(new MaterialSolicitado("Alicate",1,"FER-1",null)));
        when(pedidos.findByStatus("Em trânsito")).thenReturn(List.of(pedido));equipamento.setQuantidadeReservada(2);
        criar();assertEquals(2,salva.getItens().getFirst().quantidade());assertEquals(2,equipamento.getQuantidadeReservada());
    }
    @Test void naoAceitaIdsDuplicados(){assertThrows(RegraNegocioException.class,()->service.criar(1L,new AuditoriaTecnicoDto.Criacao(List.of(10L,10L)),"gerente"));}
    @Test void somenteGerenciaPodeAcessarOuRegistrarAuditorias(){
        for(var perfil:List.of(PerfilUsuario.TECNICO,PerfilUsuario.ESTOQUE)){
            gerente.setPerfil(perfil);assertThrows(AccessDeniedException.class,this::criar);assertThrows(AccessDeniedException.class,()->service.listar(1L,"gerente"));
        }
    }
    @Test void permiteRascunhoSemClassificarTodasAsUnidades(){criar();var r=service.registrar(1L,20L,registro(1,0,0,false),"gerente");assertEquals("ABERTA",r.status());assertEquals(1,r.itens().getFirst().bom());assertNull(r.concluidaEm());}
    @Test void exigeTodasAsUnidadesParaConcluir(){criar();assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,registro(1,0,0,true),"gerente"));assertEquals("ABERTA",salva.getStatus());}
    @Test void recusaSomaExcessivaNegativaOuEstouro(){
        criar();for(int[] valores:List.of(new int[]{4,0,0},new int[]{-1,1,1},new int[]{Integer.MAX_VALUE,Integer.MAX_VALUE,0}))assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,registro(valores[0],valores[1],valores[2],false),"gerente"));
    }
    @Test void preservaResultadosConcluidosEAutorDoLancamento(){
        criar();var r=service.registrar(1L,20L,registro(1,1,1,true),"gerente");assertEquals("CONCLUIDA",r.status());assertNotNull(r.concluidaEm());assertEquals("gerente",r.registradoPorLogin());assertEquals("Fiscal João",r.fiscal());
        assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,registro(3,0,0,true),"gerente"));
        assertEquals(1,salva.getItens().getFirst().quebrado());assertEquals("Em campo",equipamento.getStatus());
    }
    @Test void fichaContinuaValidaSeEquipamentoForMovidoOuDesmarcadoDepois(){
        criar();equipamento.setTecnico(null);equipamento.setAuditavel(false);equipamento.setQuantidade(0);
        var r=service.registrar(1L,20L,registro(1,1,1,true),"gerente");assertEquals(3,r.itens().getFirst().quantidade());assertEquals("Obra A",r.itens().getFirst().local());
    }
    @Test void exigeFiscalEDataENaoAceitaDataFutura(){
        criar();var base=registro(3,0,0,true);
        assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,new AuditoriaTecnicoDto.Registro(0L,null,"",null,true,base.itens()),"gerente"));
        assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,new AuditoriaTecnicoDto.Registro(0L,LocalDate.now().plusDays(1),"Fiscal",null,true,base.itens()),"gerente"));
    }
    @Test void naoSobrescreveVersaoAntiga(){criar();ReflectionTestUtils.setField(salva,"versao",2L);assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,registro(3,0,0,false),"gerente"));}
    @Test void naoPermiteTrocarItensDaFicha(){
        criar();var falso=new AuditoriaTecnicoDto.ItemRegistro(999L,3,0,0,null);
        assertThrows(RegraNegocioException.class,()->service.registrar(1L,20L,new AuditoriaTecnicoDto.Registro(0L,LocalDate.now(),"Fiscal",null,true,List.of(falso)),"gerente"));
    }
    @Test void naoAcessaFichaDeOutroTecnico(){assertThrows(RecursoNaoEncontradoException.class,()->service.consultar(2L,20L,"gerente"));assertThrows(RecursoNaoEncontradoException.class,()->service.registrar(2L,20L,registro(3,0,0,true),"gerente"));}
}
