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
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;
@Service
public class InventarioHistoricoService {
    private static final String PREFIXO_RESPONSAVEIS = "json:v1:";
    private static final JsonMapper JSON = JsonMapper.builder().build();
    private final InventarioObraSnapshotRepository snapshots; private final InventarioObraSnapshotItemRepository itens; private final EquipamentoRepository equipamentos;
    public InventarioHistoricoService(InventarioObraSnapshotRepository snapshots,InventarioObraSnapshotItemRepository itens,EquipamentoRepository equipamentos){this.snapshots=snapshots;this.itens=itens;this.equipamentos=equipamentos;}
    @Transactional public void registrar(Obra obra){InventarioObraSnapshot s=new InventarioObraSnapshot();s.setObra(obra);s.setDataReferencia(LocalDate.now());s.setObraNome(obra.getNome());s.setCliente(obra.getCliente());s.setCidade(obra.getCidade());s.setStatus(obra.getStatus());s.setResponsaveisTecnicos(PREFIXO_RESPONSAVEIS+JSON.writeValueAsString(obra.getResponsaveis().stream().map(Funcionario::getNome).sorted().toList()));snapshots.save(s);for(Equipamento e:equipamentos.findByObraIdOrderByModeloAscSerieAsc(obra.getId())){InventarioObraSnapshotItem item=new InventarioObraSnapshotItem();item.setSnapshot(s);item.setEquipamentoId(e.getId());item.setTipo(e.getTipo());item.setModelo(e.getModelo());item.setSerie(e.getSerie());item.setMedida(e.getMedida());item.setQuantidade(e.getQuantidade());item.setTecnico(e.getTecnico()==null?null:e.getTecnico().getNome());itens.save(item);}}
    @Transactional(readOnly=true) public InventarioHistoricoDto.Resposta consultar(Obra obra,LocalDate data){if(data.isAfter(LocalDate.now()))throw new RegraNegocioException("A data de referência não pode estar no futuro.");InventarioObraSnapshot s=snapshots.findFirstByObraIdAndDataReferenciaLessThanEqualOrderByDataReferenciaDescRegistradoEmDesc(obra.getId(),data).orElseThrow(()->new RegraNegocioException("Não existe histórico confiável para a obra nesta data."));List<String> responsaveis=lerResponsaveis(s.getResponsaveisTecnicos());return new InventarioHistoricoDto.Resposta(s.getId(),obra.getId(),data,s.getRegistradoEm(),s.getObraNome(),s.getCliente(),s.getCidade(),s.getStatus(),responsaveis,itens.findBySnapshotIdOrderByModeloAscSerieAsc(s.getId()).stream().map(i->new InventarioHistoricoDto.Item(i.getEquipamentoId(),i.getTipo(),i.getModelo(),i.getSerie(),i.getMedida(),i.getQuantidade(),i.getTecnico())).toList(),s.getDataReferencia());}

    private List<String> lerResponsaveis(String valor) {
        if (valor.isBlank()) return List.of();
        // O campo TEXT mantém o formato antigo legível; novos snapshots usam uma
        // lista versionada para preservar vírgulas, aspas e quebras nos nomes.
        if (valor.startsWith(PREFIXO_RESPONSAVEIS)) {
            try {
                return List.of(JSON.readValue(valor.substring(PREFIXO_RESPONSAVEIS.length()), String[].class));
            } catch (JacksonException | NullPointerException e) {
                throw new RegraNegocioException("Os responsáveis deste inventário histórico têm formato inválido.");
            }
        }
        return Arrays.stream(valor.split(",\\s*")).toList();
    }
}
