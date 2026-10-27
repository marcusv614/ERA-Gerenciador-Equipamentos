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
