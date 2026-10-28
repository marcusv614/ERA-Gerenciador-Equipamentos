# Manutenção, calibração e painéis com dados — 27/10/2026

Continuação das ressalvas da rodada dos formulários. Acrescentados 18 cenários
em `Frontend/UI/qa-browser/operacao-equipamentos.spec.mjs`, executados em desktop
e mobile: 36 execuções novas, elevando o conjunto de 176 para 212.

A suíte monta a aplicação, contexto de autenticação, componentes, hooks e cliente
HTTP reais. Somente a rede é interceptada, com respostas explícitas para cada
transição e dados fictícios. Cada teste tem contexto isolado; as datas são
fixadas em 27/10/2026 pelo relógio do navegador, sem alterar o relógio do sistema.
A fixture comum bloqueia tráfego externo. Não usa `.env`, API ou banco habitual.

## Comportamentos cobertos

| Casos | Contrato observado |
| --- | --- |
| QA-MAN-01 | Motivo vazio/espaços bloqueia envio; quantidade acima do saldo ou fracionária é recusada pelo controle. Abertura envia quantidade/motivo normalizados, atualiza saldo/histórico e permanece visível ao reabrir o modal. |
| QA-MAN-02 | POST pendente impede duplo envio e fechamento por Escape. Recusa mantém motivo/quantidade; retry aplica o registro e mostra indisponibilidade quando o saldo chega a zero. |
| QA-MAN-03 | Conclusão exige descrição do serviço; cancelar não envia. Recusa preserva o texto; sucesso mostra histórico concluído e saldo liberado conforme a resposta. |
| QA-MAN-04 | Saldo integralmente reservado impede nova manutenção, preservando consulta ao histórico. |
| QA-CAL-01, duas origens | Solicitação no depósito ou na obra: um POST pendente, bloqueio de Escape, recusa/retry, payload normalizado e aplicação da fase correspondente. Ao fechar, atendimento aparece na fila. |
| QA-CAL-02 | Retirada rejeita data vazia/futura; recusa conserva etapa/preenchimento. Sucesso aplica chegada ao depósito e habilita envio. |
| QA-CAL-03 | Envio exige laboratório e previsão coerente com a data do envio. Recusa permite retry; sucesso apresenta retorno/certificado e remove opção de cancelamento. |
| QA-CAL-04 | Retorno exige certificado e datas coerentes entre envio, calibração, retorno e validade. Recusa conserva certificado; sucesso aplica histórico, remove atendimento da fila e mostra saldo disponível no painel. |
| QA-CAL-05 | Gerência registra certificado anterior, com validação de data futura, preservando obra/técnico; somente o endpoint de certificado é chamado. |
| QA-CAL-06 | Cancelamento exige motivo; voltar não envia; recusa/retry preserva localização e aplica estado cancelado. |
| QA-CAL-07, duas restrições | Lote e saldo reservado impedem solicitação de calibração sem request de mutação. |
| QA-CAL-08 | Gerência consulta histórico de atendimento em laboratório sem botões de confirmação física ou cancelamento nessa fase. |
| QA-EST-DADOS-01 | Filas para atender/enviados, busca, obra, limpeza de filtros e histórico mostram os pedidos correspondentes, com dados. |
| QA-EST-DADOS-02 | Falha em uma das consultas iniciais mostra mensagem segura, sem listas parcialmente aplicadas; retry carrega o pedido e remove o aviso. |
| QA-PAINEL-DADOS, RH/Financeiro | Pedido, materiais e decisões são exibidos nos detalhes a partir da resposta adaptada. RH pode aprovar sua análise; Financeiro sem plano tem aprovação desabilitada. Ambas as visualizações, lista e Kanban, abrem o mesmo pedido. Nenhuma mutação é enviada. |

As fases de calibração são testadas em cenários independentes com estado inicial
explícito, não como uma transação única persistida no backend. Quantidades,
localização e histórico após sucesso vêm das respostas simuladas; as assertivas
verificam sua aplicação na interface e o corpo HTTP enviado. Respostas de
manutenção e calibração seguem os contratos dos serviços existentes.

## Tentativas direcionadas

A primeira execução desktop passou em 15/18 casos. Três expectativas da fixture
estavam incorretas: ela esperava a mensagem interna do HTTP 503, embora o cliente
apresente mensagem segura para 5xx; e esperava nomes dos materiais no cartão de
Kanban de RH/Financeiro, que apresenta contagem e abre os nomes nos detalhes.

A fixture passou a conferir a mensagem segura, o retry e os detalhes do pedido
aberto também pelo Kanban. As três expectativas foram reexecutadas em desktop e
mobile, com **6/6 aprovadas**. Nenhum defeito de produção foi inferido dessas
falhas. Logs em `test-results/quality-assurance/operacao-direcionado.log` e
`operacao-ajustes.log`. Tentativas parciais não são somadas ao resultado final nem
usadas como cobertura consolidada.

A primeira regressão completa também expôs uma assertiva imprecisa na conclusão
de manutenção: o texto do resultado é exibido no parágrafo junto de
`Serviço realizado:`, e o teste buscava apenas o resultado como texto exato.
A verificação passou a conferir o conteúdo do histórico e o saldo liberado.
As duas falhas estão registradas em `browser-10.log`; essa tentativa não é
tratada como regressão aprovada. A conferência corrigida passou nos dois
viewports (`operacao-conclusao.log`, **2/2**) antes da nova regressão completa.

## Reprodução

Na raiz:

```sh
ERA_QA_BROWSER_WORKERS=2 node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/qa/medir.mjs
```

Somente a nova suíte, em `Frontend/UI`:

```sh
node node_modules/@playwright/test/cli.js test --config=qa-browser/playwright.config.mjs operacao-equipamentos.spec.mjs
```

O executor aceita `ERA_QA_BROWSER_WORKERS` de 1 a 4; sem a variável, mantém
o worker único da configuração. A regressão final usa dois workers, com
contextos, rotas e sementes isolados por teste. O reporter central confere e
mescla os anexos após cada teste.

Servidor de QA exclusivo em `127.0.0.1:4179`, sem reutilizar servidor existente.
Instrumentação Istanbul restrita ao Vite de testes. Não há novo fonte de produção,
dependência ou alteração de regra de negócio nesta rodada.

## Ressalvas restantes

A cobertura funcional continua parcial. Priorizar agora compra recebida,
atendimento parcial, separação, trânsito/recebimento e cancelamentos completos
nos painéis com dados; planejamento e decisões com falhas/retry em RH/Financeiro;
e integrações reais dessas sequências. Consulta de pedido e botões por perfil
não comprovam autorização do servidor.

Permanecem a auditoria sistemática de acessibilidade, outros navegadores e
dispositivos, carga, backup/restore e scanners de imagens. Não foi exercitada
cada combinação de arquivo/etapa/perfil; percentuais de linhas não representam
cobertura funcional completa. Java, PostgreSQL/E2E e scanners não são repetidos
nesta rodada de testes da interface; suas evidências anteriores ficam preservadas.
Nenhum commit, push ou deploy foi realizado.

## Resultado final

**212/212 testes de navegador e 189/189 Node aprovados**, sem falhas, ignorados
ou retries. Lint e build aprovados. São 401 casos nesta rodada, sem somar as
tentativas intermediárias. Os 36 casos novos foram aprovados nos dois viewports.

A coleta Istanbul conferiu **212/212 anexos**, sem erros, compatível com os
resultados Playwright. Os hashes dos 102 fontes de produção são idênticos aos do
snapshot dos formulários; denominadores completos e preservados. A melhora
resulta dos cenários novos.

| Escopo | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| Interface completa | 1421/2834 — 50,14% | 1627/2834 — 57,41% | 1803/4786 — 37,67% |
| JSX | 897/1816 — 49,39% | 1023/1816 — 56,33% | 1395/3399 — 41,04% |
| Quatro hooks | 246/247 — 99,59% | 246/247 — 99,59% | 162/181 — 89,50% |

| Fonte exercitado | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| ManutencaoEquipModal.jsx | 1/29 — 3,44% | 29/29 — 100,00% | 48/60 — 80,00% |
| CalibracaoEquipModal.jsx | 1/46 — 2,17% | 45/46 — 97,82% | 94/110 — 85,45% |
| FilaCalibracoes.jsx | 0/6 — 0,00% | 5/6 — 83,33% | 11/14 — 78,57% |
| PainelEstoque.jsx | 58/80 — 72,50% | 65/80 — 81,25% | 123/178 — 69,10% |
| DetalhesPedidoFinanceiro.jsx | 1/7 — 14,28% | 7/7 — 100,00% | 35/47 — 74,46% |
| TelaAtividades.jsx | 44/90 — 48,88% | 65/90 — 72,22% | 77/162 — 47,53% |

Não foi confirmado novo defeito de produção; o inventário continua em oito
defeitos corrigidos e validados nas rodadas anteriores. Nenhum código em
`Frontend/UI/src` ou dependência foi alterado nesta rodada. O parecer global
continua **APROVADA COM RESSALVAS**.

Evidência versionável: [snapshot operacional](evidencias/operacao-equipamentos-2026-10-27.json),
com 36 resultados novos, seis contagens de envio pendente, comparação por arquivo,
hashes dos fontes e métricas completas. Os snapshots anteriores foram preservados.
Logs finais em `test-results/quality-assurance`: `node-9.log`, `lint-11.log`, `build-8.log`, `browser-11.log`.
HTML Istanbul: `browser-local/coverage/index.html`.
