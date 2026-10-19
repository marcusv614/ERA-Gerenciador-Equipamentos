# Validação do fluxo de materiais — 19/10/2026

Foi verificado o caminho entre cadastro, solicitação, aprovação, compra, separação, transporte, recebimento, devolução e auditoria periódica. Os testes de integração usaram uma API própria e um banco PostgreSQL temporário, com seis contas fictícias em sessões independentes. Esses recursos foram removidos ao terminar.

## Resultado

| Verificação | Resultado |
| --- | --- |
| Backend, Java 21 na imagem Docker | 105 testes aprovados |
| Interface e documentos | 54 testes aprovados |
| Integração HTTP com PostgreSQL e autenticação reais | 118 requisições verificadas |
| ESLint e compilação da interface | Aprovados |
| Quantidades da auditoria no Chrome, desktop e mobile | Digitação, colagem, setas, limpeza e redistribuição respeitam a quantidade da ficha |

## Cenários verificados

| Etapa | Comportamentos verificados |
| --- | --- |
| Cadastro | Item auditável ou não auditável; lote e unidade; série duplicada; quantidade zero ou decimal; cadastro restrito ao administrador. |
| Pedido | Somente catálogo cadastrado; quantidade solicitada pode superar o saldo; técnico só pede para obra autorizada; obra encerrada rejeitada; técnico não define séries de entrada. |
| Edição | Alterações antes do atendimento; destino encerrado rejeitado; compras e reservas não são apagadas pela edição posterior. |
| Aprovação | Análise pela gerência; aprovação/rejeição repetidas bloqueadas; pedido do gerente autoaprovado com autoria da conta autenticada, mesmo se o cliente enviar outro nome. |
| Compra | Quantidade limitada ao pedido; recebimentos parciais com notas distintas; entrada excedente rejeitada; lotes adquiridos preservam o atributo auditável. |
| Separação | Depósito e outra obra no mesmo pedido; quantidades conservadas; falta de saldo reverte a operação; histórico de compras permanece no pedido original; duas separações concorrentes não reservam o mesmo saldo. |
| Transporte | Envio pelo estoque; técnico não pode iniciar a entrega; material em transporte deixa de ser candidato a uma nova vistoria. |
| Recebimento | Somente o técnico destinatário confirma entrada na obra; administrador e outro técnico são bloqueados; confirmação repetida não duplica movimentações. |
| Devolução | Aprovação e coleta; confirmação no depósito pelo estoque; devolução parcial gera lote derivado; rejeição de devolução libera reservas. |
| Inventário | Quantidade total conservada após transferência e devolução parcial; origem/destino e horários reais no histórico; série longa aceita no cadastro continua funcionando na divisão do lote. |
| Auditoria | Apenas itens elegíveis do técnico; limites por soma dos estados, inclusive grandes valores; rascunho; conflito de versão; conclusão completa e imutável; novas vistorias periódicas; fotografia histórica preservada após movimentação. |
| Documentos e pesquisa | PDF de ficha e resultado, campos de assinatura, pesquisa por solicitação/obra e filtros de obra nas auditorias, CSV protegido contra fórmulas e conteúdo HTML escapado. Essas verificações são automatizadas sobre os modelos de documentos. |
| Erros e permissões | Respostas 400/401/403/404/405/409 nos cenários correspondentes; corpos de erro sem stack trace, exceção Java ou detalhes internos. |

## Correções realizadas durante a revisão

1. **Compras desapareciam ao separar o pedido.** A separação substituía as linhas que continham os contadores de compra. A migração V32 adiciona um registro persistente dessas compras no pedido original, apresentado na aba de compras e no relatório de auditoria. Uma compra ainda aguardando entrada precisa ser resolvida antes da separação.
2. **A série de um item reservado podia ser alterada.** Como os pedidos usam essa identificação, a alteração podia impedir o recebimento. Categoria, nome, medida e série ficam protegidos enquanto houver reservas; a interface explica o bloqueio. Edição, arquivamento e exclusão no serviço usam bloqueio do registro para respeitar reservas concorrentes.
3. **A divisão de um lote podia gerar série inválida.** Acrescentar o sufixo da movimentação a uma série de 120 caracteres excedia o tamanho permitido. A divisão agora gera uma identificação interna quando necessário, inclusive em caso de colisão.
4. **A validação de obra encerrada estava incompleta.** Cadastro de pedido por técnico e edição de destino passam pela mesma validação de recebimento usada pela gerência.

## Repetir os testes de integração

Pré-requisitos: Docker Desktop, Node.js e PostgreSQL de desenvolvimento em execução, com os nomes definidos em `compose.yaml` e projeto `era-erp-dev`.

```powershell
docker compose -p era-erp-dev --env-file .env -f compose.yaml build api
.\scripts\validar-fluxo-requisicoes.ps1
```

O script cria um banco separado no servidor PostgreSQL de desenvolvimento e um container de API com porta aleatória restrita ao localhost. As senhas utilizadas pelas contas fictícias valem somente nessa base descartável. Não é necessário informar credenciais de usuários reais. A limpeza ocorre também quando uma asserção falha.

## Limites da verificação

Os testes cobrem os cenários acima e não constituem garantia de ausência de falhas em qualquer combinação possível. Não foram executados testes de carga, de queda de infraestrutura ou de recuperação de backup. O fluxo HTTP usa API e banco reais; a navegação visual completa de todas as telas não foi automatizada nesta revisão.

A V32 preserva compras nas próximas separações. Ela não reconstrói dados de compra que uma separação anterior já tenha removido. Auditorias de conservação registram a condição encontrada; registrar uma avaria ou quebra não encaminha automaticamente o equipamento para manutenção.
