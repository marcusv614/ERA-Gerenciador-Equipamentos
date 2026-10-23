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
import br.com.era.api.config.UsuarioAutenticado;
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
        return new UsuarioAutenticado(usuario);
    }
    @Transactional(readOnly=true) public java.util.Optional<Usuario> buscarParaSessao(Long id){return repository.findById(id);}
    @Transactional(readOnly=true) public Usuario buscarPorLogin(String login){return repository.findByLoginIgnoreCase(normalizar(login)).orElseThrow(()->new RecursoNaoEncontradoException("Usuário não encontrado."));}
    @Transactional(readOnly=true) public List<UsuarioDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional(readOnly=true)
    public void validarAcessoRecebimento(Funcionario funcionario, br.com.era.api.model.Obra obra) {
        if (funcionario.isArquivado() || !"Ativo".equals(funcionario.getStatus()))
            throw new RegraNegocioException("Selecione um técnico ativo para receber os materiais.");
        boolean responsavel = obra.getResponsaveis().stream().anyMatch(f -> f.getId().equals(funcionario.getId()));
        if (!responsavel) throw new RegraNegocioException("O técnico responsável pelo recebimento precisa estar vinculado à obra de destino.");
        repository.findByFuncionarioId(funcionario.getId()).filter(u -> u.isAtivo() && u.getPerfil().ehProfissionalDeCampo())
            .orElseThrow(() -> new RegraNegocioException("O responsável selecionado precisa de um acesso técnico ou TST ativo para confirmar o recebimento."));
    }
    @Transactional(readOnly=true)
    public PerfilUsuario perfilAtivoDoFuncionario(Funcionario funcionario) {
        return repository.findByFuncionarioId(funcionario.getId())
            .filter(Usuario::isAtivo)
            .map(Usuario::getPerfil)
            .filter(PerfilUsuario::ehProfissionalDeCampo)
            .orElseThrow(() -> new RegraNegocioException("O responsável selecionado precisa de um acesso técnico ou TST ativo."));
    }
    @Transactional(readOnly=true)
    public boolean funcionarioTemPerfilAtivo(Funcionario funcionario, PerfilUsuario perfil) {
        return funcionario != null && repository.findByFuncionarioId(funcionario.getId())
            .filter(Usuario::isAtivo).map(Usuario::getPerfil).filter(perfil::equals).isPresent();
    }
    @Transactional public UsuarioDto.Resposta cadastrar(UsuarioDto.Cadastro dados){
        String login=normalizar(dados.login()); if(repository.existsByLoginIgnoreCase(login))throw new RegraNegocioException("Já existe um usuário com esse login.");
        if(dados.perfil().ehProfissionalDeCampo()&&dados.funcionarioId()==null)throw new RegraNegocioException("O usuário técnico ou TST precisa estar vinculado a um funcionário.");
        if(dados.funcionarioId()!=null&&repository.existsByFuncionarioId(dados.funcionarioId()))throw new RegraNegocioException("Este funcionário já possui um usuário vinculado.");
        validarSenha(login,dados.senhaTemporaria());
        Usuario usuario=new Usuario();usuario.setNome(dados.nome().trim());usuario.setLogin(login);usuario.setSenhaHash(encoder.encode(dados.senhaTemporaria()));usuario.setPerfil(dados.perfil());usuario.setDeveAlterarSenha(true);
        if(dados.funcionarioId()!=null){Funcionario funcionario=funcionarios.findById(dados.funcionarioId()).filter(f->!f.isArquivado()).orElseThrow(()->new RecursoNaoEncontradoException("Funcionário ativo não encontrado."));usuario.setFuncionario(funcionario);}
        return resposta(repository.save(usuario));
    }
    @Transactional public UsuarioDto.Resposta atualizar(Long id,UsuarioDto.Atualizacao dados){
        Usuario usuario=buscar(id);String login=normalizar(dados.login());
        if(repository.existsByLoginIgnoreCaseAndIdNot(login,id))throw new RegraNegocioException("Já existe um usuário com esse login.");
        if(dados.perfil().ehProfissionalDeCampo()&&dados.funcionarioId()==null)throw new RegraNegocioException("O usuário técnico ou TST precisa estar vinculado a um funcionário.");
        if(dados.funcionarioId()!=null&&repository.existsByFuncionarioIdAndIdNot(dados.funcionarioId(),id))throw new RegraNegocioException("Este funcionário já possui um usuário vinculado.");
        if(usuario.isAtivo()&&usuario.getPerfil()==PerfilUsuario.ADMIN&&dados.perfil()!=PerfilUsuario.ADMIN&&repository.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)<=1)throw new RegraNegocioException("O último administrador ativo não pode ter o perfil alterado.");
        usuario.setNome(dados.nome().trim());usuario.setLogin(login);usuario.setPerfil(dados.perfil());
        if(dados.perfil().ehProfissionalDeCampo()){Funcionario funcionario=funcionarios.findById(dados.funcionarioId()).filter(f->!f.isArquivado()).orElseThrow(()->new RecursoNaoEncontradoException("Funcionário ativo não encontrado."));usuario.setFuncionario(funcionario);}else usuario.setFuncionario(null);
        if(dados.senhaTemporaria()!=null){validarSenha(login,dados.senhaTemporaria());usuario.setSenhaHash(encoder.encode(dados.senhaTemporaria()));usuario.setDeveAlterarSenha(true);usuario.setTentativasFalhas(0);usuario.setBloqueadoAte(null);}
        return resposta(usuario);
    }
    @Transactional public UsuarioDto.Resposta definirStatus(Long id,boolean ativo,String solicitante){Usuario u=buscar(id);if(!ativo&&u.getLogin().equalsIgnoreCase(solicitante))throw new RegraNegocioException("O administrador não pode desativar a própria conta.");if(!ativo&&u.getPerfil()==PerfilUsuario.ADMIN&&repository.countByPerfilAndAtivoTrue(PerfilUsuario.ADMIN)<=1)throw new RegraNegocioException("O último administrador ativo não pode ser desativado.");u.setAtivo(ativo);if(ativo){u.setTentativasFalhas(0);u.setBloqueadoAte(null);}return resposta(u);}
    @Transactional public UsuarioDto.Resposta redefinirSenha(Long id,String senha){Usuario u=buscar(id);validarSenha(u.getLogin(),senha);u.setSenhaHash(encoder.encode(senha));u.setDeveAlterarSenha(true);u.setTentativasFalhas(0);u.setBloqueadoAte(null);return resposta(u);}
    @Transactional public void registrarFalha(String login){repository.buscarLoginParaAtualizacao(normalizar(login)).ifPresent(u->{
        OffsetDateTime agora=OffsetDateTime.now();
        if(u.getBloqueadoAte()!=null&&u.getBloqueadoAte().isAfter(agora))return;
        int tentativas=u.getBloqueadoAte()!=null?1:Math.min(u.getTentativasFalhas()+1,MAX_TENTATIVAS);
        u.setTentativasFalhas(tentativas);u.setBloqueadoAte(tentativas>=MAX_TENTATIVAS?agora.plusMinutes(15):null);
    });}
    @Transactional public Usuario registrarSucesso(Long id,long versaoSessao){Usuario u=buscar(id);if(!u.isAtivo()||u.getVersaoSessao()!=versaoSessao)throw new org.springframework.security.authentication.BadCredentialsException("Credenciais inválidas.");u.setTentativasFalhas(0);u.setBloqueadoAte(null);u.setUltimoLogin(OffsetDateTime.now());return u;}
    @Transactional public UsuarioAutenticado alterarSenha(Long id,AutenticacaoDto.AlterarSenha dados,long versaoSessao){
        Usuario u=buscar(id);
        if(!u.isAtivo()||u.getVersaoSessao()!=versaoSessao)throw new org.springframework.security.access.AccessDeniedException("Sessão revogada.");
        if(!u.isDeveAlterarSenha()&&(dados.senhaAtual()==null||!encoder.matches(dados.senhaAtual(),u.getSenhaHash())))throw new RegraNegocioException("A senha atual está incorreta.");
        validarSenha(u.getLogin(),dados.novaSenha());if(encoder.matches(dados.novaSenha(),u.getSenhaHash()))throw new RegraNegocioException("A nova senha deve ser diferente da atual.");
        u.setSenhaHash(encoder.encode(dados.novaSenha()));u.setDeveAlterarSenha(false);u.setSenhaAlteradaEm(OffsetDateTime.now());
        return new UsuarioAutenticado(u);
    }
    public AutenticacaoDto.Sessao sessao(Usuario u){return new AutenticacaoDto.Sessao(u.getId(),u.getFuncionario()==null?null:u.getFuncionario().getId(),u.getNome(),u.getLogin(),u.getPerfil().name(),u.isDeveAlterarSenha());}
    private Usuario buscar(Long id){return repository.buscarIdParaAtualizacao(id).orElseThrow(()->new RecursoNaoEncontradoException("Usuário não encontrado."));}
    private UsuarioDto.Resposta resposta(Usuario u){return new UsuarioDto.Resposta(u.getId(),u.getFuncionario()==null?null:u.getFuncionario().getId(),u.getNome(),u.getLogin(),u.getPerfil(),u.isAtivo(),u.isDeveAlterarSenha(),u.getUltimoLogin(),u.getCriadoEm(),u.getSenhaAlteradaEm(),u.getBloqueadoAte());}
    private String normalizar(String login){return login==null?"":login.trim().toLowerCase();}
    private void validarSenha(String login,String senha){if(senha==null||senha.length()<8)throw new RegraNegocioException("A senha precisa ter pelo menos 8 caracteres.");if(senha.toLowerCase().contains(login))throw new RegraNegocioException("A senha não pode conter o login do usuário.");}
    @Transactional public void criarAdminInicial(String nome,String login,String senha){if(login==null||login.isBlank()||senha==null||senha.isBlank()||repository.existsByLoginIgnoreCase(login))return;String loginNormalizado=normalizar(login);validarSenha(loginNormalizado,senha);Usuario u=new Usuario();u.setNome(nome==null||nome.isBlank()?"Administrador ERA":nome);u.setLogin(loginNormalizado);u.setSenhaHash(encoder.encode(senha));u.setPerfil(PerfilUsuario.ADMIN);u.setDeveAlterarSenha(true);repository.save(u);}
}
