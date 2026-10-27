# Relatório de qualidade

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

## Avaliação dos resultados

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

As ressalvas são a cobertura de ramos Java ainda em 66,91%, os módulos JSX fora
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
| EquipamentoService | 53,02% instruções; 33,82% ramos na suíte local | Ampliar combinações de edição, arquivamento, histórico restrito e compras |
| UsuarioService | 64,77% instruções; 45,61% ramos | Mais combinações de mudança de perfil/vínculo, último admin e falhas concorrentes |
| Notificações | 80,36% instruções; 58,93% ramos | Ampliar paginação, reentrega, falhas e interações simultâneas |
| JSX e hooks da interface | Fora da cobertura Node | Medir componentes e cenários adicionais de interação com ferramenta apropriada |
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
