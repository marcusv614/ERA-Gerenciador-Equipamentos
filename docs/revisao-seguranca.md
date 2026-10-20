# Revisão de segurança — 20/10/2026

## Correções

- Sessões passam a guardar o ID imutável e a versão do acesso autenticado. Mudanças de senha, login, perfil, vínculo com funcionário, situação da conta e exigência de troca de senha revogam a sessão antiga na próxima requisição. Desativar e reativar a conta não restaura sessões anteriores.
- A troca de senha mantém somente a sessão que acabou de validar a operação. A versão também é conferida dentro da transação, com bloqueio da conta, impedindo que uma sessão antiga aproveite uma redefinição administrativa para substituir a senha provisória sem conhecê-la.
- O login chama explicitamente a estratégia de autenticação de sessão do Spring Security: proteção contra fixação de sessão, registro das sessões, limite de uma sessão por conta e renovação do CSRF. A interface busca o novo token após entrar. Sessões concorrentes expiradas retornam JSON 401.
- O filtro de validação executa apenas dentro da cadeia de segurança, após o carregamento da autenticação. Cookies CSRF recebem `SameSite=Lax` e `Secure` conforme a configuração de HTTPS já utilizada para a sessão.
- A interface também reconhece a revogação ao consultar a sessão ou trocar senha e retorna ao login.
- Contadores de tentativas de login e alterações administrativas usam bloqueio de linha no banco. Cinco falhas bloqueiam novos logins por quinze minutos; requisições durante esse período não prorrogam o bloqueio indefinidamente.
- Arquivos `.env.*` ficam fora do Git, preservando exemplos públicos. Todos os `.env*` ficam fora dos contextos de construção Docker.

## Dependências

Atualizados Axios 1.20.0, brace-expansion 5.0.12, source-map-js 1.2.2, Spring Boot 4.1.1 e Bouncy Castle 1.86. Tomcat 11.0.25 e Jackson 3.1.7 são definidos explicitamente no POM porque os respectivos patches são posteriores às versões gerenciadas pelo Boot 4.1.1. O BOM atualizado também fornece Spring Framework 7.0.9, Log4j API 2.25.5 e PostgreSQL JDBC 42.7.13.

A primeira consulta OSV encontrou 16 alertas distribuídos em 6 artefatos Java; a primeira consulta npm encontrou 3 pacotes com alertas. Esses resultados identificam versões afetadas, sem afirmar que todos os recursos vulneráveis são utilizados pelo projeto. A consulta posterior às atualizações verificou 96 bibliotecas Java de execução e não retornou alertas; o npm audit também não retornou vulnerabilidades.

Referências: [autenticação personalizada e gerenciamento de sessões](https://docs.spring.io/spring-security/reference/7.0/servlet/authentication/session-management.html), [renovação de CSRF após login](https://docs.spring.io/spring-security/reference/7.0/servlet/exploits/csrf.html), [aviso do Axios e versão corrigida](https://github.com/axios/axios/security/advisories/GHSA-vh66-26gq-q6x8), [base OSV](https://osv.dev/).

## SQL injection, permissões e exportação

Não foram encontradas consultas SQL construídas pela concatenação de entradas do usuário. Os repositórios usam métodos derivados do Spring Data ou parâmetros nomeados JPQL. Os testes HTTP incluem tentativa de injeção no login, manipulação de ID e armazenamento literal de texto parecido com SQL, verificando que os registros continuam acessíveis.

As requisições usam DTOs validados, sem receber entidades JPA diretamente. O acesso por perfil continua no servidor, com restrições adicionais de obra e técnico nos serviços. Os testes incluem tentativas de cadastro administrativo por técnico e consulta a obra e vistoria não autorizadas.

Os documentos para impressão escapam os textos interpolados em HTML. A planilha CSV protege células que poderiam ser interpretadas como fórmulas. Os testes existentes dessas exportações fazem parte da validação. Senhas e hashes não são retornados pelas respostas de usuários; erros de requisição não retornam stack traces.

Validação concluída: 136 testes da API, 70 testes da interface, ESLint e construção de produção da interface; 227 requisições HTTP reais em ambiente isolado, além da verificação da migração de manutenção.

## Reproduzir a verificação

Na pasta `Backend/API`, com Java configurado:

```powershell
.\mvnw.cmd -B -ntp test dependency:tree '-DoutputType=json' '-DoutputFile=target/security-dependencies.json' '-Dscope=runtime'
```

Na raiz do projeto:

```powershell
node scripts/verificar-dependencias-java.mjs
npm.cmd --prefix Frontend/UI audit
node --test Frontend/UI/tests/*.test.js
npm.cmd --prefix Frontend/UI run lint
npm.cmd --prefix Frontend/UI run build
.\scripts\validar-fluxo-requisicoes.ps1
```

O script OSV envia apenas nomes e versões públicos das bibliotecas e falha quando encontra alertas ou não consegue concluir a consulta. O teste integrado exige Docker e a imagem de API recém-construída; cria banco, API e contas temporárias, valida também cadastro, pedidos, recebimento, vistoria, manutenção e calibração e remove seus recursos ao terminar.

## Aplicação e alcance

A migração V35 acrescenta o contador de versão das sessões. Atualizar a API exige novo login nas sessões existentes. A produção precisa receber as novas imagens para incorporar as correções; editar o repositório ou reconstruir o desenvolvimento não atualiza a produção.

Esta revisão cobre o código da aplicação, consultas, autenticação, permissões, respostas, exportações e dependências Maven/npm resolvidas. Não inclui um pentest externo, teste de carga/negação de serviço ou varredura completa dos pacotes do sistema operacional das imagens e da infraestrutura de hospedagem. Os resultados de dependências correspondem às bases consultadas na data da revisão.
