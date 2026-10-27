package br.com.era.api.config;

import br.com.era.api.model.*;
import br.com.era.api.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.context.web.WebAppConfiguration;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.WebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import java.util.*;
import java.util.stream.Stream;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(QaMatrizAutorizacaoTests.Config.class)
@WebAppConfiguration
@TestPropertySource(properties="app.cors.allowed-origins=http://localhost:5173")
class QaMatrizAutorizacaoTests {
    @Configuration @EnableWebMvc @EnableWebSecurity
    @Import({SecurityConfig.class,ValidacaoSessaoFilter.class,Probe.class})
    static class Config {
        @Bean UsuarioService usuarios(){return mock(UsuarioService.class);}
        @Bean RecuperacaoContaService recuperacao(){return mock(RecuperacaoContaService.class);}
    }
    // Isola a decisão de segurança do comportamento dos serviços/controladores.
    @RestController static class Probe {
        @RequestMapping(value={"/usuarios","/usuarios/1/status","/relatorios/pedidos","/notificacoes","/notificacoes/1/leitura",
            "/painel/resumo","/deposito/equipamentos","/funcionarios/1/auditorias","/auditorias","/funcionarios",
            "/equipamentos","/obras","/categorias-equipamento","/atividades/pedidos-financeiros","/equipamentos/disponibilidade-financeira",
            "/atividades/pedidos-rh","/equipamentos/1/historico","/obras/1/inventario-historico","/equipamentos/catalogo",
            "/atividades","/atividades/transporte-direto","/atividades/1/cancelamento","/atividades/1/plano-financeiro",
            "/atividades/1/execucao-plano","/atividades/1/inicio-atendimento","/atividades/1/atendimento-parcial",
            "/equipamentos/1/movimentacoes","/equipamentos/1/manutencoes","/equipamentos/1/calibracoes",
            "/equipamentos/1/calibracoes/1/envio","/atividades/1/aprovacao","/atividades/1/rejeicao",
            "/atividades/1/materiais/1/compra","/atividades/1/materiais/1/aquisicao","/atividades/1/distribuicao",
            "/atividades/1/transito","/atividades/1/conclusao","/rota-nao-permitida"})
        Map<String,Boolean> responder(){return Map.of("probe",true);}
    }
    record Caso(String metodo,String rota,Set<String> perfis) {}
    static Caso caso(String metodo,String rota,String... perfis){return new Caso(metodo,rota,Set.of(perfis));}
    static final List<Caso> CASOS = List.of(
        caso("GET","/usuarios","ADMIN"), caso("PATCH","/usuarios/1/status","ADMIN"),
        caso("GET","/relatorios/pedidos","ADMIN","GERENTE","RH","FINANCEIRO","ESTOQUE"),
        caso("GET","/notificacoes","ADMIN","GERENTE","RH","FINANCEIRO","ESTOQUE","TECNICO","TST"),
        caso("POST","/notificacoes/1/leitura","ADMIN","GERENTE","RH","FINANCEIRO","ESTOQUE","TECNICO","TST"),
        caso("GET","/painel/resumo","ADMIN","GERENTE","FINANCEIRO"),
        caso("GET","/deposito/equipamentos","ADMIN","GERENTE","ESTOQUE"),
        caso("GET","/funcionarios/1/auditorias","ADMIN","GERENTE","RH"),
        caso("GET","/auditorias","ADMIN","GERENTE","RH"),
        caso("GET","/funcionarios","ADMIN","GERENTE","RH","FINANCEIRO"),
        caso("POST","/funcionarios","ADMIN","GERENTE"),
        caso("POST","/equipamentos","ADMIN","GERENTE"),
        caso("POST","/obras","ADMIN","GERENTE"),
        caso("POST","/categorias-equipamento","ADMIN","GERENTE"),
        caso("GET","/atividades/pedidos-financeiros","ADMIN","FINANCEIRO"),
        caso("GET","/equipamentos/disponibilidade-financeira","ADMIN","FINANCEIRO"),
        caso("GET","/atividades/pedidos-rh","ADMIN","RH"),
        caso("GET","/equipamentos/1/historico","ADMIN","GERENTE","RH","ESTOQUE","TECNICO","TST"),
        caso("GET","/obras/1/inventario-historico","ADMIN","GERENTE"),
        caso("GET","/equipamentos/catalogo","ADMIN","GERENTE","RH","FINANCEIRO","ESTOQUE","TECNICO","TST"),
        caso("POST","/atividades","ADMIN","GERENTE","RH","TECNICO","TST"),
        caso("POST","/atividades/transporte-direto","ADMIN","GERENTE","RH"),
        caso("POST","/atividades/1/cancelamento","ADMIN","GERENTE","RH","FINANCEIRO","ESTOQUE","TECNICO","TST"),
        caso("POST","/atividades/1/plano-financeiro","ADMIN","FINANCEIRO"),
        caso("POST","/atividades/1/execucao-plano","ADMIN","ESTOQUE"),
        caso("POST","/atividades/1/inicio-atendimento","ADMIN","ESTOQUE"),
        caso("POST","/atividades/1/atendimento-parcial","ADMIN","ESTOQUE"),
        caso("POST","/equipamentos/1/movimentacoes"),
        caso("POST","/equipamentos/1/manutencoes","ADMIN","GERENTE","RH","ESTOQUE"),
        caso("POST","/equipamentos/1/calibracoes","ADMIN","GERENTE","ESTOQUE"),
        caso("POST","/equipamentos/1/calibracoes/1/envio","ADMIN","ESTOQUE"),
        caso("POST","/atividades/1/aprovacao","ADMIN","GERENTE","RH","FINANCEIRO"),
        caso("POST","/atividades/1/rejeicao","ADMIN","GERENTE","RH","FINANCEIRO"),
        caso("POST","/atividades/1/materiais/1/compra","ADMIN","FINANCEIRO"),
        caso("POST","/atividades/1/materiais/1/aquisicao","ADMIN","ESTOQUE"),
        caso("POST","/atividades/1/distribuicao","ADMIN","ESTOQUE"),
        caso("POST","/atividades/1/transito","ADMIN","ESTOQUE","TECNICO","TST"),
        caso("POST","/atividades/1/conclusao","ADMIN","ESTOQUE","TECNICO","TST"),
        caso("GET","/rota-nao-permitida")
    );
    @Autowired WebApplicationContext contexto;
    @Autowired UsuarioService usuarios;
    MockMvc mvc;
    @BeforeEach void preparar(){reset(usuarios);mvc=MockMvcBuilders.webAppContextSetup(contexto).apply(springSecurity()).build();}
    UsernamePasswordAuthenticationToken autenticar(PerfilUsuario perfil){
        var u=new Usuario();ReflectionTestUtils.setField(u,"id",1L);u.setLogin("qa");u.setSenhaHash("hash-ficticio");u.setPerfil(perfil);u.setDeveAlterarSenha(false);
        when(usuarios.buscarParaSessao(1L)).thenReturn(Optional.of(u));
        var p=new UsuarioAutenticado(u);return UsernamePasswordAuthenticationToken.authenticated(p,null,p.getAuthorities());
    }
    @TestFactory Stream<DynamicTest> perfilPorRotaEMetodo(){
        return CASOS.stream().flatMap(c -> Stream.concat(
            Arrays.stream(PerfilUsuario.values()).map(p -> DynamicTest.dynamicTest(c.metodo()+" "+c.rota()+" perfil="+p,() -> {
                mvc.perform(request(org.springframework.http.HttpMethod.valueOf(c.metodo()),c.rota()).servletPath(c.rota())
                    .with(authentication(autenticar(p))).with(csrf()))
                    .andExpect(status().is(c.perfis().contains(p.name())?200:403));
            })),
            Stream.of(DynamicTest.dynamicTest(c.metodo()+" "+c.rota()+" anonimo",() ->
                mvc.perform(request(org.springframework.http.HttpMethod.valueOf(c.metodo()),c.rota()).with(csrf()))
                    .andExpect(status().isUnauthorized())))
        ));
    }
    @Test void csrfAusenteOuInvalidoBloqueiaAdmin() throws Exception {
        mvc.perform(post("/equipamentos").with(authentication(autenticar(PerfilUsuario.ADMIN)))).andExpect(status().isForbidden());
        mvc.perform(post("/equipamentos").with(authentication(autenticar(PerfilUsuario.ADMIN))).with(csrf().useInvalidToken())).andExpect(status().isForbidden());
    }
    @Test void preflightPermiteSomenteOrigemConfigurada() throws Exception {
        mvc.perform(options("/equipamentos").header("Origin","http://localhost:5173").header("Access-Control-Request-Method","POST"))
            .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:5173"));
        mvc.perform(options("/equipamentos").header("Origin","https://hostil.invalid").header("Access-Control-Request-Method","POST"))
            .andExpect(status().isForbidden()).andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
    @Test void respostasDaCadeiaTrazemHeadersDeSeguranca() throws Exception {
        mvc.perform(get("/usuarios")).andExpect(status().isUnauthorized())
            .andExpect(header().string("X-Content-Type-Options","nosniff"))
            .andExpect(header().string("X-Frame-Options","DENY"));
    }
}
