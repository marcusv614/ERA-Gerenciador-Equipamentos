# Ampliação de useControleAtivos — 27/10/2026

Continuação da prioridade identificada na medição anterior: o hook tinha
58/179 linhas cobertas (32,40%) e 43/116 ramos (37,06%). Esta rodada acrescenta
**28 cenários**, executados em desktop e mobile (**56 execuções novas**), aos
74 testes de navegador anteriores. Os 102 fontes continuam no denominador da
medição Istanbul; não foram removidos arquivos ou ramos.

Não houve alteração em `Frontend/UI/src`, dependências ou regras de negócio.
Não foi confirmado novo defeito de produção. As alterações são fixtures,
testes e documentação, preservando o trabalho das rodadas anteriores.

## Comportamentos exercitados

| Casos | Evidência de comportamento |
| --- | --- |
| QA-ATIVOS-01 a 11 | Cadastro/edição de obras, equipamentos, categorias e funcionários; exclusão e arquivamento. A primeira chamada é recusada e todas as coleções devem permanecer iguais; o retry aplica a resposta, preserva outros registros e limpa o erro. Método, rota e corpo HTTP são conferidos. |
| QA-ATIVOS-11 | Edição de funcionário remove o nome antigo das obras e adiciona o novo somente às obras selecionadas, após confirmação da API. |
| QA-ATIVOS-12 | Série duplicada normalizada, nome duplicado e e-mail duplicado impedem mutação HTTP. |
| QA-ATIVOS-13 | Transporte direto exige equipamento existente, responsável e quantidade dentro do saldo; falha remota preserva pedidos e sucesso inclui o pedido retornado. |
| QA-ATIVOS-14 a 20 | Aprovação, rejeição com motivo, trânsito, recebimento, edição, planejamento e novo pedido: recusa preserva estado; sucesso aplica retorno sem apagar outros pedidos. O erro do planejamento é propagado ao chamador. |
| QA-ATIVOS-21, dois perfis | Financeiro e RH recarregam a lista adaptada após decisão, edição e planejamento, em vez de substituir a lista pela resposta simples. RH filtra funcionários pelos pedidos e equipamentos pelo setor. |
| QA-ATIVOS-22 | Busca local, histórico existente/ausente, resumo, filtragem/ordenação de técnicos e atualização recebida de equipamento; não fazem requisições de mutação. |
| QA-ATIVOS-23 | Falha inicial encerra o carregamento e mostra erro, sem aplicar coleções parcialmente carregadas. |
| QA-ATIVOS-24 | Falha em uma das consultas de refresh preserva as duas listas; a próxima tentativa bem-sucedida aplica ambas. |
| QA-ATIVOS-25 | Polling/foco não consultam com documento oculto; voltar à visibilidade dispara atualização. |
| QA-ATIVOS-26 | Recebimento confirmado mantém sucesso e dados atuais se a consulta secundária dos equipamentos falhar. |
| QA-ATIVOS-27 | Série em branco pode ser identificada pelo servidor e funcionário sem e-mail pode ser cadastrado. |

O ID 21 possui um caso por perfil, totalizando 28 cenários. A fixture
`qa-browser/controle-ativos.jsx` monta o hook real em React, permite acionar seus
métodos e apresenta estado/retorno para observação pelos testes. Não usa setters
internos nem substitui o hook por mock. Os serviços HTTP e normalizadores são os
reais; somente as respostas de rede são interceptadas. Dados são fictícios e
requisições externas continuam bloqueadas pela fixture comum.

Isso testa o contrato de estado do hook com respostas HTTP simuladas; não prova
validações, transações ou autorização do backend, nem o comportamento completo
dos formulários que chamam esses métodos.

## Reprodução

Na raiz:

```sh
node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/qa/medir.mjs
```

Somente a nova suíte, em `Frontend/UI`:

```sh
node node_modules/@playwright/test/cli.js test --config=qa-browser/playwright.config.mjs controle-ativos.spec.mjs
```

O servidor exclusivo de QA continua em `127.0.0.1:4179`, sem `.env`, sem API
habitual e sem reutilizar servidor já existente. A instrumentação permanece
restrita à configuração Vite de teste.

## Tentativas intermediárias

A primeira execução direcionada aprovou 44/46 casos. O teste de edição de
equipamento comparava o corpo HTTP com o primeiro argumento (ID), em vez do
objeto de edição; a expectativa da fixture foi corrigida. Nenhuma expectativa de
produção ou de teste preexistente foi alterada. A segunda execução aprovou 46/46
e a execução dos casos adicionais de refresh/opcionais aprovou 10/10.

Logs em `test-results/quality-assurance/`: `ativos-direcionado.log`,
`ativos-direcionado-2.log` e `ativos-refresh.log`. São tentativas distintas e
não são somadas ao resultado final. A cobertura parcial dessas execuções
direcionadas não substitui a cobertura da regressão completa.

## Resultado final e comparação

**130/130 testes de navegador e 189/189 Node aprovados**, sem falhas, ignorados
ou retries; lint e build também passaram. São 319 casos executados nesta rodada.
A coleta Istanbul conferiu os mapas dos fontes e os anexos de 130/130 casos, sem
erros e compatível com os resultados Playwright.

| Medida de useControleAtivos | Baseline anterior | Após ampliação |
| --- | --- | --- |
| Linhas | 58/179 — 32,40% | 179/179 — 100% |
| Ramos | 43/116 — 37,06% | 101/116 — 87,06% |
| Statements | 78/270 — 28,88% | 270/270 — 100% |
| Funções | 23/83 — 27,71% | 83/83 — 100% |

Os contadores completos estão nos snapshots. O conjunto de fontes e seus hashes
são idênticos ao baseline:
a melhora veio dos testes adicionais, com denominadores preservados.

No conjunto de quatro arquivos de hooks: linhas **246/247 (99,59%)**, ramos
**158/181 (87,29%)**, funções **103/103 (100%)**. Na interface inteira: linhas
**1.090/2.783 (39,16%)** e ramos **887/4.710 (18,83%)**. JSX permanece em
**585/1.765 linhas (33,14%)**, reforçando a prioridade dos componentes/formulários.

Evidência versionável: [snapshot de controle de ativos](evidencias/controle-ativos-2026-10-27.json),
com comparação, hashes dos mesmos fontes, métricas por arquivo e lista dos ramos
restantes. Logs finais: `node-7.log`, `lint-7.log`, `build-6.log` e `browser-8.log`,
em `test-results/quality-assurance/`. O HTML permanece em
`browser-local/coverage/index.html`. O baseline da primeira rodada de interface
foi preservado em `evidencias/interface-2026-10-27.json`.

Restam 15 alternativas instrumentadas no hook: guardas de arrays da carga
inicial, falha inicial após desmontagem, refresh de Financeiro/RH, resposta de
refresh após desmontagem e fallbacks de responsáveis/séries. Alguns ramos
defensivos exigem analisar a possibilidade de alcance com os contratos reais,
antes de criar fixtures artificiais apenas para alcançar 100% de ramos.

## Limites

Cobrir linhas ou funções não comprova todas as combinações de autorização,
entradas e transições possíveis. Ainda devem ser priorizados os formulários de
cadastro/edição reais, painéis com dados e as decisões que continuarem descobertas
no relatório HTML. Mantêm-se as ressalvas de acessibilidade sistemática, outros
navegadores/dispositivos, carga, backup/restore e scanners de imagens.

Java, PostgreSQL/E2E reais e npm audit não foram repetidos nesta rodada; não houve
mudança de dependências. Suas evidências anteriores foram preservadas. Não houve
commit, push ou deploy. O parecer global continua **APROVADA COM RESSALVAS**.
