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
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;
@Configuration @EnableConfigurationProperties(CorsProperties.class)
public class SecurityConfig {
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository csrf=CookieCsrfTokenRepository.withHttpOnlyFalse();csrf.setCookiePath("/");
        return http.cors(Customizer.withDefaults()).csrf(config->config
            .csrfTokenRepository(csrf)
            .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
            .sessionManagement(session->session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED).sessionFixation(fixation->fixation.migrateSession()).maximumSessions(1))
            .authorizeHttpRequests(authorize->authorize.requestMatchers(HttpMethod.OPTIONS,"/**").permitAll().requestMatchers(HttpMethod.GET,"/auth/csrf").permitAll().requestMatchers(HttpMethod.POST,"/auth/login").permitAll().requestMatchers("/usuarios/**").hasRole("ADMIN").requestMatchers(HttpMethod.POST,"/equipamentos","/obras").hasRole("ADMIN").anyRequest().authenticated())
            .logout(logout->logout.logoutUrl("/auth/logout").deleteCookies("JSESSIONID","XSRF-TOKEN").invalidateHttpSession(true).clearAuthentication(true).logoutSuccessHandler((request,response,authentication)->response.setStatus(HttpServletResponse.SC_NO_CONTENT)))
            .exceptionHandling(errors->errors.authenticationEntryPoint((request,response,e)->response.sendError(HttpServletResponse.SC_UNAUTHORIZED)).accessDeniedHandler((request,response,e)->response.sendError(HttpServletResponse.SC_FORBIDDEN))).build();
    }
    @Bean PasswordEncoder passwordEncoder(){return new Argon2PasswordEncoder(16,32,1,19456,2);}
    @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)throws Exception{return configuration.getAuthenticationManager();}
    @Bean ApplicationRunner criarAdminInicial(UsuarioService usuarios,@Value("${app.bootstrap.admin.nome:Administrador ERA}")String nome,@Value("${app.bootstrap.admin.login:}")String login,@Value("${app.bootstrap.admin.senha:}")String senha){return args->usuarios.criarAdminInicial(nome,login,senha);}
    @Bean CorsConfigurationSource corsConfigurationSource(CorsProperties properties){CorsConfiguration c=new CorsConfiguration();c.setAllowedOrigins(properties.allowedOrigins());c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));c.setAllowedHeaders(List.of("Content-Type","Accept","X-XSRF-TOKEN"));c.setExposedHeaders(List.of("Location","X-XSRF-TOKEN"));c.setAllowCredentials(true);c.setMaxAge(3600L);UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();source.registerCorsConfiguration("/**",c);return source;}
}
