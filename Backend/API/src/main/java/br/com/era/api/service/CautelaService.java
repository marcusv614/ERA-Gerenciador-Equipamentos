package br.com.era.api.service;
import br.com.era.api.dto.CautelaDto;
import br.com.era.api.model.*;
import br.com.era.api.repository.CautelaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
@Service
public class CautelaService {
    private final CautelaRepository repository; private final UsuarioService usuarios;
    public CautelaService(CautelaRepository repository,UsuarioService usuarios){this.repository=repository;this.usuarios=usuarios;}
    @Transactional public CautelaDto.Resposta emitir(Solicitacao s,String login){if(repository.existsBySolicitacaoId(s.getId()))return repository.findBySolicitacaoIdOrderByEmitidaEmDesc(s.getId()).stream().findFirst().map(this::resposta).orElseThrow();Usuario emissor=usuarios.buscarPorLogin(login);Cautela c=new Cautela();c.setSolicitacao(s);c.setSolicitacaoRaiz(s.getSolicitacaoPai()==null?s:s.getSolicitacaoPai());c.setTipo("UNICA");c.setStatusMovimentacao(s.getStatus());c.setEmitidaEm(OffsetDateTime.now());c.setEmitidaPor(emissor.getNome());c.setOrigemNome(s.getObraOrigem()==null?"Depósito central":s.getObraOrigem().getNome());c.setDestinoNome(s.getObraDestino()==null?"Depósito central":s.getObraDestino().getNome());c.setSolicitanteNome(s.getSolicitante().getNome());c.setTecnicoNome(s.getTecnico().getNome());c.setDataSolicitacao(s.getDataSolicitacao());c.setObservacao(s.getObservacao());for(MaterialSolicitado m:s.getMateriais())c.adicionarMaterial(new CautelaMaterial(m.getNome(),m.getQuantidade(),m.getIdentificacao()));repository.save(c);c.setNumero("CAU-"+c.getEmitidaEm().getYear()+"-"+String.format("%06d",c.getId()));return resposta(c);}
    @Transactional(readOnly=true) public List<CautelaDto.Resposta> listar(Long solicitacaoId,String login){Usuario usuario=usuarios.buscarPorLogin(login);if(usuario.getPerfil()==PerfilUsuario.TECNICO)throw new br.com.era.api.exception.RegraNegocioException("O perfil técnico não possui permissão para exportar cautelas.");List<Cautela> cautelas=solicitacaoId==null?repository.findAllByOrderByEmitidaEmDesc():repository.findBySolicitacaoIdOrderByEmitidaEmDesc(solicitacaoId);return cautelas.stream().map(this::resposta).toList();}
    private CautelaDto.Resposta resposta(Cautela c){return new CautelaDto.Resposta(c.getId(),c.getNumero(),c.getSolicitacao().getId(),c.getSolicitacaoRaiz().getId(),c.getStatusMovimentacao(),c.getEmitidaEm(),c.getEmitidaPor(),c.getOrigemNome(),c.getDestinoNome(),c.getSolicitanteNome(),c.getTecnicoNome(),c.getDataSolicitacao(),c.getObservacao(),c.getMateriais().stream().map(m->new CautelaDto.Material(m.getNome(),m.getQuantidade(),m.getIdentificacao())).toList());}
}
