package br.com.era.api.service;
import br.com.era.api.dto.PedidoFinanceiroDto;
import br.com.era.api.model.*;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class PedidosFinanceirosTests {
    private Solicitacao pedido(long id,int quantidade,String status){var p=new Solicitacao();ReflectionTestUtils.setField(p,"id",id);p.setStatus(status);p.setTipo("Movimentação");p.setDataSolicitacao(LocalDate.of(2026,10,22));var t=new Funcionario();t.setNome("Ana Técnica");p.setTecnico(t);p.setSolicitante(t);var obra=new Obra();ReflectionTestUtils.setField(obra,"id",20L);obra.setNome("Obra B");p.setObraDestino(obra);p.substituirMateriais(List.of(new MaterialSolicitado("Escada",quantidade,null,"ferramentas|escada|")));ReflectionTestUtils.setField(p.getMateriais().getFirst(),"id",id*10);return p;}
    @Test void consolidaComprasEEnviosSemDuplicarPedidoOriginal(){
        var raiz=pedido(1,10,"Aprovada");raiz.preservarPedidoOriginal();var m=raiz.getMateriais().getFirst();m.solicitarCompra(10);m.registrarAquisicao(6);raiz.preservarCompras();ReflectionTestUtils.setField(m,"quantidade",6);ReflectionTestUtils.setField(m,"identificacao","LOTE-SEIS");raiz.setStatus("Concluída");
        var saldo=pedido(2,4,"Aprovada");saldo.setSolicitacaoPai(raiz);saldo.getMateriais().getFirst().solicitarCompra(4);saldo.getMateriais().getFirst().registrarAquisicao(4);saldo.preservarCompras();
        var r=PedidosFinanceiros.consolidar(List.of(raiz,saldo),p->null);assertEquals(1,r.size());assertEquals(10,r.getFirst().materiais().getFirst().quantidadeSolicitada());assertEquals(10,r.getFirst().materiais().getFirst().quantidadeAdquirida());
    }
    @Test void recompõeQuantidadeLegadaPelasPartesDoPedido(){var raiz=pedido(1,6,"Concluída");var saldo=pedido(2,4,"Concluída");saldo.setSolicitacaoPai(raiz);assertEquals(10,PedidosFinanceiros.consolidar(List.of(raiz,saldo),p->null).getFirst().materiais().getFirst().quantidadeSolicitada());}
    @Test void decisoesCopiadasSaoUnicasEEventosFisicosFicamFora(){var raiz=pedido(1,2,"Concluída");var autor=new Usuario();autor.setNome("Maria");autor.setLogin("gerente");raiz.registrarEventoFinanceiro("APROVACAO_INICIAL","Aprovar",autor);var saldo=pedido(2,1,"Concluída");saldo.setSolicitacaoPai(raiz);saldo.copiarEventosFinanceirosDe(raiz);saldo.registrarEventoFinanceiro("ATENDIMENTO_PARCIAL","DADO FISICO",autor);var r=PedidosFinanceiros.consolidar(List.of(raiz,saldo),p->null).getFirst();assertEquals(1,r.decisoes().size());assertEquals("gerente",r.decisoes().getFirst().autorLogin());}
    @Test void retratoFinanceiroNaoExpoeCamposFisicos(){var campos=Arrays.stream(PedidoFinanceiroDto.Resposta.class.getRecordComponents()).map(c->c.getName()).toList();for(var campo:List.of("transitoEm","concluidaEm","obraOrigemId","historico","movimentacoes"))assertFalse(campos.contains(campo));}
    @Test void quantidadeUsaLongParaNaoEstourarASomaDeLotes(){var p=pedido(1,Integer.MAX_VALUE,"Concluída");var parte=pedido(2,Integer.MAX_VALUE,"Concluída");parte.setSolicitacaoPai(p);assertEquals(4294967294L,PedidosFinanceiros.consolidar(List.of(p,parte),x->null).getFirst().materiais().getFirst().quantidadeSolicitada());}
    @Test void retornoIdentificadoContinuaNaFilaDeAprovacao(){var retorno=pedido(1,1,"Aguardando financeiro");ReflectionTestUtils.setField(retorno.getMateriais().getFirst(),"identificacao","ERA-1");assertTrue(PedidosFinanceiros.permiteAnalise(retorno));retorno.setStatus("Aguardando coleta");assertFalse(PedidosFinanceiros.permiteAnalise(retorno));}
}
