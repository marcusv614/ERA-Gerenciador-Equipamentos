package br.com.era.api.config;

import br.com.era.api.exception.RegraNegocioException;
import java.text.Normalizer;
import java.util.Locale;
import java.util.Set;

/** Aplicada somente ao definir senhas novas; nunca invalida logins existentes. */
public final class PoliticaSenha {
    public static final int MINIMO=8;
    public static final int MAXIMO=128;
    private static final Set<String> COMUNS=Set.of("12345678","123456789","1234567890","password","password123","senha123","senha1234","qwerty123","qwertyuiop","abcdefgh","87654321","123456789012345","1234567890123456","passwordpassword",
        "password123456789","administrador123","senhasenhasenha123","qwertyuiopasdfgh","qwertyuiop123456");
    private PoliticaSenha() {}
    public static void validar(String login,String senha){
        if(senha==null||senha.codePointCount(0,senha.length())<MINIMO||senha.length()>MAXIMO)
            throw new RegraNegocioException("Use uma senha de 8 a 128 caracteres. Você pode usar uma frase-senha.");
        String comparacao=Normalizer.normalize(senha,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
        if(login!=null&&!login.isBlank()&&comparacao.contains(Normalizer.normalize(login.trim(),Normalizer.Form.NFKC).toLowerCase(Locale.ROOT)))
            throw new RegraNegocioException("A senha não pode conter o login do usuário.");
        if(COMUNS.contains(comparacao)||comparacao.codePoints().distinct().count()<3||repetitiva(comparacao))
            throw new RegraNegocioException("Essa senha usa um padrão muito comum. Escolha uma frase-senha diferente.");
    }
    private static boolean repetitiva(String valor){
        for(int tamanho=1;tamanho<=6&&tamanho*2<=valor.length();tamanho++)
            if(valor.length()%tamanho==0&&valor.substring(0,tamanho).repeat(valor.length()/tamanho).equals(valor))return true;
        return false;
    }
}
