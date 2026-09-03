# Controle de Ativos ERA

Painel React para acompanhar equipamentos, obras, técnicos, depósito e movimentações de ativos da ERA Engenharia de Redes da Amazônia.

## Executar o projeto

```bash
npm ci
npm run dev
```

Para o desenvolvimento local, mantenha a API disponível em `http://localhost:8080/api`
ou configure outro endereço em `.env`.

Validações disponíveis:

```bash
npm run lint
npm run build
```

## Organização

- `src/components/painel`: composição do painel, navegação e telas principais.
- `src/components`: componentes visuais reutilizáveis e modais de formulário.
- `src/hooks`: estado e consultas derivadas do domínio.
- `src/services/api`: cliente Axios e serviços HTTP separados por domínio.
- `src/config/rotasApi.js`: catálogo central de endpoints do backend.
- `src/services`: integração HTTP e geração dos documentos para impressão/PDF.
- `src/utils`: datas e regras auxiliares sem dependência da interface.
- `src/data`: constantes de apresentação do domínio, como tipos, status e ícones.

O `PainelControleAtivos` coordena a interface. A integração com a API e a atualização do estado exibido ficam em `useControleAtivos`; filtros e buscas ficam em `useFiltrosPainel`. Os componentes permanecem focados em apresentação.

## Conexão com a API

Copie `.env.example` para `.env` e configure:

```env
VITE_API_URL=http://localhost:8080/api
VITE_API_TIMEOUT=10000
```

Todas as cargas e mutações passam pela API. A autenticação usa sessão HTTP com cookie e proteção CSRF; não há armazenamento de token de acesso no navegador.

Endpoints esperados para o backend:

- `GET/POST /obras`
- `GET/POST /equipamentos`
- `POST /equipamentos/:id/movimentacoes`
- `GET/POST /funcionarios`
- `GET/PATCH /atividades/:id`
- `POST /atividades/:id/aprovacao`
- `POST /atividades/:id/rejeicao`
- `GET /deposito/equipamentos`

A lista completa e parametrizada está em `src/config/rotasApi.js`. As respostas podem usar diretamente o payload ou envolvê-lo em `{ "dados": ... }` ou `{ "data": ... }`.
