# ERA ERP

Monorepo do painel de gestão de equipamentos e obras da ERA.

Testes automatizados, matriz de cobertura e execução isolada: [guia de testes](docs/TESTES.md).

## Estrutura

```text
ERA-ERP/
├── Frontend/UI/   # React, Vite e Nginx
├── Backend/API/   # Spring Boot, Java 21, Flyway
├── compose.yaml   # PostgreSQL, API e UI
└── .env.example
```

## Executar com Docker

1. Copie `.env.example` para `.env` e substitua as senhas.
2. Construa e inicie os serviços:

```bash
docker compose up --build -d
```

3. Acesse `http://localhost:8088`.

Para acompanhar os serviços:

```bash
docker compose ps
docker compose logs -f
```

Para parar sem apagar o banco:

```bash
docker compose down
```

Para apagar também o volume do PostgreSQL, use `docker compose down -v` somente quando quiser reinicializar todos os dados.

## Testes externos com ngrok

1. Inicie o túnel para a interface publicada pelo Compose:

```bash
ngrok http 8088
```

2. Copie a URL HTTPS exibida pelo ngrok e configure no `.env`:

```dotenv
COMPOSE_FILE=compose.yaml:compose.ngrok.yaml
PUBLIC_APP_URL=https://seu-endereco.ngrok-free.app
```

`COMPOSE_FILE` faz os comandos `docker compose` seguintes manterem o modo ngrok, inclusive após reconstruções. Atualize `PUBLIC_APP_URL` sempre que o endereço do túnel mudar.

3. Recrie API e interface usando o override seguro:

```bash
docker compose -f compose.yaml -f compose.ngrok.yaml up -d --build
```

O override ativa cookies de sessão `Secure`, preserva o protocolo HTTPS encaminhado e restringe o CORS à URL informada. Use somente dados de teste e encerre o túnel ao final da homologação.

Para voltar ao acesso local por HTTP, remova `COMPOSE_FILE` do `.env` e execute `docker compose up -d`.

## Deploy em VPS

O arquivo `compose.production.yaml` executa banco, API e interface na VPS. As imagens privadas da API e da interface são publicadas no GitHub Container Registry pelo workflow `publish-production-images.yml`. O Traefik existente descobre somente o container da interface e publica a aplicação com HTTPS; a API e o PostgreSQL permanecem acessíveis apenas pela rede interna do projeto.

1. Crie o registro DNS `A` de `tools.eraltda.com.br` apontando para o IPv4 público da VPS.
2. Confirme que as imagens da API e da interface estão públicas no GitHub Container Registry.
3. Escolha **Compose manualmente**, informe o nome `era-tools-manager`, cole o conteúdo de `compose.production.yaml` e configure as variáveis de `.env.production.example` com senhas próprias. O Compose não fixa o nome internamente, permitindo que o Docker Manager aplique seu identificador de projeto.
4. Valide e inicie o projeto pelo Docker Manager. Para implantação direta por terminal, copie `.env.production.example` para `.env`, substitua as senhas, execute `chmod 600 .env` e então:

```bash
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d
docker compose -f compose.production.yaml ps
```

5. O Traefik usa o resolvedor `letsencrypt` para emitir o certificado automaticamente. Confirme o acesso a `https://tools.eraltda.com.br` e verifique os logs caso o certificado ainda esteja sendo emitido.

Antes de cada atualização, gere um backup externo do PostgreSQL. Nunca use `docker compose down -v` em produção, pois essa opção remove o volume do banco.

### Início oficial da base

A migration `V26__limpar_dados_para_inicio_oficial.sql` remove uma única vez os registros de demonstração e reinicia seus identificadores. Na primeira inicialização dessa versão, o backend recria somente o administrador definido por `ADMIN_INITIAL_NAME`, `ADMIN_INITIAL_LOGIN` e `ADMIN_INITIAL_PASSWORD`. Depois que a V26 for registrada pelo Flyway, reiniciar ou atualizar a aplicação não apagará os dados reais cadastrados posteriormente.

## Serviços

A primeira etapa de reforço de segurança (logs, eventos administrativos e verificações antes da publicação) está documentada em [Segurança — etapa 1](docs/seguranca-etapa-1.md). O mínimo de senha permanece em 8 caracteres, sem redefinir senhas existentes.

Para habilitar a recuperação de contas **somente de administradores**, com confirmação de e-mail no primeiro acesso e envio por Gmail, consulte [Configuração e segurança da recuperação de conta](docs/recuperacao-conta-admin.md). O recurso vem desabilitado até configurar o remetente; os demais perfis continuam sob gestão do administrador.

- `ui`: build React servido por Nginx, que encaminha `/api` para a API.
- `api`: aplicação Spring Boot executada com Java 21.
- `database`: PostgreSQL com volume persistente.

O Flyway aplica as migrations automaticamente quando a API inicia.

Antes de atualizar um banco existente, confira o [histórico de migrações e as orientações de deploy](docs/historico-migracoes.md). Históricos divergentes de desenvolvimento exigem conferência antes do deploy na Hostinger; não use `repair` para contornar a validação.
