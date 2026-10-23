# Segurança — primeira etapa (23/10/2026)

## Escopo e compatibilidade

Logs, autenticação, auditoria administrativa e verificações automáticas. Sem alteração de permissões de pedidos, sem MFA, sem exclusão/anonimização automática e sem mudança de retenção de dados. Não é certificação OWASP nem comprovação de conformidade LGPD.

Por decisão do responsável pelo sistema, o mínimo permanece em **8 caracteres** (máximo 128), inclusive senhas temporárias, primeiro acesso e recuperação. Aceitamos frases-senha, espaços e Unicode; não exigimos combinações artificiais de maiúsculas, números e símbolos. A API bloqueia o login contido na senha, alguns padrões públicos muito comuns e repetições óbvias. A lista local não substitui uma base completa de senhas vazadas. As senhas existentes não são reavaliadas no login e não há troca forçada em massa. Argon2 e o bloqueio após cinco falhas por quinze minutos permanecem ativos. O mínimo de oito caracteres sem MFA é uma decisão de usabilidade abaixo da recomendação de quinze caracteres da OWASP/NIST; MFA permanece pendente.

## Logs sem conteúdo sensível

O handler registra identificador de correlação, modelo da rota (por exemplo, `/usuarios/{id}`), tipo da exceção e até oito locais do código da aplicação. Não registra a exceção completa, mensagem, causas, SQL, parâmetros, URI bruta ou corpo da requisição. O mesmo código de erro aparece na resposta genérica enviada ao usuário.

Os loggers Hibernate de erros JDBC, comandos SQL, parâmetros e extração são desabilitados na configuração padrão para impedir que uma violação de restrição imprima os valores da linha antes do handler. Isso não elimina o monitoramento: o erro continua identificado pelo código de correlação. Não habilite debug/trace de SMTP, SQL ou corpos HTTP em produção. Componentes de infraestrutura e integrações externas exigem revisão própria de logs.

## Eventos de segurança

A migração aditiva V52 cria `eventos_seguranca`. São registrados tipo, ID do responsável quando identificado, ID da conta afetada e data. Não são persistidos senhas/hashes, login digitado, e-mails, IPs, tokens ou identificadores de sessão.

- Logins concluídos, recusados e bloqueados.
- Criação/edição de usuário, ativação/desativação, troca e redefinição de senha.
- Recuperação de senha por e-mail e confirmação do endereço de recuperação, também preservadas na trilha específica da recuperação.

Tentativa de login desconhecido registra conta e responsável nulos, sem salvar o texto informado. Um login recusado não é atribuído à pessoa titular da conta: ela pode estar sendo atacada. O registro de sucesso acontece depois da estratégia de sessão e antes de devolver a sessão ao cliente. Mudanças administrativas e seus eventos são gravados na mesma transação; se a gravação de auditoria falhar, a operação crítica falha, em vez de continuar silenciosamente sem rastreabilidade.

Na Administração, **Eventos de segurança** oferece filtros de tipo e período, com paginação de 50 registros e ordenação estável. Datas seguem Manaus. A API `/usuarios/eventos-seguranca` exige ADMIN; não há endpoints de edição/exclusão desses eventos. Nomes mostrados na tela vêm do cadastro atual, não de um histórico de identidade. Essa tabela não é um armazenamento inviolável: acesso direto ao banco exige controle próprio.

Não fabricamos eventos anteriores à atualização nem inserimos dados de teste no banco principal. Retenção, alertas automáticos, SIEM, monitoramento de volume e resposta a incidentes ainda precisam de uma política operacional. O limite por conta não substitui proteção contra password spraying e negação de serviço no proxy/WAF.

## Publicação e dependências

`verificar-seguranca.yml` executa em PRs, manualmente, semanalmente e como requisito da publicação:

- API: testes e consulta OSV das versões Maven efetivamente resolvidas.
- UI: instalação pelo lockfile, testes, lint, build e `npm audit` (bloqueio HIGH/CRITICAL).
- Imagens finais: Trivy, bloqueando vulnerabilidades HIGH/CRITICAL, inclusive sem correção disponível.

A publicação depende desses jobs e verifica novamente **a imagem exata** antes do push. Nenhuma imagem é publicada se essa verificação falhar. Falha de consulta às bases também bloqueia o fluxo; não há `continue-on-error` nem supressão geral de alertas. Ações de terceiros estão fixadas por SHA, checkout não persiste credenciais e permissão de escrita em pacotes fica somente no job de publicação. A versão do scanner também é fixada. Atualizar essas referências requer revisão periódica.

Esses arquivos só passam a valer no GitHub depois que forem enviados ao repositório pelo responsável. Não foram feitos commits, pushes, alterações nas configurações do GitHub ou publicação de imagens nesta etapa. Proteção da branch e obrigatoriedade dos checks no merge ainda precisam ser configuradas no GitHub. Não habilitamos criação automática de PRs por bots.

As correções compatíveis de dependências estão no lockfile; refaça o build das imagens para incorporá-las. Um resultado sem alertas representa somente as bases consultadas naquele momento, não ausência de vulnerabilidades.

A varredura identificou alertas na antiga imagem final `nginx:1.29-bookworm`, incluindo pacotes que não são necessários para servir esta interface. A base final passou para a versão estável oficial `nginx:1.30.6-alpine3.24`, preservando os arquivos de configuração e os cabeçalhos. O healthcheck usa o `wget` disponível no Alpine, sem instalar `curl` apenas para esse teste. As bases de compilação não fazem parte da imagem final analisada.

## Atualização local

Validação desta etapa: 269 testes de backend, 137 de frontend, lint/build, actionlint e fluxo HTTP em PostgreSQL descartável, incluindo senha de exatamente oito caracteres e negativa para os seis perfis não ADMIN. OSV consultou 102 bibliotecas Java sem alertas; npm audit ficou sem vulnerabilidades após atualizar as versões compatíveis do lockfile. As imagens finais de API e UI não apresentaram alertas HIGH/CRITICAL nas varreduras executadas. O teste de navegador validou filtros/paginação e os layouts 390/1440 com API fictícia. Os testes não alteraram contas reais.

A atualização local foi aplicada após backup validado. A migração V52 foi concluída e API, UI e banco ficaram saudáveis. A Hostinger não foi alterada. O backup local temporário não substitui a política de backups criptografados e externos de produção.

Faça backup do banco antes de aplicar a migração. Não use `down -v` nem resete senhas/usuários para atualizar:

```sh
docker compose up -d --build api ui
docker compose ps
```

Na VPS, publique as imagens verificadas e siga o compose de produção. A atualização local não atualiza a Hostinger. Configure o Gmail separadamente conforme [o guia de recuperação](recuperacao-conta-admin.md).

Referências: [autenticação — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [logs — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html), [ASVS](https://asvs.owasp.org/).
