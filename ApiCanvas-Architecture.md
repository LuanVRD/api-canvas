# ApiCanvas — Especificação de Arquitetura

> Documento-base para implementação assistida por IA (Antigravity).
>
> Objetivo: criar um frontend genérico capaz de consumir uma especificação OpenAPI/Swagger e gerar automaticamente uma interface simples e agradável para visualizar e executar operações de uma API.

---

## 1. Visão do projeto

O projeto será uma aplicação frontend que recebe a URL de uma especificação OpenAPI, interpreta os endpoints e schemas disponíveis e monta uma interface de administração automaticamente.

Exemplo de entrada:

```text
https://localhost:7001/swagger/v1/swagger.json
```

A aplicação deve ser capaz de descobrir endpoints como:

```http
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
```

e transformar isso, quando possível, em uma interface semelhante a um painel administrativo:

```text
Products
├── Lista de registros
├── Visualizar registro
├── Criar
├── Editar
└── Excluir
```

O projeto não deve depender de ASP.NET. O contrato principal será OpenAPI, permitindo posteriormente consumir APIs feitas em .NET, Java/Spring, Node.js, Python etc.

---

## 2. Objetivo do MVP

A primeira versão deve resolver bem o cenário CRUD comum.

### Deve suportar

- Informar uma URL de OpenAPI.
- Carregar e interpretar o documento.
- OpenAPI 3.x como formato principal.
- Identificar grupos/resources/endpoints.
- Exibir os resources em navegação lateral.
- Executar endpoints `GET`.
- Renderizar coleções retornadas por GET em tabela.
- Renderizar objetos individuais em uma visualização de detalhes.
- Gerar formulários automaticamente para `POST`.
- Executar `DELETE` com confirmação.
- Exibir loading, sucesso e erros HTTP.
- Permitir configurar a Base URL quando necessário.

### Depois do MVP

- PUT.
- PATCH.
- Bearer/JWT.
- API Key.
- Query parameters avançados.
- Paginação.
- Ordenação.
- Filtros.
- Upload de arquivos.
- Schemas complexos/aninhados.
- Arrays complexos.
- Customização visual por configuração.
- Persistência de APIs recentes.
- Múltiplas APIs/workspaces.

---

## 3. Stack

### Frontend

- Angular.
- TypeScript.
- Angular standalone components.
- Angular Signals para estado local/global quando fizer sentido.
- Angular Reactive Forms.
- Angular HttpClient.
- Angular Router.

### UI

Sugestão inicial:

- Angular Material.
- Tema escuro configurado desde a fundação do projeto.
- Customização visual minimalista para evitar aparência de tema Material padrão.

A camada de interpretação do OpenAPI NÃO deve depender do Angular Material. Os componentes de apresentação podem depender da biblioteca visual.

### OpenAPI

Preferir uma biblioteca consolidada para parsing/resolução de `$ref`, mantendo uma camada própria de abstração para que a aplicação não fique acoplada ao formato bruto da biblioteca.

Possíveis opções a avaliar durante a implementação:

- `@apidevtools/swagger-parser`
- parser compatível com OpenAPI 3.x

---


## Diretrizes obrigatórias de UI/UX

O ApiCanvas deve utilizar **tema escuro como identidade visual principal desde o início do projeto**. Não criar primeiro uma interface clara para depois convertê-la para dark mode.

A interface deve ser simples, minimalista, sóbria e funcional, com aparência de uma ferramenta técnica feita para desenvolvedores. O conteúdo e as operações da API devem ser os elementos principais da tela.

### Direção visual

- Tema escuro por padrão.
- Visual minimalista e sóbrio.
- Hierarquia visual baseada principalmente em tipografia, espaçamento e contraste.
- Paleta reduzida; cores de destaque somente quando tiverem função.
- Bordas discretas.
- Cantos com arredondamento pequeno ou moderado.
- Sombras mínimas ou inexistentes.
- Layout relativamente compacto, sem comprometer legibilidade.
- Priorizar aparência de developer tool em vez de dashboard corporativo.
- Tabelas, formulários, sidebars, dialogs e painéis devem ser simples e funcionais.
- Métodos HTTP podem utilizar cores próprias para identificação rápida de GET, POST, PUT, PATCH e DELETE.
- Usar ícones apenas quando melhorarem navegação, identificação ou entendimento de uma ação.
- Preferir superfícies simples e separações discretas a uma coleção de cards.

### Evitar

Não utilizar padrões visuais genéricos frequentemente encontrados em interfaces geradas automaticamente por IA, incluindo:

- gradientes decorativos;
- glassmorphism;
- glow ou neon sem função;
- excesso de cards;
- cards aninhados dentro de outros cards;
- sombras grandes;
- bordas excessivamente arredondadas;
- botões grandes sem necessidade;
- ícones meramente decorativos;
- excesso de espaços vazios;
- textos gigantes de apresentação dentro da aplicação;
- dashboards com métricas fictícias;
- ilustrações decorativas sem utilidade;
- elementos visuais que disputem atenção com os dados da API.

**Não transformar toda seção da interface em um card.**

### Referência conceitual

A interface deve lembrar ferramentas utilizadas por desenvolvedores, como:

- IDEs;
- API clients;
- database clients;
- ferramentas de infraestrutura;
- painéis técnicos.

A aparência deve transmitir:

> "ferramenta técnica bem projetada"

e não:

> "template genérico de SaaS/dashboard".

### Regra para implementação

Sempre que houver escolha entre uma solução visual mais decorativa e uma solução mais simples, utilizar a solução mais simples.

Angular Material deve ser utilizado como base de componentes, mas seus componentes podem e devem ser ajustados visualmente para seguir a identidade do ApiCanvas. Evitar deixar a aplicação com aparência de tema Material padrão sem personalização.

Essas diretrizes são globais e devem ser respeitadas por todas as features novas, não apenas durante uma etapa posterior de refinamento visual.

---

## 4. Princípios de arquitetura

### 4.1. OpenAPI bruto não deve chegar diretamente aos componentes

Evitar:

```text
Component
   ↓
swagger.json
```

Preferir:

```text
OpenAPI document
      ↓
OpenApiParser
      ↓
Modelo interno normalizado
      ↓
Application services
      ↓
Components
```

Isso evita espalhar regras específicas do OpenAPI pela aplicação inteira.

---

### 4.2. Separar descoberta, interpretação e execução

Existem três responsabilidades diferentes:

**Discovery**

Descobrir o que existe na API.

**Interpretation**

Entender como representar endpoints, parâmetros e schemas.

**Execution**

Montar e executar requests HTTP.

Essas responsabilidades não devem ficar em um único service.

---

### 4.3. UI genérica primeiro

O comportamento padrão deve funcionar sem configuração adicional.

```text
OpenAPI
   ↓
Automatic UI
```

Posteriormente:

```text
OpenAPI + UI Configuration
          ↓
     Customized UI
```

A configuração customizada deve complementar o OpenAPI, nunca ser obrigatória para a aplicação funcionar.

---

## 5. Arquitetura de alto nível

```text
┌──────────────────────────────────────────────┐
│                  Angular App                 │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │               UI Layer                 │  │
│  │                                        │  │
│  │ Sidebar                                │  │
│  │ Resource List                          │  │
│  │ Dynamic Table                          │  │
│  │ Dynamic Form                           │  │
│  │ Object Details                         │  │
│  │ Request Result                         │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│  ┌────────────────────▼───────────────────┐  │
│  │          Application Layer             │  │
│  │                                        │  │
│  │ Resource Service                       │  │
│  │ Form Schema Service                    │  │
│  │ Endpoint Resolver                      │  │
│  │ Request Builder                        │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│  ┌────────────────────▼───────────────────┐  │
│  │             OpenAPI Layer              │  │
│  │                                        │  │
│  │ OpenAPI Loader                         │  │
│  │ OpenAPI Parser                         │  │
│  │ Schema Resolver                        │  │
│  │ Normalizer                             │  │
│  └────────────────────┬───────────────────┘  │
│                       │                      │
│  ┌────────────────────▼───────────────────┐  │
│  │            Infrastructure              │  │
│  │                                        │  │
│  │ HttpClient                             │  │
│  │ API Executor                           │  │
│  │ Local Storage                          │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                       │
                       ▼
                 External API
```

---

## 6. Fluxo principal

```text
Usuário informa swagger.json
          ↓
OpenApiLoaderService
          ↓
OpenApiParserService
          ↓
normalização
          ↓
ApiDefinition
          ↓
ResourceDiscoveryService
          ↓
resources
          ↓
Sidebar
```

Ao selecionar um resource:

```text
Resource
   ↓
operations
   ├── GET collection → tabela
   ├── GET by id      → detalhes
   ├── POST           → criação
   ├── PUT/PATCH      → edição
   └── DELETE         → ação de exclusão
```

---

# 7. Modelo interno

O frontend deve trabalhar com modelos próprios.

## 7.1. ApiDefinition

```ts
export interface ApiDefinition {
  title: string;
  version?: string;
  description?: string;
  baseUrl: string;
  resources: ApiResource[];
}
```

---

## 7.2. ApiResource

Representa um agrupamento lógico de operações.

```ts
export interface ApiResource {
  id: string;
  name: string;
  label: string;
  description?: string;

  operations: ApiOperation[];
}
```

Exemplo:

```text
Product
├── list
├── get
├── create
├── update
└── delete
```

A associação deve usar prioritariamente informações confiáveis do OpenAPI, como `tags`, paths e operation metadata.

Não assumir que toda API segue `/api/{resource}` perfeitamente.

---

## 7.3. ApiOperation

```ts
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE';

export interface ApiOperation {
  id: string;
  operationId?: string;

  method: HttpMethod;
  path: string;

  summary?: string;
  description?: string;

  parameters: ApiParameter[];

  requestBody?: ApiSchema;

  responses: ApiResponse[];

  type: ApiOperationType;
}
```

---

## 7.4. ApiOperationType

```ts
export type ApiOperationType =
  | 'list'
  | 'details'
  | 'create'
  | 'update'
  | 'delete'
  | 'action'
  | 'unknown';
```

Essa classificação será inferida.

Exemplos:

```text
GET /products
→ list

GET /products/{id}
→ details

POST /products
→ create

PUT /products/{id}
→ update

DELETE /products/{id}
→ delete

POST /orders/{id}/approve
→ action
```

Não tentar forçar `action` para dentro de CRUD.

---

## 7.5. ApiParameter

```ts
export interface ApiParameter {
  name: string;

  location:
    | 'path'
    | 'query'
    | 'header'
    | 'cookie';

  required: boolean;

  schema: ApiSchema;
}
```

---

## 7.6. ApiSchema

Criar uma representação simplificada dos schemas OpenAPI.

```ts
export interface ApiSchema {
  type:
    | 'string'
    | 'number'
    | 'integer'
    | 'boolean'
    | 'object'
    | 'array'
    | 'unknown';

  format?: string;

  title?: string;
  description?: string;

  required?: boolean;

  enum?: unknown[];

  properties?: Record<string, ApiSchema>;

  items?: ApiSchema;

  default?: unknown;

  nullable?: boolean;

  minimum?: number;
  maximum?: number;

  minLength?: number;
  maxLength?: number;

  pattern?: string;
}
```

Esse modelo poderá crescer conforme novos casos forem suportados.

---

# 8. Estrutura Angular sugerida

```text
src/
└── app/
    │
    ├── core/
    │   ├── models/
    │   │   ├── api-definition.model.ts
    │   │   ├── api-resource.model.ts
    │   │   ├── api-operation.model.ts
    │   │   ├── api-parameter.model.ts
    │   │   ├── api-schema.model.ts
    │   │   └── api-response.model.ts
    │   │
    │   ├── services/
    │   │   ├── api-executor.service.ts
    │   │   └── storage.service.ts
    │   │
    │   └── interceptors/
    │       ├── auth.interceptor.ts
    │       └── error.interceptor.ts
    │
    ├── openapi/
    │   ├── services/
    │   │   ├── openapi-loader.service.ts
    │   │   ├── openapi-parser.service.ts
    │   │   ├── schema-resolver.service.ts
    │   │   └── operation-classifier.service.ts
    │   │
    │   ├── mappers/
    │   │   ├── operation.mapper.ts
    │   │   ├── schema.mapper.ts
    │   │   └── resource.mapper.ts
    │   │
    │   └── utils/
    │
    ├── features/
    │   ├── api-connect/
    │   │   ├── api-connect.page.ts
    │   │   └── api-connect-form.component.ts
    │   │
    │   ├── workspace/
    │   │   ├── workspace.page.ts
    │   │   └── resource-sidebar.component.ts
    │   │
    │   ├── resource/
    │   │   ├── resource.page.ts
    │   │   ├── resource-list.component.ts
    │   │   └── resource-details.component.ts
    │   │
    │   └── operation/
    │       ├── operation.page.ts
    │       └── operation-result.component.ts
    │
    ├── dynamic-ui/
    │   ├── dynamic-form/
    │   │   ├── dynamic-form.component.ts
    │   │   ├── dynamic-field.component.ts
    │   │   └── form-schema.service.ts
    │   │
    │   ├── dynamic-table/
    │   │   ├── dynamic-table.component.ts
    │   │   └── table-schema.service.ts
    │   │
    │   └── value-renderer/
    │       └── value-renderer.component.ts
    │
    ├── shared/
    │   ├── components/
    │   ├── pipes/
    │   └── utils/
    │
    ├── app.routes.ts
    └── app.config.ts
```

---

# 9. Responsabilidades dos principais serviços

## OpenApiLoaderService

Responsável somente por obter o documento.

```ts
load(url: string): Observable<unknown>
```

Não deve decidir como montar telas.

---

## OpenApiParserService

Recebe OpenAPI bruto e devolve o modelo interno.

```ts
parse(document: unknown): ApiDefinition
```

---

## SchemaResolverService

Responsável por:

- resolver `$ref`;
- schemas reutilizados;
- objetos;
- arrays;
- composição de schemas quando suportada.

A complexidade de resolução de referências deve ficar concentrada aqui ou na biblioteca de parsing escolhida.

---

## OperationClassifierService

Tenta classificar uma operação como:

```text
list
details
create
update
delete
action
unknown
```

A classificação é uma heurística.

Ela NÃO pode ser requisito para executar o endpoint.

Mesmo um endpoint classificado como `unknown` deve poder ser utilizado através de uma interface genérica.

---

## ApiExecutorService

Responsável por executar operações.

Interface conceitual:

```ts
execute(
  operation: ApiOperation,
  input: ApiRequestInput
): Observable<ApiExecutionResult>
```

Onde:

```ts
export interface ApiRequestInput {
  path?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
}
```

O executor monta:

```text
baseUrl
+
resolved path
+
query string
+
headers
+
body
```

e usa `HttpClient`.

---

# 10. Dynamic Form Engine

Esta é uma das partes centrais do projeto.

Entrada:

```ts
ApiSchema
```

Saída:

```ts
FormGroup
```

mais os metadados necessários para renderização.

### Mapeamento inicial

| OpenAPI | Controle |
|---|---|
| `string` | text input |
| `string + email` | email input |
| `string + password` | password input |
| `string + date` | date picker |
| `string + date-time` | date/time |
| `integer` | number input |
| `number` | number input |
| `boolean` | checkbox/switch |
| `enum` | select |
| objeto | field group |
| array simples | lista dinâmica |

---

## Validators

Converter automaticamente:

```text
required
→ Validators.required

minLength
→ Validators.minLength()

maxLength
→ Validators.maxLength()

minimum
→ Validators.min()

maximum
→ Validators.max()

pattern
→ Validators.pattern()
```

---

# 11. Dynamic Table Engine

Para um retorno como:

```json
[
  {
    "id": 1,
    "name": "Guitar",
    "price": 2500,
    "active": true
  }
]
```

inferir:

```text
ID | Name | Price | Active | Actions
```

O MVP pode inferir colunas a partir do primeiro item retornado.

Posteriormente, priorizar o response schema descrito pelo OpenAPI.

### Tipos especiais

```text
boolean
→ ícone/checkbox visual

date/date-time
→ data formatada

object
→ resumo / botão para expandir

array
→ quantidade / expansão
```

---

# 12. Tela de conexão

Primeira tela:

```text
┌──────────────────────────────────────────┐
│           Universal API Admin            │
│                                          │
│ OpenAPI URL                              │
│ ┌──────────────────────────────────────┐ │
│ │ https://.../swagger/v1/swagger.json │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ Base URL (opcional)                      │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│                         [ Connect ]      │
└──────────────────────────────────────────┘
```

Fluxo:

```text
Connect
   ↓
loading
   ↓
download
   ↓
parse
   ↓
validate
   ↓
workspace
```

Erros devem informar claramente:

- URL inválida;
- CORS;
- documento inválido;
- OpenAPI não suportado;
- erro de rede.

---

# 13. Workspace

Layout inicial:

```text
┌─────────────────┬─────────────────────────────────────┐
│ API Name        │ Products                            │
│                 │                                     │
│ Resources       │ [ Search ]              [+ Create] │
│                 │                                     │
│ Products        │ ID │ Name │ Price │ Active │ ...   │
│ Users           │────┼──────┼───────┼────────┼────── │
│ Orders          │ 1  │ ...  │ ...   │ true   │       │
│                 │ 2  │ ...  │ ...   │ false  │       │
│                 │                                     │
│ Operations      │                                     │
│ Custom actions  │                                     │
└─────────────────┴─────────────────────────────────────┘
```

---

# 14. Endpoints não CRUD

Exemplo:

```http
POST /orders/{id}/approve
```

O sistema não deve ignorar esse endpoint.

Renderizar inicialmente como uma operação genérica:

```text
Approve Order

Path Parameters

ID
[________]

Body
...

[ Execute ]
```

Posteriormente o sistema poderá reconhecer ações e gerar botões contextuais.

---

# 15. Request Builder

Toda operação deve ser transformada em uma estrutura intermediária antes da execução.

Exemplo:

```ts
{
  method: 'POST',
  url: '/api/products',
  query: {},
  headers: {},
  body: {
    name: 'Guitar',
    price: 2500
  }
}
```

Evitar montar requests diretamente dentro dos componentes.

Fluxo:

```text
Component
   ↓
user input
   ↓
RequestBuilder
   ↓
ApiRequest
   ↓
ApiExecutor
   ↓
HttpClient
```

---

# 16. Tratamento de respostas

Criar:

```ts
export interface ApiExecutionResult {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: unknown;
  duration?: number;
}
```

A UI deve conseguir mostrar:

```text
200 OK

Response

{
  ...
}
```

ou:

```text
400 Bad Request

{
  "errors": ...
}
```

Isso mantém uma característica útil do Swagger: permitir inspecionar a resposta técnica mesmo dentro da UI amigável.

---

# 17. Estado da aplicação

Estado global mínimo:

```ts
export interface AppState {
  api?: ApiDefinition;
  selectedResourceId?: string;
  loading: boolean;
}
```

Preferir Signals/services para o MVP em vez de introduzir uma biblioteca de state management sem necessidade.

Exemplo conceitual:

```ts
api = signal<ApiDefinition | null>(null);
selectedResource = signal<ApiResource | null>(null);
```

---

# 18. Rotas sugeridas

```text
/
→ Connect

/workspace
→ API carregada

/workspace/:resource
→ lista/resource

/workspace/:resource/new
→ POST

/workspace/:resource/:id
→ detalhes

/workspace/:resource/:id/edit
→ PUT/PATCH

/operation/:operationId
→ execução genérica
```

As rotas podem evoluir, mas a execução de operações não deve depender de uma URL CRUD específica.

---

# 19. CORS

O projeto precisa considerar desde o início que uma aplicação web não pode simplesmente chamar qualquer API da internet devido a CORS.

No desenvolvimento:

```text
Angular localhost
        ↓
API localhost
```

a API precisará permitir a origem do frontend.

Posteriormente poderá ser avaliado um backend/proxy opcional:

```text
Browser
   ↓
ApiCanvas Server
   ↓
External API
```

Isso NÃO faz parte do MVP inicial.

---

# 20. Segurança

Nunca armazenar tokens sensíveis de forma insegura por padrão.

Futuramente suportar:

```text
Authorization
├── None
├── Bearer Token
├── API Key
└── Basic (opcional)
```

Ler `securitySchemes` do OpenAPI.

O MVP pode começar apenas com APIs sem autenticação.

---

# 21. Configuração visual futura

Criar futuramente um formato opcional como:

```json
{
  "resources": {
    "products": {
      "label": "Produtos",
      "icon": "inventory",
      "list": {
        "columns": [
          "id",
          "name",
          "price",
          "active"
        ]
      },
      "fields": {
        "description": {
          "control": "textarea"
        },
        "categoryId": {
          "label": "Categoria"
        }
      }
    }
  }
}
```

Arquitetura:

```text
OpenAPI
   │
   ├───────────────┐
   │               │
   ▼               ▼
Default Rules   UI Config
   │               │
   └───────┬───────┘
           ▼
       UI Schema
           ▼
      Angular UI
```

Essa funcionalidade deve ser adicionada sem alterar a camada principal de execução HTTP.

---

# 22. Estratégia de desenvolvimento

## Fase 1 — Foundation

- Criar projeto Angular.
- Configurar Angular Material.
- Criar layout.
- Criar modelos internos.
- Criar tela de conexão.
- Implementar OpenApiLoaderService.

**Resultado:**

A aplicação consegue receber e baixar um `swagger.json`.

---

## Fase 2 — OpenAPI Parser

- Integrar parser.
- Ler `info`.
- Ler `servers`.
- Ler `paths`.
- Ler `tags`.
- Resolver schemas.
- Criar `ApiDefinition`.
- Criar `ApiResource`.
- Criar `ApiOperation`.

**Resultado:**

```text
swagger.json
→ modelo interno navegável
```

---

## Fase 3 — Endpoint Explorer

- Sidebar.
- Agrupar operações.
- Selecionar resource.
- Mostrar operações.
- Tela genérica de endpoint.

**Resultado:**

Todos os endpoints descobertos podem ser visualizados.

---

## Fase 4 — GET

- Request Builder.
- ApiExecutor.
- Path parameters.
- Query parameters.
- Executar GET.
- Renderizar JSON.
- Detectar arrays.
- Dynamic Table.

**Resultado:**

GETs comuns aparecem em uma interface útil.

---

## Fase 5 — Dynamic Forms + POST

- FormSchemaService.
- DynamicForm.
- Campos por tipo.
- Validators.
- Enums.
- Request body.
- POST.
- Feedback de resposta.

**Resultado:**

POSTs comuns podem ser utilizados sem formulário escrito manualmente.

---

## Fase 6 — CRUD

- GET by ID.
- DELETE.
- confirmação de exclusão.
- PUT.
- PATCH.
- integração list/details/edit.

**Resultado:**

CRUDs convencionais ganham automaticamente uma interface administrativa.

---

## Fase 7 — Robustez

- objetos aninhados;
- arrays;
- nullable;
- enums complexos;
- schemas compartilhados;
- diferentes response shapes;
- erros;
- loading;
- empty states;
- CORS guidance.

---

## Fase 8 — Authentication

- securitySchemes;
- Bearer;
- API Key;
- headers;
- interceptor;
- sessão da API.

---

## Fase 9 — Custom UI

- arquivo de configuração;
- labels;
- colunas;
- campos ocultos;
- controles personalizados;
- ordenação;
- custom actions.

---

# 23. Critérios do MVP

O MVP será considerado funcional quando for possível:

1. iniciar a aplicação;
2. informar uma URL OpenAPI;
3. carregar a especificação;
4. descobrir os endpoints;
5. navegar pelos resources;
6. selecionar um resource;
7. executar um GET;
8. mostrar arrays em tabela;
9. abrir um POST;
10. gerar automaticamente seu formulário;
11. enviar o POST;
12. executar DELETE;
13. visualizar respostas e erros.

---

# 24. Regras para implementação com IA

Estas regras devem ser consideradas ao utilizar este documento como contexto para o Antigravity.

### Arquitetura

- Não colocar parsing de OpenAPI dentro de componentes.
- Não colocar chamadas HTTP genéricas diretamente em páginas/componentes.
- Não acoplar os modelos internos aos tipos de uma biblioteca específica de OpenAPI.
- Não assumir que todos os endpoints são CRUD.
- Não assumir que todos os IDs são numéricos.
- Não assumir que todos os resources possuem todos os métodos.
- Não assumir que GET sempre retorna array.
- Não assumir que POST sempre retorna o objeto criado.

### Angular

- Preferir standalone components.
- Preferir Reactive Forms para formulários dinâmicos.
- Preferir Signals para estado simples.
- Componentes devem permanecer pequenos.
- Lógica de domínio/interpretação deve ficar em services/mappers.
- Evitar `any`; usar `unknown` quando o formato ainda não foi interpretado.
- Criar tipos explícitos para o modelo interno.

### Código

- Implementar incrementalmente.
- Evitar abstrações prematuras.
- Não implementar funcionalidades de fases futuras sem necessidade.
- Manter responsabilidades claras.
- Escrever código preparado para testes.
- Tratar erros explicitamente.
- Documentar heurísticas de classificação.

---

# 25. Testes

Priorizar testes nas partes que possuem regras e transformação de dados.

### Unit tests

```text
OpenApiParserService
SchemaResolverService
OperationClassifierService
RequestBuilder
FormSchemaService
TableSchemaService
```

Exemplos importantes:

```text
GET /products
→ list

GET /products/{productId}
→ details

POST /products
→ create

POST /orders/{id}/approve
→ action
```

E:

```text
OpenAPI string required
→ FormControl<string> + required validator
```

---

# 26. Exemplo de API usada durante desenvolvimento

Criar ou utilizar uma API simples contendo:

```text
Products
Users
Orders
```

Products:

```http
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}
```

DTO:

```ts
Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  active: boolean;
  category: ProductCategory;
  createdAt: string;
}
```

Enum:

```text
ProductCategory
- Guitar
- Pedal
- Amplifier
- Accessory
```

Orders deve possuir pelo menos uma operação não CRUD:

```http
POST /api/orders/{id}/approve
```

Isso força a arquitetura a não depender exclusivamente de CRUD desde o início.

---

# 27. Definição conceitual do produto

O projeto NÃO é apenas:

> Um gerador de CRUD Angular.

Ele é:

> **ApiCanvas** é um cliente visual genérico orientado por OpenAPI, capaz de interpretar contratos de APIs e gerar automaticamente interfaces adequadas para operações comuns, mantendo uma interface genérica para operações que não possam ser inferidas.

Essa distinção deve orientar as decisões arquiteturais.

---

# 28. Primeira implementação recomendada

Começar somente pelo seguinte fluxo:

```text
Angular App
    ↓
Connect Page
    ↓
OpenAPI URL
    ↓
OpenApiLoaderService
    ↓
OpenApiParserService
    ↓
ApiDefinition
    ↓
Workspace
    ↓
Sidebar com resources
    ↓
Lista de operations
```

**Não começar pelo Dynamic Form.**

Primeiro garantir que a camada OpenAPI consegue transformar diferentes documentos em um modelo interno consistente.

Depois:

```text
GET execution
→ Dynamic Table
→ POST
→ Dynamic Form
→ DELETE
→ PUT/PATCH
```

Isso reduz o risco de construir componentes de UI em cima de um modelo de dados que ainda está mudando.

---

## 29. Identidade do projeto

Nome oficial do projeto:

```text
ApiCanvas
```

Tagline de trabalho:

> Your API, rendered.

O nome deve ser utilizado em títulos, documentação, nome do repositório e interface da aplicação. Sugestão de repositório: `api-canvas` ou `apicanvas`.

---

## 30. Resultado esperado

Ao final, a experiência ideal será:

```text
1. Usuário abre a aplicação.

2. Cola:
   https://api.example.com/swagger/v1/swagger.json

3. Clica em Connect.

4. O sistema descobre:
   Products
   Users
   Orders
   Customers

5. O usuário entra em Products.

6. O GET é executado e os dados aparecem em tabela.

7. O usuário clica em New.

8. O formulário é criado automaticamente a partir do schema do POST.

9. O usuário envia.

10. A API responde e a lista é atualizada.

11. Endpoints especiais continuam disponíveis em uma área de operações.
```

O OpenAPI é a **fonte de verdade técnica**.

O frontend é responsável por transformar essa descrição técnica em uma experiência visual utilizável.
