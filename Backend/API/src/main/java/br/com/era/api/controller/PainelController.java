package br.com.era.api.controller;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.repository.SolicitacaoRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
@RestController @RequestMapping("/painel")
public class PainelController {
    private final EquipamentoRepository equipamentos; private final SolicitacaoRepository solicitacoes;
    public PainelController(EquipamentoRepository equipamentos,SolicitacaoRepository solicitacoes){this.equipamentos=equipamentos;this.solicitacoes=solicitacoes;}
    @GetMapping("/resumo") public Map<String,Long> resumo(){return Map.of("totalEquipamentos",equipamentos.count(),"totalSolicitacoes",solicitacoes.count());}
}
