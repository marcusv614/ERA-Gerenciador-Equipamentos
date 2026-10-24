# Validação de 23/10/2026

## Resultado

| Camada | Resultado |
| --- | --- |
| Java/JUnit/Mockito | 280 testes, sem falhas ou testes ignorados |
| Frontend/Node | 145 testes, sem falhas ou testes ignorados |
| Integração HTTP | 814 requisições contabilizadas pelos roteiros, além das sessões auxiliares e da preparação de dados |
| Navegador/Chromium | 28 cenários aprovados: desktop/mobile, sete perfis, claro/escuro, pedidos, falhas e relatórios |
| Dependências npm | Zero vulnerabilidades reportadas após atualização transitiva do Zod |
| Dependências Java/OSV | 102 bibliotecas de runtime consultadas, sem alertas |
| Lint/build e whitespace | Aprovados; permanece o aviso de bundle JavaScript maior que 500 kB |

As três suítes finais (`atendimento-parcial`, `regressao` e `recuperacao`) passaram.
Resumo local: `test-results/integracao-1792803551138/resumo.json`.
Relatório de navegador, incluindo seis PDFs renderizados:
`test-results/integracao-1792803551138/navegador/index.html`.
Artefatos ignorados pelo Git; não são parte do código versionado.

As imagens foram reconstruídas com a correção da aplicação. A repetição final
utilizou `--sem-build` após ajustes somente nos seletores dos testes.

## Defeito encontrado e corrigido

Na calibração, a comparação de datas usava o dia de um `OffsetDateTime` devolvido
em UTC pelo PostgreSQL. Depois das 20h em Manaus, isso podia recusar uma retirada
ou envio no mesmo dia como se fosse anterior à solicitação.

A comparação agora converte o instante para `America/Manaus`. Foram acrescentadas
três regressões: retirada no mesmo dia, envio direto do depósito e bloqueio de
retirada realmente anterior. O ciclo completo também passou com banco real.

A auditoria de dependências encontrou um alerta alto no Zod de desenvolvimento;
a atualização compatível de 4.4.3 para 4.6.7 eliminou o alerta consultado.

## Cobertura e limites

JaCoCo: **80,46% das linhas e 61,44% dos ramos** da API nos testes Java. O relatório
não agrega a instrumentação das chamadas HTTP feitas nos containers.

Node: 95,17% das linhas dos módulos JavaScript carregados por esses testes.
Esse número **não representa a cobertura dos componentes React ou de toda a UI**.

Não é uma certificação de ausência de falhas nem cobertura de 100%. A matriz e
as lacunas estão no [guia de testes](TESTES.md): outros navegadores, regressão
visual com referências, carga, acessibilidade, backups e bancos legados.

## Ambiente

Dados fictícios em PostgreSQL próprio, redes e portas locais aleatórias; SMTP
fictício sem entrega externa. Logs das três suítes foram conferidos contra senhas,
tokens e e-mail conhecidos das fixtures. Containers de teste removidos ao concluir.

Banco, containers habituais e Hostinger não foram alterados/reiniciados. A correção
está no código e nas imagens de teste; ainda precisa da reconstrução normal da API
para entrar no ambiente habitual. Nenhum commit ou push foi feito.

O workflow foi ampliado para executar integração/navegador e publicar relatórios.
Não houve execução remota do GitHub Actions nesta sessão.
