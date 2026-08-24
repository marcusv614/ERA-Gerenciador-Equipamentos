# Controle de Ativos ERA

Painel React para acompanhar equipamentos, obras, técnicos, depósito e movimentações de ativos da ERA Engenharia de Redes da Amazônia.

## Executar o projeto

```bash
npm install
npm run dev
```

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
- `src/data`: dados simulados e constantes do domínio.

O `PainelControleAtivos` coordena a interface. Regras de cadastro e movimentação ficam em `useControleAtivos`; filtros e buscas ficam em `useFiltrosPainel`. Essa separação mantém os componentes focados em apresentação e facilita a futura conexão com uma API.

## Observação

Por padrão, os dados continuam em memória para permitir o desenvolvimento sem backend. A camada HTTP já está conectada ao hook e pode ser habilitada por ambiente.

## Conexão com a API

Copie `.env.example` para `.env` e configure:

```env
VITE_USAR_API=true
VITE_API_URL=http://localhost:3000/api
VITE_API_TIMEOUT=10000
```

Com `VITE_USAR_API=false`, a aplicação usa os mocks. Com `true`, a carga inicial e todas as mutações passam pelo Axios. O token, quando existir, deve ser salvo em `localStorage` com a chave `era_token_acesso` e será enviado como Bearer token.

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

No banco de dados, obras e movimentações devem referenciar funcionários por identificador, não pelo nome. Os nomes ainda são usados nos mocks apenas para manter compatibilidade com a interface atual.
