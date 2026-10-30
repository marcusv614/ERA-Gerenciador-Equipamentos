# Revisão das dashboards ERA

A apresentação foi revisada mantendo os contratos de API, perfis, aprovações, reservas e movimentações existentes. As referências visuais são os [layouts adaptativos](https://m3.material.io/foundations/layout/canonical-examples/overview), [cards](https://m3.material.io/components/cards/guidelines) e [movimento](https://m3.material.io/styles/motion/overview) do Material Design 3.

## Decisões de interface

- Verde ERA na navegação, laranja nas ações principais e superfícies neutras no conteúdo. Etapas financeiras, transporte, atenção, conclusão e rejeição têm cores semânticas, acompanhadas de texto.
- “Solicitações” identifica a mesma área no cabeçalho, menu lateral e navegação móvel. “Equipamentos” também substitui o rótulo genérico “Ferramentas” no agrupamento do inventário.
- A pesquisa tem uma única contagem de resultados. O menu “Criar” reúne os três cadastros existentes e fecha por Escape ou clique externo.
- O resumo geral do inventário fica em Equipamentos. O Depósito apresenta seus próprios materiais, evitando indicadores globais misturados a uma lista local.
- Cards e linhas dos pedidos mostram materiais, quantidades e destino. O Kanban conserva todos os estados, detalhes, documentos e ações. A quantidade de unidades é distinta da quantidade de tipos de material.
- Técnico e TST mantêm pedido/devolução → obra → materiais → revisão. Os controles de quantidade e o envio são os mesmos. A obra aparece durante a seleção, com acesso para alterá-la; a revisão inclui a medida do material quando cadastrada.
- Administração mantém todos os perfis e ações de acesso, recuperação e eventos de segurança. No celular, um seletor torna as sete áreas acessíveis.
- Estoque mantém filas, compras, histórico, manutenção e calibração. Atalhos de período ficam visíveis; datas e ordenação ficam em um painel expansível, aberto automaticamente ao escolher “Personalizado”.
- Vistorias mantêm preparação de fichas, filtros, PDF, CSV e histórico. A tabela se apresenta como registros com rótulos no celular; filtros e preparação de fichas são expansíveis, deixando o histórico em primeiro plano.
- Animações curtas respeitam `prefers-reduced-motion`. Controles importantes têm foco visível e áreas de toque adequadas.

## Inconsistências corrigidas

A busca no depósito assumia que todo equipamento tinha série, causando erro também ao pesquisar em outras áreas do painel. Agora aceita série ausente. A quantidade dos pedidos nas obras também usa a quantidade comum quando a resposta não contém `quantidadeSolicitada`, evitando exibir `NaN`.

Nos cards de funcionários, série e situação seguem a ordem dos cabeçalhos e permanecem na mesma linha no desktop. Os estilos antigos de atividades, troca de tema e expansão de cards que já não eram usados foram removidos do painel compartilhado. Os estilos do técnico e do estoque foram reescritos para os componentes atuais.

## Verificação

Na pasta `Frontend/UI`:

```sh
npm run lint
npm run build
npm test
npm run test:ui:dashboards
```

Os testes de dashboards usam os componentes reais com API simulada e não escrevem no banco da empresa. Cobrem os sete perfis, temas claro/escuro, desktop de 1440 px, celular de 390 px e transbordamento em 320 px. Também verificam envio do técnico com quantidades e observação, busca de materiais sem série, menu por teclado, filtros do estoque e troca de áreas administrativas.

As capturas ficam em `test-results/refatoracao-ui/`. As regressões existentes continuam disponíveis em `npm run test:ui`; seus seletores foram atualizados apenas onde os nomes da interface mudaram.

A validação com API simulada não substitui os testes de integração com banco e API reais. Nenhuma migração ou regra de negócio do backend foi alterada.

## Resultado desta revisão — 29/10/2026

- Lint, build de produção e 189 testes unitários aprovados.
- 22 cenários novos de dashboards aprovados em uma rodada final isolada.
- 110 cenários existentes de interface executados: 108 aprovados na primeira rodada e os dois cenários de arquivamento aprovados no reteste, depois de atualizar o seletor que ainda esperava “Ferramentas arquivadas”.
- Os testes de interface usam API simulada. Não foi executada uma nova rodada de integração com banco real.

Prévias locais: [Gerência no desktop](../test-results/refatoracao-ui/previas/gerencia-desktop.png), [catálogo do técnico no celular](../test-results/refatoracao-ui/previas/tecnico-mobile.png) e [vistorias no celular](../test-results/refatoracao-ui/previas/vistorias-mobile.png).

O serviço `ui` do Docker Compose local foi reconstruído e atualizado na porta 8088. Após a atualização, UI, API e banco estavam saudáveis, e `/api/actuator/health` respondeu `UP`.

## Continuação — 30/10/2026

- O cabeçalho do técnico fica compacto durante a escolha da obra, materiais e revisão. O aviso de recebimentos continua disponível na entrada e a contagem permanece na navegação de pedidos.
- A seleção dos materiais usa nome, categoria, medida, ícone de seleção e quantidade, sem repetir “Adicionar ao pedido” em todos os cards.
- Depois do envio, o pedido criado recebe foco e aparece na tela. As etapas do formulário começam no topo.
- Cartões, lista e depósito compartilham a apresentação das quantidades: total, disponível, reservado, manutenção, calibração e trânsito. Situações adicionais aparecem somente quando têm quantidade positiva.
- O depósito evita separadores vazios em itens sem medida ou série e segue a mesma identificação visível do inventário.
- A troca de dashboard restaura a rolagem depois da atualização do conteúdo. A rolagem automática da área não recebe animação global, evitando movimentos herdados da tela anterior.
- As capturas de celular usam o tamanho da tela, evitando imagens longas com barras fixas aparecendo no meio da página.

Os novos cenários verificam os saldos nas três apresentações, a restauração da rolagem, a devolução limitada ao saldo da obra, a medida na revisão e o foco no pedido enviado. As regras de quantidade e os payloads das operações foram mantidos.

Validação da continuação: 28 cenários de dashboards aprovados em desktop e celular, incluindo os seis novos casos de saldos, rolagem e devolução. Os 189 testes unitários passaram. O build Docker executou lint e compilação de produção com sucesso e atualizou o serviço UI local.
