# Defeitos encontrados

Fechamento final de **29/10/2026**: **12 defeitos confirmados e corrigidos**
nos escopos validados (um crítico, dois altos, sete médios e dois baixos).
QA-BUG-011: carga aprovada no orçamento da VPS compartilhada. QA-BUG-012:
pacotes da imagem UI atualizados, regressão aprovada e scanner com zero
HIGH/CRITICAL. A classificação crítica é do scanner, sem exploração reproduzida.
Os registros anteriores abaixo são históricos. Ver [fechamento](FECHAMENTO_PILOTO.md).

Atualização de 29/10/2026: **QA-BUG-011, MÉDIA, ABERTO**. A listagem não
concluiu o ensaio de 20 sessões com o volume sintético definido. A otimização
parcial não encerra o defeito. Total: **11 confirmados**, dez corrigidos nas
rodadas anteriores e um aberto (dois altos, sete médios, dois baixos).
Ver [carga e restauração](CARGA_E_RESTAURACAO_PILOTO.md).

QA-BUG-010, severidade MÉDIA, **CORRIGIDO E VALIDADO**: plano e edição
confirmados deixam de ser apresentados como recusados quando apenas o GET da
lista falha. Total acumulado: **dez defeitos confirmados** (dois altos, seis
médios e dois baixos), corrigidos nas respectivas rodadas. Ver reprodução,
correção e persistência real em [sincronização financeira](SINCRONIZACAO_FINANCEIRA.md).
As contagens abaixo são históricas.

QA-BUG-009, severidade MÉDIA, **CORRIGIDO E VALIDADO** na rodada de RH/Financeiro.
Total acumulado: **nove defeitos confirmados** (dois altos, cinco médios e dois
baixos), corrigidos nas respectivas rodadas. A correção foi verificada com
respostas simuladas e com decisão persistida em API/PostgreSQL reais. Ver
[RH/Financeiro](RH_FINANCEIRO.md). As contagens abaixo são históricas.

A rodada de compra recebida e atendimento parcial não confirmou novo defeito de
produção. Os 22 casos novos de navegador passaram, assim como a integração HTTP
real de atendimento parcial. O inventário continua em oito defeitos confirmados
(dois altos, quatro médios e dois baixos), corrigidos nas rodadas anteriores.
Ver [compra e atendimento parcial](COMPRAS_ATENDIMENTO_PARCIAL.md).

A rodada de manutenção, calibração e painéis com dados não confirmou novo defeito
de produção. As falhas intermediárias eram expectativas da fixture,
corrigidas antes da regressão de 212 casos aprovada. O inventário permanece em
oito defeitos confirmados (dois altos, quatro médios e dois baixos), corrigidos
nas rodadas anteriores. Ver [operação dos equipamentos](OPERACAO_EQUIPAMENTOS.md).

Rodada dos formulários: QA-BUG-006, 007 e 008 **CORRIGIDOS E VALIDADOS** na
regressão de 176 testes de navegador. Total acumulado: **oito defeitos confirmados**
(dois altos, quatro médios e dois baixos), nenhum crítico confirmado.
Ver [formulários reais](FORMULARIOS_REAIS.md). As contagens abaixo são históricas.

A ampliação de `useControleAtivos` não confirmou novo defeito de produção.
Uma expectativa de payload da fixture foi corrigida, conforme `CONTROLE_ATIVOS.md`.

A rodada de JSX/hooks acrescentou medição e testes, sem novo defeito de produção
confirmado. Ajustes de fixtures e limpeza da automação estão documentados em
`COBERTURA_INTERFACE.md`; o inventário continua em cinco defeitos confirmados.

Rodada de notificações: QA-BUG-005, severidade MÉDIA, corrigido após reprodução
Java e HTTP/PostgreSQL. Total atual: cinco defeitos confirmados (três médios e
dois altos), nenhum crítico confirmado. Ver `NOTIFICACOES_PERSISTENCIA.md`.

Na primeira retomada de 27/10/2026, os cenários adicionais de serviço não
confirmaram novos defeitos. Na rodada seguinte, foram reproduzidos dois defeitos
ALTOS na proteção do último administrador, detalhados abaixo e em
`CONCORRENCIA_ADMINISTRADORES.md`. Naquela rodada, o inventário passou a quatro defeitos
confirmados: dois médios e dois altos; nenhum crítico confirmado.

Avaliação de 26/10/2026, fuso America/Manaus. Dois defeitos de aplicação foram
confirmados por execução. O usuário autorizou a correção após a reprodução;
as expectativas originais dos testes foram preservadas.

Severidade: crítica = comprometimento geral/dados irrecuperáveis; alta = acesso
indevido ou quebra de fluxo crítico; média = comportamento incorreto em cenário
suportado; baixa = apresentação sem impedir tarefa. Foram encontrados dois de
severidade média, nenhum crítico/alto confirmado. Isso não prova ausência de
vulnerabilidades ou de defeitos nos fluxos bloqueados.

## QA-BUG-001 — Campo nulo em categoria causa HTTP 500

- Funcionalidade: F07/F29, cadastro de categorias e validação HTTP.
- Severidade: MÉDIA.
- Descrição: a lista de campos aceita um elemento JSON `null` na validação;
  o serviço acessa `campo.chave()` e dispara `NullPointerException`.
- Reprodução segura: no controlador MVC com serviço real, enviar
  `POST /categorias-equipamento`, `Content-Type: application/json`, corpo
  `{"nome":"QA","campos":[null]}`. No servidor real, exige sessão ADMIN/GERENTE
  e CSRF; o teste MVC isola esse requisito da suíte de segurança.
- Esperado: HTTP 400, sem persistência.
- Obtido antes da correção: HTTP 500, erro interno genérico.
- Evidência: `test-results/quality-assurance/java-3.log` e snapshot
  `evidencias/antes-correcao.json`, falha
  `QaCategoriaHttpTests.QA_BUG_001_campoNuloDeveSerErro400EmVezDe500`:
  `Status expected:<400> but was:<500>`.
- Arquivos: `Backend/API/src/main/java/br/com/era/api/dto/CategoriaEquipamentoDto.java`;
  `Backend/API/src/main/java/br/com/era/api/service/CategoriaEquipamentoService.java`;
  teste `Backend/API/src/test/java/br/com/era/api/controller/QaCategoriaHttpTests.java`.
- Causa: `List<@Valid Campo>` não proíbe elementos nulos.
- Correção aplicada: `List<@NotNull @Valid Campo>`, seguindo o padrão já usado nos
  DTOs dos pedidos. A lista omitida/nula continua opcional; elementos nulos não.
- Estado: CORRIGIDO E VALIDADO. O teste MVC manteve a expectativa HTTP 400 e
  passou na regressão de 692 casos Java. QA-API-01 confirmou HTTP 400 e ausência
  de persistência com a API e o PostgreSQL reais descartáveis.

## QA-BUG-002 — Vírgula no nome fragmenta responsável no inventário

- Funcionalidade: F22, integridade da identificação no inventário histórico.
- Severidade: MÉDIA.
- Descrição: ao registrar um único responsável chamado `Silva, João`, o serviço
  grava o nome como texto separado por vírgulas. A consulta reconstrói duas
  entradas, `"Silva"` e `"João"`.
- Reprodução segura: criar uma Obra e um Funcionario em memória, associar o nome
  acima, chamar `InventarioHistoricoService.registrar`, capturar o snapshot salvo,
  devolvê-lo pelo repositório de teste e chamar `consultar` na data atual.
- Esperado: `responsaveisTecnicos = ["Silva, João"]`, tamanho 1.
- Obtido antes da correção: `responsaveisTecnicos = ["Silva", "João"]`, tamanho 2.
- Evidência: `test-results/quality-assurance/java-3.log`, snapshot
  `evidencias/antes-correcao.json` e teste
  `QaInventarioHistoricoTests.QA_BUG_002_snapshotDevePreservarNomeComVirgula`.
  A representação textual de ambas as listas no erro JUnit parece igual; a
  comparação de listas falha porque uma tem um elemento e a outra tem dois.
- Arquivos: `Backend/API/src/main/java/br/com/era/api/service/InventarioHistoricoService.java`;
  `Backend/API/src/test/java/br/com/era/api/service/QaInventarioHistoricoTests.java`.
- Causa: composição por `String.join(", ", nomes)` e leitura por `split(",\\s*")`.
- Correção aplicada: novos snapshots usam lista JSON com prefixo de versão
  `json:v1:` no campo TEXT existente; a leitura reconhece esse formato e mantém a
  leitura do formato legado. Não foram criadas migrations, dependências ou
  reescritas de dados históricos. JSON preserva vírgulas, aspas e quebras de linha.
- Regressões acrescentadas: nomes especiais e ordenação, lista vazia, leitura
  legada sem reescrita, nome legado que parece JSON e conteúdo versionado inválido.
- Limitação: listas antigas com vírgulas dentro de nomes já são ambíguas; não é
  possível reconstruí-las com segurança apenas pelo texto. Recuperação desses
  dados requer uma fonte histórica confiável e não foi realizada. Uma versão
  anterior da aplicação não entende o novo formato; rollback exige considerar
  os snapshots criados após esta alteração.
- Estado: CORRIGIDO E VALIDADO para novos snapshots. O teste de reprodução e os
  cinco cenários de compatibilidade passaram na regressão Java; QA-API-04 e 05
  confirmaram persistência e consulta de vírgulas/aspas no PostgreSQL real.

## QA-BUG-003 — Operações concorrentes removem todos os administradores

- Severidade: ALTA. Funcionalidades F04/F30.
- Reprodução: dois administradores ativos com sessões independentes; A desativa
  B por `PATCH /usuarios/{id}/status` enquanto B rebaixa A por `PUT /usuarios/{id}`.
  A barreira SQL exclusiva de teste garante sobreposição das transações.
- Esperado: uma alteração conclui, a outra retorna HTTP 409 pela proteção do
  último administrador; permanece um ADMIN ativo.
- Obtido: HTTP 200 nas duas chamadas e zero ADMIN ativos no PostgreSQL.
  Reprodução confirmada com imagem reconstruída do código anterior à correção.
- Causa: cada operação bloqueava somente a conta-alvo e contava administradores
  independentemente. Nas disputas homogêneas, a auditoria ainda podia causar
  conflito de locks, retornando um 409 genérico sem validar a regra de negócio.
- Correção: lock pessimista dos administradores ativos em ordem de ID antes
  da conta-alvo. Edição, status e redefinição administrativa de senha seguem
  essa ordem; a contagem ocorre após adquirir os locks.
- Regressão real: QA-ADM-01 a 03 em
  `scripts/testes/administradores-concorrentes.mjs`, incluídos no executor de
  integração. Testes exigem a mensagem de negócio, além do status e do saldo de
  administradores; o evento da operação recusada não pode ser persistido.
- Estado: CORRIGIDO; a validação e as evidências estão em
  `CONCORRENCIA_ADMINISTRADORES.md`.

## QA-BUG-004 — Arquivamento de funcionário desativa o último administrador

- Severidade: ALTA. Funcionalidades F04/F05.
- Reprodução: cadastrar um funcionário e uma conta ADMIN vinculada; deixar
  somente essa conta como administrador ativo; arquivar o funcionário por
  `PATCH /funcionarios/{id}/arquivamento`. Também reproduzido com dois ADMIN,
  disputando o arquivamento de um contra o rebaixamento do outro.
- Esperado: HTTP 409 e preservação do funcionário e do último administrador.
- Obtido: HTTP 200, funcionário arquivado e zero ADMIN ativos. Na disputa,
  ambas as operações retornaram HTTP 200.
- Causa: `FuncionarioService` desativava diretamente a conta vinculada sem
  proteger a regra do último administrador nem coordenar locks com a gestão de
  contas. O cadastro permite vincular um funcionário a uma conta ADMIN.
- Correção: usar os mesmos locks de administradores ativos e validar a conta
  vinculada antes de remover responsabilidades ou desativar o acesso.
- Regressão: QA-ADM-04 e 05 no PostgreSQL real; teste Java
  `QA_BUG_004_arquivarFuncionarioNaoDesativaUltimoAdmin` e caso positivo com
  outro administrador disponível, em `QaFuncionarioServiceTests`.
- Estado: CORRIGIDO; a validação e as evidências estão em
  `CONCORRENCIA_ADMINISTRADORES.md`.

## QA-BUG-005 — Reentrega de aviso mantém resumo e perfil antigos

- Severidade: MÉDIA. Funcionalidade F25.
- Reprodução: emitir AJUSTE_FINANCEIRO, lê-lo e depois alterar materiais e obra
  durante a análise financeira. O aviso é renovado com o mesmo ID, mas mantém
  quantidade e obra anteriores. Também reproduzido após mudar o destinatário de
  GERENTE para ESTOQUE: uma nova revisão aprovada destina o evento ao perfil atual,
  mas o perfil antigo armazenado oculta o aviso na consulta de escopo.
- Esperado: novo evento com os dados atuais, leitura reaberta e sem duplicação;
  destinatário elegível deve enxergá-lo no perfil atual.
- Obtido: pedido atualizado para quantidade 2 e obra B, aviso mostrando 1 e obra
  A; no caso de perfil, o aviso renovado não aparece na caixa do destinatário.
- Causa: `renovar` atualizava somente mensagem, data e leitura, preservando os
  demais dados capturados no primeiro evento.
- Correção: renovar com usuário/pedido atuais e atualizar perfil, obra, nome,
  indicador de destinatário e materiais, preservando ID e unicidade.
- Regressão: QA-NOT-01/08 no PostgreSQL e
  `QA_BUG_005_reentregaAtualizaMateriaisEObraDoResumo` em
  `QaNotificacaoRessalvasTests`. Os demais casos reais verificam concorrência,
  falha/rollback e paginação; não foram classificados como outros defeitos.
- Estado: CORRIGIDO; resultados e evidências em `NOTIFICACOES_PERSISTENCIA.md`.

## Falhas da automação e impedimentos, não defeitos da aplicação

- Fixture React inicial sem exportação: lint detectou; corrigida no arquivo de teste.
- Caminho do projeto com espaços: o Playwright recebeu URL codificada como cwd;
  configuração de teste passou a usar `fileURLToPath`.
- Interceptação inicial `**/api/**` capturava também módulos de
  `src/services/api/`, deixando a página de teste vazia. Corrigida para a origem
  loopback e o prefixo `/api/` da aplicação; suíte repetida e aprovada.
- Expectativa inicial para HTTP 500 foi ajustada ao requisito existente de
  mensagem genérica: a UI não deve exibir a mensagem interna recebida do servidor.
- A tentativa com a fixture defeituosa foi interrompida; não entra na contagem
  de defeitos de produção. Log preservado em `browser-2.log`.
- Sandbox bloqueou a porta local e a consulta OSV; reexecuções autorizadas fora
  da sandbox permitiram navegador e scanners. O Docker continuou indisponível.

Não foram aplicadas correções de produção baseadas apenas em suspeitas estáticas.

## QA-BUG-006 — Cadastros permitem envio duplicado enquanto aguardam a API

- Severidade: MÉDIA. Famílias F05/F08; proteção equivalente estendida à obra F06.
- Reprodução: abrir cadastro de equipamento ou funcionário, preencher dados
  fictícios válidos, manter o POST pendente e dar duplo clique no botão de salvar.
- Antes: dois POSTs observados por formulário, sem bloqueio de salvar/cancelar.
- Correção: guarda síncrona com `useRef`, estado de envio, await, bloqueio de
  fechamento enquanto pendente e erro local com preenchimento preservado. Painel
  retorna sucesso/falha ao formulário. Obra recebe a mesma proteção; seu baseline
  terminou por timeout no checkbox da fixture e não comprova dois POSTs.
- Evidência: `FORMULARIOS_REAIS.md`, snapshot próprio e QA-FORM-DUP/RETRY.

## QA-BUG-007 — Formulários ignoram validação nativa e envio por Enter

- Severidade: BAIXA. Famílias F05/F06/F08.
- Reprodução: preencher e-mail `endereco-invalido` no novo funcionário ou `invalido`
  na edição; clicar em salvar. O input tem validade falsa, mas ocorre POST/PATCH.
  Em equipamento e funcionário, Enter no nome não envia o cadastro válido.
- Causa: contêiner `div` e botão com callback direto, sem submissão HTML.
- Correção: `form`/`onSubmit` nos três cadastros e na edição do funcionário,
  com tipos explícitos nos botões. A validação HTML impede requests inválidos.
- Evidência: `formularios-antes.log` mostra uma requisição inválida em cada
  fluxo; `formularios-antes-2.log` registra Enter sem envio. QA-FORM-EMAIL,
  QA-FORM-EMAIL-EDIT e QA-FORM-ENTER verificam o resultado esperado.
- Limite: não significa aceitação desses dados pelo backend; a API é simulada.

## QA-BUG-008 — Grupo altera nomes acessíveis dos controles

- Severidade: BAIXA. Famílias F05/F06.
- Antes: o primeiro checkbox de responsáveis recebia o texto de todo o grupo;
  o primeiro botão de status tinha nome acessível `Status inicial Concluída`,
  embora exibisse `Em andamento`.
- Causa: `CampoFormulario` sempre usava `label`, envolvendo múltiplos controles
  e outros labels.
- Correção: agrupamento opcional com `fieldset`/`legend`, aplicado aos grupos de
  responsáveis/status da obra e de situação/vínculos do funcionário. Os demais
  campos preservam seus labels individuais.
- Evidência: QA-FORM-GRUPOS e edição de vínculos com nomes individuais exatos;
  reprodução registrada em `formularios-antes-3.log`.
- Limite: correção pontual, sem auditoria completa de acessibilidade.

## QA-BUG-009 — Falha de consulta posterior mascara decisão já registrada

- Severidade: MÉDIA. Famílias F12/F13, aprovação e rejeição de RH/Financeiro.
- Reprodução: confirmar decisão com HTTP 200 e devolver 503 somente ao GET
  posterior de `/atividades/pedidos-financeiros`. O POST é efetivado uma vez.
- Antes: o hook retorna falha da decisão; o formulário continua aberto com
  mensagem para nova tentativa, apesar do resultado já confirmado.
- Causa: POST e recarga da lista eram tratados pelo mesmo `catch`.
- Correção: tratamento separado da consulta; resposta confirmada aplicada à
  análise correspondente e histórico, com aviso de sincronização. Ações já
  concluídas desaparecem; o aviso é removido na consulta completa bem-sucedida.
  Pedidos e análises não relacionados são preservados.
- Arquivo: `Frontend/UI/src/hooks/useControleAtivos.js`.
- Evidência: reprodução local em `financeiro-antes-correcao.log` e snapshot
  próprio; QA-DEC-03/04 nos dois viewports; QA-FIN-REAL verifica o estado e o
  evento único no histórico financeiro da API real.
- Limite: não implica que houve duplicação no banco. O backend também valida
  a fase da decisão. Não se trata de idempotência geral para respostas de POST
  perdidas após commit.

## QA-BUG-010 — Plano e edição confirmados apresentados como recusados

- Severidade: MÉDIA. Famílias F11/F13.
- Reprodução: confirmar POST de plano ou PATCH de edição com HTTP 200 e recusar
  somente a consulta consolidada posterior com HTTP 503. Fluxos: plano novo,
  revisão aprovada, edição Financeiro/RH e saldo vinculado.
- Antes: formulário permanece aberto com erro e oferece nova tentativa apesar
  de uma gravação já confirmada. Cinco reproduções anteriores preservadas.
- Causa: gravação e recarga da lista no mesmo tratamento de erro.
- Correção: tratamento de sincronização compartilhado com aprovação/rejeição;
  aplicar a resposta somente à análise correspondente, conservar os demais
  pedidos e avisar que a lista completa ainda precisa atualizar. Reabertura
  conserva campos confirmados; retomar foco sincroniza sem novo envio.
- Recusa real do POST/PATCH continua preservando preenchimento e permitindo
  nova tentativa explícita. Agregações completas aguardam o GET bem-sucedido.
- Arquivo: `Frontend/UI/src/hooks/useControleAtivos.js`.
- Evidência: QA-SYNC-01/02 locais; QA-SYNC-REAL com POST/PATCH reais, consulta
  direta da API, campos persistidos, um evento ALTERACAO e uma gravação por caso.
  Ver [sincronização financeira](SINCRONIZACAO_FINANCEIRA.md).
- Limite: não foi comprovada duplicação no banco; a resposta da própria gravação
  perdida após commit permanece uma ressalva de idempotência geral.

## QA-BUG-011 — Listagem excede o prazo sob carga sintética

- Severidade: MÉDIA. **CORRIGIDO E VALIDADO NO PERFIL COMPARTILHADO**.
- Reprodução: três obras, 5.000 equipamentos e 2.000 pedidos adicionais,
  20 contas distintas de Gerência e prazo de 10 segundos por resposta.
- Antes da correção final: no orçamento compartilhado, oito timeouts em
  68 tentativas; as sequências interrompidas não completaram as 100 leituras.
- Causa e correção: consultas de histórico por registro foram agrupadas;
  projeção de leitura evita registrar milhares de equipamentos no contexto
  de persistência. Manutenções e calibrações são consultadas separadamente,
  agrupadas por ID e ordenadas. Normalização de catálogo usa padrões
  pré-compilados. Sem cache de respostas ou saldos.
- As regras de disponibilidade, filtros por perfil/obra, mascaramento e
  bloqueios de escrita foram preservados. O contrato compara o DTO completo,
  incluindo manutenção/calibração, e os testes de privacidade continuam ativos.
- Resultado final: **788 Java**, seis suítes e **38 E2E** aprovados. Carga:
  **100 leituras sem erros**, p95 **6.992 ms**, máximo **8.193 ms**.
- Orçamento validado: API 2 CPUs / 4 GiB (heap 2 GiB), banco 0,5 CPU / 512 MiB,
  UI 0,25 CPU / 128 MiB. O perfil que usava 4 CPUs na API não vale para a
  aceitação da VPS compartilhada. As tentativas reprovadas foram preservadas.
- Limite: mede HTTP local, sem 20 navegadores ou tráfego do Nextcloud. O
  volume real ainda não foi contado; não comprova SLA da Hostinger.
- Evidência: [snapshot final](evidencias/validacao-final-piloto-2026-10-29.json)
  e [protocolo e histórico](CARGA_E_RESTAURACAO_PILOTO.md).

## QA-BUG-012 — Pacotes vulneráveis na imagem da interface

- Severidade: **CRÍTICA**, pelo maior grau reportado pelo Trivy. **CORRIGIDO E VALIDADO**.
- Primeira varredura: Brotli `1.2.0-r1` com `CVE-2026-111497` (CRITICAL);
  curl e libcurl `8.22.0-r0` com `CVE-2026-92392` (HIGH). Duas CVEs, três
  ocorrências de pacote, agrupadas em um achado da imagem.
- Correção: `apk upgrade --no-cache` no estágio final do Dockerfile da UI;
  instalados Brotli `1.2.1-r0` e curl/libcurl `8.23.0-r0`.
- Validação: seis suítes, 38 E2E sem retries, carga na imagem API integrada e
  Trivy nas imagens finais com zero HIGH/CRITICAL. Relatórios anteriores
  preservados; nenhum ignore, scanner ou limite de severidade foi relaxado.
- Limite: achado de dependências da imagem, sem exploração reproduzida no ERP;
  a varredura não declara ausência de alertas médios/baixos ou falhas futuras.
- Evidência: [snapshot final](evidencias/validacao-final-piloto-2026-10-29.json).
