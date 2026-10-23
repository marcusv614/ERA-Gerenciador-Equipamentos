package br.com.era.api.service;

import br.com.era.api.config.UsuarioAutenticado;
import br.com.era.api.exception.RegraNegocioException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.sql.Types;
import java.time.OffsetDateTime;
import java.util.List;

@Service
public class AuditoriaSegurancaService {
    public enum Tipo { LOGIN_SUCESSO,LOGIN_FALHA,LOGIN_BLOQUEADO,USUARIO_CRIADO,USUARIO_EDITADO,
        USUARIO_ATIVADO,USUARIO_DESATIVADO,SENHA_REDEFINIDA,SENHA_ALTERADA,SENHA_RECUPERADA,EMAIL_RECUPERACAO_CONFIRMADO }
    public record Evento(Long id,Tipo tipo,Long atorId,Long alvoId,OffsetDateTime registradoEm) {}
    public record Pagina(List<Evento> itens,boolean temMais,int pagina) {}
    private final JdbcTemplate jdbc;
    public AuditoriaSegurancaService(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public Long atorAtual(){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        return auth!=null&&auth.isAuthenticated()&&auth.getPrincipal() instanceof UsuarioAutenticado p?p.getUsuarioId():null;
    }
    @Transactional
    public void registrar(Tipo tipo,Long ator,Long alvo){
        jdbc.update("INSERT INTO eventos_seguranca(tipo,ator_id,alvo_id) VALUES (?,?,?)",
            new Object[]{tipo.name(),ator,alvo},new int[]{Types.VARCHAR,Types.BIGINT,Types.BIGINT});
    }
    @Transactional(readOnly=true)
    public Pagina listar(Tipo tipo,OffsetDateTime inicio,OffsetDateTime fim,int pagina){
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null||!auth.isAuthenticated()||auth.getAuthorities().stream().noneMatch(a->a.getAuthority().equals("ROLE_ADMIN")))
            throw new AccessDeniedException("Consulta restrita ao administrador.");
        if(pagina<0||pagina>10000||(inicio!=null&&fim!=null&&fim.isBefore(inicio)))throw new RegraNegocioException("Confira o período e a página informados.");
        var parametros=new java.util.ArrayList<Object>();StringBuilder sql=new StringBuilder("SELECT id,tipo,ator_id,alvo_id,registrado_em FROM eventos_seguranca WHERE 1=1");
        if(tipo!=null){sql.append(" AND tipo=?");parametros.add(tipo.name());}
        if(inicio!=null){sql.append(" AND registrado_em>=?");parametros.add(inicio);}
        if(fim!=null){sql.append(" AND registrado_em<=?");parametros.add(fim);}
        sql.append(" ORDER BY registrado_em DESC,id DESC LIMIT 51 OFFSET ?");parametros.add(pagina*50);
        List<Evento> itens=jdbc.query(sql.toString(),(rs,n)->new Evento(rs.getLong("id"),Tipo.valueOf(rs.getString("tipo")),
            rs.getObject("ator_id",Long.class),rs.getObject("alvo_id",Long.class),rs.getObject("registrado_em",OffsetDateTime.class)),parametros.toArray());
        return new Pagina(itens.stream().limit(50).toList(),itens.size()>50,pagina);
    }
}
