# Relatório de qualidade

> Atualização posterior: nova interface Material ERA validada com 278 testes de navegador, lint/build, fontes locais e revisão visual dos sete perfis. O fechamento do piloto registrado abaixo é do candidato anterior à mudança de estilos; ver [Interface Material ERA](INTERFACE_MATERIAL_ERA.md).

Atualização final de **29/10/2026**: os **nove critérios técnicos passaram**.
Foram aprovados **788 testes Java**, seis suítes de integração, **38 E2E** e o
ensaio de restauração (24 tabelas, 20 sequências). Carga HTTP de **20 sessões,
100 leituras sem erros**, no orçamento preparado para compartilhar a VPS com
Nextcloud: API 2 CPUs / 4 GiB, banco 0,5 CPU / 512 MiB e UI 0,25 CPU / 128 MiB.
P95 de 6,99 s; máximo de 8,19 s.
A varredura final identificou **zero HIGH/CRITICAL** nas duas imagens, após
corrigir três ocorrências em dois CVEs na imagem da UI. QA-BUG-011 e 012
encerrados nos escopos validados: **12 defeitos confirmados e corrigidos**
(um crítico, dois altos, sete médios e dois baixos). O grau crítico de QA-BUG-012
é a classificação do scanner para pacotes da imagem, sem exploração reproduzida.

Os 189 Node e 278 casos locais de navegador permanecem aprovados no código da
interface preservado por hash; não foram repetidos. Lint/build também passaram
na reconstrução atual da imagem UI. O piloto permanece **adiado**. A cópia real
do banco foi **adiada pelo usuário**; o dump em Documentos é fictício.
Não houve implantação ou alteração do Nextcloud. Ver [fechamento](FECHAMENTO_PILOTO.md)
e [carga/restauração](CARGA_E_RESTAURACAO_PILOTO.md). Os registros abaixo são históricos.

Atualização de **29/10/2026**: **787 testes Java aprovados**, sem falhas, erros
ou ignorados; scanners npm/OSV reexecutados sem alertas. Ensaio avulso de
restauração aprovado (24 tabelas, 20 sequências) e cópia fictícia salva em
Documentos com hash conferido. **QA-BUG-011 permanece aberto**: as 20 leituras
simultâneas excederam 10 segundos tanto com 1 GiB quanto com 2 GiB. A consulta
isolada melhorou; a carga não foi aprovada. Integração final, E2E atualizados e
imagens aguardam Docker. Quatro dos nove critérios aprovados, quatro bloqueados
e um reprovado; **piloto adiado**. Ver [fechamento atual](FECHAMENTO_PILOTO.md) e
[carga/restauração](CARGA_E_RESTAURACAO_PILOTO.md). As rodadas abaixo são históricas.

Preparação técnica do piloto entregue com pendências; **início ADIADO pelo
usuário**. Quatro critérios
aprovados (integridade dos fontes, evidência da interface preservada por hash,
validações locais e dependências) e quatro bloqueados pelo Docker indisponível
(integração completa, restauração, imagens e E2E atualizados). Foram reexecutados
**786 Java e 189 Node**, lint/build e scanners de dependências, todos aprovados;
npm sem vulnerabilidades e 102 bibliotecas OSV sem alertas. Os 278 testes locais
de navegador permanecem como evidência anterior no mesmo código, sem nova execução.
Não houve novo defeito de aplicação confirmado. Critérios, roteiro de operação,
contingência e condições pendentes em [fechamento do piloto](FECHAMENTO_PILOTO.md).
As verificações pendentes serão retomadas antes do início do piloto.
As rodadas abaixo são históricas.

Rodada de sincronização financeira: QA-BUG-010, severidade MÉDIA, corrigido e
validado. Plano e edição confirmados conservam o resultado quando só a consulta
posterior falha, sem orientar novo envio. **278 navegador local, 189 Node,
38 E2E reais e oito QA-API aprovados**; lint/build e scripts HTTP aprovados.
Foram acrescentadas 14 execuções locais e quatro E2E. Linhas Istanbul:
**68,11% global**, **67,34% JSX**. Permanecem 102 fontes; apenas
o hook mudou nesta rodada. Inventário acumulado: dez defeitos confirmados,
corrigidos nas respectivas rodadas. Detalhes, evidências e limites em
[sincronização financeira](SINCRONIZACAO_FINANCEIRA.md). Parecer:
**APROVADA COM RESSALVAS**. As rodadas abaixo são históricas.

Rodada de RH/Financeiro: QA-BUG-009, severidade MÉDIA, corrigido e validado.
POST confirmado com falha do GET deixa de ser apresentado como decisão recusada.
**264 navegador local, 189 Node, 34 E2E reais e oito QA-API aprovados**; lint/build
aprovados e scripts HTTP de cancelamento, operações e segurança aprovados.
Foram acrescentadas 30 execuções locais e quatro E2E. Linhas Istanbul:
**65,95% global**, **65,08% JSX**. O denominador
continua com 102 fontes, mas há código novo no hook. Inventário: nove defeitos
confirmados, corrigidos e validados. Detalhes, reprodução e limites em
[RH/Financeiro](RH_FINANCEIRO.md). O parecer permanece **APROVADA COM RESSALVAS**.
As rodadas abaixo são históricas; Java unitário e scanners não foram repetidos.

Rodada de compra recebida e atendimento parcial: **234 navegador e 189 Node
aprovados**, lint/build aprovados; 22 execuções novas. A suíte HTTP de atendimento
parcial passou novamente em API/PostgreSQL reais descartáveis, com reservas,
rollback e sequência 6+1+3. Outras stacks e E2E não foram repetidos. Sem alteração
de produção nem novo defeito confirmado. Linhas Istanbul: **60,72% global**
e **60,07% JSX**, preservando os mesmos 102 fontes.
Detalhes e limites em [compra e atendimento parcial](COMPRAS_ATENDIMENTO_PARCIAL.md).
O parecer continua **APROVADA COM RESSALVAS**. As rodadas abaixo são históricas.

Rodada de operação dos equipamentos e painéis com dados: **212 navegador e
189 Node aprovados**, lint/build aprovados; 36 execuções novas de manutenção,
calibração, Estoque e consulta RH/Financeiro. Não houve alteração de produção
nem novo defeito confirmado. Linhas Istanbul: **57,41% global**
e **56,33% JSX**, com os mesmos 102 fontes e denominadores.
Detalhes e ressalvas atuais em [operação dos equipamentos](OPERACAO_EQUIPAMENTOS.md).
Backend/integração e scanners não foram repetidos. O parecer continua
**APROVADA COM RESSALVAS**. As rodadas abaixo são históricas.

Rodada dos formulários reais: **176 navegador e 189 Node aprovados**, lint/build
aprovados. Foram corrigidos QA-BUG-006 (envio duplicado, MÉDIA), QA-BUG-007
(validação nativa/Enter, BAIXA) e QA-BUG-008 (nomes acessíveis dos grupos, BAIXA).
São 46 execuções novas. Linhas Istanbul: **50,14% global**,
**49,39% JSX**; o hook mantém **100% das linhas** e chega a
**89,65% dos ramos**. Os 102 fontes continuam no denominador;
os componentes receberam código novo. Backend/integração não foram repetidos.
Detalhes, evidências e ressalvas em [formulários reais](FORMULARIOS_REAIS.md).
O parecer permanece **APROVADA COM RESSALVAS**. As rodadas abaixo são históricas.

## Retomada de 27/10/2026

Rodada de `useControleAtivos`: 28 cenários novos (56 execuções desktop/mobile)
para CRUD, arquivamento, pedidos, validações locais, Financeiro/RH e refresh.
Detalhes e métricas atuais em [controle de ativos](CONTROLE_ATIVOS.md).
Não houve alteração no código de produção nem novo defeito confirmado.
Regressão final: **130 navegador e 189 Node aprovados**, lint/build aprovados.
No hook: **100% das linhas (179/179)** e **87,06% dos ramos (101/116)**,
antes 32,40%/37,06%. Os quatro arquivos de hooks chegam a **99,59% das linhas**;
a interface completa tem **39,16% de linhas** e JSX continua em **33,14%**.
Formulários/componentes com dados seguem prioritários; os percentuais abaixo
descrevem a rodada anterior de medição da interface.

Rodada de interface: instrumentação Istanbul dos **102 fontes JS/JSX**, incluindo
os **58 JSX** e os quatro arquivos de hooks. Foram adicionadas 44 execuções de
navegador, além das 30 existentes. Método, resultados e lacunas em
[cobertura da interface](COBERTURA_INTERFACE.md). Não houve alteração em
`Frontend/UI/src` nem novo defeito de produção confirmado nesta rodada.
Resultado: **74 navegador e 189 Node aprovados**, lint/build/audit aprovados.
Cobertura de linhas Istanbul: **33,27% global**, **33,14% JSX** e **50,60% nos
quatro arquivos de hooks**. São denominadores completos da interface; o V8 Node
continua separado. A cobertura funcional permanece parcial.

Rodada mais recente: **QA-BUG-005**, de severidade MÉDIA, reproduzido e corrigido
na reentrega de notificações, que mantinha materiais, obra e perfil antigos.
Regressão Java: **786 aprovados**, zero falhas/erros/ignorados. Cobertura:
**87,51% de instruções**, **90,74% de linhas** e **75,40% de ramos**.
Ver [persistência e concorrência de notificações](NOTIFICACOES_PERSISTENCIA.md).
O inventário passa a cinco defeitos confirmados: três médios e dois altos.
Todos estão corrigidos e validados. A integração mais recente passou nas cinco
stacks, incluindo os oito QA-NOT, 30 E2E, cinco QA-ADM e oito QA-API, além dos
scripts HTTP existentes. O parecer permanece **APROVADA COM RESSALVAS**.
As rodadas anteriores seguem abaixo com seus resultados históricos.

Na rodada posterior de proteção do último administrador foram reproduzidos e
corrigidos **dois defeitos ALTOS**, por concorrência e por arquivamento de
funcionário vinculado. A regressão Java final passou em **785 testes**, com
**87,49% de instruções**, **90,72% de linhas** e **75,35% de ramos**. Detalhes,
evidências e limites em [proteção do último administrador](CONCORRENCIA_ADMINISTRADORES.md).
Naquela rodada, o total de defeitos confirmados passou a quatro (dois médios e dois altos),
todos corrigidos e validados. A integração final passou nas quatro stacks,
incluindo 30 E2E, oito QA-API e cinco QA-ADM, além dos scripts HTTP existentes.
O parecer permanece **APROVADA COM RESSALVAS** para os demais limites registrados.
Os resultados da primeira retomada seguem abaixo.

Adicionados 91 casos de serviço; regressão Java completa com **783 aprovados,
zero falhas/erros/ignorados**, em 46 classes. Instruções Java: **87,46%**;
linhas: **90,64%**; ramos: **75,31%** (antes 66,91%). Não houve alteração de
produção nem novo defeito confirmado. O parecer permanece **APROVADA COM RESSALVAS**.

Resultados, limites e fila priorizada: [continuação das ressalvas](CONTINUACAO_RESSALVAS.md).
Evidência: `evidencias/continuacao-2026-10-27.json`. As contagens consolidadas de
949 casos e os resultados de UI/integração/scanners abaixo referem-se à avaliação
de 26/10, preservada; essas suítes não foram reexecutadas na retomada.

## Inventário e arquitetura

A aplicação é um monólito modular REST com interface React. Há 17 controladores,
75 mapeamentos HTTP de métodos, 19 classes de serviço/apoio e 48 migrations SQL.
Logout e health são tratados adicionalmente pelo Spring Security/Actuator e não
entram na contagem dos 75 mapeamentos de controladores. Inventário exato:
`evidencias/endpoints.json`. A matriz organiza 31 famílias funcionais.

Linguagens: Java, JavaScript/JSX, SQL, CSS, YAML, shell e PowerShell. Backend:
Controller → DTO/Bean Validation → Service transacional → Spring Data JPA →
PostgreSQL; DTOs impedem que entidades sejam diretamente recebidas pela API.
Frontend: contexto de autenticação, painéis por perfil, hooks de estado, serviços
Axios e utilitários de regras/documentos. A navegação principal é controlada por
estado React. Persistência inclui relacionamentos, reservas, JSONB e histórico;
repositórios usam locks pessimistas nas operações sensíveis.

Integrações: SMTP de recuperação, e-mail preparado no cliente externo para
compras, impressão/PDF e CSV no navegador. Infraestrutura: Compose, Nginx,
Traefik/GHCR no deploy, ngrok na homologação e GitHub Actions/OSV/npm audit/Trivy
na automação. As configurações com credenciais não foram alteradas.

## Avaliação dos resultados de 26/10/2026

Dois defeitos de severidade média foram reproduzidos e corrigidos com autorização:
elementos nulos em categorias e nomes com vírgula no inventário. A regressão local
final tem 911 testes locais, 30 E2E integrados e oito casos HTTP adicionais:
949 aprovados, zero reprovados, com expectativas originais preservadas. Também
passaram os demais scripts de negócio/segurança, somando pelo menos 851
requisições verificadas. Detalhes e limitações dos dados antigos:
`BUGS_ENCONTRADOS.md`.

Classificação global: **APROVADA COM RESSALVAS** para o escopo executado.
Justificativa: defeitos reproduzidos corrigidos; regressão sem falhas; persistência,
48 migrations, concorrência da última unidade/cancelamento, recuperação com SMTP
fictício e 30 E2E reais aprovados. O bloqueio inicial do Docker foi resolvido pelo
usuário e não permanece como impedimento da execução final.

Na rodada de 26/10, as ressalvas eram a cobertura de ramos Java em 66,91%, os módulos JSX fora
da medição Node, combinações de fluxo não exaustivas, histórico legado ambíguo e
os tipos de teste não executados listados abaixo. Este parecer não autoriza nem
comprova deploy, segurança absoluta ou funcionamento de todas as entradas possíveis.

Métricas finais: 31 famílias inventariadas, 949 casos quantificáveis planejados,
implementados e executados; 949 aprovados, zero reprovados/ignorados/bloqueados
nessas suítes. Defeitos confirmados: 2 médios, ambos corrigidos; críticos/altos
confirmados: zero. Instruções Java 82,65%, linhas Java 87,85%, ramos Java 66,91%;
nos 29 módulos JS carregados, linhas 95,91% e ramos 84,20%.

Cobertura funcional por família: todas as 31 possuem alguma evidência executada
(31/31). Isso indica abrangência temática, não verificação integral dos requisitos.
Não foi calculado um percentual de cobertura de todas as regras/combinatórias;
o número de famílias ou de testes não é substituto dessa medida.

## Segurança e integridade

Executados: matriz de 39 combinações de método/rota × sete perfis e anônimo
(312 casos), mais CSRF, CORS e headers; revogação/troca/bloqueio de sessão;
recuperação de administrador; validação de DTOs; erros seguros; escape de HTML e
neutralização de fórmulas CSV. A matriz MockMvc prova a cadeia de segurança, não
o acesso final a cada objeto; a autorização por obra/setor tem testes de serviço
e cenários HTTP distintos. SMTP foi simulado nos testes unitários; a suíte real
usou servidor fictício sem entrega externa e validou rollback após falha de envio.

A análise de código encontrou consultas parametrizadas e mecanismos de lock,
e a execução real confirmou as invariantes de concorrência selecionadas. Não foram
executados ataques contra produção, servidores externos ou contas pessoais.
Zero alertas npm/OSV corresponde às versões e às bases consultadas nessa data;
não é declaração de ausência de vulnerabilidades.

## Lacunas e riscos residuais

| Área | Evidência / risco | Próximo passo |
| --- | --- | --- |
| EquipamentoService | 83,66% instruções; 68,21% ramos em 27/10 | Edição, arquivamento, histórico restrito e compras ampliados; restam cadastro, lotes e combinações das respostas restritas |
| UsuarioService | 91,34% instruções; 83,33% ramos em 27/10 após a correção | Concorrência e arquivamento protegidos, conforme QA-BUG-003/004; restam outras combinações e carga prolongada |
| Notificações | 99,01% instruções; 94,64% ramos após QA-BUG-005 | Gravação, rollback para múltiplos destinatários, paginação SQL e interações simultâneas reais exercitados; limites em `NOTIFICACOES_PERSISTENCIA.md` |
| JSX e hooks da interface | Incluídos na medição Istanbul dos 102 fontes; useControleAtivos ampliado na rodada seguinte | Priorizar formulários e painéis com dados; métricas e limites em `CONTROLE_ATIVOS.md` e `COBERTURA_INTERFACE.md` |
| Acessibilidade | Teclado/foco e alguns formulários exercitados | Auditoria WCAG com contraste, leitor de tela e todos os painéis |
| Navegadores | Chromium desktop/mobile | Firefox, WebKit e dispositivos reais |
| Desempenho | Smoke local e dez leituras reais, p50 20,56 ms / p95 amostral 28,48 ms | Volume representativo, aquecimento, percentis, concorrência e orçamento de recursos |
| Consultas em listas | `findAll` e consultas de histórico por equipamento | Suspeita estática de custo/N+1; medir SQL e latência com volume antes de corrigir |
| Histórico legado | Nome com vírgula já armazenado é ambíguo | Recuperar somente com fonte confiável; sem reescrita automática |
| Rollback de versão | Backend antigo não entende `json:v1:` | Considerar novos snapshots ao preparar rollback |
| Infraestrutura | Falhas, restauração e legado não representativo | Testar backup/restore e upgrade de base histórica em cópia isolada |
| Imagens e ambiente | npm/OSV não cobrem pacotes do sistema | Executar Trivy/DAST onde disponíveis; não reutilizar resultado antigo do CI |

Nenhuma suspeita de desempenho ou segurança identificada apenas na leitura foi
contada como defeito confirmado. Complexidade alta de SolicitacaoService e
componentes extensos aumenta o custo de manutenção; não foi inventada métrica
de duplicação ou de caminhos, nem proposto refactor de produção nesta análise.

## Base reproduzível entregue

Novas classes `Qa*` em `Backend/API/src/test/java`, utilitários Node adicionais,
`Frontend/UI/qa-browser`, oito cenários HTTP em `scripts/testes/qualidade.mjs`,
executor/coletor em `scripts/qa`, inclusão da suíte local de UI no CI existente e
os cinco relatórios desta pasta. A matriz liga
funcionalidades aos arquivos de teste e o inventário JSON enumera endpoints e
casos Java reais. Os artefatos locais de navegador ficam fora do diretório que a
suíte E2E limpa ao iniciar, preservando os resultados das duas execuções.
Não houve instalação de bibliotecas adicionais, commit, push,
deploy ou alteração das credenciais.
