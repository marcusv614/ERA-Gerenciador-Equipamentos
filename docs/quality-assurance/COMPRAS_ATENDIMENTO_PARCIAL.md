# Compra recebida e atendimento parcial — 27/10/2026

Continuação das ressalvas dos painéis operacionais. Acrescentados 11 cenários em
`Frontend/UI/qa-browser/compras-parciais.spec.mjs`, executados em desktop e mobile:
22 execuções novas, elevando a suíte de navegador de 212 para 234 testes.

A aplicação, autenticação, componentes, hooks e cliente HTTP são reais; a rede é
simulada com dados fictícios e contextos isolados. Datas fixadas em 27/10/2026
no navegador. A fixture comum bloqueia tráfego externo. O estoque habitual e o
`.env` não são usados. Não houve alteração em `Frontend/UI/src` ou dependências.

## Cenários da interface

| Casos | Comportamento verificado |
| --- | --- |
| QA-COMPRA-01, duas categorias | Ferramenta manual dispensa série; OTDR exige série. Nota é obrigatória, quantidade vazia não envia e o controle limita a quantidade inteira ao saldo pendente. Corpo HTTP normalizado é conferido. |
| QA-COMPRA-02 | Duplo clique com POST pendente envia uma vez; campos/cancelar ficam bloqueados e Escape não fecha. Recusa conserva quantidade/nota; retry fecha somente após sucesso. |
| QA-COMPRA-03 | Entrada de seis de dez atualiza compras pendentes. Recarregar consulta novamente o estado remoto; o pedido mostra seis recebidas/quatro pendentes e nova entrada começa com o saldo de quatro. |
| QA-PARCIAL-01 | Compra autorizada sem entrada não oferece origem disponível para separar; motivo preenchido não libera envio sem saldo. |
| QA-PARCIAL-02 | Motivo vazio/espaços e quantidade zero impedem envio. Controle limita seleção às unidades recebidas e inteiras. |
| QA-PARCIAL-03 | Envio único pendente, Escape/cancelar bloqueados e recusa preservando seleção/motivo. Resposta de sucesso divide seis/quatro, mostra envio separado e pendência, preservando outro pedido existente. |
| QA-PARCIAL-04 | Cancelar ajuste não faz mutação; reabrir restaura seleção inicial e descarta o rascunho cancelado. |
| QA-PARCIAL-05 | Corpo do ajuste distingue origem autorizada na obra e entrada de compra no depósito. Material sem entrada é incluído com zero origens. Recusa remota é apresentada sem perder o ajuste. |
| QA-EST-FLUXO-01 | Recusa do envio conserva pedido separado; retry aplica trânsito e move o pedido para a fila de enviados. |
| QA-EST-FLUXO-02 | Retorno ao depósito: trânsito bem-sucedido seguido de conclusão recusada preserva o avanço. Retry chama somente conclusão; sucesso aparece no histórico, sem repetir a saída. |

Quantidade, origem e estado depois do sucesso vêm das respostas explícitas da
fixture. Os testes conferem sua aplicação na interface, o request enviado e a
consulta posterior ao recarregar; não usam um banco simulado para alegar
persistência real. A persistência e as reservas foram verificadas separadamente
pela suíte HTTP abaixo.

## Integração com API e PostgreSQL reais

Reexecutada a suíte existente `scripts/validar-atendimento-parcial.mjs` por meio de
`scripts/testar-integracao.mjs --suite=atendimento-parcial`, com construção das
imagens atuais, projeto Compose aleatório, portas locais aleatórias e PostgreSQL
em tmpfs. Nenhum banco habitual ou `.env` é acessado. **A stack passou**; a limpeza
removeu seus contêineres e rede ao final.

As verificações reais incluem:

- Compra de seis de dez, atendimento de seis e saldo pendente de quatro, com
  materiais originais e vínculo de pedido preservados.
- Atendimentos sucessivos de seis, um e três; compra e recebimento sem duplicação.
- Reservas, revisão recusada com rollback e liberação correta dos saldos.
- Operações recusadas por perfil e CSRF; tentativas acima da entrada ou com
  equipamento não autorizado não aplicam o ajuste.
- Início do atendimento sem duplicação, histórico financeiro consolidado e
  atendimento parcial de EPI/TST.
- Notificações de envio/recebimento, leitura persistente e isolamento entre contas.

Relatório: `test-results/integracao-1793123715227/resumo.json`; log da execução em
`test-results/quality-assurance/compras-integracao.log`. A contagem de requests ou
assertivas desse script legado não foi convertida em casos individuais. Trata-se
de **uma stack aprovada**, separada dos testes Node e de navegador. As outras
stacks de integração e os 30 E2E anteriores não foram reexecutados nesta rodada.
Testes de navegador com rede simulada e testes HTTP reais são evidências
complementares; esta rodada não constitui um único fluxo UI/API ponta a ponta.

## Reprodução

Na raiz:

```sh
ERA_QA_BROWSER_WORKERS=2 node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/testar-integracao.mjs --suite=atendimento-parcial
node scripts/qa/medir.mjs
```

Somente a nova suíte em `Frontend/UI`:

```sh
node node_modules/@playwright/test/cli.js test --config=qa-browser/playwright.config.mjs compras-parciais.spec.mjs
```

O servidor exclusivo de navegador continua em `127.0.0.1:4179`, sem reutilização.
A execução direcionada desktop passou em **11/11 casos**, sem ajustes nas
expectativas após execução (`compras-direcionado.log`). A regressão final usa dois
workers, com contextos e rotas isolados. Coleta Istanbul e resultados completos
são conferidos antes de registrar o snapshot.

## Ressalvas restantes

Priorizar planejamento, aprovação, rejeição e cancelamentos completos com
falhas/retry nos painéis de RH/Financeiro; depois, ampliar o fluxo de navegador
contra API/PostgreSQL reais para compra/atendimento parcial e suas interrupções.
Os cenários de erro presentes não simulam toda perda de conexão possível,
concorrência entre múltiplos operadores ou resposta perdida após commit.

Permanecem acessibilidade sistemática, outros navegadores/dispositivos, carga,
backup/restore e scanners de imagens. Java unitário e scanners não foram repetidos
nesta rodada; o build Docker pode reutilizar camadas. O parecer global permanece
**APROVADA COM RESSALVAS**. Nenhum commit, push ou deploy foi realizado.

## Resultado final

**234/234 testes de navegador e 189/189 Node aprovados**, sem falhas, ignorados
ou retries; lint e build aprovados. São 423 casos locais nesta rodada. A stack
real de atendimento parcial também passou, sem transformar seus requests e
assertivas em casos individuais adicionais.

A coleta Istanbul recebeu **234/234 anexos**, sem erros, compatível com os
resultados Playwright. Os 102 fontes, 58 JSX e quatro hooks continuam no
denominador; seus hashes são idênticos ao baseline operacional. A cobertura
melhorou pelos testes novos, sem alteração do código de produção.

| Escopo | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| Interface completa | 1627/2834 — 57,41% | 1721/2834 — 60,72% | 1954/4786 — 40,82% |
| JSX | 1023/1816 — 56,33% | 1091/1816 — 60,07% | 1507/3399 — 44,33% |
| Quatro hooks | 246/247 — 99,59% | 246/247 — 99,59% | 162/181 — 89,50% |

| Fonte exercitado | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| RegistroCompraEstoque.jsx | 0/18 — 0,00% | 18/18 — 100,00% | 23/25 — 92,00% |
| AtendimentoParcialModal.jsx | 0/26 — 0,00% | 26/26 — 100,00% | 18/21 — 85,71% |
| PedidoOperacional.jsx | 4/15 — 26,66% | 14/15 — 93,33% | 49/57 — 85,96% |
| PainelEstoque.jsx | 65/80 — 81,25% | 79/80 — 98,75% | 149/178 — 83,70% |
| atendimentoParcial.js | 0/22 — 0,00% | 22/22 — 100,00% | 14/23 — 60,86% |
| operacaoEstoque.js | 31/33 — 93,93% | 31/33 — 93,93% | 59/81 — 72,83% |

Não foi confirmado novo defeito de produção. O inventário permanece em oito
defeitos corrigidos nas rodadas anteriores. O parecer continua **APROVADA COM
RESSALVAS**, conforme os limites acima.

Evidência versionável: [snapshot de compras e parciais](evidencias/compras-parciais-2026-10-27.json),
com 22 resultados novos, quatro contagens de envio único, comparação por arquivo,
hashes e resultado da integração real. Snapshots anteriores preservados.
Logs finais em `test-results/quality-assurance`: `node-10.log`, `lint-12.log`, `build-9.log`, `browser-12.log`.
HTML Istanbul: `browser-local/coverage/index.html`.
