# ApiCanvas

> Frontend dinâmico orientado a metadados OpenAPI para exploração, depuração e operação de APIs RESTful.

---

## 1. O Problema

Durante o ciclo de desenvolvimento de APIs (seja em .NET, Java/Spring, Node.js, Python/FastAPI ou Go), engenheiros frequentemente enfrentam um dilema:

* **Swagger UI / OpenAPI docs padrão**: Focam na documentação crua da rota e na invocação isolada endpoint a endpoint, exigindo preenchimento manual repetitivo de payloads JSON, sem visão de coleção ou fluxo de trabalho.
* **Ferramentas de teste HTTP (Postman, Insomnia, curl)**: Excelentes para requisições pontuais, mas exigem configuração manual de coleções, variáveis de ambiente e não geram interfaces estruturadas de dados.
* **Criação de Frontends Administrativos ad-hoc**: Escrever telas CRUD completas em Angular/React apenas para testar ou operar um serviço em desenvolvimento consome tempo desnecessário.

O **ApiCanvas** resolve esse problema ao atuar como um **motor de UI declarativo acoplado a especificações OpenAPI (3.x e Swagger 2.0)**: você fornece o endpoint do OpenAPI/Swagger JSON e a aplicação gera instantaneamente um painel operacional com navegação por recursos, tabelas de dados, formulários dinâmicos tipados, gavetas de detalhes e ações contextuais.

---

## 2. Fluxo de Transformação

```
  ┌─────────────────────────┐
  │   OpenAPI Spec (JSON)   │
  └────────────┬────────────┘
               │ (HTTP Fetch + Parser + Ref Resolver)
               ▼
  ┌─────────────────────────┐
  │   Resource Discovery    │ ───► Agrupamento por tags, prefixos de path e convenções CRUD
  └────────────┬────────────┘
               │
      ┌────────┴──────────────────────────┐
      ▼                                   ▼
┌──────────────┐                 ┌─────────────────┐
│ GET (List)   │                 │ POST/PUT/PATCH  │
└──────┬───────┘                 └────────┬────────┘
       ▼                                  ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│ Dynamic Table           │      │ Dynamic Form            │
│ (Inferência de colunas, │      │ (Inputs, Selects, Enums,│
│  Formatters, Badges)    │      │  Validações JSON Schema)│
└──────┬──────────────────┘      └────────┬────────────────┘
       │                                  │
       ▼                                  ▼
┌─────────────────────────┐      ┌─────────────────────────┐
│ Context Actions         │      │ HTTP API Executor       │
│ (View Detail, Edit, Del)│      │ (Headers, Auth, Query)  │
└─────────────────────────┘      └─────────────────────────┘
```

1. **Ingestão & Resolução**: A especificação OpenAPI é carregada via HTTP, seus schemas e referências `$ref` internos são resolvidos.
2. **Mapeamento de Recursos**: As operações são classificadas em recursos (`Resources`) e operações atômicas (`list`, `detail`, `create`, `update`, `patch`, `delete`, `custom`).
3. **Geração Dinâmica de UI**:
   - Rotas `GET` que retornam coleções são transformadas em **tabelas responsivas com ordenação e formatação contextual**.
   - Rotas com `requestBody` ou parâmetros são mapeadas para **formulários reativos tipados** com validação baseada em schema.
   - Registros individuais em tabelas ganham ações acopladas para **Visualizar Detalhes (Drawer lateral)**, **Editar Registro (Dialog pré-preenchido)** e **Excluir (Dialog com confirmação)**.

---

## 3. Recursos do MVP e Funcionalidades Suportadas

- [x] **Conexão OpenAPI**: Suporte a URLs remotas ou locais de especificações OpenAPI 3.0, 3.1 e Swagger 2.0.
- [x] **Histórico de APIs Recentes**: Persistência local (LocalStorage) de endpoints e sessões acessadas recentemente.
- [x] **Resource Discovery Heurístico**: Agrupamento automático por Tags e fallback inteligente por segmentos de rota.
- [x] **Tabelas Dinâmicas**:
  - Detecção automática de schemas de resposta em array ou envelopados (ex: `{ data: [...] }`, `{ items: [...] }`).
  - Formatação inteligente por tipo de dado (UUID, timestamps ISO, booleanos, números, enums).
- [x] **Formulários Dinâmicos**:
  - Geração baseada em JSON Schema (strings, inteiros, números, booleanos, enums/selects, campos aninhados).
  - Validações de obrigatoriedade (`required`), valores mínimos/máximos, pattern e limites de tamanho.
- [x] **Ações CRUD Contextuais**:
  - **Visualização de Detalhes**: Drawer lateral com busca automática via endpoint `GET /{id}` usando valores da linha.
  - **Edição**: Modal de atualização (`PUT` / `PATCH`) pré-preenchido com os dados do registro selecionado.
  - **Exclusão**: Modal de confirmação com target id e auto-refresh da listagem após exclusão.
- [x] **Autenticação Integrada**:
  - Suporte a **Bearer Token** (`Authorization: Bearer <token>`).
  - Suporte a **API Key** (injetada via Header customizado ou Query parameter).
  - Detecção automática dos esquemas de segurança declarados no `components.securitySchemes`.
- [x] **Customização de UI**: Configuração de densidade, paginação padrão e visualização raw de JSON.
- [x] **Design Minimalista Dark Mode**: Interface inspirada em developer tools sóbrias (sem distrações visuais ou elementos decorativos supérfluos).

---

## 4. Requisitos de Ambiente

- **Node.js**: `v18.x`, `v20.x` (LTS) ou superior.
- **Gerenciador de Pacotes**: `npm` (v9 ou superior).

---

## 5. Instalação e Execução Local

### Clonar o repositório e instalar dependências

```bash
git clone https://github.com/LuanVRD/api-canvas.git
cd api-canvas
npm install
```

### Iniciar servidor de desenvolvimento

```bash
npm start
```

A aplicação estará disponível em `http://localhost:4200/`.

### Executar suite de testes unitários

O projeto conta com mais de 400 testes unitários cobrindo serviços, mappers, parsers e componentes dinâmicos:

```bash
npm test -- --watch=false
```

### Build de Produção

Para gerar o bundle de produção otimizado na pasta `dist/apicanvas`:

```bash
npm run build
```

---

## 6. APIs de Exemplo para Teste

Você pode testar o ApiCanvas imediatamente utilizando especificações públicas de referência ou APIs locais:

| API / Exemplo | URL da Especificação OpenAPI | Descrição |
| :--- | :--- | :--- |
| **JSONPlaceholder (OpenAPI)** | `https://api.apis.guru/v2/specs/jsonplaceholder.typicode.com/1.0.0/openapi.json` | Posts, Users, Comments e Albuns |
| **GitHub REST API (Subset)** | `https://api.apis.guru/v2/specs/github.com/1.1.4/openapi.json` | API pública robusta para exploração de recursos |
| **Backend Local (.NET / Java / Node)** | `http://localhost:5000/swagger/v1/swagger.json` | Swagger gerado pelo Swashbuckle, Springdoc ou Swagger-UI |

---

## 7. Limitações de CORS no Navegador

Como o ApiCanvas é executado diretamente no navegador do usuário, as requisições HTTP (tanto para baixar o arquivo `swagger.json` quanto para invocar os endpoints da sua API) estão sujeitas às **políticas de CORS (Cross-Origin Resource Sharing)**.

### Por que o erro de CORS acontece?
Se o seu backend estiver rodando em `http://localhost:5000` e o ApiCanvas em `http://localhost:4200`, o navegador bloqueará requisições a menos que o servidor de destino responda com os cabeçalhos apropriados.

### Como resolver no seu Backend Local:

* **ASP.NET Core**:
  ```csharp
  builder.Services.AddCors(options => {
      options.AddDefaultPolicy(policy => {
          policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
      });
  });
  // No pipeline:
  app.UseCors();
  ```

* **Node.js (Express)**:
  ```javascript
  import cors from 'cors';
  app.use(cors({ origin: '*' }));
  ```

* **FastAPI (Python)**:
  ```python
  from fastapi.middleware.cors import CORSMiddleware
  app.add_middleware(
      CORSMiddleware,
      allow_origins=["*"],
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```

* **Spring Boot (Java)**:
  ```java
  @CrossOrigin(origins = "*")
  ```

> **Dica para APIs externas de terceiros**: Caso queira consumir uma API pública que não envia cabeçalhos CORS permissivos, utilize uma extensão de navegador para desenvolvimento (ex: *Allow CORS*) ou um proxy reverso local (como Nginx ou Caddy).

---

## 8. Limitações Conhecidas de OpenAPI / JSON Schema

O motor dinâmico do ApiCanvas suporta especificações padrão OpenAPI 3.x e Swagger 2.0. No entanto, algumas construções avançadas possuem tratamento específico:

1. **Polimorfismo (`oneOf`, `anyOf`)**: Campos polimórficos complexos onde o discriminator não está explicitamente tipado são renderizados com fallback em editor de JSON Raw para manter a integridade dos dados.
2. **Upload Binário (`multipart/form-data`)**: Upload avançado com múltiplos streams binários em lote está em fase de planejamento; tipos `string (binary)` simples são mapeados para file inputs básicos.
3. **Schemas não estruturados (`type: object` sem `properties`)**: Quando uma API não declara propriedades em seu schema OpenAPI, o ApiCanvas gera um campo de entrada de objeto/JSON genérico.

---

## 9. Arquitetura em Alto Nível

O ApiCanvas foi projetado com forte desacoplamento entre a camada de interpretação do contrato OpenAPI e a camada de renderização visual:

```text
src/app/
├── core/                  # Serviços fundamentais, interceptors, autenticação e execução HTTP
│   ├── guards/            # ApiSessionGuard para controle de rotas ativas
│   ├── interceptors/      # Injeção de auth headers e tratamento global de erros
│   └── services/          # ApiExecutor, ApiRequestBuilder, ApiSession, Storage
├── openapi/               # Camada agnóstica de parsing e mapeamento OpenAPI
│   ├── mappers/           # ResourceMapper, OperationMapper, SchemaMapper
│   ├── models/            # Tipos normalizados (ApiResource, ApiOperation, ApiSchema)
│   └── services/          # OpenApiParserService, SchemaResolverService, OperationClassifier
├── dynamic-ui/            # Componentes reutilizáveis de UI declarativa
│   ├── dynamic-form/      # Motor de formulário reativo baseado em JSON Schema
│   ├── dynamic-table/     # Tabela de dados dinâmica com ordenação e badges
│   ├── object-details/    # Drawer lateral e visualizador de entidades
│   ├── edit-dialog/       # Modal de edição in-place
│   └── delete-dialog/     # Modal de confirmação de exclusão
├── features/              # Páginas e fluxos principais
│   ├── api-connect/       # Conexão, input de URL e histórico de APIs
│   ├── workspace/         # Layout principal, navegação por recursos e configuração de Auth
│   └── operation/         # Área de execução técnica, visualização de tabelas e formulários
└── shared/                # Componentes utilitários (JsonViewer, StatusBadges, EmptyStates)
```

Para detalhes minuciosos sobre convenções de código, decisões arquiteturais, heurísticas de agrupamento e roadmap, consulte a documentação técnica dedicada:
* [Especificação de Arquitetura Completa (`ApiCanvas-Architecture.md`)](./ApiCanvas-Architecture.md)
* [Heurísticas de Resource Discovery (`docs/heuristics/resource-discovery.md`)](./docs/heuristics/resource-discovery.md)

---

## 10. Demonstração Visual

Abaixo encontram-se representações visuais dos fluxos de trabalho da aplicação:

### Conexão e Descoberta de Recursos
Apresenta a tela de inicialização com histórico de APIs acessadas e detecção instantânea de esquemas e rotas.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  ApiCanvas  /  Connect API                                      [Theme: Dark]│
│                                                                             │
│  OpenAPI Specification URL                                                  │
│  [ https://api.example.com/v1/openapi.json                      ] [Connect] │
│                                                                             │
│  Recent APIs:                                                               │
│  • OrderFlow API (http://localhost:5000/swagger/v1/swagger.json)             │
│  • E-Commerce Billing Service (https://api.example.com/billing.json)        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Exploração de Coleções e Ações In-Place
Tabela gerada automaticamente com badges de status, formatação de dados e gatilhos para Drawer de Detalhes, Edição e Exclusão.

```text
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ RESOURCES    │ GET /api/v1/orders                                 [Run GET] │
│              ├──────────────────────────────────────────────────────────────┤
│ ▸ Customers  │ ID     CUSTOMER       TOTAL     STATUS      ACTIONS          │
│ ▾ Orders     │ 1001   Alice Smith    $124.50   [COMPLETED] [View] [Edit] [X]│
│   • List     │ 1002   Bob Johnson    $89.00    [PENDING]   [View] [Edit] [X]│
│   • Create   │ 1003   Carol White    $412.10   [PROCESSING][View] [Edit] [X]│
│ ▸ Products   │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

---

## 11. Licença

Este projeto é disponibilizado sob a licença [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](./LICENSE).

* **Uso Não Comercial**: Proibida a venda ou exploração comercial direta do código.
* **Compartilhamento Igualitário (ShareAlike)**: Qualquer modificação ou trabalho derivado deve ser obrigatoriamente mantido aberto sob estes mesmos termos.
* **Atribuição**: Exige menção e créditos aos autores originais.
