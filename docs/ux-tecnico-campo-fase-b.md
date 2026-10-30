# Fase B — UX/UI do Técnico de Campo

Escopo: apresentação e interação do usuário `TECNICO`. Base de comparação: commit `05ffff1`.

## Entrega

- Digitar uma quantidade válida seleciona o material. Seleção explícita, aumento, redução e remoção continuam disponíveis.
- Entradas vazias, fracionárias, negativas e acima do limite permanecem no campo com mensagem próxima, `aria-invalid` e descrição acessível. Revisão e envio ficam bloqueados até a correção. Não há remoção silenciosa de sinais ou separadores.
- Os mesmos controles de quantidade aparecem no catálogo e na revisão. Mantidos os limites existentes: solicitação até 2147483647 e devolução até o saldo disponível.
- Cards destacam pedido, estado real, obra, materiais, quantidades e recebimento disponível. Materiais adicionais, identificações, data, solicitação de origem, solicitante, observação, registros, justificativas e cancelamento ficam acessíveis em detalhes.
- Pedidos organizados em **Para receber**, **Em andamento** e **Pedidos anteriores**. São agrupamentos visuais dos estados existentes; nenhuma transição foi adicionada.
- Recebimento abre o modal compartilhado, mostrando o atendimento e suas quantidades atuais. Um atendimento parcial não usa a quantidade do pedido original.
- Envio e recebimento possuem proteção síncrona contra acionamentos repetidos durante o processamento. Falhas preservam o contexto para nova tentativa explícita. O foco retorna ao pedido após o sucesso.
- Botões de quantidade e ações principais com 48 px, textos maiores, nomes longos com quebra, erros acessíveis e estilos derivados exclusivamente dos tokens compartilhados. Temas claro/escuro e preferência por movimento reduzido preservados.
- Falhas de consulta oferecem atualização explícita; estados vazios diferenciam ausência de obra, catálogo, materiais para devolução e histórico.

## Isolamento e regras preservadas

A nova experiência depende simultaneamente de `usuario.perfil === 'TECNICO'`, `perfilPainel === 'TECNICO'` e `!modoAdministrador` em `PainelTecnico.jsx`.

O TST continua com o formulário, catálogo de EPI, cards e recebimento originais. As consultas administrativas continuam com a apresentação anterior e sem ações de escrita. “Técnico de Campo” é apenas texto da interface.

Os componentes novos recebem dados e callbacks do controlador existente. Não fazem chamadas de API. Reutilizados `EstruturaModal`, `useDialogo`, `CancelamentoPedido`, agrupamentos, construção dos payloads e atualização periódica existentes.

Nenhum arquivo de backend, banco, serviços da API, autorização, Kanban ou outro dashboard foi alterado. A confirmação continua usando exclusivamente a chamada existente de conclusão, sem corpo adicional, baixa extra ou movimento local de estoque. O servidor permanece responsável por permissões, recebimento parcial, estoque e rastreabilidade.

## Arquivos

| Arquivo em `Frontend/UI/` | Alteração |
| --- | --- |
| `src/components/tecnico/PainelTecnico.jsx` | Isolamento, integração da apresentação e validação, proteção de processamento e modal |
| `src/components/tecnico/PainelTecnico.module.css` | Ajustes condicionados a `data-tecnico-campo='true'` |
| `src/components/tecnico/QuantidadeMaterialTecnico.jsx` | Novo controle acessível reutilizado no catálogo e revisão |
| `src/components/tecnico/CartaoSolicitacaoTecnico.jsx` | Novos componentes `CartaoSolicitacaoTecnico` e `PedidosTecnicoCampo` |
| `src/components/tecnico/ConfirmarRecebimentoTecnico.jsx` | Novo conteúdo de confirmação usando o modal existente |
| `src/components/tecnico/TecnicoCampo.module.css` | Estilos locais com tokens existentes |
| `src/utils/quantidadeTecnicoCampo.js` | Validação da entrada visual com limite recebido do painel |
| `tests/quantidadeTecnicoCampo.test.js` | Casos válidos, entradas inválidas e limites operacionais |
| `qa-browser/tecnico-campo.spec.mjs` | Fluxos do Técnico, preservação do TST e consultas administrativas |
| `qa-browser/tecnico-campo.config.mjs` | Execução isolada desses testes em desktop e mobile |

Além desses arquivos, este relatório foi criado em `docs/ux-tecnico-campo-fase-b.md`.

## Validação

| Execução | Resultado |
| --- | --- |
| `npm --prefix Frontend/UI run lint` | Aprovado, sem erros |
| `npm --prefix Frontend/UI run build` | Aprovado; aviso de bundle grande registrado abaixo |
| `npm --prefix Frontend/UI test` | **192/192 aprovados**, incluindo 3 novos testes de validação |
| `test:ui -- --config=qa-browser/tecnico-campo.config.mjs --workers=1` | **28/28 aprovados**, sem retries ou skips: 14 cenários em desktop e mobile |
| `test:ui:dashboards -- --workers=1` | **28 cenários aprovados**: 27 passaram na execução completa; Estoque desktop passou na repetição isolada após falha de inicialização |
| `test:e2e -- --sem-build --suite=atendimento-parcial` | **Aprovado**, 224 requisições verificadas com banco e API descartáveis |
| `test:e2e -- --sem-build --suite=regressao` | Etapas de API aprovadas; navegador: **18 aprovados e 20 falhas preexistentes**, detalhadas abaixo |
| Comparação com imagem anterior da UI | Reproduziu **as mesmas 20 falhas**; 2 cenários adicionais passaram. Comparação por nome do teste e projeto |

Os cenários novos verificam seleção por digitação, erros próximos ao campo, limites, revisão, payload, observação, proteção contra acionamento repetido, falha e nova tentativa, grupos com os nove estados reais, detalhes, justificativa e confirmação de cancelamento, recebimento parcial, foco contido/retorno/Escape, recusa de autorização, atualização do estado com modal aberto, carregamento, erro de consulta, ausência de dados, temas, áreas de toque e larguras de 320, 390 e 640 px. Também verificam pedido/devolução/recebimento do TST e leitura administrativa de Técnico/TST sem escrita.

Na API real, a regressão aprovou os fluxos de EPI, autorizações, cancelamento, concorrência, rastreabilidade e segurança. A suíte de qualidade HTTP passou em 8/8 casos. A suíte de atendimento parcial verificou entregas sucessivas de 6 + 1 + 3 unidades, rejeição de confirmação por usuário sem autorização, retorno ao depósito e rejeição de confirmação repetida. A imagem da UI de testes foi reconstruída; a API de testes existente foi reutilizada, sem alterações em fontes de backend.

### Falhas amplas e comparação com a versão anterior

Todos os 20 casos E2E com falha param na mesma asserção de `e2e/fluxos.spec.mjs:19`: o teste procura o título **Solicitações** dentro da região de solicitações; o conteúdo atual dessa região apresenta **Pedidos da equipe**. Isso impede que esses casos avancem para suas verificações posteriores de Gerência, RH, Financeiro, relatórios e Kanban.

A imagem anterior em uso (`sha256:03f22268ebca808ea960ac10457909dd4fc22cf61c92cc1335ab5673f8286e3d`) foi executada em outro projeto Docker descartável, com o mesmo preparador de dados e os testes existentes, sem editar a aplicação ou os testes. Os 20 nomes de casos/projetos com falha coincidem exatamente com os da imagem nova. Essas falhas são anteriores à Fase B; a suíte ampla continua vermelha e não é apresentada como aprovada.

Os testes reais de login, painel, logout e criação de pedido de **Técnico e TST**, em desktop e mobile, passaram. Nenhum teste existente foi alterado.

### Evidências locais

- Suíte específica: `test-results/tecnico-campo/results.json` e capturas em `test-results/tecnico-campo/artifacts/`.
- Regressão visual dos sete perfis: `test-results/refatoracao-ui/`; repetição isolada do Estoque: `test-results/tecnico-campo-regressao-repeticao/results.json`.
- Atendimento parcial: `test-results/integracao-1793366980367/resumo.json`.
- Regressão com imagem nova: `test-results/integracao-1793366805451/navegador/resultados.json`.
- Comparação com imagem anterior: `test-results/integracao-1793367098298/navegador/resultados.json`.
- Os projetos Docker descartáveis foram removidos ao final, sem limpar volumes ou serviços do ambiente habitual.

As execuções iniciais do navegador instrumentado tiveram falhas intermitentes de inicialização, com página vazia e ausência de cobertura. A execução final específica passou inteira com um worker e diagnóstico de recursos, sem repetição automática de casos. Na regressão visual geral, Estoque desktop teve a mesma falha de inicialização e passou na repetição isolada. Não houve mudança de código da aplicação ou dos testes existentes para contornar essas ocorrências.

## Ambiente local

A interface local foi reconstruída e atualizada com `docker compose -f compose.yaml -f compose.ngrok.yaml up -d --no-deps --build ui`. Somente o contêiner `ui` foi recriado; API e banco foram preservados.

## Limites da validação

- Chromium desktop e emulação mobile não substituem testes em aparelhos físicos, especialmente sob sol, rede instável, teclado virtual e uso com luvas.
- Navegação por teclado, semântica acessível e associação dos erros foram verificadas automaticamente. Não houve avaliação manual com TalkBack, VoiceOver ou NVDA nem pesquisa de usabilidade com profissionais de campo.
- Verificação matemática dos pares de tokens usados nos novos textos, estados e ações: contraste mínimo 5,00:1 no tema claro e 6,55:1 no escuro. Isso não constitui certificação integral de acessibilidade da aplicação.
- O build mantém o aviso de bundle JavaScript acima de 500 kB. Dividir o bundle exige outro escopo arquitetural.
- A suíte local geral `test:ui` não foi executada integralmente: foram selecionadas a suíte específica e a regressão existente das dashboards. As demais suítes de formulários, recuperação, carga, backup e análise de segurança não foram reexecutadas nesta etapa, pois esses módulos não foram alterados.
- As verificações E2E posteriores ao título antigo permanecem sem validação por esses 20 casos. Atualizar os seletores da suíte ampla é uma pendência separada; os testes existentes foram preservados.
