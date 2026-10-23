# Compatibilidade do histórico de migrações

O histórico de referência é o banco que já recebeu TST/RH e Financeiro nas versões 36–39. Os arquivos foram recuperados do commit `32d0bdf`, sem alterar seu conteúdo nem os registros do banco.

| Versão | Conteúdo | Checksum Flyway |
|---|---|---|
| 36 | Perfis TST/RH e categoria EPI | -57127539 |
| 37 | Contato opcional de funcionário | 46588798 |
| 38 | Perfil Financeiro e eventos de aprovação | -227939204 |
| 39 | Planejamento do atendimento pelo Financeiro | -1018223467 |
| 44 | Materiais originais em atendimentos parciais | — |
| 45 | Notificações de envio para obras | — |
| 46–48 | Estrutura histórica de e-mails | — |
| 49 | Cancelamento auditável e notificações por evento | — |

Os números 40–43 ficam sem uso: eram cópias renumeradas de 36–39 e não foram aplicados no banco local verificado. O Flyway permite lacunas. As migrações de e-mail que colidiam com 36–38 foram movidas para 46–48; apenas preservam estrutura histórica, sem implementar envio de mensagens. Não renumerar novamente estes arquivos após sua aplicação.

## Atualização e deploy na Hostinger

1. Faça um backup externo do PostgreSQL e confira se é restaurável.
2. Confira `SELECT version, script, checksum FROM flyway_schema_history ORDER BY installed_rank;` no banco de destino.
3. Banco novo: use a sequência atual completa. Banco com o histórico de referência acima (ou somente até V35): atualize normalmente; o Flyway valida e aplica as versões pendentes.
4. Se o destino tiver e-mails nas versões 36–38, ou as cópias TST/Financeiro em 40–43, **não faça deploy direto**. Esse é outro histórico, incompatível com a referência. Prepare e valide uma reconciliação específica em uma cópia do banco antes de atualizar. Não execute `repair` nem edite `flyway_schema_history` indiscriminadamente.
5. Verifique a saúde da API e teste login e fluxos principais antes de liberar o acesso.

A correção não apaga o volume, não desativa a validação e não altera checksums no banco. Nunca use `docker compose down -v` em produção.

Um banco vazio também executa V26, que remove os dados iniciais de demonstração. Essa limpeza só ocorre uma vez; ela não será repetida nos bancos onde V26 já consta como aplicada.
