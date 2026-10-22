# Compatibilidade do histórico de migrações

As versões 36, 37 e 38 já foram aplicadas em um banco de desenvolvimento durante a implementação de e-mail. Seus arquivos SQL originais permanecem no projeto para que o Flyway valide esse histórico. Esses arquivos mantêm somente a estrutura histórica do banco; não adicionam serviço, endpoint, interface ou envio de e-mail à aplicação atual.

| Versão | Conteúdo | Checksum Flyway original |
|---|---|---|
| 36 | Configuração e registros de e-mail | 1124857223 |
| 37 | Provedor dos registros de e-mail | -1413606151 |
| 38 | Preparação da mensagem para cliente externo | -46184779 |
| 40 | Perfis TST/RH e categoria EPI | — |
| 41 | Contato opcional de funcionário | — |
| 42 | Perfil Financeiro e eventos de aprovação | — |
| 43 | Planejamento do atendimento pelo Financeiro | — |

As novas funcionalidades usavam inicialmente os números 36–39. Foram renumeradas para 40–43 porque esses números colidiam com o histórico existente. Não se deve reutilizar nem editar uma migração aplicada; alterações futuras recebem uma nova versão.

A correção restaura os SQLs originais sem executar `repair`, desativar a validação, alterar os checksums registrados ou apagar o volume do PostgreSQL. Bancos novos executam a sequência completa; bancos com as migrações antigas de e-mail recebem as funcionalidades posteriores normalmente.
