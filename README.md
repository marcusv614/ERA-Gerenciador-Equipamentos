# ERA ERP

Monorepo do painel de gestão de equipamentos e obras da ERA.

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

2. Copie a URL HTTPS exibida pelo ngrok e defina `PUBLIC_APP_URL` no `.env`.
3. Recrie API e interface usando o override seguro:

```bash
docker compose -f compose.yaml -f compose.ngrok.yaml up -d --build
```

O override ativa cookies de sessão `Secure`, preserva o protocolo HTTPS encaminhado e restringe o CORS à URL informada. Use somente dados de teste e encerre o túnel ao final da homologação.

## Deploy em VPS

O arquivo `compose.production.yaml` executa banco, API e interface na VPS. As imagens privadas da API e da interface são publicadas no GitHub Container Registry pelo workflow `publish-production-images.yml`. O Traefik existente descobre somente o container da interface e publica a aplicação com HTTPS; a API e o PostgreSQL permanecem acessíveis apenas pela rede interna do projeto.

1. Crie o registro DNS `A` de `tools.eraltda.com.br` apontando para o IPv4 público da VPS.
2. No Docker Manager da Hostinger, cadastre uma credencial para `ghcr.io` usando um token GitHub com permissão somente `read:packages`.
3. Escolha **Compose manualmente**, informe o nome `era-erp`, cole o conteúdo de `compose.production.yaml` e configure as variáveis de `.env.production.example` com senhas próprias.
4. Valide e inicie o projeto pelo Docker Manager. Para implantação direta por terminal, copie `.env.production.example` para `.env`, substitua as senhas, execute `chmod 600 .env` e então:

```bash
docker compose -f compose.production.yaml config --quiet
docker compose -f compose.production.yaml pull
docker compose -f compose.production.yaml up -d
docker compose -f compose.production.yaml ps
```

5. O Traefik usa o resolvedor `letsencrypt` para emitir o certificado automaticamente. Confirme o acesso a `https://tools.eraltda.com.br` e verifique os logs caso o certificado ainda esteja sendo emitido.

Antes de cada atualização, gere um backup externo do PostgreSQL. Nunca use `docker compose down -v` em produção, pois essa opção remove o volume do banco.

## Serviços

- `ui`: build React servido por Nginx, que encaminha `/api` para a API.
- `api`: aplicação Spring Boot executada com Java 21.
- `database`: PostgreSQL com volume persistente.

O Flyway aplica as migrations automaticamente quando a API inicia.
