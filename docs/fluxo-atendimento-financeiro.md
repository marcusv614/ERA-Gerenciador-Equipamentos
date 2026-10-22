# Transporte, compra e execução pelo estoque

O Kanban da Gerência também atende o Financeiro. Pedidos de catálogo seguem a primeira análise da Gerência (técnicos) ou do RH (TSTs/EPI) e depois ficam em **Aguardando financeiro**.

O Financeiro define, por material, quais equipamentos existentes serão utilizados, suas origens e quantidades, e a quantidade para compra. Pode autorizar uma compra mesmo havendo saldo em outra obra, registrando uma justificativa para preservar o equipamento em uso. A soma de transporte e compra deve corresponder exatamente ao pedido.

Salvar o plano registra as instruções e a justificativa no histórico, visível à Gerência/RH. Aprovar valida novamente o saldo e reserva os equipamentos escolhidos. O estoque recebe o pedido somente após essa aprovação.

O estoque executa o plano: realiza as compras autorizadas, registra entradas com nota fiscal, confirma a separação e registra o transporte. Não pode mudar origens ou quantidades nem solicitar novas compras. Os lotes recebidos ficam reservados para o atendimento e são usados na execução. O técnico/TST confirma a entrega na obra; o estoque confirma o retorno ao depósito. As permissões de administração continuam disponíveis ao administrador.

O botão **Mover** usa um fluxo próprio de transporte direto: exige um único equipamento existente, com identificação, origem e saldo validados. A Gerência/RH encaminha esse transporte diretamente ao estoque. Uma lista de catálogo continua passando pelo Financeiro, mesmo que parte ou todos os materiais já existam no depósito ou em outra obra.

Pedidos ainda não separados são encaminhados à análise financeira pela migração V39. Compras já recebidas são preservadas e reaproveitadas pelo plano; equipamentos já separados continuam no fluxo de execução existente.
