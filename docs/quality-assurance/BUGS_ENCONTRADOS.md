# Defeitos encontrados

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
