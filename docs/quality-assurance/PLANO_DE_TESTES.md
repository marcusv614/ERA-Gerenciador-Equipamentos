# Plano de testes

## Escopo e requisitos

Avaliação do repositório atual, preservando alterações preexistentes e credenciais.
Após a reprodução dos defeitos, o usuário autorizou explicitamente a correção de
bugs. Foram delimitadas duas correções de produção: rejeitar campo nulo de
categoria e preservar nomes dos responsáveis em novos inventários históricos.
Requisitos são derivados dos DTOs, serviços, controles de acesso, componentes e
documentação do próprio projeto; não há especificação externa de aceite.
O inventário funcional e a rastreabilidade estão em `MATRIZ_DE_TESTES.md`.

Arquitetura: React 19/Vite 8/Axios, API Java 21/Spring Boot 4/Spring Security,
JPA/Hibernate, PostgreSQL 16, Flyway, Nginx e Docker Compose. A aplicação usa sessão
HTTP e CSRF; há sete perfis. Integrações externas: SMTP para recuperação,
cliente de e-mail para compras, impressão/PDF e CSV no navegador. Deploy usa GHCR
e Traefik; CI usa GitHub Actions, OSV, npm audit e Trivy.

## Riscos e prioridade

Retomada de 27/10/2026: ampliar primeiro as decisões de acesso e integridade nos
três serviços destacados no relatório: contas, equipamentos e notificações.
Executar toda a regressão Java com JaCoCo e registrar evidência separada da
integração anterior. A fila de ressalvas e os resultados atuais estão em
`CONTINUACAO_RESSALVAS.md`. Testes de serviço com mocks não encerram ressalvas de
concorrência real, rollback transacional ou paginação SQL.

Rodada posterior: concorrência do último administrador em PostgreSQL com barreira
controlada, incluindo desativação, rebaixamento e arquivamento de funcionário
vinculado. Reproduzir antes da correção, preservar assertivas de integridade,
verificar mensagem de negócio, estado persistido e auditoria; executar regressão
Java e integração completa após as correções. Ver `CONCORRENCIA_ADMINISTRADORES.md`.

Rodada de notificações: oito casos HTTP/PostgreSQL com barreiras observadas,
paginação com datas empatadas, falha de gravação para múltiplos destinatários e
reentrega após mudança de materiais/obra/perfil. Exigir unicidade, estado lido
compatível com a ordem das operações e rollback integral antes de repetir sem a
falha. Ver `NOTIFICACOES_PERSISTENCIA.md`. Próxima prioridade: medir JSX e hooks.

Rodada de interface: instrumentação de todos os JS/JSX antes da transformação no
Vite de teste, baseline zerada, comparação dos mapas originais e anexos por caso.
Exercitar hooks no React, respostas antigas, desmontagem/polling, notificações,
painéis dos sete perfis e regressão dos testes anteriores. Distinguir cobertura
Istanbul de navegador da cobertura Node e manter fora do build de produção.
Resultados e próximos casos em `COBERTURA_INTERFACE.md`.

Rodada específica de `useControleAtivos`: verificar cada mutação com recusa
seguida de sucesso, preservação das coleções e dos registros não relacionados,
payloads e endpoints, recarga de listas financeiras, validação local e falhas de
carregamento/refresh. Os testes não substituem formulários nem regras do backend.
Manter o denominador completo de fontes e registrar resultados em `CONTROLE_ATIVOS.md`.

P0: acesso entre perfis/obras, revogação de sessão, recuperação, dupla reserva,
duplicação de compras e cancelamento concorrente. P1: manutenção/calibração,
rastreabilidade, arquivamento e validação de entradas. P2: filtros, documentos,
responsividade, teclado e mensagens de erro.

## Estratégia executável

1. Inspecionar fontes, infraestrutura, testes e estado Git antes de editar.
2. Inventariar funcionalidades, endpoints e decisões; planejar cenários.
3. Reaproveitar JUnit 5/Mockito/MockMvc, Node Test Runner e Playwright existentes.
4. Acrescentar tabelas de autorização, limites de DTOs, categorias, obras e
   inventário histórico; testes de utilitários e navegador com transporte simulado.
5. Executar Java com JaCoCo, Node com cobertura V8, lint/build, testes de navegador,
   integração descartável e verificações de dependências tecnicamente disponíveis.
6. Investigar falhas, mantendo testes que expõem defeitos reais; registrar bloqueios.

Caixa-preta: classes válidas/inválidas/nulas, mínimo/máximo e vizinhos, tabelas
perfil × rota, transições de pedidos/calibração/cancelamento, sucesso e erro.
Caixa-branca: decisões de arquivamento, composição de chaves, snapshots e
controles de segurança; métricas JaCoCo para instruções/ramificações e V8 para JS.
Cobertura de código não equivale à cobertura de requisitos.

A matriz de segurança usa a cadeia Spring real e respostas de um controlador
de teste: prova políticas HTTP, não persistência nem regras dos controladores reais.
Os testes `qa-browser` usam componentes reais e interceptação HTTP em Chromium:
provam comportamento da UI, não integração com PostgreSQL. A suíte E2E original
continua sendo o caminho para integração real.

Segurança segue os temas de autenticação, autorização, sessão, entradas, erros e
lógica de negócio do [OWASP WSTG](https://wstg.owasp.org/stable/4-Web_Application_Security_Testing/).
Não se trata de certificação OWASP ou pentest exaustivo.

## Isolamento e aceitação

Nunca usar `.env`, dados reais, banco habitual ou serviços públicos como alvos.
Integração somente por `scripts/testar-integracao.mjs`, que cria projeto Compose
aleatório, banco tmpfs, portas loopback e SMTP fictício. Não iniciar o daemon do
Docker automaticamente, pois ele pode reiniciar serviços habituais.
Navegador local usa servidor Vite sem arquivos `.env` (`envDir: false`), variáveis
fictícias e bloqueio de requisições externas. Sem dependências novas.

Aceite: nenhuma falha funcional confirmada sem tratamento, sem defeito crítico/alto,
testes críticos reais executados e sem vazamento de dados. Bloqueios impedem
aprovação completa. As correções autorizadas devem manter os testes que
reproduziram os defeitos e passar pela regressão. Não remover, ignorar ou inverter
expectativas para produzir uma suíte verde.

Resultados devem distinguir APROVADO, REPROVADO, BLOQUEADO e NÃO EXECUTADO.
Contagens são obtidas dos relatórios da execução, com denominadores explícitos.
O relatório final informa limitações de plataforma, acessibilidade e desempenho.

## Continuação pelos formulários reais — 27/10/2026

Após ampliar o hook, exercitar cadastro/edição de equipamentos e funcionários,
cadastro de obras, categorias, arquivamento e movimentação nos componentes reais.
Priorizar envio único com API pendente, erro/retry sem perda de preenchimento,
validação HTML e teclado, nomes acessíveis e invariantes de quantidade/reserva.
Corrigir os defeitos reproduzidos dentro da autorização vigente. Acrescentar
refresh de Financeiro/RH para ramos alcançáveis do hook. Regressão de Node,
lint/build e todo o navegador com Istanbul; manter evidências de backend e
integração separadas, com datas e escopos próprios. Detalhes em
[formulários reais](FORMULARIOS_REAIS.md).

## Operação de equipamentos e painéis com dados — 27/10/2026

Após os formulários, exercitar a interface de manutenção e calibração com dados,
quantidades reservadas, fases reais do contrato e recusa/retry. Conferir request,
estado aplicado no modal e atualização do painel ao fechar/reabrir. Incluir filas
e filtros do Estoque e consulta de pedidos nos painéis de RH/Financeiro. Preservar
os mesmos 102 fontes no denominador Istanbul e comparar hashes com a rodada
anterior. API simulada não substitui autorização, transações ou integração real.
Próxima prioridade e resultados em [operação dos equipamentos](OPERACAO_EQUIPAMENTOS.md).

## Compra recebida e atendimento parcial — 27/10/2026

Exercitar as telas reais do Estoque com compra parcial, saldo pendente, envio
único, recusa/retry e preservação de preenchimento. Conferir o corpo das origens
e a aplicação de pedidos divididos sem apagar outros registros. Validar que uma
conclusão recusada após trânsito permite retomar sem repetir a saída. Reexecutar
a suíte HTTP de atendimento parcial em API/PostgreSQL descartáveis para conferir
reservas, persistência e rollback, mantendo as evidências separadas do navegador
com respostas simuladas. Resultados e limites em
[compra recebida e atendimento parcial](COMPRAS_ATENDIMENTO_PARCIAL.md).

## Planejamento e decisões de RH/Financeiro — 27/10/2026

Cobrir plano financeiro, revisão, decisões e cancelamento nos componentes reais,
com validação, envio único, recusa/retry e manutenção dos vínculos. Distinguir
POST confirmado de falha de sincronização posterior. Reproduzir QA-BUG-009,
aplicar a resposta somente à análise afetada e validar a correção também com
POST/API/PostgreSQL reais, recusando somente o GET da lista. Executar a stack
real e a suíte local em sequência para reduzir concorrência por recursos.
Resultados e ressalvas em [RH/Financeiro](RH_FINANCEIRO.md).

## Sincronização após plano e edição — 27/10/2026

Retomar a ressalva de POST/PATCH confirmado seguido de GET recusado nos fluxos
financeiros. Reproduzir QA-BUG-010 antes da correção para plano novo, revisão
aprovada, edição Financeiro/RH e análise vinculada; conservar dados conhecidos
sem substituir agregados. Testar erro real da gravação separadamente. Confirmar
pela interface com API/PostgreSQL reais o plano e a edição persistidos, um evento
de alteração e um envio, bloqueando somente a consulta posterior. Manter os
cenários de decisão anteriores na regressão e medir novamente a cobertura.
Resultados e limites em [sincronização financeira](SINCRONIZACAO_FINANCEIRA.md).

Próxima prioridade de integridade: testar resposta do próprio POST/PATCH perdida
após commit, diferenciando confirmação indisponível de recusa real. Conferir
estado persistido, auditoria e comportamento ao reabrir antes de decidir sobre
reenvio ou mecanismo de idempotência. Essa situação não foi encerrada pela
correção de sincronização posterior desta rodada.

## Fechamento técnico do piloto — 27/10/2026

Congelar o candidato por hashes, conferir a evidência anterior da interface no
mesmo código e reexecutar Java, Node, lint/build e scanners de dependências.
Executar a integração completa em stacks descartáveis, incluindo novo ensaio de
backup/restauração, e varrer as imagens finais identificadas por ID. Ausência do
Docker bloqueia esses critérios: não substituí-los por resultados históricos.
Não iniciar o daemon automaticamente, conforme a regra de isolamento acima.
Ambiente, responsáveis, backup real e aceite das ressalvas permanecem pendentes.
Parecer e comandos de retomada em [fechamento do piloto](FECHAMENTO_PILOTO.md).
