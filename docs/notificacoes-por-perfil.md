# Notificações por responsabilidade

O sino usa o mesmo componente visual, mas destinatários, títulos e mensagens são definidos pelo evento no servidor. Ter acesso ao histórico não significa receber todos os avisos.

| Evento | Quem recebe |
|---|---|
| Novo pedido de ferramentas | Gerentes ativos |
| Novo pedido de EPI | RH ativo |
| Aprovação inicial / pedido criado pelo gestor | Financeiro |
| Plano financeiro aprovado | Estoque |
| Transporte direto autorizado | Estoque, sem passar pelo Financeiro |
| Alteração financeira | Gerência ou RH conforme o material; Estoque também quando já aprovado |
| Envio para obra | Responsáveis ativos da obra do mesmo setor (técnicos ou TSTs) |
| Recebimento confirmado | Estoque e gestor do setor |
| Rejeição inicial | Técnico/TST responsável |
| Rejeição financeira | Técnico/TST e gestor do setor |
| Cancelamento solicitado | Financeiro (ou gestor em transporte direto); Estoque somente se já chegou à execução |
| Cancelamento confirmado | Técnico/TST, gestor e setores envolvidos nas etapas já alcançadas |

ADMIN não recebe cópias automáticas de todas as etapas; continua podendo acompanhar os painéis e o histórico. Funcionários de outros setores não recebem dados de EPI por serem responsáveis pela mesma obra.

Repetidas alterações financeiras atualizam o aviso do pedido e reabrem sua leitura, sem criar uma pilha de avisos duplicados. O histórico auditável de cada alteração permanece no pedido. A titularidade da leitura, conta ativa e perfil continuam sendo conferidos na API.

Avisos antigos de envio distribuídos a gestores/Financeiro/Estoque deixam de aparecer nessas caixas (sem apagar registros). Não há geração retroativa de avisos para pedidos antigos. Os novos eventos são notificados a partir da atualização.

Cada aviso mostra seu evento, o número do pedido e a situação atual. Nos painéis operacionais, **Ver pedido** abre a fila ou o atendimento correspondente. Uma notificação antiga não autoriza repetir uma ação: o backend sempre valida a etapa atual.

Validação HTTP em cópia descartável do banco DEMO, na porta local 18089:

```sh
node scripts/validar-notificacoes-por-perfil.mjs /caminho/privado/acessos-demo.json --banco-descartavel
```
