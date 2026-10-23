package br.com.era.api.config;

import br.com.era.api.exception.RegraNegocioException;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class PoliticaSenhaTests {
    @Test void aceitaExatamenteOitoCaracteresSemExigirSimbolos(){
        assertDoesNotThrow(()->PoliticaSenha.validar("operador","Bico#123"));
        assertDoesNotThrow(()->PoliticaSenha.validar("operador","marazul8"));
        assertDoesNotThrow(()->PoliticaSenha.validar("operador","Minha frase fácil de lembrar"));
    }
    @Test void rejeitaTamanhoForaDoLimite(){
        for(String senha:new String[]{"Abc#123","abc".repeat(43),"😀".repeat(4)})assertThrows(RegraNegocioException.class,()->PoliticaSenha.validar("operador",senha));
    }
    @Test void rejeitaPadroesObviosELogin(){
        for(String senha:new String[]{"12345678","password","senha123","aaaaaaaa","abcabcabc","OPERADOR#123"})
            assertThrows(RegraNegocioException.class,()->PoliticaSenha.validar("operador",senha));
    }
}
