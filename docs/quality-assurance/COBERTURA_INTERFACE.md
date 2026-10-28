# Cobertura de JSX e hooks — 27/10/2026

Rodada seguinte: a ampliação específica de `useControleAtivos` está em
[controle de ativos](CONTROLE_ATIVOS.md), com 56 execuções adicionais. Os
percentuais e os 74 testes abaixo são o baseline da primeira rodada de interface.

Esta rodada trata a lacuna de medição da interface. Foram acrescentados 22
cenários, executados em desktop e mobile: **44 execuções novas**, além das 30
existentes. Não houve alteração em `Frontend/UI/src` nem novo defeito de
produção confirmado. Foram alterados ferramentas, fixtures, testes e documentos.

## Escopo e método

O servidor Vite exclusivo dos testes instrumenta todos os **102 arquivos JS/JSX
de `src`**, incluindo os **58 JSX**, antes da transformação de React/JSX. O
[instrumentador Istanbul](https://github.com/istanbuljs/istanbuljs/tree/main/packages/istanbul-lib-instrument)
registra contadores e posições no fonte original. O relatório é iniciado com
todos os arquivos zerados; um arquivo fora das importações não desaparece do
denominador. CSS, imagens, dependências e fixtures não entram nessa medição.

A fixture automática utiliza os [contextos isolados do Playwright](https://playwright.dev/docs/test-fixtures)
e coleta os contadores ao terminar cada teste. Navegação/reload preserva uma
amostra síncrona em `sessionStorage`, exclusiva daquele contexto. Antes de
mesclar, o coletor compara mapas de statements, funções e ramos com os mapas
gerados diretamente dos fontes. Divergência, anexo ausente ou coleta incompleta
reprovam a execução; uma suíte funcionalmente reprovada não é declarada aprovada
pelo fato de ter gerado cobertura.

O grupo de hooks contém os quatro arquivos `useControleAtivos.js`,
`useFiltrosPainel.js`, `useDialogo.js` e `useOperacaoEstoque.js`. Hooks definidos
em JSX, como `useAutenticacao`, continuam no grupo JSX e no total; não são
excluídos. Arquivo carregado não significa componente renderizado: a inicialização
de módulos também executa statements, enquanto funções e ramos não chamados
continuam descobertos.

A cobertura V8 dos utilitários Node permanece separada. Seus denominadores e
critérios de contagem diferem dos do Istanbul; não foram somados nem comparados
como se os percentuais representassem a mesma população.

## Resultado final

**74/74 testes de navegador aprovados**, sem retries, falhas, ignorados ou coleta
ausente; **189/189 testes Node aprovados**. ESLint, build Vite e `npm audit --json`
passaram; a auditoria reportou zero alertas para o conjunto de 200 dependências
contabilizado nessa execução. A coleta conferiu mapas originais e anexos dos
74 casos, sem erros, e foi compatível com o relatório Playwright.

| Escopo Istanbul | Fontes | Linhas cobertas / total | Ramos cobertos / total | Funções cobertas / total |
| --- | ---: | --- | --- | --- |
| Toda a interface JS/JSX | 102 | 926/2.783 — 33,27% | 799/4.710 — 16,96% | 271/1.752 — 15,46% |
| JSX | 58 | 585/1.765 — 33,14% | 617/3.323 — 18,56% | 164/1.150 — 14,26% |
| Quatro arquivos de hooks | 4 | 125/247 — 50,60% | 100/181 — 55,24% | 43/103 — 41,74% |

Nesta execução, o grafo de imports carregou todos os fontes, inclusive vários
componentes que não foram renderizados. Isso explica por que carregar todos os
arquivos não equivale a cobrir seus comportamentos. Não houve exclusão de fontes
para melhorar os percentuais.

| Arquivo de hook | Linhas | Ramos |
| --- | --- | --- |
| useControleAtivos | 58/179 — 32,40% | 43/116 — 37,06% |
| useDialogo | 32/33 — 96,96% | 24/32 — 75,00% |
| useFiltrosPainel | 26/26 — 100% | 29/29 — 100% |
| useOperacaoEstoque | 9/9 — 100% | 4/4 — 100% |

Os 100% acima se referem aos contadores instrumentados desses arquivos nos
cenários selecionados, sem afirmar cobertura de todas as combinações funcionais.
O maior próximo esforço nos hooks é `useControleAtivos`.

Snapshot versionável: [evidências da interface](evidencias/interface-2026-10-27.json),
com métricas por arquivo, resultados, versões, hashes e verificações de isolamento
do build. Logs finais: `node-6.log`, `lint-6.log`, `build-5.log`, `browser-7.log`
e `audit-3.log`, em `test-results/quality-assurance/`. A contagem desta rodada é
263 casos Node/navegador; não soma novamente as tentativas intermediárias, Java
ou integrações anteriores.

## Interações acrescentadas

| Casos | Componentes/hooks reais | Comportamento observado |
| --- | --- | --- |
| QA-JSX-01 a 03 | useFiltrosPainel | Combinação de filtros, busca normalizada, responsáveis/contato, arquivamento, depósito e manutenção/calibração parcial |
| QA-JSX-04 a 06 | useOperacaoEstoque | Duplo acionamento, sucesso, erro, nova tentativa e falha sem mensagem |
| QA-JSX-07 a 09 | useControleAtivos | Carregamento, cadastro recusado sem perda de estado, nova tentativa, resposta antiga após troca de perfil, refresh sobreposto e limpeza ao desmontar |
| QA-JSX-10 a 13 | SinoNotificacoes | Erro/retry, caixa vazia, paginação, leitura que prevalece sobre consulta antiga, navegação só após confirmação, Escape/foco e clique externo |
| QA-JSX-14 e 15 | Notificacoes | Pausa do tempo com foco, expiração após saída, limite de três avisos e avanço da fila |
| QA-JSX-16 a 22 | App, autenticação e painéis dos sete perfis | Renderização com listas vazias, navegação aplicável, Kanban, período, tema e logout com reload |

As fixtures dos hooks são pequenos componentes React que usam os hooks reais e
os serviços HTTP reais com respostas interceptadas. Os cenários dos sete perfis
usam o App e os painéis reais. A API é simulada em todos esses testes; requisições
externas são bloqueadas e rotas não simuladas nas fixtures recebem erro. Os
testes de painéis usam conjuntos vazios e não comprovam CRUD ou fluxo integrado
com PostgreSQL.

## Reprodução e artefatos

Na raiz, com dependências instaladas e Chromium disponível:

```sh
node scripts/qa/executar.mjs --only=node,lint,build,browser,audit
node scripts/qa/medir.mjs
```

Para somente navegador/cobertura, em `Frontend/UI`:

```sh
npm run test:ui
```

`ERA_TEST_CHROMIUM` seleciona o executável. O servidor usa exclusivamente
`127.0.0.1:4179`, recusa reutilizar outro servidor, não carrega `.env` e define a
API relativa de teste. A configuração Vite habitual do build não importa a
instrumentação; a verificação dos JS gerados em `dist/assets` não encontrou
`__coverage__` ou funções de contadores.

Artefatos locais em `test-results/quality-assurance/browser-local/coverage/`:
`index.html` (fonte anotado), `lcov.info`, `coverage-final.json`,
`coverage-summary.json` e `resumo.json` com os grupos e resultados por arquivo.
Os dados brutos por teste ficam nos anexos de `browser-local/artifacts/`.
O job existente de integração do CI executa a mesma configuração e já publica
`test-results/`; não foi disparado workflow remoto nesta rodada.

Foram adicionadas quatro dependências de desenvolvimento do Istanbul, com 11
entradas novas no lockfile. Nenhuma versão preexistente do lockfile foi alterada.
O ESLint passou a incluir explicitamente os módulos `.mjs` de `qa-browser`.
Não houve commit, push ou deploy.

## Tentativas intermediárias e limpeza

A coleta inicial passou nos 30 testes antigos. Na ampliação, um seletor de
combobox não encontrou o label implícito da fixture; passou a usar papel/nome
acessível. Os dois casos de avisos mobile encontraram o botão da fixture coberto
pelos próprios avisos; o botão foi reposicionado, preservando o comportamento e
as expectativas da aplicação. Não foram classificados como bugs de produção.

Interromper a execução deixou um Vite de testes na porta 4179. O processo exato
foi identificado e encerrado; `scripts/qa/executar.mjs` passou a encaminhar
SIGINT/SIGTERM ao subprocesso e a parar as etapas seguintes. Um teste com
`timeout --foreground --signal=INT` enviou SIGINT somente ao executor: a etapa
foi registrada como reprovada/interrompida e a execução seguinte conseguiu
iniciar seu próprio servidor sem reutilização da porta.

Logs preservados: `browser-5.log` (30 antigos), `browser-6-interrompido.log`,
`jsx-direcionado.log` (porta ocupada), `jsx-direcionado-2.log` (42/44 aprovados),
`jsx-toasts.log` (4/4 após ajuste) e `interrupcao-browser.log`.
Essas tentativas não são somadas ao resultado final.

## Ressalvas que permanecem

Incluir todos os arquivos no denominador encerra a lacuna de medição, mas não
significa cobertura integral dos JSX ou hooks. Priorizar as operações ainda
descobertas de `useControleAtivos`, formulários de cadastros, estados com dados
nos painéis e demais ações administrativas/financeiras. As posições descobertas
podem ser consultadas no HTML; não foi fixado um patamar artificial para aprovar
a interface inteira a partir desses cenários.

Permanecem também acessibilidade sistemática/leitor de tela, Firefox/WebKit e
dispositivos reais, desempenho com volume, backup/restore, upgrade histórico e
scanners de imagens. Java e PostgreSQL/E2E reais não foram repetidos nesta rodada;
suas últimas evidências continuam nos relatórios anteriores. O parecer global
continua **APROVADA COM RESSALVAS**.
