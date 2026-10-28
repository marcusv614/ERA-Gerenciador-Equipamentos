# Persistência e concorrência das notificações — 27/10/2026

Rodada seguinte: a medição de JSX/hooks e interações da UI está em
[cobertura da interface](COBERTURA_INTERFACE.md). Os resultados abaixo são da
rodada de persistência/concorrência das notificações.

Continuação da prioridade P1 de notificações registrada nas rodadas anteriores.
Os testes usam API, transações Spring e PostgreSQL reais, em projeto Compose
aleatório com banco tmpfs. Não usam `.env`, banco habitual ou serviços externos.

## QA-BUG-005 — Reentrega mantém dados e perfil antigos

Severidade **MÉDIA**, família F25. Ao emitir um novo ajuste financeiro para uma
solicitação com aviso anterior, a aplicação reutilizava seu ID e reabria a
leitura, mas mantinha o resumo de materiais, a obra e o perfil capturados no
primeiro envio.

Reprodução HTTP: criar um pedido com uma unidade para a obra A, aprovar na
Gerência e definir o plano no Financeiro. Marcar o aviso AJUSTE_FINANCEIRO como
lido. Ainda na análise financeira, alterar o pedido para duas unidades e obra B.
O mesmo aviso reaparecia não lido, mostrando **uma unidade e a obra A**, embora
o pedido já tivesse sido alterado corretamente.

Outra manifestação da mesma causa: uma conta GERENTE que recebeu o aviso passa
a ESTOQUE. Após aprovação e revisão do plano, esse perfil é destinatário elegível
do novo ajuste, mas o aviso renovado permanecia com o perfil GERENTE armazenado.
A consulta de escopo o ocultava, sem duplicá-lo ou informar o novo evento.

A causa era `renovar(String mensagem)`: atualizava apenas mensagem, data de
criação e leitura. A correção passa usuário e pedido atuais à renovação, que
recaptura perfil, obra, nome da obra, indicação de destinatário e materiais.
O construtor dos avisos de evento reutiliza a mesma captura. O ID, a chave de
unicidade e as regras de acesso foram preservados. Não houve migration,
dependência nova, atualização em massa ou alteração dos locks existentes.

Os casos QA-NOT-01 e 08 reproduziram as manifestações no banco real. O teste
Java `QA_BUG_005_reentregaAtualizaMateriaisEObraDoResumo` falhou antes da correção
e passou depois, com a expectativa original de atualizar materiais e obra.

## Casos reais acrescentados

| Caso | Verificação |
| --- | --- |
| QA-NOT-01 | Reentrega mantém ID e unicidade, atualiza quantidade/obra e reabre leitura; conferência também no SQL |
| QA-NOT-02 | Duas leituras simultâneas concluem e preservam um único instante de leitura na precisão armazenada |
| QA-NOT-03 | Leitura primeiro, seguida de renovação concorrente: o novo evento termina não lido |
| QA-NOT-04 | Renovação primeiro, seguida de leitura concorrente: a leitura do aviso renovado é preservada |
| QA-NOT-05 | Duas alterações financeiras sobrepostas concluem, preservam um aviso por chave e o estado da segunda alteração |
| QA-NOT-06 | Falha de gravação para o Estoque durante revisão de plano reverte pedido e todos os avisos; nova tentativa após retirar a falha conclui para Gerência e Estoque |
| QA-NOT-07 | 45 avisos com a mesma data: páginas de 20/20/5, ordenação por ID, nenhum repetido/omitido, `temMais`, limites, contador do titular e leitura de outra conta recusada |
| QA-NOT-08 | Novo evento para outro perfil elegível renova o mesmo aviso com o perfil atual e permanece visível |

Nos casos concorrentes, a primeira operação precisa alcançar o gatilho de
barreira antes de iniciar a segunda. A suíte observa duas transações aguardando
locks no PostgreSQL, libera a barreira e exige HTTP 200 em ambas. Não se aceita
erro de concorrência como prova de leitura/renovação corretas.

A falha de gravação usa um gatilho que rejeita o aviso de ajuste para o Estoque,
com erro SQL de integridade. A resposta precisa ser HTTP 409 e as linhas completas
do pedido e dos avisos devem permanecer iguais às anteriores. Depois de remover
o gatilho, a mesma revisão deve concluir e produzir os dois avisos esperados.
As barreiras/falhas são fixtures de teste, removidas na finalização; não fazem
parte do schema da aplicação.

## Reprodução e evidências

```sh
node scripts/testar-integracao.mjs --suite=notificacoes
```

O executor reconstrói a imagem e prepara dados fictícios em stack própria. O
helper `scripts/testes/banco-descartavel.mjs` confere nome do banco e etiquetas
de propriedade antes de permitir SQL ou barreiras. Os casos estão em
`scripts/testes/notificacoes-persistencia.mjs`. A suíte também integra a execução
completa padrão, após a de administradores.

O resultado fica em `notificacoes/notificacoes-persistencia.json` no diretório
da execução `test-results/integracao-*`, além da cópia local em
`test-results/quality-assurance/notificacoes-persistencia.json`.
O coletor `scripts/qa/medir.mjs` inclui esses casos apenas quando o artefato existe
na mesma execução de integração selecionada.

A primeira tentativa comparava timestamps como strings; a primeira resposta
Java tinha offset/nanossegundos, e a segunda refletia a representação armazenada
em PostgreSQL. A comparação passou a converter os três valores (duas respostas
e persistência) para `timestamptz` no próprio banco. Não foi considerado defeito
de produção. Dois cenários também tentavam PATCH após aprovação, recebendo 403
pela regra existente; passaram a usar a revisão de plano com justificativa,
permitida nessa etapa. Essas falhas de fixture foram preservadas nos logs.

A imagem anterior foi reconstruída na primeira tentativa e mantida nas duas
reexecuções sem build usadas para estabilizar as fixtures. Na reprodução final
antes da correção, seis casos passaram e QA-NOT-01/08 falharam pelos dados/perfil
antigos. Nenhum resultado dessas tentativas é somado ao resultado final.

## Resultado final

**APROVADO no escopo desta rodada**: 786 testes Java em 46 classes, zero falhas,
erros ou ignorados; os oito QA-NOT passaram. A integração completa também passou
nas cinco stacks: atendimento parcial, regressão, recuperação, administradores
e notificações, incluindo 30 E2E Chromium desktop/mobile, oito QA-API, cinco
QA-ADM e os scripts HTTP existentes. Os containers/redes descartáveis foram
removidos pelo executor após validar suas etiquetas.

Cobertura Java: instruções **87,51%** (19.820/22.650), linhas **90,74%**
(1.577/1.738), ramos **75,40%** (1.658/2.199). No serviço de notificações:
**99,01% de instruções**, **94,64% de ramos**, **100% de linhas**. Essas métricas
vêm da regressão local Java, sem adicionar a cobertura dos containers ou da UI.

Snapshot versionável: [evidências antes/depois](evidencias/notificacoes-2026-10-27.json),
com casos, métricas, comandos, hashes das fontes e resultados das cinco stacks.
Logs finais: `test-results/quality-assurance/java-12.log` e `integration-6.log`.
Execução integrada: `test-results/integracao-1793103397065/resumo.json`.
O log `java-11.log` preserva a reprodução Java (785/786 aprovados).

Node, navegador local com API simulada e scanners não foram repetidos. Os
snapshots anteriores foram preservados. O total agregado do coletor usa a última
execução de cada suíte, incluindo as execuções antigas de Node/navegador local;
não é divulgado como nova execução dessas suítes. Não houve commit, push ou deploy.

QA-BUG-005 está **CORRIGIDO E VALIDADO**. O parecer global permanece
**APROVADA COM RESSALVAS** pelos limites restantes abaixo.

## Limites e próximas prioridades

Os casos demonstram persistência, unicidade e serialização nos caminhos HTTP
exercitados, que já bloqueiam a solicitação ou a notificação. Não demonstram
idempotência de chamadas diretas e simultâneas ao serviço fora desses fluxos,
nem todas as combinações entre perfis, cancelamento, ENVIO, falhas de rede e
três ou mais atores. Não foram introduzidos locks ou reentregas automáticas
com base apenas nessas possibilidades.

Paginação foi testada em conjunto estável; não se exige que página e contador
sejam um retrato atômico durante alterações simultâneas. Carga, saturação e
índices com grande volume não foram medidos. Permanecem as ressalvas de JSX,
acessibilidade, navegadores alternativos, backup/restore, histórico legado e
scanners de imagens. A próxima prioridade de cobertura é JSX e hooks.
