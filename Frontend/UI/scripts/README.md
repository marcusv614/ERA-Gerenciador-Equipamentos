Verificação de responsividade dos painéis
======================================

Na pasta `Frontend/UI`, execute:

```powershell
node scripts/verificar-layout-paineis.mjs
```

Requer as dependências do frontend, Node.js 22 ou superior e Google Chrome
instalado no caminho padrão do Windows. Para outro caminho, defina `CHROME_PATH`.

O script inicia um Vite temporário com os componentes reais e respostas de API
fictícias. Não usa contas nem altera dados do ambiente de desenvolvimento.

Verifica os quatro perfis em larguras de 320, 390, 768, 844, 1024 e 1440 pixels.
A largura de 844 pixels usa altura de 390 pixels para conferir a orientação
horizontal. Inclui nomes longos, listas, cards, menus, navegação e janelas.
Os cliques são enviados ao navegador e falham quando o botão está encoberto.
Na movimentação, verifica também o retorno ao depósito com o técnico de origem,
o bloqueio de reenvio durante o processamento e o erro apresentado no modal.

Relatórios e capturas ficam em `node_modules/.cache/layout-paineis`.
O processo termina com erro quando encontra overflow ou falha de interação.

Para validar a operação do Estoque separadamente:

```powershell
node scripts/verificar-estoque-operacao.mjs
```

Confere fila ordenada, pedidos enviados separados, pesquisa por código, filtros
por obras de retirada, compras parciais, limites de quantidade, nota e série,
envio parcial, confirmação de saída, retorno ao depósito, documentos e erros
recuperáveis da API. Usa os componentes reais com dados simulados nos temas
claro e escuro, em seis tamanhos de tela, incluindo paisagem. Capturas e
relatório ficam em `node_modules/.cache/estoque-operacao`.

As calibrações do Estoque ficam na área Manutenção.

Para testar somente a calibração do Fluke:

```powershell
node scripts/verificar-layout-paineis.mjs --calibracao
```

São verificados pedido pelo gerente, fila do estoque, retirada, envio ao
laboratório, retorno com certificado e datas, em quatro tamanhos de tela.

Para testar a tela de planejamento do Financeiro:

```powershell
node scripts/verificar-planejamento-financeiro.mjs
```

Verifica os seis tamanhos de tela nos temas claro e escuro, agrupamento por
local, limites de quantidade, preenchimento do transporte, compras e motivos,
busca, filtros, erro da API, nova tentativa e bloqueio de envio duplicado.
Também testa revisão de um plano salvo com origem indisponível e fechamento
pelo teclado. As capturas e o relatório ficam em
`node_modules/.cache/plano-financeiro`.

Inclui revisão de um atendimento já aprovado e o botão na tela de detalhes,
compra integral sem retirada de outras obras e edição do envio parcial pelo
estoque. O teste integrado de permissões, reservas e compras sucessivas roda
pela raiz com `./scripts/validar-atendimento-parcial.ps1`, sempre em uma API e
banco temporários.

O roteiro visual também verifica o Kanban financeiro recebendo uma lista com
pedidos ainda pendentes: esses pedidos devem permanecer ocultos. Confere os
cartões de acompanhamento, a aprovação pelo gerente e a linha de etapas em
desktop e mobile. O teste integrado verifica a aprovação inicial, as permissões
para iniciar providências e a consulta do gerente ao evento registrado pelo estoque.
