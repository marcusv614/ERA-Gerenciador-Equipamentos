package br.com.era.api.service;
import br.com.era.api.dto.EquipamentoDto;
import br.com.era.api.dto.MovimentacaoDto;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.MovimentacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;
@Service
public class EquipamentoService {
    private final EquipamentoRepository repository; private final MovimentacaoRepository movimentacoes; private final ObraService obras; private final FuncionarioService funcionarios;
    public EquipamentoService(EquipamentoRepository repository,MovimentacaoRepository movimentacoes,ObraService obras,FuncionarioService funcionarios){this.repository=repository;this.movimentacoes=movimentacoes;this.obras=obras;this.funcionarios=funcionarios;}
    @Transactional(readOnly=true) public List<EquipamentoDto.Resposta> listar(){return repository.findAll().stream().map(this::resposta).toList();}
    @Transactional(readOnly=true) public List<EquipamentoDto.Resposta> listarDeposito(){return repository.findByObraIsNullOrderByModeloAsc().stream().map(this::resposta).toList();}
    @Transactional public EquipamentoDto.Resposta cadastrar(EquipamentoDto.Requisicao d){if(repository.existsBySerieIgnoreCase(d.serie()))throw new RegraNegocioException("Já existe equipamento com esta série.");Equipamento e=new Equipamento();e.setTipo(d.tipo());e.setModelo(d.modelo());e.setSerie(d.serie());e.setStatus(d.status());e.setObra(obras.buscarOpcional(d.obraId()));e.setTecnico(d.tecnico()==null||d.tecnico().isBlank()?null:funcionarios.buscarPorNome(d.tecnico()));LocalDate entrada=d.dataEntrada()!=null?d.dataEntrada():(d.data()!=null?d.data():LocalDate.now());e.setDataEntrada(entrada);e.setDataSaida(d.dataSaida());return resposta(repository.save(e));}
    @Transactional public EquipamentoDto.Resposta atualizar(Long id,EquipamentoDto.Requisicao d){Equipamento e=buscar(id);repository.findBySerieIgnoreCase(d.serie()).filter(outro->!outro.getId().equals(id)).ifPresent(outro->{throw new RegraNegocioException("Já existe equipamento com esta série.");});e.setTipo(d.tipo());e.setModelo(d.modelo());e.setSerie(d.serie());e.setStatus(d.status());e.setObra(obras.buscarOpcional(d.obraId()));e.setTecnico(d.tecnico()==null||d.tecnico().isBlank()?null:funcionarios.buscarPorNome(d.tecnico()));if(d.dataEntrada()!=null)e.setDataEntrada(d.dataEntrada());if(d.dataSaida()!=null)e.setDataSaida(d.dataSaida());return resposta(e);}
    @Transactional public EquipamentoDto.Resposta movimentar(Long id,MovimentacaoDto.Requisicao d){Equipamento e=buscar(id);Obra origem=e.getObra();Obra destino=obras.buscarOpcional(d.obraId());Funcionario tecnico=d.tecnico()==null||d.tecnico().isBlank()?null:funcionarios.buscarPorNome(d.tecnico());Movimentacao m=novaMovimentacao(e,null,origem,destino,tecnico,d.status(),d.dataMovimentacao());movimentacoes.save(m);aplicarDestino(e,destino,tecnico,d.status(),d.dataMovimentacao());return resposta(e);}
    @Transactional(readOnly=true) public List<MovimentacaoDto.Resposta> historico(Long id){buscar(id);return movimentacoes.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(id).stream().map(this::respostaMovimentacao).toList();}
    @Transactional(readOnly=true) public Equipamento buscar(Long id){return repository.findById(id).orElseThrow(()->new RecursoNaoEncontradoException("Equipamento não encontrado."));}
    public Movimentacao novaMovimentacao(Equipamento e,Solicitacao s,Obra origem,Obra destino,Funcionario tecnico,String status,LocalDate data){Movimentacao m=new Movimentacao();m.setEquipamento(e);m.setSolicitacao(s);m.setObraOrigem(origem);m.setObraDestino(destino);m.setTecnico(tecnico);m.setStatus(status);m.setDataMovimentacao(data);return m;}
    public void aplicarDestino(Equipamento e,Obra destino,Funcionario tecnico,String status,LocalDate data){e.setObra(destino);e.setTecnico(destino==null?null:tecnico);e.setStatus(status);e.setDataSaida(data);e.setDataEntrada(data);}
    public MovimentacaoDto.Resposta respostaMovimentacao(Movimentacao m){return new MovimentacaoDto.Resposta(m.getId(),m.getEquipamento().getId(),m.getSolicitacao()==null?null:m.getSolicitacao().getId(),m.getObraOrigem()==null?null:m.getObraOrigem().getId(),m.getObraDestino()==null?null:m.getObraDestino().getId(),m.getObraOrigem()==null?"Depósito central":m.getObraOrigem().getNome(),m.getObraDestino()==null?"Depósito central":m.getObraDestino().getNome(),m.getTecnico()==null?null:m.getTecnico().getNome(),m.getStatus(),m.getDataMovimentacao(),m.getDataMovimentacao(),m.getDataMovimentacao());}
    private EquipamentoDto.Resposta resposta(Equipamento e){List<MovimentacaoDto.Resposta> h=movimentacoes.findByEquipamentoIdOrderByDataMovimentacaoAscIdAsc(e.getId()).stream().map(this::respostaMovimentacao).toList();return new EquipamentoDto.Resposta(e.getId(),e.getTipo(),e.getModelo(),e.getSerie(),e.getStatus(),e.getObra()==null?null:e.getObra().getId(),e.getTecnico()==null?null:e.getTecnico().getNome(),e.getDataEntrada(),e.getDataEntrada(),e.getDataSaida(),e.getDataSaida(),h);}
}
