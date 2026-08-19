package br.com.era.api.service;
import br.com.era.api.dto.ObraDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.model.Obra;
import br.com.era.api.repository.ObraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashSet;
import java.util.List;
@Service
public class ObraService {
    private final ObraRepository repository; private final FuncionarioService funcionarios;
    public ObraService(ObraRepository repository,FuncionarioService funcionarios){this.repository=repository;this.funcionarios=funcionarios;}
    @Transactional(readOnly=true) public List<ObraDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional public ObraDto.Resposta cadastrar(ObraDto.Requisicao dados){Obra obra=new Obra();preencher(obra,dados);return resposta(repository.save(obra));}
    @Transactional public ObraDto.Resposta atualizar(Long id,ObraDto.Requisicao dados){Obra obra=buscar(id);preencher(obra,dados);return resposta(obra);}
    @Transactional(readOnly=true) public Obra buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Obra não encontrada."));}
    public Obra buscarOpcional(Long id){return id==null?null:buscar(id);}
    private void preencher(Obra obra,ObraDto.Requisicao d){obra.setNome(d.nome().trim());obra.setCliente(d.cliente().trim());obra.setCidade(d.cidade().trim());obra.setInicio(d.inicio());obra.setStatus(d.status());LinkedHashSet<Funcionario> responsaveis=new LinkedHashSet<>();if(d.responsaveis()!=null)d.responsaveis().forEach(nome->responsaveis.add(funcionarios.buscarPorNome(nome)));obra.setResponsaveis(responsaveis);}
    private ObraDto.Resposta resposta(Obra o){return new ObraDto.Resposta(o.getId(),o.getNome(),o.getCliente(),o.getCidade(),o.getInicio(),o.getStatus(),o.getResponsaveis().stream().map(Funcionario::getNome).toList());}
}
