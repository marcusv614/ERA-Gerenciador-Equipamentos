# Testes e regressão

Última validação local: [resultados e defeitos corrigidos em 23/10/2026](RELATORIO-TESTES-2026-10-23.md).

## Executar

Requisitos: Node 24+, Docker com Compose e dependências do frontend instaladas.
O Java 21 é usado dentro da construção Docker; para Maven diretamente, instale-o localmente.

```sh
cd Frontend/UI
npm ci
npx playwright install --with-deps chromium
npm test
npm run lint
npm run test:e2e
```

`test:e2e` constrói imagens de teste e executa integração HTTP e navegador com API,
PostgreSQL e Nginx reais. Não precisa subir a aplicação habitual.
No Linux, se já tiver Chromium, use `ERA_TEST_CHROMIUM=/usr/bin/chromium` antes do comando.

Alternativas, a partir da raiz:

```sh
node scripts/testar-integracao.mjs --sem-navegador
node scripts/testar-integracao.mjs --suite=atendimento-parcial
node scripts/testar-integracao.mjs --suite=regressao
node scripts/testar-integracao.mjs --suite=recuperacao
```

`--sem-build` é apenas para depuração: reutiliza imagens existentes, que podem
estar desatualizadas. Não usar para validar uma alteração da aplicação.

Testes e cobertura Java, com Java 21:

```sh
cd Backend/API
sh mvnw -B -ntp -Pcoverage verify
```

Relatório HTML em `Backend/API/target/site/jacoco/index.html` (também CSV/XML).
No frontend, `npm run test:coverage` mede os módulos JavaScript carregados pelos
testes Node, não a renderização dos componentes React. Não representa a cobertura
de toda a interface. Ainda não há limite mínimo arbitrário para mascarar lacunas.

## Isolamento e segurança

- O executor passa um arquivo de ambiente vazio ao Compose; não carrega `.env`.
- Projetos aleatórios `era-tests-<12 caracteres hexadecimais>`, rede própria e
  portas aleatórias vinculadas somente a `127.0.0.1`.
- PostgreSQL próprio em `tmpfs`: nenhum volume persistente, cópia do banco real ou
  credencial habitual. A base nasce das migrations e recebe dados fictícios pela API.
- CORS permite somente a origem exata da UI descartável, sem curingas.
- Containers marcados `era.test=true`; limpeza valida os alvos antes de remover
  somente o projeto criado. SIGINT/SIGTERM tenta encerrar o processo e limpar a stack.
- SIGKILL, queda do Docker ou do computador podem impedir a limpeza. Nesse caso,
  confira os containers com a etiqueta `era.test=true` antes de qualquer remoção.
- O SMTP fictício guarda mensagens em memória e **não entrega e-mails externos**.
  A dispensa de autenticação/TLS existe apenas no override de teste; a configuração
  Gmail/produção não é alterada.
- Traces ficam desligados por padrão, pois podem capturar dados sensíveis.
  `ERA_TEST_TRACE=1` habilita sua retenção em falhas exclusivamente nesse ambiente
  descartável. Nunca usar credenciais pessoais ou dados reais nas fixtures.

## Matriz de cobertura

| Área | Cobertura automatizada |
| --- | --- |
| Regras e documentos | JUnit/Mockito e utilitários Node; PDF/CSV, escape de HTML/fórmulas, filtros e cálculos |
| Permissões HTTP | Sete perfis e anônimo nas consultas administrativas, financeiras, RH, auditoria e estoque; cadastros proibidos e CSRF |
| Sessões | Troca obrigatória, senha mínima, login inválido, sessão concorrente, logout, bloqueio, desativação e reset administrativo |
| Pedidos | Técnico → Gerente e TST → RH → Financeiro → Estoque → recebimento; edição, rejeição, transporte direto, compras e saldos |
| Atendimento parcial | Entregas sucessivas, notas distintas, reservas, revisão financeira e rastreabilidade sem compras duplicadas |
| Cancelamento | Justificativa, suspensão, conferência física/financeira, confirmação concorrente, liberação única e preservação de compras/entregas |
| Notificações | Destinatários por etapa/setor, leitura isolada/persistente, agrupamento e vínculo com a obra |
| Equipamentos | Manutenção parcial, calibração, sequência de retirada/envio/retorno, origem, certificado e último saldo disputado |
| Vistoria e auditoria | Versão desatualizada, conclusão, nota fiscal e inventário histórico; isolamento de consulta |
| Recuperação | SMTP fictício real, confirmação, exclusividade de admin, resposta genérica, hash persistido, token expirado/reutilizado e rollback SMTP |
| Exceções | Contrato 400/401/403/404/405/409/415/5xx; sem stack trace, SQL ou credenciais na resposta; logs seguros |
| Navegador | Login/logout dos sete perfis, temas claro/escuro, catálogo restrito e criação de pedidos Técnico/TST; Kanban, filtros do estoque e largura desktop/mobile; senha incorreta, falha de rede e nova tentativa após conflito; CSV, janela de impressão e renderização PDF com filtro por dia |

Os testes HTTP verificam persistência entre requisições e invariantes de saldo.
A disputa da última unidade usa duas aprovações simultâneas, não mocks.
Fixtures SQL na recuperação apenas avançam expiração/carência para testar limites
sem aguardar quinze minutos; não substituem as verificações HTTP de autorização.

## Relatórios e CI

- Resumo por suíte em `test-results/integracao-<instante>/resumo.json`.
- Playwright gera relatório HTML e screenshots. Falhas na integração preservam o
  log da API descartável. Esses diretórios são ignorados pelo Git.
- O workflow `verificar-seguranca.yml` executa testes Java, frontend, integração,
  navegador desktop/mobile e verificações de dependências/imagens.
- O workflow de publicação depende dessa verificação; ativação/proteção de branch
  depende das configurações do repositório no GitHub.

## Limites conhecidos

Não é uma declaração de cobertura de 100%. Ainda não cobre todas as combinações
de telas, todos os métodos/endpoints ou todas as transições possíveis.
Os fluxos de múltiplos setores são completos na API; no navegador, a criação dos
pedidos e a navegação são reais, mas nem todas as aprovações são clicadas pela UI.

Ainda exigem ampliação: Firefox/WebKit, comparação visual com referências
aprovadas, acessibilidade sistemática, carga prolongada, indisponibilidade de
infraestrutura, restauração de backups e migração de um banco legado representativo.
Não executamos ataques ou testes de carga em produção. Cobertura de linhas não
deve ser confundida com cobertura de regras.

Os roteiros antigos `validar-fluxo-requisicoes.mjs` e
`validar-migracao-manutencao.mjs` documentam contratos anteriores ao fluxo
financeiro atual e não fazem parte desta suíte. Não executá-los no banco habitual.
