package br.com.era.api.service;
import br.com.era.api.dto.InventarioHistoricoDto;
import br.com.era.api.exception.RegraNegocioException;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
@Service
public class InventarioHistoricoService {
    private final InventarioObraSnapshotRepository snapshots; private final InventarioObraSnapshotItemRepository itens; private final EquipamentoRepository equipamentos;
    public InventarioHistoricoService(InventarioObraSnapshotRepository snapshots,InventarioObraSnapshotItemRepository itens,EquipamentoRepository equipamentos){this.snapshots=snapshots;this.itens=itens;this.equipamentos=equipamentos;}
    @Transactional public void registrar(Obra obra){InventarioObraSnapshot s=new InventarioObraSnapshot();s.setObra(obra);s.setDataReferencia(LocalDate.now());s.setObraNome(obra.getNome());s.setCliente(obra.getCliente());s.setCidade(obra.getCidade());s.setStatus(obra.getStatus());s.setResponsaveisTecnicos(String.join(", ",obra.getResponsaveis().stream().map(Funcionario::getNome).sorted().toList()));snapshots.save(s);for(Equipamento e:equipamentos.findByObraIdOrderByModeloAscSerieAsc(obra.getId())){InventarioObraSnapshotItem item=new InventarioObraSnapshotItem();item.setSnapshot(s);item.setEquipamentoId(e.getId());item.setTipo(e.getTipo());item.setModelo(e.getModelo());item.setSerie(e.getSerie());item.setMedida(e.getMedida());item.setQuantidade(e.getQuantidade());item.setTecnico(e.getTecnico()==null?null:e.getTecnico().getNome());itens.save(item);}}
    @Transactional(readOnly=true) public InventarioHistoricoDto.Resposta consultar(Obra obra,LocalDate data){if(data.isAfter(LocalDate.now()))throw new RegraNegocioException("A data de referência não pode estar no futuro.");InventarioObraSnapshot s=snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(obra.getId(),data).orElseThrow(()->new RegraNegocioException("Não existe histórico confiável para a obra nesta data."));List<String> responsaveis=s.getResponsaveisTecnicos().isBlank()?List.of():Arrays.stream(s.getResponsaveisTecnicos().split(",\\s*")).toList();return new InventarioHistoricoDto.Resposta(s.getId(),obra.getId(),data,s.getRegistradoEm(),s.getObraNome(),s.getCliente(),s.getCidade(),s.getStatus(),responsaveis,itens.findBySnapshotIdOrderByModeloAscSerieAsc(s.getId()).stream().map(i->new InventarioHistoricoDto.Item(i.getEquipamentoId(),i.getTipo(),i.getModelo(),i.getSerie(),i.getMedida(),i.getQuantidade(),i.getTecnico())).toList());}
}
