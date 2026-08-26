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

## Serviços

- `ui`: build React servido por Nginx, que encaminha `/api` para a API.
- `api`: aplicação Spring Boot executada com Java 21.
- `database`: PostgreSQL com volume persistente.

O Flyway aplica as migrations automaticamente quando a API inicia.
