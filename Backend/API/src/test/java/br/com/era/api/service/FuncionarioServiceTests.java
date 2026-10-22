package br.com.era.api.service;

import br.com.era.api.dto.FuncionarioDto;
import br.com.era.api.model.Funcionario;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.FuncionarioRepository;
import br.com.era.api.repository.ObraRepository;
import br.com.era.api.repository.SolicitacaoRepository;
import br.com.era.api.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FuncionarioServiceTests {
    private final FuncionarioRepository repository=mock(FuncionarioRepository.class);
    private final FuncionarioService service=new FuncionarioService(repository,mock(ObraRepository.class),
        mock(EquipamentoRepository.class),mock(SolicitacaoRepository.class),mock(UsuarioRepository.class),
        mock(UsuarioService.class),mock(InventarioHistoricoService.class));

    @Test
    void cadastraFuncionarioSemEmailNemTelefone(){
        when(repository.save(any(Funcionario.class))).thenAnswer(invocacao->invocacao.getArgument(0));

        service.cadastrar(new FuncionarioDto.Requisicao("Ana","TST","   ",null,null));

        ArgumentCaptor<Funcionario> captor=ArgumentCaptor.forClass(Funcionario.class);
        verify(repository).save(captor.capture());
        verify(repository,never()).existsByEmailIgnoreCase(any());
        assertNull(captor.getValue().getEmail());
        assertNull(captor.getValue().getTelefone());
    }
}
