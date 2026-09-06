package br.com.era.api.service;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.era.api.dto.FuncionarioDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.repository.FuncionarioRepository;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.ObraRepository;
import br.com.era.api.repository.SolicitacaoRepository;
import br.com.era.api.repository.UsuarioRepository;
import br.com.era.api.model.PerfilUsuario;
@Service
public class FuncionarioService {
    private final FuncionarioRepository repository; private final ObraRepository obras; private final EquipamentoRepository equipamentos; private final SolicitacaoRepository solicitacoes; private final UsuarioRepository usuarios; private final UsuarioService usuarioService; private final InventarioHistoricoService inventarioHistorico;
    public FuncionarioService(FuncionarioRepository repository,ObraRepository obras,EquipamentoRepository equipamentos,SolicitacaoRepository solicitacoes,UsuarioRepository usuarios,UsuarioService usuarioService,InventarioHistoricoService inventarioHistorico){this.repository=repository;this.obras=obras;this.equipamentos=equipamentos;this.solicitacoes=solicitacoes;this.usuarios=usuarios;this.usuarioService=usuarioService;this.inventarioHistorico=inventarioHistorico;}
    @Transactional(readOnly=true) public List<FuncionarioDto.Resposta> listar(){return repository.findAll().stream().filter(f->!f.isArquivado()).map(this::resposta).toList();}
    @Transactional(readOnly=true) public List<FuncionarioDto.Resposta> listarParaUsuario(String login){boolean admin=usuarioService.buscarPorLogin(login).getPerfil()==PerfilUsuario.ADMIN;return repository.findAll().stream().filter(f->admin||!f.isArquivado()).map(this::resposta).toList();}
    @Transactional public FuncionarioDto.Resposta cadastrar(FuncionarioDto.Requisicao dados){
        if(repository.existsByEmailIgnoreCase(dados.email())) throw new RegraNegocioException("Já existe um funcionário com este e-mail.");
        Funcionario f=new Funcionario(); f.setNome(dados.nome().trim()); f.setCargo(dados.cargo().trim()); f.setEmail(dados.email().trim().toLowerCase()); f.setTelefone(dados.telefone()); f.setStatus(dados.status()==null?"Ativo":dados.status());
        return resposta(repository.save(f));
    }
    @Transactional public FuncionarioDto.Resposta atualizar(Long id,FuncionarioDto.Atualizacao dados){Funcionario f=buscar(id);repository.findByEmailIgnoreCase(dados.email().trim()).filter(outro->!outro.getId().equals(id)).ifPresent(outro->{throw new RegraNegocioException("Já existe um funcionário com este e-mail.");});f.setNome(dados.nome().trim());f.setCargo(dados.cargo().trim());f.setEmail(dados.email().trim().toLowerCase());f.setTelefone(dados.telefone());if(dados.status()!=null)f.setStatus(dados.status());if(dados.obraIds()!=null){var idsSelecionados=new java.util.HashSet<>(dados.obraIds());obras.findAll().forEach(obra->{boolean responsavel=obra.getResponsaveis().contains(f);boolean deveSerResponsavel=idsSelecionados.contains(obra.getId());if(deveSerResponsavel&&!responsavel)obra.getResponsaveis().add(f);else if(!deveSerResponsavel&&responsavel)obra.getResponsaveis().remove(f);if(responsavel||deveSerResponsavel)inventarioHistorico.registrar(obra);});}return resposta(f);}
    @Transactional(readOnly=true) public Funcionario buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Funcionário não encontrado."));}
    @Transactional(readOnly=true) public Funcionario buscarPorNome(String nome){return repository.findByNomeIgnoreCase(nome).filter(f->!f.isArquivado()).orElseThrow(()->new RecursoNaoEncontradoException("Técnico ativo não encontrado: "+nome));}
    @Transactional public FuncionarioDto.Resposta definirArquivamento(Long id,boolean valor,String autor){Funcionario f=buscar(id);if(f.isArquivado()==valor)return resposta(f);if(valor){if(equipamentos.existsByTecnicoIdAndArquivadoFalse(id))throw new RegraNegocioException("Transfira os equipamentos vinculados antes de arquivar o funcionário.");if(solicitacoes.existeAbertaParaFuncionario(id))throw new RegraNegocioException("Conclua ou rejeite as movimentações abertas antes de arquivar o funcionário.");obras.findAll().stream().filter(o->o.getResponsaveis().remove(f)).forEach(inventarioHistorico::registrar);usuarios.findByFuncionarioId(id).ifPresent(u->u.setAtivo(false));f.setStatus("Inativo");}f.definirArquivamento(valor,autor);return resposta(f);}
    private FuncionarioDto.Resposta resposta(Funcionario f){return new FuncionarioDto.Resposta(f.getId(),f.getNome(),f.getCargo(),f.getEmail(),f.getTelefone(),f.getStatus(),f.isArquivado());}
}
