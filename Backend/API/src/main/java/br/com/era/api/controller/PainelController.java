package br.com.era.api.controller;
import br.com.era.api.repository.EquipamentoRepository;
import br.com.era.api.service.SolicitacaoService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
@RestController @RequestMapping("/painel")
public class PainelController {
    private final EquipamentoRepository equipamentos; private final SolicitacaoService solicitacoes;
    public PainelController(EquipamentoRepository equipamentos,SolicitacaoService solicitacoes){this.equipamentos=equipamentos;this.solicitacoes=solicitacoes;}
    @GetMapping("/resumo") public Map<String,Long> resumo(Authentication auth){return Map.of("totalEquipamentos",equipamentos.count(),"totalSolicitacoes",(long)solicitacoes.listarParaUsuario(auth.getName()).size());}
}
