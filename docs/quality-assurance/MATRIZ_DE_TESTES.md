# Matriz de rastreabilidade

Requisitos inferidos da implementação e dos documentos do repositório. Uma linha
representa uma família funcional, não cada combinação de campo, endpoint ou tela.
`B/` = `Backend/API/src/test/java/br/com/era/api/`; `U/` = `Frontend/UI/tests/`;
`I/` = `scripts/testes/`; `E/` = `Frontend/UI/e2e/`; `Q/` = `Frontend/UI/qa-browser/`.
Casos parametrizados serão contados individualmente nos relatórios executados.

| ID | Funcionalidade / requisito identificável | Risco | Casos e automação planejada |
| --- | --- | --- | --- |
| F01 | Login, CSRF e mensagens de erro | P0: acesso indevido | B/controller/AutenticacaoControllerTests; I/seguranca; E/fluxos; Q/acesso: vazio, senha inválida, 403, rede, envio único e token |
| F02 | Senha temporária, logout e revogação | P0: sessão antiga ativa | B/config/ValidacaoSessaoFilterTests; B/service/UsuarioServiceTests; I/seguranca; Q/acesso: troca e comparação |
| F03 | Recuperar administrador e confirmar e-mail | P0: tomada de conta | B/service/RecuperacaoContaServiceTests; B/config/SegurancaRecuperacaoTests; I/recuperacao; Q/acesso: fragmento, confirmação, falhas |
| F04 | Contas, perfis, bloqueio e eventos de segurança | P0: privilégio ou segredo exposto | B/service/UsuarioServiceTests e AuditoriaSegurancaServiceTests; U/administracaoUsuarios; tabela B/config/QaMatrizAutorizacaoTests |
| F05 | Funcionários, vínculos e arquivamento | P1: usuário com vínculo inconsistente | B/service/FuncionarioServiceTests e QaFuncionarioServiceTests; B/dto/QaValidacaoDtoTests; U/novoPedido e classificações |
| F06 | Obras, responsáveis, conclusão e arquivamento | P1: perda de rastreabilidade | B/service/QaObraServiceTests: conclusão × saldo × pedido; reativação, repetição, escopo e cadastro |
| F07 | Categorias e atributos configuráveis | P1: dados inválidos/500 | B/service/QaCategoriaEquipamentoTests e B/controller/QaCategoriaHttpTests; I/qualidade QA-API-01 a 03: persistência, duplicidade, slug, tipos, chave, campos nulos |
| F08 | Cadastro, edição e exclusão de equipamentos | P1: saldo e identidade alterados | B/service/EquipamentoServiceTests; B/dto/QaValidacaoDtoTests: 0/1, tamanhos e nulos |
| F09 | Catálogo, depósito, localização e histórico | P0: acesso fora da obra/setor | B/service/PerfisTstRhTests; U/localizacaoEquipamentos, documentosAuditoria e identificação; I/seguranca |
| F10 | Solicitar materiais como Técnico/TST/Gerência | P0: material/perfil forjado | B/service/PedidoMateriaisTests e PedidoGerenciaTests; U/novoPedido; E/fluxos: criação real |
| F11 | Editar pedidos e preservar autoria | P1: reserva/plano descartados | B/service/EdicaoPedidoTests e PlanejamentoAtendimentoTests; U/edicaoSolicitacao |
| F12 | Aprovar ou rejeitar por Gerência/RH | P0: decisão duplicada ou de outro setor | B/service/FluxoFinanceiroTests e PerfisTstRhTests; I/operacoes; Q matriz de políticas |
| F13 | Planejamento e revisão financeira | P0: compra/reserva duplicada | B/service/PlanejamentoAtendimentoTests, PedidosFinanceirosTests; U/planoFinanceiro e pedidosFinanceiros |
| F14 | Transporte direto e distribuição | P0: origem/destino ou saldo errado | B/service/PlanejamentoAtendimentoTests e SolicitacaoServiceTests; U/pedidoMovimentacao |
| F15 | Compra, aquisição, nota e entrada no estoque | P0: aquisição sem autorização | B/service/FluxoFinanceiroTests e PlanejamentoAtendimentoTests; validar-atendimento-parcial.mjs |
| F16 | Atendimento parcial e pedido remanescente | P0: duplicação/perda de quantidade | B/service/PlanejamentoAtendimentoTests; U/atendimentoParcial; validar-atendimento-parcial.mjs |
| F17 | Separação, trânsito e recebimento | P0: conclusão antes de entrega | B/service/SolicitacaoServiceTests e PedidoMateriaisTests; U/operacaoEstoque e acompanhamentoSolicitacao; I/operacoes |
| F18 | Solicitar/confirmar cancelamento auditável | P0: liberar reserva duas vezes | B/service/CancelamentoSolicitacaoTests; U/cancelamento; validar-cancelamento-rh.mjs e I/operacoes |
| F19 | Manutenção parcial/total e conclusão | P1: unidade bloqueada disponível | B/service/ManutencaoEquipamentoTests; B/controller/ManutencaoErrosHttpTests; I/operacoes; U/manutencaoEquipamento |
| F20 | Calibração, retirada, envio, retorno e certificado | P1: equipamento ficticiamente disponível | B/service/CalibracaoServiceTests; B/controller/CalibracaoErrosHttpTests; I/operacoes; U/calibracoes |
| F21 | Vistorias e auditoria de técnico/TST | P1: sobrescrever versão/concluir saldo incorreto | B/service/AuditoriaTecnicoServiceTests; B/controller/AuditoriaErrosHttpTests; U/vistoriaTecnico; I/operacoes |
| F22 | Inventário histórico por data | P1: inventar ou corromper retrato histórico | B/service/QaInventarioHistoricoTests: futuro, ausência, cópia, data anterior, nomes especiais e legado; I/qualidade QA-API-04 a 06 |
| F23 | Consultar relatórios por setor/obra/funcionário | P0: exposição de outro setor | B/service/RelatorioPedidoServiceTests; U/exportacaoAuditoria; E/fluxos e I/seguranca |
| F24 | CSV, impressão/PDF e documentos operacionais | P1: XSS/fórmula ou documento incorreto | U/documentosAuditoria, exportacaoAuditoria, ordemAtendimento; E/fluxos; novos casos de fronteira CSV |
| F25 | Notificações por destinatário e leitura | P1: notificar outra conta/perder aviso | B/service/NotificacaoMovimentacaoServiceTests; U/notificacoes e titulosNotificacao; validar-notificacoes-por-perfil.mjs |
| F26 | Pesquisa, período, status e Kanban | P2: pedido oculto/incorreto | U/filtrosEstoque, pesquisaSolicitacoes, rolagemKanban; E/fluxos; novos casos de status/data/classificação |
| F27 | Painéis por perfil, tema e responsividade | P1: comando indevido/acesso inutilizável | E/fluxos: sete perfis × desktop/mobile; Q/acesso: formulário a 390/1440 px |
| F28 | Modal, teclado, foco e feedback acessível | P2: bloqueio de navegação | Q/modal: Escape, Tab/Shift+Tab, foco de retorno, modal empilhado e rolagem; Q/acesso: labels, alertas, foco e idioma |
| F29 | Validação e contrato HTTP de erros | P1: 500 ou segredo na resposta | B/controller/*ErrosHttpTests, ExcecoesSegurasTests e LogsSegurosTests; B/dto/QaValidacaoDtoTests; QaCategoriaHttpTests |
| F30 | Autorização, CSRF, CORS e deny-all | P0: elevação de privilégio | B/config/QaMatrizAutorizacaoTests: perfil × rota × método, anônimo, CSRF ausente/inválido, CORS hostil e headers; I/seguranca |
| F31 | Migrations, infraestrutura e dependências | P0: regressão de schema/segurança | B/HistoricoMigracoesTests; build/lint; I com Flyway/PostgreSQL; npm audit/OSV; revisão Compose/Nginx/CI |

## Casos transversais

- Concorrência real: disputa de última unidade, confirmação de cancelamento e versão
  de vistoria nos scripts de integração existentes; mocks não comprovam locking.
- Desempenho controlado: medir tempo de carregamento local do formulário com API
  simulada e dez GET sequenciais reais em I/qualidade QA-API-08. Não extrapolar
  para throughput de produção ou percentis representativos de carga.
- Dependências/imagens: executar scanners disponíveis; rede ou daemon indisponíveis
  são bloqueio, nunca resultado "sem vulnerabilidades".
- Regressão: executar a suíte existente inteira após adicionar testes. Os testes
  que reproduziram os defeitos mantêm suas expectativas após a correção autorizada.

## Complementos e inventário executável

- Rodada de `useControleAtivos`: Q/controle-ativos QA-ATIVOS-01 a 27 (ID 21 em
  Financeiro e RH), 28 cenários nos dois projetos = 56 execuções adicionais.
  Complementa F05/F06/F07/F08/F14/F15/F17/F26 com estado após recusa/retry,
  contratos HTTP do cliente, vínculos, duplicidades, planejamento, carregamento,
  refresh/visibilidade e respostas secundárias. Resultados em `CONTROLE_ATIVOS.md`.

- Rodada de interface em 27/10: Q/interacoes QA-JSX-01 a 15 e Q/paineis
  QA-JSX-16 a 22, nos dois projetos (44 execuções adicionais), complementam
  F17/F25/F26/F27/F28 com filtros, operação duplicada, estado/cleanup de hooks,
  leitura/paginação/timers e os sete perfis. Q/cobertura instrumenta todos os
  JS/JSX de produção; relatório e limites em `COBERTURA_INTERFACE.md`.

- Rodada de notificações em 27/10: `I/notificacoes-persistencia` acrescenta oito
  casos reais de F25: resumo/obra/perfil atualizados na reentrega, dupla leitura,
  leitura/renovação nas duas ordens, alterações financeiras concorrentes,
  rollback após falha de gravação e paginação SQL. O teste
  `QaNotificacaoRessalvasTests.QA_BUG_005_reentregaAtualizaMateriaisEObraDoResumo`
  preserva a reprodução Java. Resultados em `NOTIFICACOES_PERSISTENCIA.md`.

- Rodada posterior de 27/10: `I/administradores-concorrentes` acrescenta cinco
  casos de F04/F05/F30, com PostgreSQL real e sobreposição observada: desativações,
  rebaixamentos, disputa mista, arquivamento contra rebaixamento e proteção
  sequencial do último administrador no arquivamento. `QaFuncionarioServiceTests`
  acrescenta a reprodução de QA-BUG-004 e um caso positivo com outro ADMIN ativo.
  Casos, correções e resultados em `CONCORRENCIA_ADMINISTRADORES.md`.

- Retomada de 27/10/2026 (contagens e resultados em `CONTINUACAO_RESSALVAS.md`):
  `QaUsuarioGestaoTests` complementa F02/F04/F05 com conflitos de login/vínculo,
  funcionários ausentes/arquivados, proteção sequencial do último administrador,
  mudanças de perfil, revogação de sessão, bloqueio e redefinição de senha.
  `QaEquipamentoRessalvasTests` complementa F08/F09/F15/F19/F20 com bloqueios de
  edição/arquivamento/exclusão, snapshots, catálogo por perfil, histórico restrito
  por obra/setor e cópia independente de atributos em compras.
  `QaNotificacaoRessalvasTests` complementa F18/F25 com limites da paginação,
  contadores, falha de consulta, contas inativas, destinatários por etapa,
  deduplicação, retorno ao depósito e reabertura da leitura na reentrega.
  As contagens de 949 abaixo permanecem referentes à avaliação de 26/10.

- `QaRecursosRecuperacaoTests`: vetor SHA-256 conhecido, limite inclusivo de
  tentativas, retorno nulo, configuração de SMTP, montagem de mensagem e falha
  sem vazamento de dados. Não usa servidor SMTP externo.
- I/qualidade QA-API-07: arquivamento de obra antes/depois da conclusão e
  restauração persistidos no PostgreSQL descartável.
- Os 75 mapeamentos HTTP, com método, rota completa e arquivo de origem, estão
  em `evidencias/endpoints.json`.
- Casos JUnit individuais e resultados finais: `evidencias/casos-java.json`.
  Casos Node/TAP e Playwright: artefatos indicados em `RELATORIO_EXECUCAO.md`.
- Total local planejado e implementado: 911 casos individuais, mais 30 E2E
  integrados e oito novos casos HTTP = 949 casos quantificáveis. Scripts HTTP
  legados têm outras verificações sequenciais, sem contagem artificial por assert.
  O resultado final pode ser consultado no relatório de execução.

## Critério de cobertura funcional

"Parcialmente verificada" exige pelo menos um teste executado da família com
assertiva de comportamento. "Integralmente verificada" exigiria todos os casos e
integrações planejados executados com sucesso. A existência de código/teste ou uma
rota permitida na cadeia de segurança não comprova o fluxo de negócio completo.
Resultados e quantidades finais estão consolidados no relatório de execução.

## Resultado final da rastreabilidade

As 31 famílias tiveram pelo menos uma verificação de comportamento executada.
F07/F22 tiveram defeitos confirmados e depois correções validadas com as mesmas
expectativas, inclusive em PostgreSQL real. F27 foi exercitada nos 30 E2E reais
desktop/mobile, incluindo os sete perfis. F31 teve build, scanners de dependências,
checksums e aplicação das 48 migrations em três bancos novos.

Todos os 949 casos individuais quantificados passaram, além dos scripts HTTP
legados. Não há família declarada integralmente coberta: permanecem combinações
de entradas, telas e estados e os tipos de teste NÃO EXECUTADOS registrados em
`RELATORIO_EXECUCAO.md`. A cobertura de famílias com alguma evidência é 31/31;
isso não deve ser divulgado como "100% da aplicação testada".

## Formulários reais — retomada de 27/10/2026

`Q/formularios.spec.mjs`, com 21 cenários em desktop/mobile:

| Família | Casos adicionais |
| --- | --- |
| F05 | QA-FORM-DUP/RETRY/ENTER funcionário, EMAIL, FUNC, EDIT-FUNC, EMAIL-EDIT, ARQUIVAR-FUNC: validação, envio, preservação e vínculos |
| F06 | QA-FORM-DUP/RETRY/ENTER obra, OBRA, GRUPOS: responsáveis, data padrão, status e nomes acessíveis |
| F07 | QA-FORM-CATEGORIA: duplicidade, falha/retry, seleção e guia |
| F08 | QA-FORM-DUP/RETRY/ENTER equipamento, EQUIP, EDICAO, ARQUIVAR-EQUIP: série, quantidade, reservas e arquivamento |
| F14 | QA-FORM-MOVER: destino, responsável, saldo, envio pendente e retry |
| F09/F12/F13 | Q/controle-ativos.spec.mjs, QA-ATIVOS-28: foco atualiza disponibilidade e pedidos em Financeiro/RH |

Componentes, hook e cliente HTTP reais com API simulada. Escopo e limites em
[formulários reais](FORMULARIOS_REAIS.md); não substitui integração PostgreSQL.

## Operação dos equipamentos e painéis com dados — 27/10/2026

`Q/operacao-equipamentos.spec.mjs`: 18 cenários, desktop/mobile, com aplicação
real e rede simulada. Ver [operação dos equipamentos](OPERACAO_EQUIPAMENTOS.md).

| Família | Casos adicionais |
| --- | --- |
| F19 | QA-MAN-01 a 04: abertura, saldo/motivo, envio pendente, recusa/retry, cancelamento da conclusão, histórico e liberação de saldo |
| F20 | QA-CAL-01 a 08: solicitação em duas origens, retirada, envio, retorno/certificado, certificado anterior, cancelamento, duas restrições e limites da Gerência |
| F09/F17 | QA-EST-DADOS-01/02: filas e filtros com dados, histórico, falha de carga sem listas parciais e retry |
| F12/F13 | QA-PAINEL-DADOS RH/Financeiro: detalhes/materiais/decisões, disponibilidade dos botões e abertura pelo Kanban, sem mutações |

## Compra recebida e atendimento parcial — 27/10/2026

`Q/compras-parciais.spec.mjs`: 11 cenários em desktop/mobile, 22 execuções novas.
Detalhes em [compra recebida e atendimento parcial](COMPRAS_ATENDIMENTO_PARCIAL.md).

| Família | Casos adicionais e evidências |
| --- | --- |
| F15 | QA-COMPRA-01 a 03: nota/série/quantidade, envio único, recusa/retry, entrada de seis e saldo de quatro após recarga |
| F16 | QA-PARCIAL-01 a 05: indisponibilidade sem entrada, seleção/motivo, divisão e pedido remanescente, cancelamento local, origens distintas e material sem saldo |
| F17 | QA-EST-FLUXO-01/02: envio recusado/retry e recebimento recusado após trânsito sem repetição da saída |
| F13/F15/F16/F17 | `scripts/validar-atendimento-parcial.mjs`: reexecutado em API/PostgreSQL reais descartáveis, com reservas, rollback, sequência 6+1+3, autorização e CSRF |

## Planejamento e decisões de RH/Financeiro — 27/10/2026

`Q/financeiro-decisoes.spec.mjs`: 15 cenários, 30 execuções desktop/mobile.
Detalhes em [RH/Financeiro](RH_FINANCEIRO.md).

| Família | Casos e evidências adicionais |
| --- | --- |
| F12 | QA-DEC-01/02 em RH e Financeiro: aprovação, rejeição justificada, envio único e recusa/retry |
| F13 | QA-FIN-PLANO-01 a 03: transporte/compra, origem inválida, revisão, reserva própria e mínimo já recebido |
| F18 | QA-CAN-01 a 04: falha de carga, entrega concluída somente leitura, suspensão pelo RH, parecer financeiro com/sem estoque e saldo vinculado |
| F12/F13 | QA-DEC-03/04: POST confirmado com GET recusado, análise vinculada, aviso de sincronização e retomada sem nova mutação; QA-BUG-009 |
| F12/F13 | E/fluxos QA-FIN-REAL aprovação/rejeição: quatro execuções novas com API/PostgreSQL reais, consulta da lista interceptada e decisão persistida conferida |
| F18/F04 | Regressão HTTP de cancelamento/RH, operações, segurança e oito QA-API; stack real de regressão reexecutada |

## Sincronização após plano e edição — 27/10/2026

Sete cenários novos em `Q/financeiro-decisoes.spec.mjs`, 14 execuções nos dois
viewports; dois cenários novos em `E/fluxos.spec.mjs`, quatro execuções reais.
Detalhes em [sincronização financeira](SINCRONIZACAO_FINANCEIRA.md).

| Família | Casos e evidências adicionais |
| --- | --- |
| F11/F13 | QA-SYNC-01: plano novo, revisão aprovada, edição Financeiro/RH e saldo vinculado confirmados com GET recusado, dados preservados e um envio; QA-BUG-010 |
| F11 | QA-SYNC-02: PATCH realmente recusado preserva dados e permite retry em Financeiro/RH |
| F11/F13 | QA-SYNC-REAL: POST do plano e PATCH da edição reais, GET interceptado, campos persistidos e um evento ALTERACAO, retomada/reload sem novo envio |
| F12 | Regressão dos casos de decisão e consulta recusada da rodada de QA-BUG-009 |

## Fechamento técnico do piloto — 27/10/2026

| Família | Verificação e situação nesta tentativa |
| --- | --- |
| F01 a F31 | 786 Java, 189 Node, lint/build reexecutados e aprovados; 278 navegador preservados por hashes dos 102 fontes, sem nova execução |
| F31 | npm audit sem vulnerabilidades e OSV com 102 bibliotecas sem alertas |
| F31 | QA-BKP-01: dump custom, alteração de dados fictícios, restauração integral/sequências e retomada HTTP; implementação com sintaxe verificada, execução BLOQUEADA pelo Docker |
| F31 | Integração completa e Trivy das duas imagens locais: BLOQUEADOS pelo Docker; resultados anteriores não contados como novos |
| F01/F27/F31 | Smoke e condições operacionais do destino: PENDENTES de ambiente e responsáveis |

Critérios e evidências em [fechamento do piloto](FECHAMENTO_PILOTO.md).
