# Recuperação de conta de administrador por e-mail

Recurso exclusivo para contas **ADMIN ativas**. Os demais logins e senhas continuam sob gestão do administrador. Não é login com Google: o Gmail envia as mensagens, e cada administrador confirma seu próprio endereço de recuperação (que pode ser Gmail ou outro provedor).

## Configurar o remetente Gmail

1. Na conta Gmail que enviará as mensagens, ative a verificação em duas etapas.
2. Gere uma [senha de app do Google](https://support.google.com/accounts/answer/185833), se a opção estiver disponível nessa conta. Não use a senha pessoal do Google. Contas com determinadas políticas ou Proteção Avançada podem não oferecer senhas de app.
3. No `.env` **do servidor**, adicione:

   ```dotenv
   RECOVERY_ENABLED=true
   RECOVERY_PUBLIC_URL=https://endereco-publico-do-sistema
   MAIL_USERNAME=seu-remetente@gmail.com
   MAIL_PASSWORD=senha-de-app-de-16-caracteres-sem-espacos
   ```

   SMTP padrão: `smtp.gmail.com:587`, autenticação e STARTTLS obrigatório, com verificação do certificado e limites de tempo. Não exponha essas variáveis com prefixo `VITE_`, não compartilhe-as no chat e não versione o `.env` real. A senha de app dá acesso ao serviço de e-mail: proteja o servidor e prefira futuramente um remetente dedicado ao sistema. O Gmail pessoal tem limites de envio e não substitui um serviço transacional para grandes volumes.

4. Para desenvolvimento local, a URL pode ser `http://localhost:8088`. Para ngrok ou Hostinger, use a origem HTTPS exata, sem caminhos, parâmetros ou fragmentos. Os overrides ngrok/produção usam `PUBLIC_APP_URL` se `RECOVERY_PUBLIC_URL` não estiver definido. Atualize a URL ao trocar de túnel/domínio. Não usamos o cabeçalho `Host` fornecido na requisição para construir links.
5. Depois de atualizar o código/imagem e a configuração, recrie os serviços, **sem remover volumes**:

   ```sh
   docker compose up -d --build api ui
   ```

   Na Hostinger, mantenha o procedimento de publicação das imagens e use o compose de produção; não é necessário apagar ou recriar o banco.

O recurso vem desabilitado (`RECOVERY_ENABLED=false`). Nessa condição, o login existente continua funcionando e o Admin informa que o remetente não foi configurado. Ao habilitar, URL inválida ou credenciais vazias impedem a inicialização, em vez de ativar uma recuperação insegura. Se credenciais não vazias estiverem incorretas ou o SMTP estiver indisponível, o formulário de confirmação informa a falha de envio; não marque um endereço como confirmado manualmente para contornar isso. Se necessário, desabilite temporariamente o recurso na configuração do servidor e recrie a API enquanto corrige o remetente.

## Uso

- Primeiro acesso: trocar senha temporária → informar e-mail e senha atual do ERA → confirmar código de 8 números → painel. Administradores já existentes também passam pela etapa no próximo acesso após habilitar o recurso.
- Código válido por 15 minutos, com no máximo 5 tentativas. Outro código exige a senha atual e invalida o anterior; há intervalo mínimo de um minuto e limite de 5 solicitações por hora por administrador (incluindo tentativas com senha errada).
- Na Administração, **Meu e-mail de recuperação** permite alterar o endereço da própria conta. O endereço anterior permanece ativo até a nova confirmação e recebe um aviso após a troca. Não é permitido configurar o e-mail de outro administrador por esse fluxo.
- **Esqueci minha senha** solicita o login. A resposta não revela a existência, o perfil ou o e-mail da conta. Apenas administradores ativos com endereço confirmado recebem o link.
- Link aleatório de 256 bits, válido por 15 minutos e de uso único. Apenas o hash é persistido. O segredo viaja no fragmento do link, que não é enviado nos logs HTTP e é removido da barra de endereço ao abrir a tela. Não há consumo em GET, nem login automático após redefinir.
- Redefinir exige uma senha diferente da atual, encerra as sessões anteriores e envia um aviso. Mudanças de senha, login, perfil, vínculo ou status invalidam links anteriores pela versão de sessão. Alterar o e-mail confirmado também invalida os links. Remover o perfil ADMIN limpa o endereço; uma futura promoção exige nova confirmação.
- As verificações são feitas na API, além da interface. Não basta esconder botões para proteger o recurso.

## Operação e auditoria

O indicador SMTP automático não integra a saúde geral da API (`management.health.mail.enabled=false`). Assim, o Docker não bloqueia a interface por falta de configuração ou indisponibilidade do Gmail. Os indicadores do banco e os demais controles de saúde permanecem ativos. Isso não habilita o envio sem credenciais: os erros continuam sendo tratados no fluxo de recuperação e registrados sem dados sensíveis.

Migração aditiva `V51`, sem redefinir senhas ou alterar contatos de funcionários. O e-mail de recuperação não é copiado do cadastro de funcionário e não é exibido na listagem administrativa de outras contas.

`recuperacao_eventos` registra, por ID de usuário e data, envio/erro de confirmação, confirmação/troca de e-mail, solicitação e conclusão da recuperação. Não registra códigos, links ou senhas. `recuperacao_tokens` guarda hashes e metadados; tokens expirados há mais de 7 dias são removidos automaticamente. Eventos de auditoria são preservados.

Contadores persistentes e atômicos por hora resistem ao reinício da API: 5 solicitações por login, 100 por origem, 500 globais; 60 tentativas de redefinição por origem. As chaves são hashes, não IPs/logins em texto. A origem é `remoteAddr`, sem confiar em `X-Forwarded-For` digitado pelo cliente. Quando o proxy agrega os acessos, o limite por origem pode ser compartilhado; o limite por login continua independente. A fila de envio pública é limitada e não expõe erros SMTP na resposta. Monitore falhas de envio nos logs sem ativar debug de SMTP ou logs de corpos HTTP.

Depois de configurar, valide em uma conta administrativa de teste: confirmação, código incorreto/expirado, recuperação completa, reutilização do link, revogação da sessão antiga e negativa para todos os perfis não ADMIN. Nenhum e-mail real é enviado pelos testes unitários.

Referências: [recuperação segura — OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html), [senhas de app — Google](https://support.google.com/accounts/answer/185833), [SMTP Gmail](https://developers.google.com/workspace/gmail/imap/imap-smtp).
