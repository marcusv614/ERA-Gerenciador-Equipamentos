# Cancelamento de solicitações

Implementado pela migração V49, sem alterar migrações já aplicadas. Não há exclusão de pedidos, notas ou entradas de compra.

## Como usar

Abra um atendimento e selecione **Cancelamento e histórico**. Informe motivo/parecer (5–1000 caracteres) e confirme a declaração. A opção existe nas visões de Gerência, RH, Financeiro e Estoque; o solicitante pode cancelar seu próprio pedido pendente. A API aplica as permissões e o escopo independentemente da interface.

- Pendente: solicitante ou gestor do setor pode cancelar; Estoque não consulta pedidos ainda não aprovados.
- Aguardando Financeiro: o gestor pode solicitar a retirada; Financeiro confirma. Enquanto isso, o pedido fica suspenso.
- Aprovado sem execução: Financeiro confirma e libera reservas. Transporte direto é confirmado pelo gestor, sem aprovação financeira.
- Com providências iniciadas, compra recebida, materiais separados ou transporte em andamento: exige parecer responsável e conferência do Estoque. O formulário explica a confirmação física necessária. Enquanto não houver ambas, as reservas permanecem e compra, edição, separação, envio e recebimento são bloqueados.
- Em trânsito: o Estoque só deve confirmar após TODOS os materiais estarem de volta na origem registrada. O sistema registra essa declaração, não comprova fisicamente o retorno. Como o estoque físico só é transferido ao confirmar recebimento, o cancelamento libera a reserva original sem inventar um novo deslocamento.
- Compra recebida: lote, quantidade, nota e entrada são preservados; a reserva do pedido é liberada após conferência. Compras externas pendentes precisam ser tratadas com o fornecedor antes do parecer financeiro.
- Concluído: não pode ser cancelado. Use o fluxo existente de devolução/transporte direto, autorizado pelo gestor e confirmado no destino. O recebimento original permanece no histórico.
- Atendimento parcial: o cancelamento atua SOMENTE no atendimento escolhido; não cancela filhos, irmãos ou entregas anteriores automaticamente.

O cancelamento não tem retomada automática: um novo atendimento deve ser criado se a necessidade voltar. ADMIN precisa cumprir as mesmas conferências físicas, embora tenha as duas permissões.

## Garantias técnicas

As operações usam transação e bloqueio pessimista do pedido, compartilhado com aprovação, compra, separação e recebimento. A liberação confere integridade das reservas, preserva o saldo de outros pedidos e é idempotente: confirmar novamente não libera saldo duas vezes. Qualquer inconsistência reverte a transação.

Motivo, estado anterior, autor, login, data e pareceres ficam no histórico. Avisos de solicitação e conclusão são enviados ao setor responsável, Financeiro (exceto transporte direto), Estoque e técnico/TST. Cancelados e suspensos continuam consultáveis no Kanban. O cadastro de funcionários/obras considera cancelados como encerrados.

## Dashboard RH

O acesso **RH · EPIs** no cabeçalho do Admin abre a mesma dashboard usada por contas RH. Reutiliza o layout de pedidos do Financeiro: Kanban, agrupamento por técnico/obra, compras e PDF. Acrescenta a etapa inicial de aprovação do RH e o acompanhamento de envio/entrega por atendimento. O histórico completo de cada atendimento pode ser exportado em PDF.

`GET /atividades/pedidos-rh` aceita somente RH/ADMIN e restringe os registros a pedidos de EPI dos TSTs. O filtro do servidor também vale para compras, saldos parciais e histórico; não se trata apenas de ocultar ferramentas na interface. RH continua sem permissão para cadastrar funcionários ou equipamentos e sem poder decidir o plano financeiro.

## Verificação

Testes unitários em `CancelamentoSolicitacaoTests` e `PerfisTstRhTests`, testes da interface em `cancelamento.test.js` e teste HTTP em `scripts/validar-cancelamento-rh.mjs`. Este último exige uma cópia descartável do banco DEMO na API local 18089 e o arquivo privado de acessos; não executar contra o banco principal:

```sh
node scripts/validar-cancelamento-rh.mjs /caminho/privado/acessos-demo.json --banco-descartavel
```
