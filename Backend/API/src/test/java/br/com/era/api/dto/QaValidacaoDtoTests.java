package br.com.era.api.dto;

import br.com.era.api.model.PerfilUsuario;
import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.*;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;

class QaValidacaoDtoTests {
    static ValidatorFactory factory;
    record Caso(String id,Object dados,boolean valido) {}
    @BeforeAll static void preparar(){factory=Validation.buildDefaultValidatorFactory();}
    @AfterAll static void encerrar(){factory.close();}
    static UsuarioDto.Cadastro usuario(String nome,String login,String senha,PerfilUsuario perfil){return new UsuarioDto.Cadastro(null,nome,login,senha,perfil);}
    static CategoriaEquipamentoDto.Requisicao categoria(String nome,List<CategoriaEquipamentoDto.Campo> campos){return new CategoriaEquipamentoDto.Requisicao(nome,null,campos);}
    @TestFactory Stream<DynamicTest> equivalenciasELimites(){
        var campo=new CategoriaEquipamentoDto.Campo("marca","Marca","text",null,null);
        var material=new SolicitacaoDto.MaterialRequisicao("Alicate",1,null,"ferramentas|alicate|");
        var casos=List.of(
            new Caso("usuario-senha-7",usuario("QA","qa","aB!2345",PerfilUsuario.ADMIN),false),
            new Caso("usuario-senha-8",usuario("QA","qa","aB!23456",PerfilUsuario.ADMIN),true),
            new Caso("usuario-senha-128",usuario("QA","qa","x".repeat(128),PerfilUsuario.ADMIN),true),
            new Caso("usuario-senha-129",usuario("QA","qa","x".repeat(129),PerfilUsuario.ADMIN),false),
            new Caso("usuario-login-120",usuario("QA","x".repeat(120),"aB!23456",PerfilUsuario.ADMIN),true),
            new Caso("usuario-login-121",usuario("QA","x".repeat(121),"aB!23456",PerfilUsuario.ADMIN),false),
            new Caso("usuario-perfil-nulo",usuario("QA","qa","aB!23456",null),false),
            new Caso("usuario-nome-branco",usuario(" ","qa","aB!23456",PerfilUsuario.ADMIN),false),
            new Caso("categoria-nome-100",categoria("x".repeat(100),null),true),
            new Caso("categoria-nome-101",categoria("x".repeat(101),null),false),
            new Caso("categoria-campos-12",categoria("QA",Collections.nCopies(12,campo)),true),
            new Caso("categoria-campos-13",categoria("QA",Collections.nCopies(13,campo)),false),
            new Caso("categoria-rotulo-branco",categoria("QA",List.of(new CategoriaEquipamentoDto.Campo("marca"," ","text",null,null))),false),
            new Caso("funcionario-contato-opcional",new FuncionarioDto.Requisicao("QA","TST",null,null,null),true),
            new Caso("funcionario-email-invalido",new FuncionarioDto.Requisicao("QA","TST","invalido",null,null),false),
            new Caso("funcionario-nome-150",new FuncionarioDto.Requisicao("x".repeat(150),"TST",null,null,null),true),
            new Caso("funcionario-nome-151",new FuncionarioDto.Requisicao("x".repeat(151),"TST",null,null,null),false),
            new Caso("obra-status-valido",new ObraDto.Requisicao("QA","Cliente","Manaus",LocalDate.now(),"Concluída",List.of()),true),
            new Caso("obra-status-desconhecido",new ObraDto.Requisicao("QA","Cliente","Manaus",LocalDate.now(),"Finalizada",List.of()),false),
            new Caso("obra-data-nula",new ObraDto.Requisicao("QA","Cliente","Manaus",null,"Em andamento",List.of()),false),
            new Caso("material-quantidade-zero",new SolicitacaoDto.MaterialRequisicao("QA",0,null,null),false),
            new Caso("material-quantidade-negativa",new SolicitacaoDto.MaterialRequisicao("QA",-1,null,null),false),
            new Caso("material-quantidade-um",material,true),
            new Caso("material-quantidade-nula",new SolicitacaoDto.MaterialRequisicao("QA",null,null,null),false),
            new Caso("pedido-sem-materiais",new SolicitacaoDto.Requisicao(null,"QA",null,1L,LocalDate.now(),null,List.of()),false),
            new Caso("pedido-material-nulo",new SolicitacaoDto.Requisicao(null,"QA",null,1L,LocalDate.now(),null,Arrays.asList((SolicitacaoDto.MaterialRequisicao)null)),false),
            new Caso("pedido-200-materiais",new SolicitacaoDto.Requisicao(null,"QA",null,1L,LocalDate.now(),null,Collections.nCopies(200,material)),true),
            new Caso("pedido-201-materiais",new SolicitacaoDto.Requisicao(null,"QA",null,1L,LocalDate.now(),null,Collections.nCopies(201,material)),false),
            new Caso("recuperacao-token-43",new RecuperacaoDto.Redefinir("a".repeat(43),"aB!23456"),true),
            new Caso("recuperacao-token-42",new RecuperacaoDto.Redefinir("a".repeat(42),"aB!23456"),false),
            new Caso("recuperacao-token-injecao",new RecuperacaoDto.Redefinir("<".repeat(43),"aB!23456"),false),
            new Caso("recuperacao-codigo-8",new RecuperacaoDto.ConfirmarEmail("12345678"),true),
            new Caso("recuperacao-codigo-7",new RecuperacaoDto.ConfirmarEmail("1234567"),false),
            new Caso("recuperacao-codigo-9",new RecuperacaoDto.ConfirmarEmail("123456789"),false),
            new Caso("recuperacao-codigo-letra",new RecuperacaoDto.ConfirmarEmail("1234567x"),false),
            new Caso("plano-compra-zero",new SolicitacaoDto.MaterialPlano(1L,0,null,List.of()),true),
            new Caso("plano-compra-negativa",new SolicitacaoDto.MaterialPlano(1L,-1,null,List.of()),false),
            new Caso("plano-origem-nula",new SolicitacaoDto.MaterialPlano(1L,0,null,Arrays.asList((SolicitacaoDto.OrigemPlano)null)),false)
        );
        return casos.stream().map(c -> DynamicTest.dynamicTest(c.id(),() -> {
            var violacoes=factory.getValidator().validate(c.dados());
            assertEquals(c.valido(),violacoes.isEmpty(),() -> c.id()+": "+violacoes);
        }));
    }
}
