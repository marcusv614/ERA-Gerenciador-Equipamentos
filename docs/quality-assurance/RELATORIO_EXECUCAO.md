# Relatório de execução

Data: 26/10/2026, America/Manaus. Base inspecionada:
`8236c47fad30bb58dd7c2dc42d144a5430ceab2c`. O Git estava limpo no início.
Nenhum commit ou push foi realizado. A autorização posterior para corrigir bugs
foi aplicada somente aos dois defeitos reproduzidos.

## Ambiente e método de contagem

Linux x86_64, Node 24.19.0, npm 11.17.0, JDK 21.0.11 escolhido explicitamente pelo
executor, Maven Wrapper 3.9.16, Chromium do sistema, JaCoCo 0.8.15. O Java padrão
da máquina era 26 e não foi alterado. Dependências existentes foram reaproveitadas.

Contagens abaixo usam a última execução completa de cada suíte, sem somar
reexecuções, requests HTTP ou as mesmas classes novamente executadas no build
Docker. Casos parametrizados/dinâmicos JUnit são contados individualmente.
O Node fornece sua própria contagem, que inclui módulos de teste legados com
assertivas no nível do arquivo. Não há inferência de número de assertivas.

## Resultado local após as correções

| Suíte | Executados | Aprovados | Reprovados | Ignorados | Resultado |
| --- | ---: | ---: | ---: | ---: | --- |
| JUnit/Mockito/MockMvc, 43 classes | 692 | 692 | 0 | 0 | APROVADO |
| Node, 27 arquivos | 189 | 189 | 0 | 0 | APROVADO |
| Chromium, API simulada, desktop/mobile | 30 | 30 | 0 | 0 | APROVADO |
| Total local | 911 | 911 | 0 | 0 | 100% de aprovação |

| Integração adicional | Executados | Aprovados | Reprovados | Resultado |
| --- | ---: | ---: | ---: | --- |
| E2E Chromium contra API/PostgreSQL/Nginx reais | 30 | 30 | 0 | APROVADO |
| Casos HTTP novos QA-API-01 a 08 | 8 | 8 | 0 | APROVADO |
| Total de casos individuais finais | 949 | 949 | 0 | 100% de aprovação |

São 491 casos novos no total: 483 locais e oito HTTP. Outros scripts HTTP legados
também passaram, mas suas assertivas não foram convertidas artificialmente em
casos individuais. Os três cenários de ambiente (atendimento parcial, regressão
e recuperação) passaram. Nenhum caso das suítes selecionadas ficou bloqueado ou
ignorado na execução final; impedimentos iniciais foram resolvidos.

A avaliação acrescentou 412 casos Java, 41 Node e 30 de navegador local: 483
casos individuais novos neste subtotal. Os testes preexistentes foram mantidos.
Na execução anterior às correções havia 687 Java (685 aprovados, 2 reprovados),
189 Node e 30 navegador: 904/906 aprovados. Os cinco casos Java adicionais testam
a compatibilidade do novo armazenamento de responsáveis.

Evidências: `test-results/quality-assurance/java-4.log`, `frontend.tap`,
`frontend.lcov`, `browser-4.log`, `comandos.json`,
`test-results/quality-assurance/browser-local/results.json` e
`Backend/API/target/surefire-reports/`. O snapshot resumido versionável fica em
`evidencias/metricas.json`; a reprodução inicial em `evidencias/antes-correcao.json`.

O perfil Java usa `maven.test.failure.ignore=true` para gerar o relatório JaCoCo
mesmo quando há defeitos; o executor lê os XMLs Surefire e retorna falha se houver
tests reprovados. O texto `BUILD SUCCESS` isolado não foi tratado como aprovação
dos testes. A execução pós-correção tem zero falhas nos XMLs.

## Build, análise estática e dependências

- Build da API: APROVADO, incluindo os 692 testes.
- ESLint da interface: APROVADO após corrigir a fixture adicionada.
- Build Vite: APROVADO; não significa teste de todos os componentes.
- `npm audit --json`: APROVADO, zero alertas reportados para 189 dependências.
- OSV: consulta concluída para 102 bibliotecas Maven de execução, zero alertas.
  Essas consultas verificam versões nas bases consultadas, não explorabilidade,
  infraestrutura ou ausência futura de vulnerabilidades.
- `git diff --check` e análise sintática dos novos scripts: APROVADOS.

## Cobertura efetivamente medida

| Medida | Cobertos / total | Percentual | Escopo |
| --- | ---: | ---: | --- |
| Instruções Java | 18.677 / 22.599 | 82,65% | Classes principais instrumentadas pelo JaCoCo |
| Ramificações Java | 1.466 / 2.191 | 66,91% | Decisões instrumentáveis pelo JaCoCo |
| Linhas Java | 1.511 / 1.720 | 87,85% | Código principal, não testes |
| Linhas JS | 938 / 978 | 95,91% | 29 módulos `.js` carregados pelos testes Node |
| Ramos JS | 895 / 1.063 | 84,20% | Mesmos módulos V8 |

Há 44 arquivos `.js` e 58 arquivos `.jsx` em `src`. Os 15 módulos JS não carregados
e todos os JSX estão fora do denominador V8. Não foi medida cobertura global de
renderização React, nem cobertura JaCoCo dos testes dentro dos containers.
Não foi calculada cobertura de caminhos completos: o número de combinações de
estado e autorização é muito maior que a contagem de instruções.

## Integração com PostgreSQL e E2E

Inicialmente BLOQUEADA: Docker inativo, socket ausente e início exigindo senha
administrativa. O usuário iniciou o Docker e autorizou o uso de dados fictícios.
A suíte foi retomada com banco tmpfs, rede e portas próprias. Os containers
habituais `era-erp-*` não são alvos das fixtures nem da limpeza.

Resultado: APROVADO nas três stacks, com imagens reconstruídas do código atual.
Evidências em `test-results/integracao-1793064495341/resumo.json`,
`navegador/resultados.json`, logs de cada API e
`test-results/quality-assurance/integration-3.log`. PostgreSQL executado: 16.15.
Flyway validou e aplicou 48 migrations até v52 em cada um dos três bancos novos.

| Verificação HTTP | Quantidade reportada pelo script | Resultado |
| --- | ---: | --- |
| Atendimento parcial, compras, reservas, recebimento e notificações | 224 | APROVADO |
| Notificações/setores e fluxo EPI completo | 176 | APROVADO |
| Cancelamento, confirmação concorrente e liberação única | 96 | APROVADO |
| Operações, calibração, manutenção, vistoria e última unidade concorrente | 66 | APROVADO |
| Segurança, CSRF, CORS, sessões, autoria e dados inválidos | 209 | APROVADO |
| Categorias, inventário histórico e arquivamento (oito casos novos) | 37 | APROVADO |
| Recuperação com SMTP fictício, expiração, uso único e rollback | 43 | APROVADO |
| Soma dos contadores reportados | 851 | APROVADO |

851 é um limite inferior de requisições verificadas, pois não inclui todas as
sessões auxiliares, preparação de fixtures e requisições dos testes de navegador.
Os 30 E2E passaram sem retry, nos sete perfis, temas claro/escuro, desktop/mobile,
Kanban, criação de pedidos, erros, filtros, CSV e impressão/PDF. Aprovações e
entregas completas são validadas por HTTP; nem todas são clicadas pela UI.

Os logs das três APIs passaram na verificação de ausência dos segredos fictícios
definidos pela suíte. Todos os containers/redes de teste foram removidos; os três
containers habituais continuaram saudáveis. Os dados tmpfs descartados podem ser
recriados pelas fixtures, não são backup dos dados habituais.

## Acessibilidade, usabilidade e desempenho

Verificações executadas no navegador local: labels, foco inicial, alternância de
visibilidade da senha, campos obrigatórios, feedback de erro, envio duplicado,
recuperação e confirmação de senha, modal empilhado, Tab/Shift+Tab, Escape,
retorno do foco e restauração de rolagem. Acesso testado em 1440×1000 e 390×844.
Isso não equivale a certificação WCAG: contraste sistemático, leitor de tela,
árvore acessível de todos os painéis e navegadores alternativos não foram auditados.

`domContentLoadedEventEnd`: 4.006,30 ms no desktop e 2.108,10 ms no mobile, uma
amostra em cada projeto, Vite local, Chromium e API simulada. São observações de
smoke, não benchmark de produção, percentis confiáveis ou comparação entre
dispositivos físicos. As amostras da última execução estão em
`evidencias/metricas.json`. Não foi criado SLA artificial para esse teste.

Na API real descartável, dez GET sequenciais de categorias variaram de 17,85 a
28,48 ms, p50 amostral de 20,56 ms e p95 amostral de 28,48 ms. O conjunto é muito
pequeno para representar capacidade/SLA. Evidência:
`test-results/quality-assurance/qualidade-api.json`.

## Não executados e limites finais

- Firefox/WebKit, leitores de tela e auditoria WCAG completa: não disponíveis na
  estratégia instalada; a verificação de acessibilidade foi parcial.
- Trivy, Semgrep e ZAP: executáveis não encontrados. Não foi atribuída aprovação
  à segurança dos pacotes do sistema das imagens ou a DAST/SAST completos.
- Carga prolongada, saturação, indisponibilidade de infraestrutura, backup/restore
  e upgrade de base legada representativa: NÃO EXECUTADOS; não substituídos por
  smoke local, mocks ou aplicação das migrations em banco novo.
- Workflow GitHub: adicionada a execução da suíte local de UI ao job existente,
  YAML validado localmente. A execução remota do workflow não foi disparada.

## Reproduzir

Na raiz, usando JDK 21, Docker ativo e dependências já instaladas:

```sh
node scripts/qa/executar.mjs
node scripts/qa/medir.mjs --snapshot
```

Para somente as suítes locais, sem Docker:

```sh
node scripts/qa/executar.mjs --only=java,node,lint,build,browser
```

`ERA_QA_JAVA_HOME` permite selecionar outro caminho de JDK 21;
`ERA_TEST_CHROMIUM` permite selecionar Chromium. Os testes de navegador usam a
porta loopback 4179 e recusam reutilizar outro servidor nessa porta. A suíte
original usa `scripts/testar-integracao.mjs`, que nunca carrega `.env` e valida
etiquetas antes de remover os próprios containers descartáveis.

Logs brutos e artefatos gerados são ignorados pelo Git. Não compartilhar XMLs
Surefire completos sem revisão: suas propriedades podem incluir informações do
ambiente. Os snapshots em `evidencias/` contêm apenas resultados e inventário.
