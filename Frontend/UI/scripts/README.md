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

Relatórios e capturas ficam em `node_modules/.cache/layout-paineis`.
O processo termina com erro quando encontra overflow ou falha de interação.
