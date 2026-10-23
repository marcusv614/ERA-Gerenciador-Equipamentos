# Relatórios e exportação de auditoria

Os botões **Auditoria · PDF / Planilha** nos pedidos e nos funcionários ativos abrem um modal de exportação dentro da dashboard, com filtro de datas, impressão/salvamento em PDF e download de planilha CSV UTF-8 (Excel/LibreOffice). As demais fichas, inventários, romaneios e históricos usam o mesmo modal. O documento de impressão contém somente o relatório, sem botões ou campos de filtro.

- **Pedido:** somente a família do pedido original, materiais originais, atendimentos vinculados, decisões/justificativas, compras conferidas e eventos de envio/recebimento.
- **Pedidos da obra:** uma linha por evento do fluxo, com número do pedido/atendimento, solicitante, destinatário, responsável, conta e data/hora. Não mistura inventário ou lista de compras.
- **Compras da obra:** somente quantidades com aprovação financeira documentada e entrada registrada no estoque. Uma compra planejada, aprovada mas não recebida, ou uma transferência não é aquisição homologada. Entrada no estoque não comprova entrega na obra.
- **Funcionário ativo:** pedidos e aquisições vinculados ao ID do destinatário, respeitando o setor do usuário. Não usa o nome para relacionar pessoas nem inclui contatos pessoais desnecessários.

## Datas

No modal da dashboard, selecione **Dia específico** ou **Período** antes de imprimir ou baixar a planilha. Os dois formatos usam o mesmo recorte, com limites inclusivos e horário de Manaus. Fluxo usa a data de cada evento; compras usam a conferência da entrada. Isso inclui eventos ocorridos no período mesmo que o pedido tenha sido criado antes.

Linhas sem data histórica comprovada ficam fora do recorte e permanecem acessíveis em **Todos os registros**. Materiais originais e situações atuais são identificados como contexto e não representam saldos retroativos. Relatórios sem eventos datados não oferecem um filtro fictício: inventário passado continua disponível em **Obras → Por data**, baseado nos retratos efetivamente armazenados.

## Integridade e permissões

A migração V50 adiciona comprovantes de aquisição ao pedido, preservando material, quantidade, nota fiscal, fornecedor disponível, data/hora e operador da conferência. Alterar o cadastro do equipamento posteriormente não altera esses comprovantes. Novas solicitações, alterações, separações, envios e recebimentos registram autoria e horário. Não há reconstrução inventada de autoria em dados antigos.

Entradas legadas vinculadas a lote e a aprovação financeira são sinalizadas; nota/fornecedor eventualmente consultados no cadastro atual não são apresentados como retrato histórico. Contadores sem documentação suficiente não são classificados como compras homologadas.

A API verifica o usuário autenticado: Gerência não exporta EPI; RH exporta exclusivamente EPI; Financeiro não acessa pedidos ainda na primeira etapa nem transporte direto; Estoque não consulta listagens amplas nem pedidos não liberados. Técnicos/TSTs exportam apenas os dados de pedidos já autorizados em sua própria tela, sem acesso à consulta ampla. CSV neutraliza conteúdo que poderia virar fórmula; HTML escapa conteúdo informado pelos usuários.

Como referência de rastreabilidade (ação, data/hora e responsável), foi consultado o [e-ARQ Brasil v2 — Arquivo Nacional](https://www.gov.br/arquivonacional/pt-br/servicos/publicacoes/e-arq-brasil_v2.pdf). Os relatórios auxiliam a conferência operacional e não constituem certificação de conformidade nem substituem documentos fiscais originais.

## Atualização

Recrie API e interface com `docker compose up -d --build api ui`. A migração é incremental; não use `down -v` para atualizar. Não requer reset do banco. Depois, atualize a página do navegador.
