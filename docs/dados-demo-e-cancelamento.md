# Dados de demonstração e proposta de cancelamento

## Carga local de demonstração

Execução manual na raiz, com serviços locais em execução:

```sh
node scripts/criar-dados-demo.mjs --confirmar-banco-local
```

Requer Node com fetch, Docker Compose, Python 3 e libargon2 local. Faça backup antes. Não executar na Hostinger/produção: o parâmetro é uma confirmação humana, não uma detecção automática de ambiente. A carga usa o banco do Compose atual e o endereço local `http://localhost:8088`. Não é uma migration e não roda no deploy.

Cria oito contas (`demo.admin`, `demo.gerente`, `demo.rh`, `demo.financeiro`, `demo.estoque`, `demo.tecnico1`, `demo.tecnico2`, `demo.tst`), sete funcionários, três obras e nove equipamentos/lotes iniciais, além das entradas de compra geradas pelo fluxo. Todos os nomes têm prefixo DEMO. E-mail e telefone não são preenchidos. As senhas são aleatórias, distintas e ficam somente no arquivo `/tmp/era-demo-acessos-<timestamp>.json` indicado ao executar, com permissão 0600. Guarde-o em local privado se precisar conservá-lo; /tmp é temporário.

Somente o bootstrap da conta demo.admin usa SQL (Argon2id com parâmetros do servidor). Os demais registros, trocas de senha, aprovações, reservas, compras e transportes passam pela API autenticada, com CSRF e as permissões reais. A carga não apaga registros, não redefine contas preexistentes e recusa execução quando já existem contas demo. Uma falha pode deixar carga parcial: não apagar os dados para tentar novamente; investigar a etapa que falhou.

### Cenários preparados

| Cenário | Pedidos | O que testar |
|---|---|---|
| Pendente | 2 | Gerência recebe ferramentas, RH recebe EPIs |
| Aguardando financeiro | 2 | Aprovar, rejeitar ou planejar compras e origens |
| Aprovada | 2 | Um plano misto (obra + compra), um de compra de EPI |
| Compra recebida | 1 | Estoque confirma separação de compra recebida |
| Em trânsito | 2 | Notificações, recebimento pelo técnico/TST |
| Concluída | 2 | Histórico, entrega e movimentação |
| Rejeitada | 2 | Histórico preservado e ausência de execução |

Os equipamentos têm saldos no depósito e nas obras. Incluem ferramentas auditáveis e EPIs não auditáveis. Não são testes exaustivos: ainda testar manualmente acesso cruzado entre perfis, uso mobile/desktop, atendimento parcial, movimentação direta, manutenção/calibração e falhas/repetição de ações.

## Cancelamento seguro — proposta aprovada

Implementação e regras finais: [cancelamento de solicitações e dashboard RH](cancelamento-solicitacoes.md). O texto abaixo registra a proposta original.

O sistema atual tem rejeição na análise e cancelamento interno de movimentações substituídas, mas isso não constitui um cancelamento completo de solicitação.

| Momento | Regra proposta |
|---|---|
| Pendente | Solicitante cancela o próprio pedido; Gerência/RH cancela dentro do respectivo escopo |
| Aguardando financeiro | Gerência/RH solicita retirada; Financeiro ou responsável autorizado confirma, sem apagar pareceres |
| Aprovada, execução não iniciada | Financeiro cancela, libera apenas as reservas desse pedido e avisa Gerência/RH e Estoque |
| Compra/atendimento já iniciado | Suspender novas ações; Financeiro trata compra pendente ou já realizada com o Estoque antes de encerrar |
| Compra já recebida | Manter nota e entrada; liberar saldo remanescente ao depósito somente após conferência, sem apagar a compra |
| Separada ou em trânsito | Interrupção logística com confirmação física e devolução/reroteamento; nunca recolocar saldo na origem automaticamente |
| Concluída ou parcialmente entregue | Registrar devolução/ajuste vinculado; preservar entregas e cancelar somente o saldo não atendido |

Requisitos de implementação:

- Motivo obrigatório, confirmação explícita e histórico com autor, perfil, data, estado anterior e itens/quantidades afetados. Não excluir o pedido nem reutilizar rejeição como cancelamento.
- Estado intermediário `Cancelamento solicitado`/suspensão quando houver execução, sem confundir suspensão com cancelamento confirmado.
- Permissões no backend; Estoque pode comunicar impedimento, mas não desfazer decisão financeira. ADMIN também precisa seguir as invariantes físicas e registrar motivo.
- Transação e bloqueios nos pedidos, itens e equipamentos; concorrência com compra, separação e recebimento não pode gerar saldo negativo ou liberar reserva duas vezes. Repetir a confirmação deve ser idempotente.
- Considerar pedido principal e filhos de atendimentos parciais. Não cancelar automaticamente o que já foi entregue.
- Avisos aos envolvidos, histórico visível para Gerência/RH dentro do escopo, Financeiro e Estoque; Kanban mantém cancelados consultáveis sem ações de execução.
- Testar cada etapa, autorização por perfil/EPI, compra parcial, transporte direto, pedidos divididos e tentativas simultâneas/repetidas.
