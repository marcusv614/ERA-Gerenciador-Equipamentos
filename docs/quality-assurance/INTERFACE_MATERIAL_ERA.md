# Interface Material ERA — 29/10/2026

A interface passou a usar uma linguagem inspirada no [Material Design 3](https://m3.material.io/styles/color/roles), adaptada à identidade ERA. A implementação usa CSS e os componentes React existentes, sem adicionar biblioteca de componentes ou dependências JavaScript.

## Identidade e sistema visual

| Papel | Tema claro | Tema escuro |
| --- | --- | --- |
| Fundo | Branco com leve tom verde `#f5f8f5` | Verde profundo `#0a1b13` |
| Superfície | Branco `#ffffff` | Verde `#10271c` |
| Ação principal | Laranja `#ac4c00`, texto branco | Laranja `#ffb77a`, texto marrom escuro |
| Seleção secundária | Verde suave `#d1eddb` | Verde `#204c35` |
| Texto principal | Verde quase preto `#1b2e22` | Branco esverdeado `#e2efe4` |

O logo original foi preservado, com suporte branco nas superfícies escuras. O laranja foi ajustado por papel para manter legibilidade nas ações. Erro, sucesso e situações dos equipamentos continuam usando cores semânticas, acompanhadas de texto/ícones.

Os papéis de cor, formas, elevações e movimentos ficam em `Frontend/UI/src/styles/material-theme.css`. Os aliases existentes de gerência, administração, campo e estoque apontam para esses papéis, incluindo diálogos e notificações em portais. Para ajustar a identidade, alterar os tokens compartilhados; evitar novas paletas isoladas em componentes.

Cartões usam cantos arredondados e elevação discreta. Navegação e seleções usam superfícies tonais; botões de ação têm formato arredondado, estados de foco visíveis e pares de cor próprios. Diálogos usam cantos de 28 pixels e superfície tonal. A preferência de movimento reduzido é respeitada. A tipografia principal é Roboto, com Arial como alternativa. Roboto e Roboto Mono são servidas localmente em WOFF2 (aproximadamente 76 KB no total), com as licenças SIL OFL no repositório e em `public/fonts/LICENSES.txt`. Não há carregamento de fontes externas; a política `font-src self` permanece compatível.

Foram atualizados acesso e recuperação, dashboards, navegação, cartões, formulários, modais, tabelas, notificações e fluxos de gerência/RH/Financeiro, administração, estoque e campo/TST. As alterações da aplicação estão restritas aos estilos.

## Verificação

- Lint e build finais: aprovados em `lint-22.log` e `build-16.log`.
- Regressão conclusiva: **278/278 casos desktop/mobile aprovados**, sem falhas, ignorados ou retries, em `browser-20.log`.
- Prévia com dados fictícios: sete perfis nos temas claro/escuro, com Roboto local carregada; gerência também em 390 e 320 pixels. Sem overflow horizontal nos painéis desktop verificados. O rodapé do cadastro foi conferido por limites geométricos em desktop e em 320 pixels, mantendo o botão inteiro dentro do diálogo.
- Vinte e seis combinações de texto/fundo dos tokens foram calculadas: todas acima de 4,5:1. A referência é o [critério de contraste mínimo da W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Isso verifica os pares da paleta; não constitui auditoria integral de acessibilidade de todos os elementos e estados.

Artefatos locais: `test-results/material-era/`, incluindo a galeria `preview.html`. A prévia usa API simulada e bloqueia acessos externos; as capturas finais também usam as fontes locais, sem depender de serviços externos.

## Relação com o fechamento do piloto

O fechamento técnico anterior registra a versão anterior à mudança visual. Seus snapshots são históricos e permanecem preservados. Esta rodada revalida a interface; a nova imagem de publicação ainda deve passar pela integração e pela varredura do fluxo de release antes do piloto. O teste de carga HTTP anterior não mede o desempenho da nova renderização no navegador.

Não houve implantação na Hostinger. O piloto e a cópia real do banco continuam adiados, conforme orientação do usuário. O orçamento de CPU/RAM preparado para compartilhar a VPS com Nextcloud permanece para a próxima implantação autorizada.

Uma rodada intermediária passou com 278 casos. A rodada seguinte foi interrompida pelo limite global de 15 minutos, sem falhas nos casos concluídos; seu log está preservado em `etapa-fontes-interrompida`. O executor passou a reservar até 45 minutos para a campanha completa de navegador. Os timeouts de cada teste, as assertivas e a configuração sem retries foram mantidos. A rodada conclusiva valida as fontes locais e o ajuste do rodapé.

Snapshot: [evidências da interface Material](evidencias/interface-material-era-2026-10-29.json). A revisão final de cores e foco foi conferida pelas prévias e pelo build final, além da regressão funcional.
