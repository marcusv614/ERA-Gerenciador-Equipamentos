# Proteção do último administrador — 27/10/2026

Rodada seguinte: a prioridade de notificações foi tratada em
[persistência e concorrência das notificações](NOTIFICACOES_PERSISTENCIA.md).
As contagens e resultados abaixo são os desta rodada de administradores.

Esta rodada continua a prioridade P0 registrada em `CONTINUACAO_RESSALVAS.md`.
A reprodução usa API, Spring transacional e PostgreSQL reais, exclusivamente em
stacks tmpfs criadas por `scripts/testar-integracao.mjs`. Não usa `.env` nem o
banco habitual. Nenhum commit, push ou deploy foi realizado.

## QA-BUG-003: desativação e rebaixamento concorrentes

Com dois administradores ativos e sessões independentes, A desativa B enquanto
B altera A para GERENTE. Antes da correção, ambas as operações retornaram HTTP
200 e a consulta SQL confirmou **zero administradores ativos**. A reprodução
foi repetida após reconstruir a imagem com o código do repositório.

Severidade **ALTA**: quebra do fluxo de administração e necessidade de intervenção
para restaurar acesso administrativo. Não houve perda de dados demonstrada.

O lock existente protegia apenas a conta-alvo. Cada transação podia contar dois
administradores antes de a outra confirmar sua alteração. Nas disputas homogêneas,
também foram observados conflitos de locks na auditoria, respondidos como HTTP
409 genérico; isso não foi aceito como prova da regra do último administrador.

## Correção e ordem dos locks

Foi confirmado ainda **QA-BUG-004**, também de severidade ALTA: arquivar um
funcionário vinculado à única conta ADMIN retornava HTTP 200, arquivava o
funcionário e deixava zero administradores ativos. A primeira correção, limitada
à gestão de contas, também não impedia a disputa entre esse arquivamento e um
rebaixamento. Os casos QA-ADM-04 e 05 reproduziram as duas situações no PostgreSQL;
o teste Java `QA_BUG_004_arquivarFuncionarioNaoDesativaUltimoAdmin` também falhou
antes da correção, sem a exceção de negócio esperada.

`UsuarioRepository.bloquearAtivosDoPerfil(ADMIN)` adquire lock pessimista dos
administradores ativos, em ordem de ID. `UsuarioService.atualizar` e
`definirStatus` fazem essa consulta **antes** de bloquear a conta-alvo e contar
administradores. A redefinição administrativa de senha segue a mesma ordem,
pois a auditoria referencia tanto o autor quanto a conta alterada.

`FuncionarioService.definirArquivamento` também bloqueia os administradores
ativos e verifica a conta vinculada antes de remover responsabilidades, gerar
snapshots ou desativar a conta. O arquivamento é recusado se desativaria o último
ADMIN ativo. Com outro administrador disponível, o arquivamento continua
permitido; a restauração do funcionário continua sem reativar sua conta.

O lock dura até o fim da transação. A segunda alteração espera a primeira e
reavalia a regra após sua confirmação. A escolha segue o comportamento documentado
de [SELECT FOR UPDATE em Read Committed](https://www.postgresql.org/docs/16/transaction-iso.html#XACT-READ-COMMITTED)
e a duração dos [locks de linha do PostgreSQL](https://www.postgresql.org/docs/16/explicit-locking.html#LOCKING-ROWS).
Não foram criadas migrations ou dependências. O custo é serializar as operações
administrativas que adotam essa ordem; carga elevada desse fluxo não foi medida.

## Automação reproduzível

```sh
node scripts/testar-integracao.mjs --suite=administradores
```

O executor reconstrói as imagens e valida as etiquetas do projeto antes da
limpeza. `scripts/testes/administradores-concorrentes.mjs` também valida a etiqueta
do banco e seu nome antes de usar SQL de fixture. O resultado de cada execução
fica no diretório `administradores/` de seu artefato `integracao-*`, além da cópia
local em `test-results/quality-assurance/administradores-concorrentes.json`.

A sobreposição é forçada com um gatilho de teste, que aguarda uma chave advisory
mantida por uma conexão auxiliar. O teste observa as duas transações aguardando
locks em `pg_stat_activity` antes de liberar a barreira. Esse gatilho não é uma
migration e não faz parte da aplicação. É removido entre casos e na finalização;
a stack inteira é descartada ao terminar.

Cada disputa exige um HTTP 200, um HTTP 409 com mensagem da regra do último
administrador, exatamente um ADMIN ativo no SQL e na consulta HTTP do
sobrevivente. A auditoria também é conferida para impedir que a operação recusada
persista um evento administrativo. Os casos com arquivamento preservam o
comportamento anterior de não gerar esse tipo de evento quando o arquivamento
é a operação vencedora.

Os testes usam restauração explícita das duas contas fictícias entre casos,
incrementando a versão de sessão e fazendo novos logins. Isso permite reproduzir
uma falha que deixe zero administradores sem tocar em nenhum dado habitual.

## Resultados e limites

Regressão Java final: **785 testes aprovados**, zero falhas, erros ou ignorados.
Foram acrescentados dois testes Java para a proteção no arquivamento e para
preservar a operação quando há outro administrador. Nenhuma expectativa anterior
foi removida ou alterada. Cobertura global Java: instruções **87,49%**, linhas
**90,72%**, ramos **75,35%**. Denominadores atuais: 22.649 instruções, 1.735 linhas
e 2.199 ramos; mudaram com a adição e formatação do código de produção.

Os cinco casos HTTP cobrem: duas desativações; dois rebaixamentos; desativação
contra rebaixamento; arquivamento de funcionário contra rebaixamento; e recusa
sequencial de arquivamento do funcionário vinculado ao último administrador.
O teste não usa apenas ausência de erro ou HTTP 409 como critério de aprovação.

Integração final **APROVADA** em quatro stacks: atendimento parcial, regressão,
recuperação e administradores. Passaram os 30 E2E Chromium desktop/mobile,
os oito casos QA-API existentes, os cinco QA-ADM e os scripts HTTP de negócio,
segurança, concorrência de estoque/cancelamento e recuperação com SMTP fictício.
Nenhuma stack foi reutilizada da aplicação habitual; o executor removeu os
containers e redes de teste após conferir suas etiquetas.

| Caso | HTTP | ADMIN ativos após a operação | Resultado |
| --- | --- | ---: | --- |
| QA-ADM-01: duas desativações | 200 + 409 de negócio | 1 | APROVADO |
| QA-ADM-02: dois rebaixamentos | 200 + 409 de negócio | 1 | APROVADO |
| QA-ADM-03: desativação × rebaixamento | 200 + 409 de negócio | 1 | APROVADO |
| QA-ADM-04: arquivamento × rebaixamento | 200 + 409 de negócio | 1 | APROVADO |
| QA-ADM-05: arquivar o funcionário do único ADMIN | 409 de negócio; funcionário preservado | 1 | APROVADO |

Snapshot versionável: [evidências antes/depois](evidencias/administradores-2026-10-27.json),
incluindo hashes das fontes alteradas e os resultados das quatro stacks. Logs:
`test-results/quality-assurance/java-10.log` e `integration-5.log`.
Integração final: `test-results/integracao-1793102035175/resumo.json`.
As reproduções anteriores foram preservadas no snapshot e nos diretórios locais
indicados nele. `java-9.log` mantém a falha de reprodução de QA-BUG-004.

O coletor `scripts/qa/medir.mjs` passou a incluir os casos QA-ADM quando o
artefato existir na mesma execução de integração selecionada. Não reaproveita a
cópia global de outra execução. Os snapshots das rodadas anteriores foram
preservados; o total agregado do coletor usa a última execução de cada suíte e
inclui Node/navegador local de 26/10, não sendo uma nova execução dessas suítes.

Permanecem fora deste escopo: todas as combinações entre três ou mais atores,
alterações diretas no banco, carga prolongada, capacidade, leitores de tela,
cobertura JSX, histórico legado, restauração de backup e scanners de imagens.
A próxima prioridade funcional da fila é persistência/concorrência das
notificações. Não há declaração de ausência de deadlocks em toda a aplicação.
