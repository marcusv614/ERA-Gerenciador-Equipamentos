# ERA API

API REST para gestão de obras, funcionários, equipamentos, movimentações e solicitações da ERA.

## Stack

- Java 21 e Spring Boot 4.1
- Spring Web MVC, Data JPA, Validation e Security
- PostgreSQL e Flyway
- Maven, sem Lombok

## Arquitetura

O projeto utiliza as camadas `model`, `repository`, `service`, `controller` e `dto`, além dos pacotes de configuração e tratamento de exceções.

## Banco e execução

Crie o banco `era_erp` no PostgreSQL ou, a partir da raiz do repositório, execute `docker compose up -d database`. O Flyway executa as migrations de `src/main/resources/db/migration`; o Hibernate apenas valida o schema.

```env
DB_URL=jdbc:postgresql://localhost:5432/era_erp
DB_USERNAME=postgres
DB_PASSWORD=postgres
SERVER_PORT=8080
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Execute com `./mvnw spring-boot:run`. A API fica em `http://localhost:8080/api`, com CORS liberado para o Vite em `http://localhost:5173` por padrão.

## Endpoints

- `GET/POST/PATCH /api/funcionarios`
- `GET/POST/PATCH /api/obras`
- `GET/POST/PATCH /api/equipamentos`
- `POST /api/equipamentos/{id}/movimentacoes`
- `GET /api/equipamentos/{id}/historico`
- `GET/POST/PATCH /api/atividades`
- `POST /api/atividades/{id}/aprovacao`
- `POST /api/atividades/{id}/rejeicao`
- `POST /api/atividades/{id}/transito`
- `POST /api/atividades/{id}/conclusao`
- `GET /api/cautelas`
- `GET /api/deposito/equipamentos`
- `GET /api/painel/resumo`
- `GET/POST /api/auth/*`
- `GET/POST/PUT/PATCH /api/usuarios/*`

A autenticação usa sessão HTTP, cookie `JSESSIONID` protegido e token CSRF em cookie separado. O Spring Security restringe os endpoints por perfil (`ADMIN`, `GERENTE`, `ESTOQUE` e `TECNICO`) e invalida sessões de usuários desativados ou bloqueados.
