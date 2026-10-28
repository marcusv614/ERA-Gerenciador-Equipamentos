# Fechamento técnico para o piloto — 27/10/2026

**Início do piloto: BLOQUEADO.** O pacote de fechamento está preparado, mas a
integração atualizada, o ensaio de restauração e a varredura das imagens não
puderam executar porque o daemon Docker está indisponível nesta sessão.
Não há novo defeito de aplicação confirmado por esse bloqueio de infraestrutura.
O parecer anterior **APROVADA COM RESSALVAS** continua limitado ao escopo já
executado; não representa autorização de início operacional do piloto.

Os critérios técnicos abaixo derivam de [isolamento e aceitação](PLANO_DE_TESTES.md#isolamento-e-aceitação)
e do workflow `.github/workflows/verificar-seguranca.yml`. Os campos operacionais
que não foram informados permanecem pendentes, sem presumir responsáveis,
ambiente, quantidade de usuários, período do piloto ou aceite de riscos.
As execuções começaram em 28/10 UTC, ainda 27/10 em America/Manaus.

## Versão candidata e evidências

A árvore de trabalho contém as correções das rodadas de QA, ainda sem commit.
A revisão Git de base, isoladamente, não identifica o conteúdo testado. O
snapshot do fechamento registra hashes dos fontes, migrations, configurações de
build e ferramentas de QA. São 361 entradas verificadas; alterações posteriores
invalidam a conferência e exigem nova avaliação dos testes afetados.

- **786 Java e 189 Node aprovados**, sem falhas; lint e build aprovados novamente.
- **278 testes de navegador aprovados na rodada anterior**, preservados como
  evidência no mesmo código: hashes conferidos dos 102 fontes JS/JSX da interface.
  A suíte não foi repetida neste fechamento. A cobertura completa dessa execução
  é 1946/2857 linhas da interface, **68,11%**; não mede percentual de requisitos
  do sistema aprovados. São 58 JSX e quatro hooks no inventário instrumentado.
- npm audit: **zero vulnerabilidades**. OSV: **102 bibliotecas consultadas,
  zero alertas**. Esses scanners não cobrem os pacotes do sistema das imagens.
- **38 E2E e oito QA-API aprovados anteriormente**: referência histórica preservada,
  sem contar como nova execução da tentativa de fechamento bloqueada.
- Dez defeitos confirmados nas rodadas anteriores, corrigidos e validados em
  seus escopos: dois altos, seis médios e dois baixos. Não há novo defeito crítico
  ou alto confirmado neste fechamento. Varredura de imagens ainda pendente.

Não foram alterados os fontes da aplicação nesta rodada de fechamento. Foram
acrescentados o ensaio de restauração, sua inclusão na integração completa e as
ferramentas de execução/consolidação do piloto. O ensaio tem sintaxe verificada;
**ainda não tem validação de execução**, pois depende do Docker.

## Resultado dos critérios

<!-- resultado-inicio -->

Parecer técnico: **BLOQUEADO**.

| Critério | Resultado | Evidência |
| --- | --- | --- |
| P01 — Integridade dos fontes do fechamento | **APROVADO** | Hashes dos arquivos conferidos. |
| P02 — Regressão de interface preservada no mesmo código | **APROVADO** | 278 casos já aprovados; 102 fontes conferidos por hash. |
| P03 — Backend, Node, lint e build | **APROVADO** | 786 Java, 189 Node, lint e build aprovados. |
| P04 — Dependências npm e Maven | **APROVADO** | npm sem vulnerabilidades; 102 bibliotecas Maven sem alertas. |
| P05 — Integração completa em stacks descartáveis | **BLOQUEADO** | Daemon Docker indisponível; nenhuma stack foi validada nesta tentativa. |
| P06 — Ensaio de backup e restauração | **BLOQUEADO** | Ensaio preparado; execução depende da stack Docker descartável. |
| P07 — Varredura das imagens finais de API e UI | **BLOQUEADO** | Não há relatório atual de duas imagens identificadas, sem alertas HIGH/CRITICAL. Consultar os motivos registrados no relatório de imagens. |
| P08 — E2E reais desktop/mobile atualizados | **BLOQUEADO** | Os 38 E2E anteriores não são contados como nova execução do fechamento. |

Início operacional: PENDENTE: ambiente, responsáveis, backup real e aceite das ressalvas não informados.

<!-- resultado-fim -->

## Conteúdo entregue e correções relevantes

O pacote inclui plano/matriz de testes, inventário de defeitos, relatórios e
snapshots das rodadas. As correções protegem o último administrador, a renovação
de notificações, a validação de categorias e os nomes históricos com vírgulas.
Na interface, impedem duplo envio nos formulários cobertos, restauram validação
nativa/Enter e nomes acessíveis, e distinguem gravação financeira confirmada de
falha apenas da consulta posterior. Ver [defeitos encontrados](BUGS_ENCONTRADOS.md).

Ferramentas de fechamento:

| Arquivo | Finalidade |
| --- | --- |
| `scripts/qa/executar-integracao-piloto.mjs` | Executar todas as suítes em stacks descartáveis e registrar início, fim, log e código de saída. |
| `scripts/testes/backup-restauracao.mjs` | Fazer dump custom, alterar dados fictícios, restaurar todas as tabelas/sequências e conferir a retomada da API com novo login. |
| `scripts/qa/verificar-imagens-piloto.mjs` | Varrer imagens locais de API/UI com Trivy na versão usada pelo CI, registrar IDs, relatórios e contagens HIGH/CRITICAL; sem publicar imagens. |
| `scripts/qa/fechar-piloto.mjs` | Conferir hashes e consolidar oito critérios; retornar código diferente de zero quando houver reprovação ou bloqueio. |

O ensaio de backup usa PostgreSQL 16 em tmpfs e dados fictícios, na mesma versão
da aplicação. Confere contagens e resumos do conteúdo de todas as tabelas,
valores e `is_called` das sequências, histórico Flyway e leituras HTTP após
reiniciar a API. Não comprova retenção, criptografia, armazenamento externo,
restauração de base real, upgrade legado ou downgrade da aplicação.

## Retomada das verificações pendentes

Disponibilizar um contexto Docker autorizado já em execução. Conforme o plano de
QA, não foi iniciado o daemon automaticamente: isso pode reiniciar serviços
habituais. A tentativa registrada terminou na construção, antes de criar stacks.
Os testes continuam usando somente `compose.test.yaml`, `.env` vazio, projetos
aleatórios etiquetados, portas loopback e bancos descartáveis. O ensaio de
restauração só aceita configuração gerada pelo executor e verifica os rótulos
do banco e da API antes de parar/restaurar qualquer serviço de teste.

Na mesma árvore de trabalho e com os artefatos locais preservados, executar
sequencialmente na raiz:

```sh
node scripts/qa/executar-integracao-piloto.mjs
node scripts/qa/verificar-imagens-piloto.mjs
node scripts/qa/medir.mjs
node scripts/qa/fechar-piloto.mjs
```

A primeira etapa usa `/usr/bin/chromium` quando disponível ou
`ERA_TEST_CHROMIUM` informado. Executa atendimento parcial, regressão/E2E,
recuperação com SMTP fictício, concorrência administrativa, notificações e
backup/restauração. Não executar simultaneamente com a suíte de navegador local.
A varredura exige integração completa aprovada e fontes iguais ao manifesto.
Baixa o scanner público usado pelo CI; exporta apenas as imagens de teste para
arquivos locais e não monta o socket Docker dentro do scanner.

O manifesto inicial e os logs são artefatos locais em
`test-results/quality-assurance/piloto`. O snapshot versionável guarda os hashes e
os resultados necessários à revisão. Uma execução em outro checkout exige
recriar as evidências; não copiar apenas um parecer ou atualizar hashes para
aproveitar testes de fontes diferentes. Alterações nos fontes/dependências
exigem repetir as verificações afetadas antes de consolidar outro candidato.

## Condições operacionais para iniciar

| Condição | Situação / evidência necessária |
| --- | --- |
| Ambiente e versão | Destino do piloto ainda não informado. Identificar ambiente, release com todas as correções e IDs das imagens aprovadas. |
| Responsáveis e participantes | Definir responsável de negócio, responsável técnico, usuários/perfis, obras e período. Nenhum nome ou aceite foi presumido. |
| Base e acesso | Conferir dados do piloto, contas por perfil e ausência de contas/dados de demonstração no destino. Fazer smoke no ambiente autorizado. |
| HTTPS e sessão | Conferir HTTPS, cookie seguro, CORS da origem exata e isolamento da API/banco conforme a configuração de produção. |
| Recuperação de conta | Se habilitada, conferir remetente e fluxo de recuperação no ambiente autorizado. SMTP fictício valida somente o teste isolado. |
| Backup real | Definir armazenamento externo, proteção, retenção, responsável e procedimento de restauração com evidência. O dump fictício não substitui esse backup. |
| Acompanhamento e suporte | Definir canal de incidentes e responsáveis. Registrar pedido/equipamento, perfil, horário e resultado, sem senha/token. |
| Aceite das ressalvas | Registrar aceite explícito do responsável antes de iniciar; a aprovação dos testes não o substitui. |

Depois que os critérios técnicos forem aprovados, realizar smoke no destino:
login/logout por perfis participantes, criação e aprovação de pedido,
planejamento, estoque/entrega ou cancelamento, notificações e leitura do
histórico. Registrar os IDs e resultados sem incluir credenciais no relatório.
Essa etapa depende do ambiente e do escopo operacional ainda não informados.

## Ressalvas e contingência

Permanece em aberto a resposta do próprio POST/PATCH perdida após commit.
A correção de sincronização posterior exige resposta de gravação confirmada;
não introduz idempotência geral. Em caso de resultado incerto, conferir o pedido,
o histórico e o estado persistido antes de decidir reenviar a operação.

Também permanecem acessibilidade sistemática, outros navegadores/dispositivos,
carga representativa e migração de base legada representativa. Não há declaração
de cobertura funcional total, SLA, ausência de vulnerabilidades ou auditoria
completa de acessibilidade.

Interromper novas operações do piloto e acionar os responsáveis se houver acesso
indevido, divergência de saldos/reservas, perda de dados ou defeito crítico/alto.
Preservar evidências e o estado atual antes de qualquer intervenção. O retorno
exige diagnóstico e validação do responsável; não automatizar reenvios incertos.

Rollback deve usar um conjunto consistente de aplicação e banco, com backup
restaurável e imagens identificadas. O backend antigo não entende os snapshots
`json:v1:`; trocar somente a imagem não comprova um rollback válido. Não usar
`Flyway repair` para contornar divergências nem remover o volume do banco.
O teste preparado restaura a mesma versão e não valida downgrade de schema.

## Registros do fechamento

Snapshot: [evidências do fechamento](evidencias/fechamento-piloto-2026-10-27.json).
Logs locais em `test-results/quality-assurance`: `java-13.log`, `node-13.log`,
`lint-18.log`, `build-12.log`, `maven-deps-3.log`, `audit-4.log`, `osv-3.log`.
Na subpasta `piloto`: `validacoes-locais.log`, `integracao.log`,
`integracao-execucao.json`, `imagens.json`, `fechamento.json` e `resumo.md`.
