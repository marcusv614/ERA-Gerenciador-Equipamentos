# Formulários reais — 27/10/2026

Continuação da prioridade de componentes com dados. A suíte
`Frontend/UI/qa-browser/formularios.spec.mjs` abre a aplicação real como Gerente,
com componentes, hook e cliente HTTP reais. Apenas a rede é simulada; as sementes
são fictícias e a fixture bloqueia requisições externas. Não usa a API ou o banco
habitual, nem lê `.env`.

## Defeitos reproduzidos e correções

- **QA-BUG-006, MÉDIA:** duplo clique gerava dois POSTs em equipamento e funcionário
  enquanto a API estava pendente. Os cadastros agora aguardam o retorno, guardam
  o envio com referência síncrona, desabilitam salvar/cancelar e impedem fechamento
  durante a resposta. A mesma proteção foi aplicada à obra, que usava o mesmo
  padrão. A reprodução anterior da obra terminou por timeout, sem evidência
  conclusiva da contagem; não é contada como reprodução adicional do defeito.
  Os callbacks do painel retornam sucesso/falha e os três cadastros exibem erro
  local, preservando o preenchimento para nova tentativa.
- **QA-BUG-007, BAIXA:** cadastro e edição de funcionário enviavam e-mail inválido
  apesar do input `type=email`; Enter não enviava os cadastros. Os contêineres
  passaram a formulários nativos com `onSubmit` e botões de tipos explícitos.
  A validação nativa impede o envio inválido e Enter submete o formulário válido.
  Isso não implica que o backend aceitasse o e-mail inválido.
- **QA-BUG-008, BAIXA:** um `label` envolvia vários controles, alterando o nome
  acessível do primeiro checkbox e do primeiro botão de status. `CampoFormulario`
  aceita agrupamento com `fieldset`/`legend`, usado nos responsáveis e status de
  obra e nos vínculos/situação de funcionário. Rótulos individuais são preservados.

Os logs `formularios-antes.log`, `formularios-antes-2.log` e
`formularios-antes-3.log`, em `test-results/quality-assurance`, registram as
reproduções. A primeira tentativa da obra também esbarrou no nome acessível do
checkbox; falhas de localização da fixture não são contadas como duplo envio.

## Ajustes da automação

A primeira execução após a correção foi interrompida para trocar a interação
direta no checkbox sem eventos de mouse pelo clique no texto visível, com
assertiva do estado selecionado. Na seguinte, a categoria duplicada acrescentou
uma dica ao nome acessível do campo; a fixture passou a localizar o prefixo
estável do rótulo para preencher a nova categoria. Esses ajustes são da
automação e não acrescentam defeitos ao inventário. A navegação mobile usa
`Equipe` para a tela `Funcionários`; a fixture passou a reconhecer ambos os
rótulos. Logs:
`formularios-depois.log` e `formularios-depois-2.log`. A reexecução dos quatro
cenários afetados, em desktop e mobile, aprovou **8/8** (`formularios-ajustes.log`).
A tentativa de 46 casos havia aprovado 41 e reprovado cinco por esses seletores;
ela não é somada à regressão completa nem usada como cobertura final.

## Casos

São 21 cenários de formulário em desktop e mobile (42 execuções): envio único
pendente, fechamento, recusa/retry e Enter nos três cadastros; e-mail inválido
no cadastro/edição; duplicidade de funcionário e série; quantidade inteira e
mínima conforme reservas; mudança de categoria e limpeza de atributos; seleção
de responsáveis e data padrão; edição de funcionário e vínculos de obras;
categoria aninhada com recusa/retry e guia; arquivamento de equipamento e
funcionário com cancelamento/recusa/retry; movimentação com destino, responsável,
saldo e resposta pendente; nomes acessíveis dos grupos e controles.

Mais dois cenários de foco para Financeiro/RH (quatro execuções) exercitam ramos
alcançáveis de `useControleAtivos`, sem alterar o hook ou fabricar contratos
inválidos da API. O conjunto cresce de 130 para 176 testes de navegador.

## Reprodução e limites

Na raiz:

```sh
node scripts/qa/executar.mjs --only=node,lint,build,browser
node scripts/qa/medir.mjs
```

Execução direcionada em `Frontend/UI`:

```sh
node node_modules/@playwright/test/cli.js test --config=qa-browser/playwright.config.mjs formularios.spec.mjs controle-ativos.spec.mjs --grep='QA-FORM|QA-ATIVOS-28'
```

O servidor exclusivo continua em `127.0.0.1:4179`, sem reutilização. Os testes
com API simulada verificam a interface e o corpo dos requests, não persistência,
autorização ou transações no backend. Java, integração PostgreSQL/E2E e scanners
não são repetidos nesta rodada; dependências não foram alteradas.

Restam painéis de RH/Financeiro/Estoque com dados e fluxos de manutenção,
calibração e pedidos completos;
a cobertura funcional continua parcial. Acessibilidade sistemática, outros
navegadores/dispositivos, carga, backup/restore e scanners de imagens permanecem
ressalvas. A correção pontual de nomes acessíveis não certifica acessibilidade.
Nenhum commit, push ou deploy foi realizado.

## Resultado final

**176/176 testes de navegador e 189/189 Node aprovados**, sem falhas, ignorados
ou retries. Lint e build aprovados. São 365 casos nesta rodada, sem somar
tentativas intermediárias. Os 46 casos adicionais incluem 42 execuções dos
formulários e quatro de atualização por foco do hook.

A coleta Istanbul recebeu **176/176 anexos**, sem erros e compatível com os
resultados Playwright. Mantém os 102 fontes JS/JSX, 58 JSX e quatro hooks no
denominador. As correções adicionaram código aos componentes; os denominadores
de linhas/ramos globais mudaram. O fonte do hook permanece idêntico.

| Escopo | Linhas | Ramos |
| --- | --- | --- |
| Interface completa | 1421/2834 — 50,14% | 1414/4786 — 29,54% |
| JSX | 897/1816 — 49,39% | 1104/3399 — 32,48% |
| Quatro hooks | 246/247 — 99,59% | 162/181 — 89,5% |
| useControleAtivos | 179/179 — 100% | 104/116 — 89,65% |

O hook tinha 101/116 — 87,06% ramos antes desta rodada. Os 12
ramos restantes estão listados no snapshot; alguns são guardas defensivas e
respostas após desmontagem. Os novos testes priorizam contratos alcançáveis.

Evidência versionável: [snapshot dos formulários](evidencias/formularios-2026-10-27.json),
com reproduções, seis contagens de envio único, 46 resultados novos, métricas por
arquivo e hashes. Os snapshots anteriores foram preservados. Logs finais:
`node-8.log`, `lint-8.log`, `build-7.log`, `browser-9.log`, em
`test-results/quality-assurance`. HTML: `browser-local/coverage/index.html`.

QA-BUG-006, 007 e 008 estão **CORRIGIDOS E VALIDADOS**. O inventário acumulado
passa a oito defeitos confirmados: dois altos, quatro médios e dois baixos.
O parecer global permanece **APROVADA COM RESSALVAS** nos limites acima.
