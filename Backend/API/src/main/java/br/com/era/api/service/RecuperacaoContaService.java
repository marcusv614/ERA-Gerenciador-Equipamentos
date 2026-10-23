package br.com.era.api.service;

import br.com.era.api.config.RecuperacaoProperties;
import br.com.era.api.dto.RecuperacaoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.PerfilUsuario;
import br.com.era.api.model.TokenRecuperacao;
import br.com.era.api.model.Usuario;
import br.com.era.api.repository.TokenRecuperacaoRepository;
import br.com.era.api.repository.UsuarioRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Locale;
import static br.com.era.api.model.TokenRecuperacao.Finalidade.*;
import static br.com.era.api.service.LimitesRecuperacao.hash;

@Service
public class RecuperacaoContaService {
    private final UsuarioRepository usuarios;
    private final TokenRecuperacaoRepository tokens;
    private final PasswordEncoder encoder;
    private final EmailRecuperacaoService email;
    private final LimitesRecuperacao limites;
    private final RecuperacaoProperties config;
    private final JdbcTemplate jdbc;
    private final AuditoriaSegurancaService auditoria;
    private final SecureRandom random=new SecureRandom();

    public RecuperacaoContaService(UsuarioRepository usuarios,TokenRecuperacaoRepository tokens,PasswordEncoder encoder,
        EmailRecuperacaoService email,LimitesRecuperacao limites,RecuperacaoProperties config,JdbcTemplate jdbc,AuditoriaSegurancaService auditoria){
        this.usuarios=usuarios;this.tokens=tokens;this.encoder=encoder;this.email=email;
        this.limites=limites;this.config=config;this.jdbc=jdbc;
        this.auditoria=auditoria;
    }
    public boolean habilitada(){return config.habilitada();}
    public boolean exigeCadastro(Usuario usuario){return habilitada()&&usuario.precisaCadastrarEmailRecuperacao();}

    @Transactional(readOnly=true)
    public RecuperacaoDto.Configuracao configuracao(Long id,long versao){
        Usuario usuario=validarAdmin(usuarios.findById(id).orElseThrow(()->new AccessDeniedException("Acesso negado.")),versao);
        String pendente=tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(id,CONFIRMAR_EMAIL)
            .filter(t->t.valido(OffsetDateTime.now())&&t.getVersaoSessao()==versao).map(TokenRecuperacao::getEmail).orElse(null);
        return new RecuperacaoDto.Configuracao(habilitada(),exigeCadastro(usuario),usuario.getEmailRecuperacao(),pendente);
    }

    @Transactional
    public void cadastrarEmail(Long id,long versao,RecuperacaoDto.CadastrarEmail dados){
        exigirHabilitada();
        Usuario usuario=adminBloqueado(id,versao);
        if(usuario.isDeveAlterarSenha())throw new RegraNegocioException("Troque a senha temporária antes de cadastrar o e-mail.");
        if(!limites.permitir("cadastro-email",id.toString(),5))throw new RegraNegocioException("Limite de tentativas atingido. Tente novamente em uma hora.");
        if(!encoder.matches(dados.senhaAtual(),usuario.getSenhaHash()))throw new RegraNegocioException("A senha atual está incorreta.");
        String destino=dados.email().trim().toLowerCase(Locale.ROOT);
        if(destino.equalsIgnoreCase(usuario.getEmailRecuperacao()))throw new RegraNegocioException("Esse e-mail já está confirmado para sua conta.");
        OffsetDateTime agora=OffsetDateTime.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(id,CONFIRMAR_EMAIL)
            .filter(t->t.getCriadoEm().isAfter(agora.minusSeconds(60))).ifPresent(t->{
                throw new RegraNegocioException("Aguarde um minuto antes de solicitar outro código.");
            });
        String codigo=String.format(Locale.ROOT,"%08d",random.nextInt(100_000_000));
        tokens.invalidar(id,CONFIRMAR_EMAIL,agora);
        tokens.save(new TokenRecuperacao(usuario,CONFIRMAR_EMAIL,destino,hashCodigo(id,agora,codigo),agora));
        email.enviar(destino,"Confirme seu e-mail de recuperação",
            "Seu código de confirmação é: "+codigo+"\n\nEle é válido por 15 minutos e permite até 5 tentativas. "
            +"Digite-o no sistema ERA, na sessão em que solicitou o cadastro. Nunca compartilhe este código. "
            +"Se não foi você quem solicitou, ignore esta mensagem.\n\nEste e-mail ainda não permite recuperar a conta até ser confirmado.");
        auditar(id,"CONFIRMACAO_EMAIL_ENVIADA");
    }

    // A falha de código precisa ser persistida; a exceção é específica para não confirmar outras alterações.
    @Transactional(noRollbackFor=CodigoInvalidoException.class)
    public void confirmarEmail(Long id,long versao,String codigo){
        exigirHabilitada();
        Usuario usuario=adminBloqueado(id,versao);
        TokenRecuperacao token=tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(id,CONFIRMAR_EMAIL)
            .filter(t->t.valido(OffsetDateTime.now())&&t.getVersaoSessao()==versao)
            .orElseThrow(()->new RegraNegocioException("Código inválido ou expirado. Solicite outro código."));
        if(!MessageDigest.isEqual(token.getTokenHash().getBytes(StandardCharsets.UTF_8),
            hashCodigo(id,token.getCriadoEm(),codigo).getBytes(StandardCharsets.UTF_8))){
            token.registrarFalha();auditar(id,"CONFIRMACAO_EMAIL_INVALIDA");
            throw new CodigoInvalidoException();
        }
        String anterior=usuario.getEmailRecuperacao();
        OffsetDateTime agora=OffsetDateTime.now();
        usuario.confirmarEmailRecuperacao(token.getEmail(),agora);token.consumir(agora);
        tokens.invalidar(id,REDEFINIR_SENHA,agora);
        auditar(id,"EMAIL_RECUPERACAO_CONFIRMADO");
        if(anterior!=null)aposConfirmacao(()->email.avisarSemInterromper(anterior,"E-mail de recuperação alterado",
            "O e-mail de recuperação da sua conta ERA foi alterado. Se você não reconhece esta ação, entre em contato com outro administrador imediatamente."));
    }

    // Executado em uma fila limitada, nunca na resposta pública: contas inexistentes recebem a mesma resposta.
    @Transactional
    public void processarSolicitacao(String login){
        if(!habilitada())return;
        Usuario usuario=usuarios.buscarLoginParaAtualizacao(login).filter(u->u.isAtivo()&&u.getPerfil()==PerfilUsuario.ADMIN
            &&u.getEmailRecuperacaoVerificadoEm()!=null).orElse(null);
        if(usuario==null)return;
        OffsetDateTime agora=OffsetDateTime.now();
        if(tokens.findFirstByUsuarioIdAndFinalidadeOrderByCriadoEmDescIdDesc(usuario.getId(),REDEFINIR_SENHA)
            .filter(t->t.getCriadoEm().isAfter(agora.minusSeconds(60))).isPresent())return;
        byte[] bytes=new byte[32];random.nextBytes(bytes);
        String segredo=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.invalidar(usuario.getId(),REDEFINIR_SENHA,agora);
        tokens.save(new TokenRecuperacao(usuario,REDEFINIR_SENHA,usuario.getEmailRecuperacao(),hash(segredo),agora));
        email.enviar(usuario.getEmailRecuperacao(),"Redefinição de senha",
            "Foi solicitada uma nova senha para sua conta ERA. Abra o endereço abaixo:\n\n"
            +config.urlPublica()+"/#recuperacao="+segredo
            +"\n\nO link expira em 15 minutos e só pode ser utilizado uma vez. Sua senha atual permanece válida até a redefinição. "
            +"Se você não solicitou, ignore a mensagem. Nunca compartilhe este link.");
        auditar(usuario.getId(),"RECUPERACAO_SOLICITADA");
    }

    @Transactional
    public void redefinir(RecuperacaoDto.Redefinir dados){
        exigirHabilitada();
        String hash=hash(dados.token());
        // Sempre bloquear usuário antes de token, como nas outras operações, evitando inversão de locks.
        Long usuarioId=tokens.buscarUsuarioPeloHash(hash).orElseThrow(this::linkInvalido);
        Usuario usuario=usuarios.buscarIdParaAtualizacao(usuarioId).orElseThrow(this::linkInvalido);
        TokenRecuperacao token=tokens.buscarParaAtualizacao(hash).orElseThrow(this::linkInvalido);
        if(!usuario.isAtivo()||usuario.getPerfil()!=PerfilUsuario.ADMIN||usuario.getEmailRecuperacaoVerificadoEm()==null
            ||token.getFinalidade()!=REDEFINIR_SENHA||!token.valido(OffsetDateTime.now())
            ||token.getVersaoSessao()!=usuario.getVersaoSessao()||!token.getEmail().equals(usuario.getEmailRecuperacao()))throw linkInvalido();
        br.com.era.api.config.PoliticaSenha.validar(usuario.getLogin(),dados.novaSenha());
        if(encoder.matches(dados.novaSenha(),usuario.getSenhaHash()))throw new RegraNegocioException("A nova senha deve ser diferente da atual.");
        OffsetDateTime agora=OffsetDateTime.now();
        usuario.setSenhaHash(encoder.encode(dados.novaSenha()));usuario.setDeveAlterarSenha(false);
        usuario.setTentativasFalhas(0);usuario.setBloqueadoAte(null);usuario.setSenhaAlteradaEm(agora);
        token.consumir(agora);tokens.invalidar(usuario.getId(),CONFIRMAR_EMAIL,agora);
        tokens.invalidar(usuario.getId(),REDEFINIR_SENHA,agora);auditar(usuario.getId(),"SENHA_RECUPERADA");
        aposConfirmacao(()->email.avisarSemInterromper(usuario.getEmailRecuperacao(),"Senha redefinida",
            "Sua senha no sistema ERA foi redefinida e as sessões anteriores foram encerradas. "
            +"Se não foi você, solicite uma nova recuperação ou entre em contato com outro administrador imediatamente."));
    }

    private Usuario adminBloqueado(Long id,long versao){return validarAdmin(usuarios.buscarIdParaAtualizacao(id).orElseThrow(()->new AccessDeniedException("Acesso negado.")),versao);}
    private Usuario validarAdmin(Usuario usuario,long versao){
        if(!usuario.isAtivo()||usuario.getPerfil()!=PerfilUsuario.ADMIN||usuario.getVersaoSessao()!=versao)throw new AccessDeniedException("Acesso negado.");
        return usuario;
    }
    private void exigirHabilitada(){if(!habilitada())throw new RegraNegocioException("A recuperação por e-mail ainda não foi configurada no servidor.");}
    private RegraNegocioException linkInvalido(){return new RegraNegocioException("Link inválido ou expirado. Solicite uma nova recuperação.");}
    private void auditar(Long id,String tipo){
        jdbc.update("INSERT INTO recuperacao_eventos(usuario_id,tipo) VALUES (?,?)",id,tipo);
        if("EMAIL_RECUPERACAO_CONFIRMADO".equals(tipo))auditoria.registrar(AuditoriaSegurancaService.Tipo.EMAIL_RECUPERACAO_CONFIRMADO,id,id);
        if("SENHA_RECUPERADA".equals(tipo))auditoria.registrar(AuditoriaSegurancaService.Tipo.SENHA_RECUPERADA,null,id);
    }
    private String hashCodigo(Long id,OffsetDateTime agora,String codigo){return hash(id+":"+agora.toInstant()+":"+codigo);}
    private void aposConfirmacao(Runnable acao){
        if(TransactionSynchronizationManager.isSynchronizationActive())TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCommit(){acao.run();}
        });else acao.run();
    }
    public static class CodigoInvalidoException extends RegraNegocioException {
        public CodigoInvalidoException(){super("Código inválido ou expirado. Após 5 erros, solicite outro código.");}
    }
}
