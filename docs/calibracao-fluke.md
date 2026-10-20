# Calibração dos equipamentos Fluke

Em **Equipamentos → Calibração**, o gerente, administrador ou estoque pode abrir
um atendimento por número de série. Cada Fluke precisa estar cadastrado com
quantidade igual a um. Reservas e manutenções existentes precisam terminar antes
da solicitação. Uma solicitação já bloqueia o equipamento para outros pedidos.

## Etapas e localização

| Etapa | Localização e ação |
| --- | --- |
| Aguardando retirada | Permanece na obra e com o técnico original. O estoque vê a obra e o responsável em **Pedidos → Calibrações a atender**. |
| Aguardando envio | O estoque confirma a retirada e chegada ao depósito. A obra deixa de conter o equipamento e recebe um novo retrato de inventário; a retirada também entra nas movimentações. |
| Em calibração | O estoque informa laboratório, data do envio e previsão de retorno opcional. Os cards identificam o laboratório e o saldo disponível permanece zero. |
| Concluída | O estoque confirma a chegada ao depósito, data da calibração, número do certificado e validade conforme o documento. O saldo é liberado no depósito. |
| Cancelada | Antes do envio ao laboratório, o atendimento pode ser cancelado com motivo. A localização física já confirmada é preservada. |

Somente estoque e administrador confirmam as etapas físicas. Cada evento guarda
nome, login e perfil da conta autenticada, instante do lançamento e observação.
Datas informadas pelo operador são preservadas separadamente desses instantes.
Envio, calibração e retorno devem respeitar sua ordem cronológica.

Em **Manutenção**, no painel do estoque, o botão **Calibração** dos Flukes permite
consultar atendimentos e certificados, inclusive depois do retorno.

## Certificados e vencimento

O campo **Certificado anterior** registra documentos existentes sem inventar
retirada, envio ou retorno. A posição e a custódia do equipamento são preservadas.
A calibração concluída mais recente, pela data de calibração, determina o
certificado atual; lançar um certificado antigo depois não substitui um recente.

Cards e listas indicam certificado ausente, vencido, vencendo em até 30 dias ou
válido. A validade é inclusiva e segue a data do certificado, sem prazo fixo.
Os filtros da tela de equipamentos permitem consultar essas situações.
Os indicadores de validade são informativos; o bloqueio de saldo acompanha o
atendimento operacional em andamento.

O histórico do equipamento e seu PDF incluem as calibrações, as datas, a obra
de origem, o técnico, o laboratório, o certificado e os autores dos eventos.
Os registros são preservados mesmo após a conclusão. Equipamentos com esse
histórico podem ser arquivados depois do atendimento, mas não excluídos.

## Verificação

- Testes Java: transições, permissões, certificado anterior, datas, duplicidades,
  quantidade individual e bloqueio em conjunto com manutenção/reservas.
- Integração com PostgreSQL temporário: migração V34, ciclo completo, repetição
  de etapas, persistência e duas solicitações concorrentes para o mesmo Fluke.
- Interface: vencimento, documento seguro e ciclo gerente/estoque em Chrome
  com larguras de 320, 390, 844 e 1440 pixels.
