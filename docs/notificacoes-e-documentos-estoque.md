# Avisos de envio e documentos do estoque

O sino aparece nas dashboards de Administrador, Gerente, RH, Financeiro, Estoque, Técnico e TST. Ao confirmar o envio no estoque (`POST /atividades/{id}/transito`), a mesma transação grava os avisos das contas ativas. Aprovação e separação ainda não representam envio. Retiradas para o depósito não geram aviso de entrega em obra.

Técnicos e TSTs recebem os envios de seu setor para as obras sob sua responsabilidade. Administrador, Gerente e Estoque recebem os envios confirmados; o RH recebe apenas EPI destinado a TST; o Financeiro recebe os envios do fluxo financeiro, excluindo transportes diretos autorizados pela Gerência/RH. Nas áreas incorporadas do administrador, o sino permanece único e corresponde à conta administrativa autenticada.

Cada aviso apresenta uma frase curta, a obra, a data do envio e uma ação. O destinatário toca **Ver entrega**, o aviso fica lido e o sistema abre o cartão correto em Meus pedidos, com materiais e quantidades. Os demais responsáveis tocam **Entendi**. Nos envios parciais, cada aviso corresponde àquela remessa. O destinatário continua sendo o único profissional de campo autorizado a confirmar o recebimento. Após a conclusão, a caixa apresenta “Material recebido”.

As notificações ficam no banco, com leitura individual por conta, consulta paginada de 20 registros e atualização do sino a cada 15 segundos enquanto a página estiver visível. A troca de perfil revoga a consulta dos avisos anteriores; para profissionais de campo, a remoção do vínculo com a obra também revoga esse acesso. As APIs exigem sessão e CSRF para registrar leitura; o identificador de outro usuário retorna 404, inclusive quando quem tenta acessar é administrador. O aviso não contém origem restrita, informações financeiras ou credenciais.

Na dashboard do estoque, **Ordem de atendimento** imprime em A4 retrato:

- Destino e recebedor em destaque, referência do atendimento e do pedido original quando houver divisão.
- Autorizações com as datas e responsáveis registrados, sem presumir horários antigos.
- Materiais agrupados por local de retirada, com quantidade e código de cada registro.
- Compras autorizadas, entradas registradas, saldo ainda a comprar e compras aguardando entrada.
- Orientações do Financeiro e observações do pedido.

Após a separação, a ordem usa os registros reais daquela remessa e deixa de repetir as instruções do plano anterior. Envios em trânsito ou concluídos trazem sua situação para impedir nova execução com o mesmo documento. Quantidades remanescentes continuam no atendimento pendente criado pelo sistema.

**Rastreabilidade PDF** preserva autoria, pedido original, itens, compras, decisões, ajustes, saída e recebimento. Foram retirados resumos duplicados e instruções repetidas. Os inventários também deixam de repetir o saldo em uma segunda tabela e omitem tabelas auxiliares vazias. Fichas periódicas de vistoria continuam com condições dos materiais, observações e assinaturas.

## Verificação

`Frontend/UI/tests/ordemAtendimento.test.js` valida origens distintas, compras parciais, autorizações, remessas separadas, bloqueio de ordens pendentes e escape de HTML.

`Frontend/UI/scripts/verificar-notificacoes-documentos.mjs` usa as sete dashboards reais com API fictícia e Chrome temporário. Verifica seis larguras e dois temas, paginação, leitura, erro recuperável, teclado, sino único nas áreas do administrador, barra recolhida e geração do documento. Evidências e PDF de exemplo ficam em `Frontend/UI/node_modules/.cache/notificacoes-documentos`.

`scripts/validar-atendimento-parcial.ps1` cria API e banco descartáveis e executa os fluxos HTTP, incluindo entrega parcial, isolamento dos avisos por conta/setor/obra, leitura concorrente, persistência após login, CSRF e confirmação restrita ao destinatário. Os dados habituais não são alterados por esse roteiro.
