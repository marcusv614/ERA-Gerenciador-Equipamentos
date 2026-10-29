# Fechamento técnico para o piloto — 29/10/2026

**Nove critérios técnicos APROVADOS. Início do piloto: ADIADO pelo usuário.**
O parecer técnico é **APTO PARA PILOTO CONTROLADO COM RESSALVAS** no escopo
abaixo. A implantação, a validação no destino e as condições operacionais
continuam para a etapa futura; a cópia real do banco também foi adiada pelo usuário.

O domínio previsto é `tools.eraltda.com.br`, com HTTPS pela Hostinger. A VPS
informada tem 4 vCPUs, 16 GB de RAM e 200 GB de armazenamento, compartilhados
com o Nextcloud da empresa. Aproximadamente 20 pessoas e pelo menos três obras;
volume real e responsáveis ainda a definir. O destino escolhido para backup é
Documentos deste computador; o arquivo já salvo é um ensaio com dados fictícios.

## Versão candidata e evidências

**370 arquivos conferidos por hash**, incluindo fontes, testes, configuração e
ferramentas. A base Git isolada não identifica as alterações sem commit.
A integração registra os fontes no início e os IDs das imagens; a varredura e
a carga usam as imagens identificadas, sem aceitar evidência de outro candidato.
Snapshot: [validação final](evidencias/validacao-final-piloto-2026-10-29.json).

- **788 Java**, seis suítes de integração, **38 E2E** e oito QA-API aprovados.
- **189 Node e 278 navegador local** preservados no mesmo código da interface:
  102 fontes conferidos. Os 278 não foram repetidos. Cobertura UI: **68,11%**
  (1946/2857 linhas), sem representar percentual de requisitos aprovados.
- npm audit e OSV sem alertas nas dependências consultadas; 102 bibliotecas Maven.
  Lint/build aprovados, inclusive na reconstrução atual da UI.
- Restauração: **24 tabelas e 20 sequências**, novo login e quatro leituras HTTP.
  Dump fictício copiado para Documentos, com hash conferido; cópia real adiada.
- Carga: **20 sessões, 100 leituras sem erros**, 5.000 equipamentos e 2.000
  pedidos adicionais em três obras. P95 **6,99 s**, máximo **8,19 s**, prazo 10 s.
- Imagens finais: **zero HIGH/CRITICAL**. A UI recebeu correções de Brotli,
  curl e libcurl após uma ocorrência crítica e duas altas na primeira varredura.
- **12 defeitos corrigidos nos respectivos escopos**: um crítico, dois altos,
  sete médios e dois baixos. O crítico é um achado de pacotes da imagem,
  classificado pelo scanner; não é comprovação de exploração do ERP.

O orçamento preparado em `compose.production.yaml` é API **2 CPUs / 4 GiB**
(heap 2 GiB), PostgreSQL **0,5 CPU / 512 MiB** e UI **0,25 CPU / 128 MiB**.
Nenhum desses ajustes foi aplicado à VPS. A carga é local HTTP, sem 20 browsers,
sem tráfego simultâneo do Nextcloud e sem medir rede/armazenamento do destino.
Ver [protocolo, falhas anteriores e correções](CARGA_E_RESTAURACAO_PILOTO.md).

## Resultado dos critérios

<!-- resultado-inicio -->

Parecer técnico: **APTO PARA PILOTO CONTROLADO COM RESSALVAS**.

| Critério | Resultado | Evidência |
| --- | --- | --- |
| P01 — Integridade dos fontes do fechamento | **APROVADO** | 370 hashes conferidos. |
| P02 — Regressão de interface preservada no mesmo código | **APROVADO** | 278 casos anteriores aprovados; 102 fontes da interface conferidos por hash. |
| P03 — Backend, Node, lint e build | **APROVADO** | 788 Java, 189 Node, lint e build aprovados. |
| P04 — Dependências npm e Maven | **APROVADO** | npm sem vulnerabilidades; 102 bibliotecas Maven sem alertas. |
| P05 — Integração completa em stacks descartáveis | **APROVADO** | Seis suítes aprovadas em stacks descartáveis. |
| P06 — Ensaio de backup e restauração | **APROVADO** | 24 tabelas e 20 sequências restauradas; novo login e leituras HTTP conferidos. |
| P07 — Varredura das imagens finais de API e UI | **APROVADO** | Duas imagens identificadas; zero alertas HIGH/CRITICAL. |
| P08 — E2E reais desktop/mobile atualizados | **APROVADO** | 38 E2E reais aprovados, sem falhas, ignorados ou retries. |
| P09 — Carga sintética com 20 sessões e três obras | **APROVADO** | 20 sessões; 100 leituras sem erros; 3 obras, 5.000 equipamentos e 2.000 pedidos adicionais; API 2 CPUs / 4GiB. p95 6992 ms. VPS com 4 vCPUs e 16 GB, compartilhada com Nextcloud; validar consumo conjunto no destino. |

Início operacional: ADIADO pelo usuário; validação no destino, responsáveis, backup real e acompanhamento com Nextcloud pendentes.

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
| `scripts/qa/fechar-piloto.mjs` | Conferir hashes e consolidar nove critérios; retornar código diferente de zero quando houver reprovação ou bloqueio. |

O ensaio de backup usa PostgreSQL 16 em tmpfs e dados fictícios, na mesma versão
da aplicação. Confere contagens e resumos do conteúdo de todas as tabelas,
valores e `is_called` das sequências, histórico Flyway e leituras HTTP após
reiniciar a API. Não comprova retenção, criptografia, armazenamento externo,
restauração de base real, upgrade legado ou downgrade da aplicação.

## Retomada das verificações pendentes

O Docker foi disponibilizado e a integração final passou nas seis suítes.
Para nova execução, usar um contexto Docker autorizado já em execução; o plano
evita iniciar o daemon automaticamente porque isso pode reiniciar serviços habituais.
Os testes continuam usando somente `compose.test.yaml`, `.env` vazio, projetos
aleatórios etiquetados, portas loopback e bancos descartáveis. O ensaio de
restauração só aceita configuração gerada pelo executor e verifica os rótulos
do banco e da API antes de parar/restaurar qualquer serviço de teste.

Na mesma árvore de trabalho e com os artefatos locais preservados, executar
sequencialmente na raiz:

```sh
node scripts/qa/executar-integracao-piloto.mjs
node scripts/testar-integracao.mjs --suite=carga-piloto --sem-build
node scripts/qa/verificar-imagens-piloto.mjs
node scripts/qa/medir.mjs --integracao=test-results/integracao-1793281363426
node scripts/qa/fechar-piloto.mjs
```

QA-BUG-011 foi encerrado no perfil final: API 2 CPUs / 4 GiB com heap de
2 GiB, banco 0,5 CPU / 512 MiB e UI 0,25 CPU / 128 MiB. A VPS informada tem
4 vCPUs, 16 GB de RAM e 200 GB de armazenamento, compartilhados com Nextcloud.
Os tetos do ERP somam 2,75 CPUs / 4,625 GiB; limites não equivalem a reservas.
Alterações de recursos, fontes ou imagens exigem nova avaliação dos testes
afetados, com o mesmo volume e prazo por resposta.

O diretório usado acima identifica esta rodada. Em nova execução, substituir
o argumento `--integracao` pelo diretório da integração completa registrada
no log; uma execução somente de carga não substitui as seis suítes.

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
| Ambiente e versão | Destino previsto: tools.eraltda.com.br, Hostinger, VPS 4 vCPUs / 16 GB / 200 GB compartilhada com Nextcloud. Limites de CPU/RAM preparados; conferir release, espaço livre e consumo conjunto no destino. |
| Responsáveis e participantes | Cerca de 20 pessoas e pelo menos três obras informadas. Definir responsáveis de negócio/técnico, perfis e período; nenhum nome ou aceite presumido. |
| Base e acesso | Conferir dados do piloto, contas por perfil e ausência de contas/dados de demonstração no destino. Fazer smoke no ambiente autorizado. |
| HTTPS e sessão | HTTPS será configurado pela Hostinger, conforme informado pelo usuário. Após a publicação, conferir acesso HTTPS, cookie seguro, CORS da origem exata e isolamento da API/banco. Configuração prevista; validação no destino ainda pendente. |
| Recuperação de conta | Se habilitada, conferir remetente e fluxo de recuperação no ambiente autorizado. SMTP fictício valida somente o teste isolado. |
| Backup real | Destino definido: /home/marcus/Documents/Backups-ERA. Ensaio fictício salvo e restaurado. Cópia real adiada pelo usuário nesta etapa. Antes da operação, configurar cópia real da VPS, periodicidade, proteção, retenção e responsável. |
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

Snapshot atual: [validação final](evidencias/validacao-final-piloto-2026-10-29.json).
Snapshot anterior preservado: [retomada inicialmente reprovada](evidencias/retomada-piloto-2026-10-29.json).
Snapshot histórico: [fechamento anterior](evidencias/fechamento-piloto-2026-10-27.json).
Regressão atual: `java-17.log`, `maven-deps-6.log`, `audit-6.log`, `osv-6.log`.
Logs locais em `test-results/quality-assurance`: `java-13.log`, `node-13.log`,
`lint-18.log`, `build-12.log`, `maven-deps-3.log`, `audit-4.log`, `osv-3.log`.
Na subpasta `piloto`: `validacoes-locais.log`, `integracao.log`,
`integracao-execucao.json`, `imagens.json`, `fechamento.json` e `resumo.md`.
