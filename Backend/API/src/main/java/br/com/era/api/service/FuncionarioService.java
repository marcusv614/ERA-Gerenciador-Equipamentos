package br.com.era.api.service;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.era.api.dto.FuncionarioDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.Funcionario;
import br.com.era.api.repository.FuncionarioRepository;
import br.com.era.api.repository.ObraRepository;
@Service
public class FuncionarioService {
    private final FuncionarioRepository repository; private final ObraRepository obras; private final InventarioHistoricoService inventarioHistorico;
    public FuncionarioService(FuncionarioRepository repository,ObraRepository obras,InventarioHistoricoService inventarioHistorico){this.repository=repository;this.obras=obras;this.inventarioHistorico=inventarioHistorico;}
    @Transactional(readOnly=true) public List<FuncionarioDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional public FuncionarioDto.Resposta cadastrar(FuncionarioDto.Requisicao dados){
        if(repository.existsByEmailIgnoreCase(dados.email())) throw new RegraNegocioException("Já existe um funcionário com este e-mail.");
        Funcionario f=new Funcionario(); f.setNome(dados.nome().trim()); f.setCargo(dados.cargo().trim()); f.setEmail(dados.email().trim().toLowerCase()); f.setTelefone(dados.telefone()); f.setStatus(dados.status()==null?"Ativo":dados.status());
        return resposta(repository.save(f));
    }
    @Transactional public FuncionarioDto.Resposta atualizar(Long id,FuncionarioDto.Atualizacao dados){Funcionario f=buscar(id);repository.findByEmailIgnoreCase(dados.email().trim()).filter(outro->!outro.getId().equals(id)).ifPresent(outro->{throw new RegraNegocioException("Já existe um funcionário com este e-mail.");});f.setNome(dados.nome().trim());f.setCargo(dados.cargo().trim());f.setEmail(dados.email().trim().toLowerCase());f.setTelefone(dados.telefone());if(dados.status()!=null)f.setStatus(dados.status());if(dados.obraIds()!=null){var idsSelecionados=new java.util.HashSet<>(dados.obraIds());obras.findAll().forEach(obra->{boolean responsavel=obra.getResponsaveis().contains(f);boolean deveSerResponsavel=idsSelecionados.contains(obra.getId());if(deveSerResponsavel&&!responsavel)obra.getResponsaveis().add(f);else if(!deveSerResponsavel&&responsavel)obra.getResponsaveis().remove(f);if(responsavel||deveSerResponsavel)inventarioHistorico.registrar(obra);});}return resposta(f);}
    @Transactional(readOnly=true) public Funcionario buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Funcionário não encontrado."));}
    @Transactional(readOnly=true) public Funcionario buscarPorNome(String nome){return repository.findByNomeIgnoreCase(nome).orElseThrow(()->new RecursoNaoEncontradoException("Técnico não encontrado: "+nome));}
    private FuncionarioDto.Resposta resposta(Funcionario f){return new FuncionarioDto.Resposta(f.getId(),f.getNome(),f.getCargo(),f.getEmail(),f.getTelefone(),f.getStatus());}
}
