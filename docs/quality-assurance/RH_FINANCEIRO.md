# Planejamento, decisões e cancelamentos de RH/Financeiro — 27/10/2026

Continuação das ressalvas de compra e atendimento parcial. Acrescentados 15
cenários locais em `Frontend/UI/qa-browser/financeiro-decisoes.spec.mjs`, em desktop
e mobile: 30 execuções novas, elevando a suíte local de navegador de 234 para 264.
Também foram acrescentados dois cenários E2E reais, nos dois viewports: quatro
execuções novas, elevando essa suíte de 30 para 34.

Os testes locais montam a aplicação, componentes, hooks e cliente HTTP reais,
interceptando somente a rede. Dados fictícios e contextos isolados; datas fixadas
em 27/10/2026 no navegador. O servidor de QA não usa `.env` ou o banco habitual.
Os E2E reais usam uma stack própria com API/PostgreSQL/Nginx, descrita abaixo.

## QA-BUG-009 — Decisão confirmada é apresentada como falha de operação

**Severidade MÉDIA.** Após aprovação ou rejeição com POST bem-sucedido, o hook
consultava a lista consolidada no mesmo bloco de tratamento de erro. Se essa
consulta falhasse, retornava falha da decisão, mantinha a ação disponível e
orientava nova tentativa, embora a decisão já estivesse registrada no servidor.
Isso não comprova duplicação no banco: o backend também valida a fase da decisão.
O defeito é a informação incorreta sobre a operação e a oferta de seu reenvio.

Reprodução segura: preencher um pedido fictício no Financeiro, confirmar a
decisão com resposta HTTP 200 e recusar apenas o GET posterior de
`/atividades/pedidos-financeiros` com HTTP 503. Aprovação e rejeição foram
reproduzidas antes da correção; em ambas havia um POST confirmado e o formulário
continuava aberto como se a decisão tivesse falhado. Evidência local em
`financeiro-antes-correcao.log` e `financeiro-antes-correcao.json`, em
`test-results/quality-assurance`.

Correção em `src/hooks/useControleAtivos.js`:

- Distinguir falha do POST de falha da consulta posterior. Se o POST falha, o
  comportamento de recusa/retry permanece. Se somente a consulta falha, retornar
  sucesso da decisão e avisar que a lista completa ainda precisa sincronizar.
- Aplicar a resposta confirmada somente à análise correspondente, preservando
  as outras análises e os outros pedidos. Atualizar o status do pedido quando
  ele corresponde ao ID da decisão; agregações completas aguardam novo GET.
- Preservar e mesclar eventos de decisão sem repetir a mesma combinação de
  tipo, instante, autor e descrição. O evento de rejeição é necessário também
  para manter o registro visível ao Financeiro enquanto a consulta está falhando.
- Retirar as ações já concluídas e limpar o aviso de sincronização quando uma
  consulta completa posterior tiver sucesso, sem apagar erros de outras operações.

O aviso informa: “A decisão foi registrada, mas não foi possível atualizar a
lista completa. Os dados serão sincronizados ao retomar o painel.” A lista ainda
pode exibir agregados anteriores até essa consulta; a correção não inventa novos
saldos ou totais financeiros. Não houve alteração no backend ou nas dependências.

## Cenários locais

| Casos | Contrato verificado |
| --- | --- |
| QA-FIN-PLANO-01 | Plano incompleto impede aprovação; origem no destino, arquivada ou em manutenção não é oferecida. Transporte limitado ao saldo e compra exigindo justificativa. Envio único, bloqueio de fechamento e recusa/retry preservando o plano e corpo HTTP normalizado. |
| QA-FIN-PLANO-02 | Revisão considera a reserva do próprio pedido, preserva o mínimo já recebido e exige motivo da alteração. |
| QA-FIN-PLANO-03 | Origem inválida do plano pode ser removida; preenchimento de transporte/compra, filtros, busca e limpeza não enviam mutações. |
| QA-DEC-01, RH/Financeiro | Aprovação com POST pendente desabilita decisões concorrentes; recusa mantém a análise e retry atualiza o estado confirmado. |
| QA-DEC-02, RH/Financeiro | Rejeição exige motivo; voltar não envia. Durante o POST, retorno/Escape ficam bloqueados. Recusa conserva o texto e sucesso encerra a confirmação. |
| QA-CAN-01 | Falha de consulta de cancelamento pode ser recuperada ao reabrir; entrega concluída permanece somente leitura e orienta transporte de devolução. |
| QA-CAN-02 | RH solicita suspensão após sua primeira aprovação, com justificativa e declaração obrigatórias. Envio único e recusa conservando texto/declaração. |
| QA-CAN-03, duas condições | Financeiro confirma parecer com recusa/retry. Sem necessidade de estoque, encerra; com conferência física pendente, permanece suspenso e informa a pendência. |
| QA-CAN-04 | Cancelamento é enviado somente ao saldo vinculado, preservando a entrega concluída do atendimento original. |
| QA-DEC-03, duas decisões | Aprovação/rejeição confirmada com GET recusado informa registro concluído, mantém o histórico e retira ações de reenvio. Retomar foco sincroniza sem novo POST e remove o aviso. |
| QA-DEC-04 | Decisão do saldo vinculado com GET recusado atualiza somente essa análise; preserva entrega concluída e outro pedido existente. |

O teste inicial de 13 cenários passou com as expectativas antigas. Ao fortalecer
a assertiva para distinguir POST confirmado de falha de GET, os dois cenários
QA-DEC-03 reprovaram antes da correção, como registrado no baseline próprio.
Essas execuções não são somadas à regressão final.

## E2E reais e integração

A suíte `regressao` de `scripts/testar-integracao.mjs` executa verificações HTTP de
notificações, cancelamento/RH, operações, segurança e oito casos QA-API, além dos
E2E reais. Usa projeto Compose aleatório com label de teste, portas locais
aleatórias e PostgreSQL em tmpfs. Ao final, os contêineres e a rede são removidos;
o banco habitual não é acessado.

Os dois cenários QA-FIN-REAL criam um pedido próprio pela API com a conta de
Gerência, planejam uma compra e fazem aprovação ou rejeição pela interface do
Financeiro. **Somente o GET da lista é recusado pela rota do navegador**; o POST
chega à API real. Uma consulta direta ao histórico financeiro confirma o status
e um único evento gravado, sem passar pela interceptação da página. Reabrir o
pedido não oferece a decisão novamente; retomar foco, com o GET liberado, remove
o aviso. As evidências incluem ID fictício do pedido, tipo da decisão, status,
quantidade de eventos e de POSTs. Não incluem cookies ou senhas.

As verificações HTTP existentes incluem suspensão bloqueando aprovação,
conferência física, compra preservada, liberação de reserva correspondente,
confirmação concorrente sem dupla liberação, cancelamento só do saldo pendente,
escopo de EPI/RH e CSRF. Requests e assertivas desses scripts legados não são
convertidos em casos individuais adicionais.

## Tentativas intermediárias

- `financeiro-integracao.log`: os 30 E2E não abriram o navegador porque o Chromium
  esperado pelo Playwright não estava instalado; as etapas HTTP passaram.
- `financeiro-integracao-2.log`: usando `/usr/bin/chromium`, a stack e os 30 E2E
  anteriores passaram, antes da correção do hook.
- `financeiro-depois-correcao.log`: a aprovação passou; a rejeição exigiu preservar
  o evento recebido para continuar visível na lista financeira. O caso vinculado
  também tinha uma expectativa incorreta de fechar o pedido inteiro: o grupo
  permanece aberto quando a ação é de outra análise. A fixture foi ajustada sem
  alterar esse comportamento.
- `financeiro-depois-correcao-2.log`: seis casos direcionados aprovados em ambos
  os viewports, cobrindo aprovação, rejeição e saldo vinculado com GET recusado.
- `financeiro-integracao-3.log`: os novos E2E de rejeição consultavam a lista
  operacional, que filtra análises rejeitadas. A verificação foi corrigida para
  consultar o histórico financeiro consolidado e seus eventos, como a aplicação.

Essas falhas não são ocultadas nem contadas como regressões aprovadas. O problema
do hook é o único novo defeito de produção confirmado nesta rodada.

A tentativa local `browser-13.log` foi interrompida após falhas de montagem da
página, sem contadores de cobertura, em login e Estoque, enquanto os E2E reais
estavam em execução. Não é usada como regressão ou cobertura final; as suítes
foram separadas para a repetição. Isso não identifica por si só a causa de cada
falha de carregamento e não acrescenta defeitos de negócio ao inventário.

## Reprodução e limites

Executar as suítes sequencialmente na raiz:

```sh
ERA_TEST_CHROMIUM=/usr/bin/chromium node scripts/testar-integracao.mjs --suite=regressao
ERA_QA_BROWSER_WORKERS=2 node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/qa/medir.mjs
```

O primeiro comando usa o Chromium do sistema deste ambiente; em outros ambientes,
configurar `ERA_TEST_CHROMIUM` para o executável disponível ou instalar o navegador
compatível com o Playwright. O servidor local simulado permanece exclusivo em
`127.0.0.1:4179`; a API real usa portas aleatórias de outra stack.

Os ramos de fallback do hook modificaram o denominador da cobertura: continuam
102 fontes JS/JSX, 58 JSX e quatro hooks, mas há código novo em
`useControleAtivos.js`. Percentuais antes/depois não representam apenas aumento
de testes. A sincronização completa continua dependendo do GET; a resposta da
decisão só atualiza os campos conhecidos com segurança.

Restam falhas de sincronização após cadastro/edição/salvamento de plano,
resposta do próprio POST perdida após commit, interrupções/reentrada durante
operações e combinações de múltiplos operadores. A correção desta rodada trata
aprovação/rejeição confirmadas, não introduz idempotência geral de comandos.
Também permanecem acessibilidade sistemática, outros navegadores/dispositivos,
carga, backup/restore e scanners de imagens. Java unitário e outras stacks não
foram repetidos; camadas do build Docker podem ser reutilizadas.
Nenhum commit, push ou deploy foi realizado.

## Resultado final

**264/264 testes locais de navegador e 189/189 Node aprovados**, sem falhas,
ignorados ou retries; lint e build aprovados. São 453 casos locais. Na stack real,
**34/34 E2E e oito QA-API aprovados**, além dos scripts HTTP de notificações,
cancelamento, operações e segurança. O subtotal desta rodada é 495 casos
individuais, sem contar novamente tentativas ou requests dos scripts legados.

A coleta Istanbul recebeu **264/264 anexos**, sem erros e compatível com os
resultados Playwright. Mantém todos os 102 fontes no denominador; somente
`src/hooks/useControleAtivos.js` mudou em relação ao baseline. Os demais 101
fontes JS/JSX têm hashes idênticos. Há linhas e ramos novos no hook; os ganhos
abaixo combinam a correção e a ampliação dos cenários.

| Escopo | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| Interface completa | 1721/2834 — 60,72% | 1881/2852 — 65,95% | 2189/4802 — 45,58% |
| JSX | 1091/1816 — 60,07% | 1182/1816 — 65,08% | 1655/3399 — 48,69% |
| Quatro hooks | 246/247 — 99,59% | 264/265 — 99,62% | 175/197 — 88,83% |

| Fonte exercitado | Linhas antes | Linhas nesta rodada | Ramos nesta rodada |
| --- | --- | --- | --- |
| useControleAtivos.js | 179/179 — 100,00% | 197/197 — 100,00% | 117/132 — 88,63% |
| SepararEquipamentosModal.jsx | 1/65 — 1,53% | 64/65 — 98,46% | 78/93 — 83,87% |
| DetalhesPedidoFinanceiro.jsx | 7/7 — 100,00% | 7/7 — 100,00% | 38/47 — 80,85% |
| JustificarRejeicaoModal.jsx | 0/4 — 0,00% | 4/4 — 100,00% | 9/10 — 90,00% |
| CancelamentoPedido.jsx | 7/20 — 35,00% | 20/20 — 100,00% | 43/49 — 87,75% |
| TelaAtividades.jsx | 65/90 — 72,22% | 74/90 — 82,22% | 94/162 — 58,02% |
| planoFinanceiro.js | 5/52 — 9,61% | 50/52 — 96,15% | 63/91 — 69,23% |

QA-BUG-009 está **CORRIGIDO E VALIDADO**. O inventário acumulado passa a nove
defeitos confirmados: dois altos, cinco médios e dois baixos. O parecer continua
**APROVADA COM RESSALVAS**, conforme os limites registrados acima.

Evidência versionável: [snapshot de RH/Financeiro](evidencias/rh-financeiro-2026-10-27.json),
com reprodução anterior, 30 resultados locais novos, 16 contagens de envio único,
seis decisões com consulta recusada, quatro decisões persistidas reais, métricas
por arquivo e hashes. Os snapshots anteriores foram preservados.
Logs locais finais em `test-results/quality-assurance`: `node-11.log`, `lint-15.log`, `build-10.log`, `browser-14.log`.
Integração final: `financeiro-integracao-4.log` e
`test-results/integracao-1793126673558/resumo.json`. HTML Istanbul:
`browser-local/coverage/index.html`.
