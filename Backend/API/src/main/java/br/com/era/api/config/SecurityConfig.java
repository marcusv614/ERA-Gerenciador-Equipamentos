package br.com.era.api.config;
import br.com.era.api.service.UsuarioService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.ConcurrentSessionControlAuthenticationStrategy;
import org.springframework.security.web.authentication.session.RegisterSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.security.web.session.HttpSessionEventPublisher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
@Configuration @EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfig {
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http,ValidacaoSessaoFilter validacaoSessao,CookieCsrfTokenRepository csrf,SessionAuthenticationStrategy estrategiaSessao,SessionRegistry registroSessoes) throws Exception {
        return http.cors(Customizer.withDefaults()).csrf(config->config
            .csrfTokenRepository(csrf)
            .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .sessionAuthenticationStrategy(estrategiaSessao).maximumSessions(1).sessionRegistry(registroSessoes)
                .expiredSessionStrategy(event->escreverErro(event.getResponse(),401,"Sessão encerrada. Entre novamente para continuar.")))
            .authorizeHttpRequests(authorize->authorize
                .requestMatchers(HttpMethod.OPTIONS,"/**").permitAll()
                .requestMatchers(HttpMethod.GET,"/auth/csrf","/actuator/health").permitAll()
                .requestMatchers(HttpMethod.POST,"/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET,"/auth/me").authenticated()
                .requestMatchers(HttpMethod.POST,"/auth/alterar-senha","/auth/logout").authenticated()
                .requestMatchers("/usuarios/**").hasRole("ADMIN")
                .requestMatchers("/painel/**").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers("/deposito/**").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers("/funcionarios/*/auditorias","/funcionarios/*/auditorias/**").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers(HttpMethod.GET,"/auditorias").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers(HttpMethod.POST,"/funcionarios","/equipamentos","/obras","/categorias-equipamento").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,"/funcionarios/**").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers(HttpMethod.PATCH,"/funcionarios/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH,"/equipamentos/**","/obras/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE,"/equipamentos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET,"/equipamentos/**","/obras/**","/atividades/**","/categorias-equipamento").authenticated()
                .requestMatchers(HttpMethod.POST,"/atividades").hasAnyRole("ADMIN","GERENTE","TECNICO")
                .requestMatchers(HttpMethod.PATCH,"/atividades/**").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers(HttpMethod.POST,"/equipamentos/*/movimentacoes").denyAll()
                .requestMatchers(HttpMethod.POST,"/equipamentos/*/manutencoes","/equipamentos/*/manutencoes/*/conclusao").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/equipamentos/*/calibracoes","/equipamentos/*/calibracoes/certificados","/equipamentos/*/calibracoes/*/cancelamento").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/equipamentos/*/calibracoes/*/retirada","/equipamentos/*/calibracoes/*/envio","/equipamentos/*/calibracoes/*/retorno").hasAnyRole("ADMIN","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/atividades/*/aprovacao","/atividades/*/rejeicao").hasAnyRole("ADMIN","GERENTE")
                .requestMatchers(HttpMethod.POST,"/atividades/*/materiais/*/compra").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/atividades/*/materiais/*/aquisicao").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/atividades/*/distribuicao").hasAnyRole("ADMIN","GERENTE","ESTOQUE")
                .requestMatchers(HttpMethod.POST,"/atividades/*/transito","/atividades/*/conclusao").hasAnyRole("ADMIN","ESTOQUE","TECNICO")
                .anyRequest().denyAll())
            .addFilterBefore(validacaoSessao,AuthorizationFilter.class)
            .logout(logout->logout.logoutUrl("/auth/logout").deleteCookies("JSESSIONID","XSRF-TOKEN").invalidateHttpSession(true).clearAuthentication(true).logoutSuccessHandler((request,response,authentication)->response.setStatus(HttpServletResponse.SC_NO_CONTENT)))
            .exceptionHandling(errors->errors.authenticationEntryPoint((request,response,e)->escreverErro(response,HttpServletResponse.SC_UNAUTHORIZED,"Autenticação necessária.")).accessDeniedHandler((request,response,e)->escreverErro(response,HttpServletResponse.SC_FORBIDDEN,"Você não tem permissão para realizar esta operação."))).build();
    }
    @Bean PasswordEncoder passwordEncoder(){return new Argon2PasswordEncoder(16,32,1,19456,2);}
    @Bean CookieCsrfTokenRepository csrfTokenRepository(@Value("${server.servlet.session.cookie.secure:false}") boolean secure){
        CookieCsrfTokenRepository csrf=CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrf.setCookieCustomizer(cookie->cookie.path("/").secure(secure).sameSite("Lax"));
        return csrf;
    }
    @Bean SessionRegistry registroSessoes(){return new SessionRegistryImpl();}
    @Bean SessionAuthenticationStrategy estrategiaSessao(SessionRegistry registroSessoes,CookieCsrfTokenRepository csrf){
        ConcurrentSessionControlAuthenticationStrategy concorrencia=new ConcurrentSessionControlAuthenticationStrategy(registroSessoes);
        concorrencia.setMaximumSessions(1);
        return new CompositeSessionAuthenticationStrategy(List.of(concorrencia,new ChangeSessionIdAuthenticationStrategy(),new RegisterSessionAuthenticationStrategy(registroSessoes),new CsrfAuthenticationStrategy(csrf)));
    }
    // Executar somente na cadeia do Spring Security, depois de carregar a autenticação.
    @Bean FilterRegistrationBean<ValidacaoSessaoFilter> registroValidacaoSessao(ValidacaoSessaoFilter filter){
        FilterRegistrationBean<ValidacaoSessaoFilter> registro=new FilterRegistrationBean<>(filter);registro.setEnabled(false);return registro;
    }
    @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)throws Exception{return configuration.getAuthenticationManager();}
    @Bean HttpSessionEventPublisher httpSessionEventPublisher(){return new HttpSessionEventPublisher();}
    @Bean ApplicationRunner criarAdminInicial(UsuarioService usuarios,@Value("${app.bootstrap.admin.nome:Administrador ERA}")String nome,@Value("${app.bootstrap.admin.login:}")String login,@Value("${app.bootstrap.admin.senha:}")String senha){return args->usuarios.criarAdminInicial(nome,login,senha);}
    @Bean CorsConfigurationSource corsConfigurationSource(CorsProperties properties){CorsConfiguration c=new CorsConfiguration();c.setAllowedOrigins(properties.allowedOrigins());c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Content-Type","Accept","X-XSRF-TOKEN"));c.setExposedHeaders(List.of("Location","X-XSRF-TOKEN"));c.setAllowCredentials(true);c.setMaxAge(3600L);UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;}
    private static void escreverErro(HttpServletResponse response,int status,String mensagem)throws java.io.IOException{response.setStatus(status);response.setContentType("application/json");response.setCharacterEncoding("UTF-8");response.getWriter().write("{\"status\":"+status+",\"mensagem\":\""+mensagem+"\",\"detalhes\":{}}");}
}
