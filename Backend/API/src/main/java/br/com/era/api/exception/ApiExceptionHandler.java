package br.com.era.api.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger LOGGER=LoggerFactory.getLogger(ApiExceptionHandler.class);
    @ExceptionHandler(RecursoNaoEncontradoException.class) ResponseEntity<Map<String,Object>> tratarNaoEncontrado(RecursoNaoEncontradoException e,HttpServletRequest r){return resposta(HttpStatus.NOT_FOUND,e.getMessage(),Map.of(),r,null);}
    @ExceptionHandler(RegraNegocioException.class) ResponseEntity<Map<String,Object>> tratarRegra(RegraNegocioException e,HttpServletRequest r){return resposta(HttpStatus.CONFLICT,e.getMessage(),Map.of(),r,null);}
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Map<String,Object>> tratarValidacao(MethodArgumentNotValidException e,HttpServletRequest r){Map<String,String> campos=new LinkedHashMap<>();e.getBindingResult().getFieldErrors().forEach(erro->campos.putIfAbsent(erro.getField(),erro.getDefaultMessage()));return resposta(HttpStatus.BAD_REQUEST,"Existem campos inválidos.",campos,r,null);}
    @ExceptionHandler(ConstraintViolationException.class) ResponseEntity<Map<String,Object>> tratarRestricoes(ConstraintViolationException e,HttpServletRequest r){Map<String,String> campos=new LinkedHashMap<>();e.getConstraintViolations().forEach(erro->campos.put(erro.getPropertyPath().toString(),erro.getMessage()));return resposta(HttpStatus.BAD_REQUEST,"Existem parâmetros inválidos.",campos,r,null);}
    @ExceptionHandler({HttpMessageNotReadableException.class,MissingServletRequestParameterException.class,MethodArgumentTypeMismatchException.class}) ResponseEntity<Map<String,Object>> tratarRequisicaoInvalida(Exception e,HttpServletRequest r){return resposta(HttpStatus.BAD_REQUEST,"A requisição enviada é inválida.",Map.of(),r,null);}
    @ExceptionHandler(NoResourceFoundException.class) ResponseEntity<Map<String,Object>> tratarRotaInexistente(NoResourceFoundException e,HttpServletRequest r){return resposta(HttpStatus.NOT_FOUND,"Rota não encontrada.",Map.of(),r,null);}
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class) ResponseEntity<Map<String,Object>> tratarMetodoInvalido(HttpRequestMethodNotSupportedException e,HttpServletRequest r){return resposta(HttpStatus.METHOD_NOT_ALLOWED,"Método HTTP não permitido para esta rota.",Map.of(),r,null);}
    @ExceptionHandler(DataIntegrityViolationException.class) ResponseEntity<Map<String,Object>> tratarIntegridade(DataIntegrityViolationException e,HttpServletRequest r){String id=registrar(e,r);return resposta(HttpStatus.CONFLICT,"Não foi possível concluir a operação porque os dados entram em conflito.",Map.of(),r,id);}
    @ExceptionHandler(AccessDeniedException.class) ResponseEntity<Map<String,Object>> tratarAcessoNegado(AccessDeniedException e,HttpServletRequest r){return resposta(HttpStatus.FORBIDDEN,"Você não tem permissão para realizar esta operação.",Map.of(),r,null);}
    @ExceptionHandler(ResponseStatusException.class) ResponseEntity<Map<String,Object>> tratarStatus(ResponseStatusException e,HttpServletRequest r){HttpStatus status=HttpStatus.resolve(e.getStatusCode().value());HttpStatus seguro=status==null?HttpStatus.INTERNAL_SERVER_ERROR:status;String mensagem=seguro.is5xxServerError()?"Ocorreu um erro interno.":e.getReason();return resposta(seguro,mensagem==null?"Não foi possível concluir a requisição.":mensagem,Map.of(),r,null);}
    @ExceptionHandler(Exception.class) ResponseEntity<Map<String,Object>> tratarErroInesperado(Exception e,HttpServletRequest r){String id=registrar(e,r);return resposta(HttpStatus.INTERNAL_SERVER_ERROR,"Ocorreu um erro interno. Informe o código do erro ao suporte.",Map.of(),r,id);}
    private String registrar(Exception e,HttpServletRequest r){String id=UUID.randomUUID().toString();LOGGER.error("Erro não tratado id={} metodo={} rota={}",id,r.getMethod(),r.getRequestURI(),e);return id;}
    private ResponseEntity<Map<String,Object>> resposta(HttpStatus status,String mensagem,Object detalhes,HttpServletRequest r,String idErro){Map<String,Object> corpo=new LinkedHashMap<>();corpo.put("status",status.value());corpo.put("mensagem",mensagem);corpo.put("detalhes",detalhes);corpo.put("rota",r.getRequestURI());corpo.put("instante",OffsetDateTime.now());if(idErro!=null)corpo.put("codigoErro",idErro);return ResponseEntity.status(status).body(corpo);}
}
