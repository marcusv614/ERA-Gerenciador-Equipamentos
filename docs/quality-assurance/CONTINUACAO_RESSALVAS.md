# Continuação das ressalvas — 27/10/2026

Rodada posterior nesta mesma data: a prioridade P0 abaixo foi tratada e dois
defeitos de proteção do último administrador foram corrigidos. Ver
[proteção do último administrador](CONCORRENCIA_ADMINISTRADORES.md).
As métricas e os 783 testes desta página descrevem a primeira retomada; a rodada
posterior tem 785 testes Java e uma suíte própria de concorrência real.
Depois, a rodada de [notificações](NOTIFICACOES_PERSISTENCIA.md) tratou sua
persistência/concorrência, corrigiu QA-BUG-005 e elevou a regressão Java a 786 casos.

Foram priorizadas as lacunas de autorização e integridade nos três serviços
destacados no relatório anterior. Foram adicionados **91 casos de teste**, sem
alteração de código de produção, dependências, credenciais ou dados habituais.
Nenhum novo defeito de produção foi confirmado nesta rodada.

## Execução e cobertura

Regressão Java completa: **783 aprovados em 46 classes, zero falhas, erros ou
ignorados**. Antes: 692 testes em 43 classes. Os 91 casos adicionais são 43 de
equipamentos, 26 de contas e 22 de notificações. O executor também concluiu o
empacotamento da API e conferiu os resultados Surefire, além do código do Maven.

| Escopo | Instruções antes → agora | Ramos antes → agora |
| --- | --- | --- |
| Java completo | 82,65% → 87,46% | 66,91% → 75,31% |
| EquipamentoService | 53,02% → 83,66% | 33,82% → 68,21% |
| UsuarioService | 64,77% → 91,19% | 45,61% → 83,33% |
| NotificacaoMovimentacaoService | 80,36% → 98,21% | 58,93% → 92,86% |

Linhas Java: 87,85% → 90,64%. Denominadores do JaCoCo preservados: 22.599
instruções, 2.191 ramos e 1.720 linhas. Agora estão cobertos 19.765 instruções,
1.650 ramos e 1.559 linhas. Os percentuais não representam cobertura integral
dos requisitos, dos fluxos ou das combinações de estado.

Evidência versionável: [snapshot desta rodada](evidencias/continuacao-2026-10-27.json),
com contadores, comparação anterior, comando, base Git e os 91 casos individuais.
Log local: `test-results/quality-assurance/java-7.log`; relatórios locais:
`Backend/API/target/surefire-reports/` e `Backend/API/target/site/jacoco/`.
O snapshot de 26/10 em `evidencias/metricas.json` foi preservado.

Para reproduzir, na raiz, com JDK 21 e dependências existentes:

```sh
node scripts/qa/executar.mjs --only=java
```

## Comportamentos adicionais verificados

- `QaUsuarioGestaoTests`: login normalizado duplicado; conflito de funcionário;
  vínculo obrigatório para Técnico/TST; funcionário ausente/arquivado; proteção
  sequencial do último administrador; rebaixamento com outro administrador;
  manutenção do perfil; remoção de vínculo; revogação de sessão ao mudar perfil,
  status ou senha; redefinição e reativação com limpeza de bloqueio; sucesso com
  versão válida, conta inativa e sessão revogada; reinício de falhas após expiração;
  perfil ativo de campo e criação do administrador com nome padrão.
- `QaEquipamentoRessalvasTests`: bloqueios de arquivamento por calibração,
  manutenção, reserva, obra, técnico e trânsito; restauração e idempotência;
  exclusão com históricos e atualização do snapshot após flush; preservação de
  série, catálogo e unidade com pendências; quantidade mínima incluindo manutenção;
  série duplicada; atualização de quantidade em obra; disponibilidade financeira
  e catálogo nos sete perfis; histórico de Técnico/TST restrito por obra e setor,
  inclusive retorno ao depósito e ocultação da localização atual não permitida;
  compras com cópia independente dos atributos e rejeição de catálogo arquivado.
- `QaNotificacaoRessalvasTests`: limites inferior/superior da página e titular;
  contador de não lidas e página seguinte; propagação de falha do repositório;
  proibição de leitura por conta inativa; rejeição financeira por setor;
  solicitante ausente, inativo ou de outro setor; filtragem/deduplicação de
  destinatários; encaminhamento do cancelamento por etapa e transporte direto;
  recebimento no depósito; reentrega que reutiliza o aviso e reabre sua leitura.

Os testes novos reutilizam Mockito e os modelos reais existentes. Eles não
executam SQL, não validam o comportamento dos locks nem o rollback do Spring.
As verificações de reentrega e leitura são sequenciais.

As tentativas intermediárias identificaram problemas nas fixtures: o autor da
auditoria não estava configurado no mock; um cenário de cancelamento pendente
usava a etapa de solicitação quando se pretendia verificar a confirmação.
O autor passou a ser configurado explicitamente e o cenário foi ajustado à etapa
exercitada pelo fluxo. As expectativas dos testes preexistentes não mudaram.
Os logs `java-5.log` e `java-6.log` preservam essas tentativas; não são contados
como defeitos da aplicação nem somados ao resultado final.

## Fila restante por prioridade

| Prioridade | Ressalva | Próxima evidência necessária |
| --- | --- | --- |
| P0, tratada na rodada posterior | Último administrador sob operações concorrentes e arquivamento | QA-BUG-003/004 reproduzidos e corrigidos; evidências e limites em `CONCORRENCIA_ADMINISTRADORES.md`. |
| P1 | Decisões ainda descobertas de equipamentos e contas | Usar o relatório JaCoCo para ampliar cadastro, alteração de campos controlados, recebimento, lotes derivados e combinações das respostas restritas de manutenção/calibração. |
| P1, tratada no escopo documentado | Notificações concorrentes e persistência | Oito casos reais, correção QA-BUG-005 e limites em `NOTIFICACOES_PERSISTENCIA.md`; não equivale a todas as combinações de concorrência. |
| P1, medição tratada; cobertura parcial | JSX e hooks | Istanbul inclui todos os 102 fontes. useControleAtivos ampliado para 100% das linhas e 87,06% dos ramos; priorizar formulários/painéis com dados. Ver `CONTROLE_ATIVOS.md` e `COBERTURA_INTERFACE.md`. |
| P1 | Infraestrutura e histórico | Backup/restore em cópia isolada e upgrade de base histórica representativa. Não recuperar nomes legados ambíguos sem fonte confiável; considerar `json:v1:` no rollback de versão. |
| P1 | Imagens e segurança dinâmica | Executar scanners de imagens e DAST no ambiente descartável; os resultados de dependências de 26/10 não substituem essas verificações. |
| P2 | Acessibilidade e navegadores | Contraste, leitor de tela, todos os painéis, Firefox/WebKit e dispositivos reais. |
| P2 | Volume, latência e custo de consultas | Medir SQL e suspeita de N+1 com volume representativo, aquecimento, concorrência e recursos; evitar concluir por smoke ou mocks. |

Na primeira retomada, nenhuma suspeita dessa fila foi classificada como defeito confirmado. Não foram
reexecutados Node, navegador, PostgreSQL/E2E ou scanners nesta rodada. Os 949 casos
de 26/10 continuam sendo evidência daquela avaliação; não foram somados aos 783
atuais para alegar uma nova execução integrada completa. Não houve commit, push
ou deploy.

O parecer permanece **APROVADA COM RESSALVAS** para o escopo documentado, com
redução das lacunas de serviço e preservação dos limites da avaliação anterior.
