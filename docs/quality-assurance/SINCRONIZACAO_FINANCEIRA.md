# Sincronização após salvar plano e editar solicitação — 27/10/2026

Continuação de [RH/Financeiro](RH_FINANCEIRO.md), priorizando as ressalvas de
sincronização após gravações confirmadas. Acrescentados sete cenários locais em
`Frontend/UI/qa-browser/financeiro-decisoes.spec.mjs`, nos dois viewports: 14
execuções. Acrescentados dois cenários com API e banco reais em
`Frontend/UI/e2e/fluxos.spec.mjs`, também em desktop e mobile: quatro execuções.

## QA-BUG-010 — Plano ou edição confirmados apresentados como falha

**Severidade MÉDIA.** O salvamento do plano e a edição aguardavam a consulta
consolidada no mesmo tratamento de erro da gravação. Se o POST/PATCH era
confirmado e somente o GET posterior falhava, o formulário continuava aberto
como se a alteração tivesse sido recusada, oferecendo nova tentativa.
Não foi comprovada duplicação no banco; o defeito está na informação e na
possibilidade de reenviar uma operação já confirmada.

Antes da correção, foram reproduzidos cinco fluxos: plano novo, revisão de plano
aprovado e edições de Financeiro, RH e saldo vinculado. Em todos, a resposta de
gravação foi confirmada uma vez e o formulário permaneceu aberto. As recusas
reais de PATCH continuaram permitindo retry e preservando o texto preenchido.

A primeira fixture da revisão tentava clicar em um atalho desabilitado porque
o plano já comprava toda a quantidade. Essa tentativa não comprova o defeito.
A fixture foi corrigida para preencher diretamente a compra; a reprodução
separada da revisão então confirmou o mesmo problema. As duas tentativas estão
preservadas em `test-results/quality-assurance/sincronizacao-antes.json` e nos
logs `sincronizacao-antes.log` e `sincronizacao-revisao-antes.log`.

Correção limitada a `Frontend/UI/src/hooks/useControleAtivos.js`: extraído o
tratamento de sincronização das decisões para uma função compartilhada por
aprovação/rejeição, salvamento do plano e edição. Quando a gravação foi
confirmada, uma consulta recusada gera aviso específico (“O plano foi salvo” ou
“As alterações foram salvas”) e mantém a resposta na análise correspondente.
O formulário conclui o envio; reabri-lo conserva o plano ou a edição confirmados.
As recusas da própria gravação conservam o comportamento de erro e retry.

Outras análises e pedidos são preservados. Eventos conhecidos são mesclados;
o status do grupo só é atualizado quando seu ID corresponde à análise alterada.
Agregados, saldos e materiais consolidados completos aguardam o próximo GET.
Ao retomar o foco com a consulta disponível, a lista sincroniza e o aviso é
removido sem nova gravação. Não houve alteração do backend ou de dependências
nesta rodada.

## Contratos verificados

| Casos | Contrato |
| --- | --- |
| QA-SYNC-01, cinco fluxos | POST/PATCH confirmado, GET recusado: formulário encerra, aviso distingue sincronização pendente, reabertura conserva dados, somente um envio. Recuperação por foco remove o aviso sem reenviar. |
| QA-SYNC-01, saldo vinculado | Alteração só da análise vinculada; quantidade protegida continua desabilitada e outro pedido permanece disponível. |
| QA-SYNC-02, Financeiro/RH | PATCH realmente recusado conserva preenchimento e mensagem de erro; nova tentativa explícita bem-sucedida encerra o formulário. São dois envios esperados. |
| QA-SYNC-REAL, plano/edição | Gravação real pela interface e bloqueio apenas do GET da lista. Consulta direta confirma campos persistidos e um evento ALTERACAO; recuperação e reload conservam o resultado, sem novo POST/PATCH. |

Os casos locais usam aplicação, componentes, hook e cliente HTTP reais com rede
simulada e dados fictícios. A integração usa API/PostgreSQL/Nginx descartáveis,
projeto Compose aleatório, portas locais aleatórias e banco em tmpfs. O contexto
de request direto não passa pelas interceptações da página. O banco habitual e
`.env` não são usados; a stack é removida ao terminar. Evidências de alterações
reais contêm ID fictício, operação, método, status e contagens, sem credenciais.

## Execução interrompida

A primeira regressão local completa desta rodada (`browser-15.log`) foi
interrompida durante a conversa, depois de resultados parciais aprovados.
Na retomada, não havia processo ativo nem resultado final dessa execução.
Ela foi registrada como interrompida e não fornece a cobertura final. Node,
lint, build e integração real já aprovados foram preservados; somente a etapa
de navegador foi repetida. Uma segunda tentativa (`browser-16.log`) foi
interrompida para fortalecer a assertiva do histórico consolidado. O teste isolado confirmou que o cliente HTTP
já normaliza `decisoes` como `eventosFinanceiros`, preservando o histórico sem
outra alteração de produção. Evidência: `sincronizacao-historico-reproducao.log`,
um caso aprovado. Essa interrupção também não compõe a regressão final.
A repetição usa o mesmo comando Playwright, com dois workers e limite de 30 minutos no lançador local, em vez dos 15 minutos do
executor geral. O lançador fica nos artefatos locais, sem alteração da aplicação.

## Reprodução e ressalvas

Executar as suítes sequencialmente na raiz:

```sh
ERA_TEST_CHROMIUM=/usr/bin/chromium node scripts/testar-integracao.mjs --suite=regressao
ERA_QA_BROWSER_WORKERS=2 node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/qa/medir.mjs
```

O caminho do Chromium corresponde a este ambiente. Não executar a suíte local e
os E2E reais ao mesmo tempo neste ambiente; as duas rodadas usam recursos de
navegador. Os scripts HTTP legados de notificações, cancelamento, operações e
segurança são verificados, sem contar cada request como teste individual.

Esta correção exige resposta bem-sucedida da gravação. Resposta do próprio
POST/PATCH perdida após commit permanece uma ressalva: não foi implementada
idempotência geral. Restam cadastro, interrupção/reentrada durante operações,
combinações entre operadores, acessibilidade sistemática, outros navegadores,
carga, backup/restore e scanners de imagens. Java unitário e outras stacks
não foram repetidos nesta rodada; camadas Docker podem ser reutilizadas.
Nenhum commit, push ou deploy foi realizado.

## Resultado final

**278/278 testes locais de navegador e 189/189 Node aprovados**, sem falhas,
ignorados ou retries; lint e build aprovados. São 467 casos locais. Na stack real,
**38/38 E2E e oito QA-API aprovados**, além dos scripts HTTP de notificações,
cancelamento/RH, operações e segurança. Subtotal: 513 casos individuais, sem
contar novamente tentativas ou requests dos scripts legados.

Os 264 casos locais e 34 E2E da rodada anterior foram mantidos. As 14 execuções
locais novas incluem dez alterações confirmadas com consulta recusada, todas com
um envio; as quatro execuções E2E novas confirmaram campos persistidos e um único
evento ALTERACAO no banco em cada pedido.

Istanbul recebeu **278/278 anexos**, sem erros e compatível com os resultados.
Continuam 102 fontes no denominador; somente o hook mudou em relação ao snapshot
de RH/Financeiro, com hashes idênticos nos demais 101 fontes. A extração da função
compartilhada também altera o código instrumentado; comparar percentuais levando
em conta os denominadores abaixo.

| Escopo | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| Interface completa | 1881/2852 — 65,95% | 1946/2857 — 68,11% | 2301/4802 — 47,91% |
| JSX | 1182/1816 — 65,08% | 1223/1816 — 67,34% | 1745/3399 — 51,33% |
| Quatro hooks | 264/265 — 99,62% | 269/270 — 99,62% | 175/197 — 88,83% |

| Fonte exercitado | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| useControleAtivos.js | 197/197 — 100,00% | 202/202 — 100,00% | 117/132 — 88,63% |
| EditarSolicitacaoModal.jsx | 1/44 — 2,27% | 38/44 — 86,36% | 87/136 — 63,97% |
| SepararEquipamentosModal.jsx | 64/65 — 98,46% | 64/65 — 98,46% | 78/93 — 83,87% |
| DetalhesPedidoFinanceiro.jsx | 7/7 — 100,00% | 7/7 — 100,00% | 38/47 — 80,85% |

QA-BUG-010 está **CORRIGIDO E VALIDADO**. O inventário acumulado passa a dez
defeitos confirmados: dois altos, seis médios e dois baixos, corrigidos nas
respectivas rodadas. O parecer permanece **APROVADA COM RESSALVAS**.

Evidência versionável: [snapshot de sincronização](evidencias/sincronizacao-financeira-2026-10-27.json),
com reprodução anterior, casos novos, contagens de envio, campos persistidos,
cobertura e hashes. Snapshots anteriores preservados. Logs locais finais em
`test-results/quality-assurance`: `node-12.log`, `lint-17.log`, `build-11.log`, `browser-17.log`.
Integração: `sincronizacao-integracao.log` e
`test-results/integracao-1793132175643/resumo.json`. HTML Istanbul:
`test-results/quality-assurance/browser-local/coverage/index.html`.
