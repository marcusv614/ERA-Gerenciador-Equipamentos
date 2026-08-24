package br.com.era.api.exception;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(RecursoNaoEncontradoException.class) ResponseEntity<Map<String,Object>> tratarNaoEncontrado(RecursoNaoEncontradoException e) { return resposta(HttpStatus.NOT_FOUND,e.getMessage(),Map.of()); }
    @ExceptionHandler(RegraNegocioException.class) ResponseEntity<Map<String,Object>> tratarRegra(RegraNegocioException e) { return resposta(HttpStatus.CONFLICT,e.getMessage(),Map.of()); }
    @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<Map<String,Object>> tratarValidacao(MethodArgumentNotValidException e) {
        Map<String,String> campos=new LinkedHashMap<>(); e.getBindingResult().getFieldErrors().forEach(erro->campos.put(erro.getField(),erro.getDefaultMessage()));
        return resposta(HttpStatus.BAD_REQUEST,"Existem campos inválidos.",campos);
    }
    private ResponseEntity<Map<String,Object>> resposta(HttpStatus status,String mensagem,Object detalhes) { return ResponseEntity.status(status).body(Map.of("status",status.value(),"mensagem",mensagem,"detalhes",detalhes,"instante", OffsetDateTime.now())); }
}
