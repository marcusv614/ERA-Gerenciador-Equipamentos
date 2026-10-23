package br.com.era.api.service;
import br.com.era.api.model.*;
import br.com.era.api.repository.*;
import br.com.era.api.exception.RecursoNaoEncontradoException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.access.AccessDeniedException;
import java.util.*;
@Service
@Transactional(readOnly=true)
public class RelatorioPedidoService {
    private final SolicitacaoRepository pedidos;private final EquipamentoRepository equipamentos;private final UsuarioService usuarios;
    public RelatorioPedidoService(SolicitacaoRepository p,EquipamentoRepository e,UsuarioService u){pedidos=p;equipamentos=e;usuarios=u;}
    public record Evento(Long atendimento,String acao,String instante,String autor,String conta,String descricao) {}
    public record Item(String material,String catalogoChave,int quantidade) {}
    public record Compra(Long atendimento,Long equipamentoId,String material,int quantidade,String notaFiscal,String fornecedor,String instante,String autor,String conta,boolean legado) {}
    public record Atendimento(Long id,String status,String enviadoEm,String recebidoEm) {}
    public record Pedido(Long id,Long obraId,String obra,String solicitante,String conta,String tecnico,String criadoEm,String dataSolicitacao,String status,List<Item> materiais,List<Evento> eventos,List<Atendimento> atendimentos,List<Compra> compras,List<String> avisos,String observacao) {}
    private Solicitacao raiz(Solicitacao s){while(s.getSolicitacaoPai()!=null)s=s.getSolicitacaoPai();return s;}
    private boolean permitido(Solicitacao s,Usuario u){return u.isAtivo()&&permitido(s,u.getPerfil());}
    private boolean permitido(Solicitacao s,Usuario u,PerfilUsuario escopo){return permitido(s,u)&&(escopo==null||permitido(s,escopo));}
    private boolean permitido(Solicitacao s,PerfilUsuario perfil){
        if(!"Movimentação".equals(s.getTipo()))return false;
        return switch(perfil){
            case ADMIN -> true;
            case GERENTE -> !EscopoEquipamento.pedidoContemEpi(s);
            case RH -> !s.getMateriais().isEmpty()&&s.getMateriais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.getCatalogoChave()))&&s.getMateriaisOriginais().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.catalogoChave()))&&s.getCompras().stream().allMatch(m->EscopoEquipamento.catalogoEhEpi(m.catalogoChave()));
            case FINANCEIRO -> !"Pendente".equals(s.getStatusAntesCancelamento())&&!s.isMovimentacaoDireta()&&!"Pendente".equals(s.getStatus())&&(!"Rejeitada".equals(s.getStatus())||s.getEventosFinanceiros().stream().anyMatch(e->"REJEICAO".equals(e.tipo())));
            case ESTOQUE -> !Set.of("Pendente","Aguardando financeiro").contains(Objects.toString(s.getStatusAntesCancelamento(),""))&&Set.of("Aprovada","Aguardando coleta","Em trânsito","Concluída","Cancelada","Cancelamento solicitado").contains(s.getStatus());
            default -> false;
        };
    }
    public Pedido pedido(Long id,String login){return pedido(id,login,null);}
    public Pedido pedido(Long id,String login,PerfilUsuario escopo){
        Usuario u=usuarios.buscarPorLogin(login);var alvo=pedidos.findById(id).filter(s->permitido(s,u,escopo)).orElseThrow(()->new RecursoNaoEncontradoException("Pedido não encontrado."));
        var raiz=raiz(alvo);if(!permitido(raiz,u,escopo))throw new RecursoNaoEncontradoException("Pedido não encontrado.");
        return montar(pedidos.findAll().stream().filter(s->Objects.equals(raiz(s).getId(),raiz.getId())).filter(s->permitido(s,u,escopo)).sorted(Comparator.comparing(Solicitacao::getId)).toList());
    }
    public List<Pedido> consultar(String login,Long obraId,Long funcionarioId){return consultar(login,obraId,funcionarioId,null);}
    public List<Pedido> consultar(String login,Long obraId,Long funcionarioId,PerfilUsuario escopo){
        Usuario u=usuarios.buscarPorLogin(login);if(!Set.of(PerfilUsuario.ADMIN,PerfilUsuario.GERENTE,PerfilUsuario.RH,PerfilUsuario.FINANCEIRO).contains(u.getPerfil()))throw new AccessDeniedException("Consulta restrita aos setores responsáveis.");
        Map<Long,List<Solicitacao>> grupos=new TreeMap<>();
        pedidos.findAll().stream().filter(s->permitido(s,u,escopo)&&permitido(raiz(s),u,escopo)).filter(s->obraId==null||(s.getObraDestino()!=null&&Objects.equals(s.getObraDestino().getId(),obraId)))
            .filter(s->funcionarioId==null||Objects.equals(s.getTecnico().getId(),funcionarioId)).forEach(s->grupos.computeIfAbsent(raiz(s).getId(),k->new ArrayList<>()).add(s));
        return grupos.values().stream().map(this::montar).toList();
    }
    private String instante(java.time.OffsetDateTime d){return d==null?null:d.toString();}
    private Pedido montar(List<Solicitacao> grupo){
        Solicitacao r=raiz(grupo.getFirst());Map<String,Evento> eventos=new LinkedHashMap<>();
        for(var s:grupo){
            for(var e:s.getEventosFinanceiros()){
                var ev=new Evento(s.getId(),e.tipo(),instante(e.registradoEm()),e.autorNome(),e.autorLogin(),e.descricao());
                eventos.putIfAbsent(e.tipo()+"|"+e.registradoEm()+"|"+e.autorLogin()+"|"+e.descricao(),ev);
            }
            if(s.getTransitoEm()!=null&&s.getEventosFinanceiros().stream().noneMatch(e->"ENVIO".equals(e.tipo())))eventos.put("envio:"+s.getId(),new Evento(s.getId(),"ENVIO",instante(s.getTransitoEm()),null,null,"Envio legado: autor não registrado."));
            if(s.getConcluidaEm()!=null&&s.getEventosFinanceiros().stream().noneMatch(e->"RECEBIMENTO".equals(e.tipo())))eventos.put("recebimento:"+s.getId(),new Evento(s.getId(),"RECEBIMENTO",instante(s.getConcluidaEm()),null,null,"Recebimento legado: autor não registrado."));
        }
        if(eventos.values().stream().noneMatch(e->"CRIACAO".equals(e.acao())))eventos.put("criacao",new Evento(r.getId(),"CRIACAO",instante(r.getCriadoEm()),r.getSolicitanteNome(),r.getSolicitanteLogin(),"Registro original do pedido. Dados de autoria não documentados permanecem como não registrados."));
        List<Compra> compras=new ArrayList<>();List<String> avisos=new ArrayList<>();Set<Long> documentados=new HashSet<>();
        boolean aprovado=grupo.stream().flatMap(s->s.getEventosFinanceiros().stream()).anyMatch(e->"APROVACAO".equals(e.tipo()));
        if(aprovado){
            for(var s:grupo)for(var a:s.getAquisicoesAuditadas()){
                compras.add(new Compra(s.getId(),a.equipamentoId(),a.material(),a.quantidade(),a.notaFiscal(),a.fornecedor(),instante(a.registradaEm()),a.autorNome(),a.autorLogin(),false));documentados.add(a.equipamentoId());
            }
            Map<Long,Integer> legados=new LinkedHashMap<>();Map<Long,Solicitacao.OrigemPlanejada> referencias=new HashMap<>();
            for(var s:grupo)for(var entrada:s.getEntradasCompra())if(!documentados.contains(entrada.equipamentoId())){legados.merge(entrada.equipamentoId(),entrada.quantidade(),Math::addExact);referencias.put(entrada.equipamentoId(),entrada);}
            for(var e:legados.entrySet()){
                var equipamento=equipamentos.findById(e.getKey()).orElse(null);var referencia=referencias.get(e.getKey());
                compras.add(new Compra(r.getId(),e.getKey(),referencia.nome(),e.getValue(),equipamento==null?null:equipamento.getNotaFiscal(),equipamento==null?null:equipamento.getFornecedor(),null,null,null,true));
            }
            if(!legados.isEmpty())avisos.add("Entradas legadas: quantidade vinculada à compra; nota/fornecedor consultados no cadastro atual. Data e autor da conferência não foram registrados historicamente.");
        }
        if(grupo.stream().anyMatch(s->s.getMateriais().stream().anyMatch(m->m.getQuantidadeEntradaEstoque()>0))&&compras.isEmpty())avisos.add("Existem contadores de compra recebida sem documentação suficiente de aprovação ou vínculo com o lote. Não incluídos como compras homologadas.");
        var itens=!r.getMateriaisOriginais().isEmpty()?r.getMateriaisOriginais().stream().map(m->new Item(m.nome(),m.catalogoChave(),m.quantidade())).toList():grupo.stream().flatMap(s->s.getMateriais().stream()).map(m->new Item(m.getNome(),m.getCatalogoChave(),m.getQuantidade())).toList();
        var ordenados=eventos.values().stream().sorted(Comparator.comparing((Evento e)->e.instante()==null?null:java.time.OffsetDateTime.parse(e.instante()).toInstant(),Comparator.nullsLast(Comparator.naturalOrder()))).toList();
        return new Pedido(r.getId(),r.getObraDestino()==null?null:r.getObraDestino().getId(),r.getObraDestino()==null?"Depósito central":r.getObraDestino().getNome(),r.nomeSolicitante(),r.getSolicitanteLogin(),r.getTecnico().getNome(),instante(r.getCriadoEm()),r.getDataSolicitacao()==null?null:r.getDataSolicitacao().toString(),grupo.size()==1?r.getStatus():"Atendimentos vinculados",itens,ordenados,grupo.stream().map(s->new Atendimento(s.getId(),s.getStatus(),instante(s.getTransitoEm()),instante(s.getConcluidaEm()))).toList(),compras,avisos,r.getObservacao());
    }
}
