package br.com.era.api.service;

import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class ConsultaObrasAuditoriaTests {
    final ObraRepository repository=mock(ObraRepository.class);
    final UsuarioService usuarios=mock(UsuarioService.class);
    final ObraService service=new ObraService(repository,mock(EquipamentoRepository.class),mock(SolicitacaoRepository.class),mock(FuncionarioService.class),usuarios,mock(InventarioHistoricoService.class));
    @Test void gerenciaEEstoqueConsultamNomeDeObraArquivadaParaAuditoria(){
        Obra arquivada=new Obra();arquivada.setNome("Obra antiga");arquivada.definirArquivamento(true,"admin");
        when(repository.findAll()).thenReturn(List.of(arquivada));
        for(PerfilUsuario perfil:List.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.ESTOQUE)){
            Usuario u=new Usuario();u.setPerfil(perfil);when(usuarios.buscarPorLogin("auditor")).thenReturn(u);
            var obras=service.listarParaUsuario("auditor");assertEquals(1,obras.size());assertEquals("Obra antiga",obras.getFirst().nome());
        }
    }
    @Test void tecnicoNaoGanhaAcessoAObraArquivada(){
        Obra arquivada=new Obra();arquivada.definirArquivamento(true,"admin");when(repository.findAll()).thenReturn(List.of(arquivada));
        Usuario u=new Usuario();u.setPerfil(PerfilUsuario.TECNICO);when(usuarios.buscarPorLogin("tecnico")).thenReturn(u);
        assertTrue(service.listarParaUsuario("tecnico").isEmpty());
    }
    @Test void listagemOperacionalDeObrasAtivasContinuaExcluindoArquivadas(){
        Obra arquivada=new Obra();arquivada.definirArquivamento(true,"admin");when(repository.findAll()).thenReturn(List.of(arquivada));assertTrue(service.listar().isEmpty());
    }
}
