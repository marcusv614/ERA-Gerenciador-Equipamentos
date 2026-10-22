# Transporte, compra e execução pelo estoque

O Kanban da Gerência também atende o Financeiro. Pedidos de catálogo seguem a primeira análise da Gerência (técnicos) ou do RH (TSTs/EPI) e depois ficam em **Aguardando financeiro**.

O Financeiro define, por material, quais equipamentos existentes serão utilizados, suas origens e quantidades, e a quantidade para compra. Pode autorizar uma compra mesmo havendo saldo em outra obra, registrando uma justificativa para preservar o equipamento em uso. A soma de transporte e compra deve corresponder exatamente ao pedido.

Salvar o plano registra as instruções e a justificativa no histórico, visível à Gerência/RH. Aprovar valida novamente o saldo e reserva os equipamentos escolhidos. O estoque recebe o pedido somente após essa aprovação.

Na tela de planejamento, o destino aparece no cabeçalho e cada material mostra as origens agrupadas por depósito ou obra, com saldo e quantidade a transportar. A compra fica em uma área própria, com motivo obrigatório. A busca aceita material, local, identificação e responsável; o filtro permite revisar somente pendências ou itens planejados.

**Usar saldo disponível** completa o transporte sem alterar escolhas manuais ou compras já definidas, priorizando o depósito. Quando há busca, usa somente as origens exibidas. **Comprar as unidades restantes** preenche apenas a diferença do pedido. Quantidades já recebidas permanecem na compra e seus lotes não aparecem novamente como transporte de outra origem. Saldo insuficiente ou origem indisponível em um plano salvo impedem o salvamento até a revisão. Falhas da API aparecem na própria janela e preservam as escolhas para nova tentativa.

O estoque executa o plano: realiza as compras autorizadas, registra entradas com nota fiscal, confirma a separação e registra o transporte. Pode ajustar as quantidades do envio para separar somente o que está disponível, dentro das origens e compras já autorizadas. Novas compras ou mudanças de origem continuam sob decisão do Financeiro. Os lotes recebidos ficam reservados para o atendimento e são usados na execução. O técnico/TST confirma a entrega na obra; o estoque confirma o retorno ao depósito. As permissões de administração continuam disponíveis ao administrador.

## Revisão e envio parcial

O Financeiro pode comprar tudo, mesmo havendo saldo disponível em outra obra. O botão **Comprar tudo e manter nas origens** zera a retirada para aquele material; a justificativa continua obrigatória. Também pode usar **Editar atendimento aprovado** antes da separação para rever origens e compras, informando o motivo. A API atualiza as reservas na mesma transação e preserva unidades já recebidas. Equipamentos separados, em trânsito ou recebidos não podem ser alterados por esse formulário.

O estoque usa **Editar solicitação / envio parcial** para selecionar as unidades autorizadas que consegue enviar e registrar o motivo. Compras ainda sem entrada não ficam disponíveis para seleção. A confirmação separa os itens selecionados; o transporte é confirmado depois, pelo fluxo habitual. O saldo não atendido gera um atendimento pendente vinculado ao pedido original, com suas compras e reservas restantes preservadas.

Exemplo: o pedido autoriza comprar 10 unidades, mas o fornecedor entrega 6. O estoque registra a entrada de 6, informa o motivo e separa essas 6. O sistema mantém 4 pendentes para compra e envio posterior. Outra entrega pode atender uma parte ou todo o saldo. O pedido original, os autores, os motivos e os vínculos permanecem no histórico e no documento de vistoria. Compras e reservas são repartidas entre os atendimentos, sem contabilizar novamente unidades enviadas.

A migração V44 adiciona o retrato dos materiais originais para atendimentos parciais. A validação integrada, com banco e API temporários, é executada pela raiz com `./scripts/validar-atendimento-parcial.ps1`.

O botão **Mover** usa um fluxo próprio de transporte direto: exige um único equipamento existente, com identificação, origem e saldo validados. A Gerência/RH encaminha esse transporte diretamente ao estoque. Uma lista de catálogo continua passando pelo Financeiro, mesmo que parte ou todos os materiais já existam no depósito ou em outra obra.

Pedidos ainda não separados são encaminhados à análise financeira pela migração V43. Compras já recebidas são preservadas e reaproveitadas pelo plano; equipamentos já separados continuam no fluxo de execução existente.
