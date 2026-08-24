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

## Serviços

- `ui`: build React servido por Nginx, que encaminha `/api` para a API.
- `api`: aplicação Spring Boot executada com Java 21.
- `database`: PostgreSQL com volume persistente.

O Flyway aplica as migrations automaticamente quando a API inicia.
