package br.com.era.api.service;

import br.com.era.api.dto.AutenticacaoDto;
import br.com.era.api.dto.UsuarioDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.FuncionarioRepository;
import br.com.era.api.repository.UsuarioRepository;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class UsuarioService implements UserDetailsService {
    private static final int MAX_TENTATIVAS = 5;
    private final UsuarioRepository repository; private final FuncionarioRepository funcionarios; private final PasswordEncoder encoder;
    public UsuarioService(UsuarioRepository repository,FuncionarioRepository funcionarios,PasswordEncoder encoder){this.repository=repository;this.funcionarios=funcionarios;this.encoder=encoder;}
    @Override @Transactional(readOnly=true) public UserDetails loadUserByUsername(String login) throws UsernameNotFoundException {
        Usuario usuario=repository.findByLoginIgnoreCase(normalizar(login)).orElseThrow(()->new UsernameNotFoundException("Credenciais inválidas."));
        boolean bloqueado=usuario.getBloqueadoAte()!=null&&usuario.getBloqueadoAte().isAfter(OffsetDateTime.now());
        return User.withUsername(usuario.getLogin()).password(usuario.getSenhaHash()).roles(usuario.getPerfil().name()).disabled(!usuario.isAtivo()).accountLocked(bloqueado).build();
    }
    @Transactional(readOnly=true) public Usuario buscarPorLogin(String login){return repository.findByLoginIgnoreCase(normalizar(login)).orElseThrow(()->new RecursoNaoEncontradoException("Usuário não encontrado."));}
    @Transactional(readOnly=true) public List<UsuarioDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional public UsuarioDto.Resposta cadastrar(UsuarioDto.Cadastro dados){
        String login=normalizar(dados.login()); if(repository.existsByLoginIgnoreCase(login))throw new RegraNegocioException("Já existe um usuário com esse login.");
        Usuario usuario=new Usuario();usuario.setNome(dados.nome().trim());usuario.setLogin(login);usuario.setSenhaHash(encoder.encode(dados.senhaTemporaria()));usuario.setPerfil(dados.perfil());usuario.setDeveAlterarSenha(true);
        if(dados.funcionarioId()!=null){Funcionario funcionario=funcionarios.findById(dados.funcionarioId()).orElseThrow(()->new RecursoNaoEncontradoException("Funcionário não encontrado."));usuario.setFuncionario(funcionario);}
        return resposta(repository.save(usuario));
    }
    @Transactional public UsuarioDto.Resposta definirStatus(Long id,boolean ativo){Usuario u=buscar(id);u.setAtivo(ativo);if(ativo){u.setTentativasFalhas(0);u.setBloqueadoAte(null);}return resposta(u);}
    @Transactional public UsuarioDto.Resposta redefinirSenha(Long id,String senha){Usuario u=buscar(id);u.setSenhaHash(encoder.encode(senha));u.setDeveAlterarSenha(true);u.setTentativasFalhas(0);u.setBloqueadoAte(null);return resposta(u);}
    @Transactional public void registrarFalha(String login){repository.findByLoginIgnoreCase(normalizar(login)).ifPresent(u->{int tentativas=u.getTentativasFalhas()+1;u.setTentativasFalhas(tentativas);if(tentativas>=MAX_TENTATIVAS)u.setBloqueadoAte(OffsetDateTime.now().plusMinutes(15));});}
    @Transactional public Usuario registrarSucesso(String login){Usuario u=buscarPorLogin(login);u.setTentativasFalhas(0);u.setBloqueadoAte(null);u.setUltimoLogin(OffsetDateTime.now());return u;}
    @Transactional public void alterarSenha(String login,AutenticacaoDto.AlterarSenha dados){Usuario u=buscarPorLogin(login);if(!encoder.matches(dados.senhaAtual(),u.getSenhaHash()))throw new RegraNegocioException("A senha atual está incorreta.");if(encoder.matches(dados.novaSenha(),u.getSenhaHash()))throw new RegraNegocioException("A nova senha deve ser diferente da atual.");u.setSenhaHash(encoder.encode(dados.novaSenha()));u.setDeveAlterarSenha(false);u.setSenhaAlteradaEm(OffsetDateTime.now());}
    public AutenticacaoDto.Sessao sessao(Usuario u){return new AutenticacaoDto.Sessao(u.getId(),u.getNome(),u.getLogin(),u.getPerfil().name(),u.isDeveAlterarSenha());}
    private Usuario buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Usuário não encontrado."));}
    private UsuarioDto.Resposta resposta(Usuario u){return new UsuarioDto.Resposta(u.getId(),u.getFuncionario()==null?null:u.getFuncionario().getId(),u.getNome(),u.getLogin(),u.getPerfil(),u.isAtivo(),u.isDeveAlterarSenha());}
    private String normalizar(String login){return login==null?"":login.trim().toLowerCase();}
    @Transactional public void criarAdminInicial(String nome,String login,String senha){if(login==null||login.isBlank()||senha==null||senha.isBlank()||repository.existsByLoginIgnoreCase(login))return;Usuario u=new Usuario();u.setNome(nome==null||nome.isBlank()?"Administrador ERA":nome);u.setLogin(normalizar(login));u.setSenhaHash(encoder.encode(senha));u.setPerfil(PerfilUsuario.ADMIN);u.setDeveAlterarSenha(true);repository.save(u);}
}
