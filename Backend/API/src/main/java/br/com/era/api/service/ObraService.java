package br.com.era.api.service;
import br.com.era.api.dto.ObraDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.model.Obra;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.ObraRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
@Service
public class ObraService {
    private final ObraRepository repository; private final FuncionarioService funcionarios; private final UsuarioService usuarios; private final InventarioHistoricoService inventarioHistorico;
    public ObraService(ObraRepository repository,FuncionarioService funcionarios,UsuarioService usuarios,InventarioHistoricoService inventarioHistorico){this.repository=repository;this.funcionarios=funcionarios;this.usuarios=usuarios;this.inventarioHistorico=inventarioHistorico;}
    @Transactional(readOnly=true) public List<ObraDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional(readOnly=true) public List<ObraDto.Resposta> listarParaUsuario(String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil()!=PerfilUsuario.TECNICO)return listar();return repository.findAll().stream().filter(obra->podeAcessar(usuario,obra)).map(this::resposta).toList();}
    @Transactional public ObraDto.Resposta cadastrar(ObraDto.Requisicao dados){Obra obra=new Obra();preencher(obra,dados);repository.save(obra);inventarioHistorico.registrar(obra);return resposta(obra);}
    @Transactional public ObraDto.Resposta atualizar(Long id,ObraDto.Requisicao dados){Obra obra=buscar(id);preencher(obra,dados);inventarioHistorico.registrar(obra);return resposta(obra);}
    @Transactional(readOnly=true) public Obra buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Obra não encontrada."));}
    @Transactional(readOnly=true) public Obra buscarParaUsuario(Long id,String login){Usuario usuario=usuarios.buscarPorLogin(login);Obra obra=buscar(id);if(!podeAcessar(usuario,obra))throw new RecursoNaoEncontradoException("Obra não encontrada.");return obra;}
    public Obra buscarOpcional(Long id){return id==null?null:buscar(id);}
    public void validarAcessoTecnico(Usuario usuario,Long obraId){if(usuario.getPerfil()==PerfilUsuario.TECNICO&&obraId!=null&&!podeAcessar(usuario,buscar(obraId)))throw new RegraNegocioException("Você não é responsável por esta obra.");}
    @Transactional(readOnly=true) public Set<Long> idsPermitidos(String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil()!=PerfilUsuario.TECNICO)return repository.findAll().stream().map(Obra::getId).collect(Collectors.toSet());return repository.findAll().stream().filter(obra->podeAcessar(usuario,obra)).map(Obra::getId).collect(Collectors.toSet());}
    private boolean podeAcessar(Usuario usuario,Obra obra){if(usuario.getPerfil()!=PerfilUsuario.TECNICO)return true;if(usuario.getFuncionario()==null)return false;return obra.getResponsaveis().stream().anyMatch(responsavel->responsavel.getId().equals(usuario.getFuncionario().getId()));}
    private void preencher(Obra obra,ObraDto.Requisicao d){obra.setNome(d.nome().trim());obra.setCliente(d.cliente().trim());obra.setCidade(d.cidade().trim());obra.setInicio(d.inicio());obra.setStatus(d.status().trim());LinkedHashSet<Funcionario> responsaveis=new LinkedHashSet<>();if(d.responsaveis()!=null)d.responsaveis().forEach(nome->responsaveis.add(funcionarios.buscarPorNome(nome)));obra.setResponsaveis(responsaveis);}
    private ObraDto.Resposta resposta(Obra o){return new ObraDto.Resposta(o.getId(),o.getNome(),o.getCliente(),o.getCidade(),o.getInicio(),o.getStatus(),o.getResponsaveis().stream().map(Funcionario::getNome).toList());}
}
