# ApiCanvas

> Frontend dinâmico e agnóstico orientado a metadados OpenAPI para exploração técnica e operação de APIs RESTful.

---

## 1. Visão Geral e Propósito

Durante o ciclo de vida e sustentação de APIs (em .NET, Java/Spring, Node.js, Python/FastAPI, Go ou Rust), desenvolvedores e times de produto lidam com dois desafios fundamentais:

1. **Inspeção Técnica de Baixo Nível**: Depurar rotas isoladas, testar parâmetros específicos, inspecionar headers HTTP, validar códigos de retorno e examinar schemas JSON brutos.
2. **Operação e Gestão de Dados**: Visualizar coleções em tabelas funcionais, filtrar e buscar registros, acompanhar métricas/KPIs em tempo real, executar fluxos CRUD completos e disparar ações de negócio parametrizadas (ex.: cancelar pedidos, despachar itens, alterar status) sem precisar desenvolver painéis administrativos manuais.

O **ApiCanvas** resolve ambos os cenários através de um **núcleo técnico unificado acoplado a especificações OpenAPI (3.x e Swagger 2.0)**, fornecendo dois modos complementares de visualização:

```
                                  ┌─────────────────────────┐
                                  │   OpenAPI Spec (JSON)   │
                                  └────────────┬────────────┘
                                               │
                                               ▼
                                  ┌─────────────────────────┐
                                  │   ApiCanvas Core        │
                                  │   (Parser, Matched CRUD,│
                                  │    Dynamic Forms/Tables)│
                                  └──────┬───────────┬──────┘
                                         │           │
                     ┌───────────────────┘           └───────────────────┐
                     ▼                                                   ▼
       ┌───────────────────────────┐                       ┌───────────────────────────┐
       │       API EXPLORER        │                       │         DASHBOARD         │
       │    (Visão Técnica)        │                       │    (Visão Operacional)    │
       ├───────────────────────────┤                       ├───────────────────────────┤
       │ • Inspeção rota a rota    │                       │ • Páginas por Recurso     │
       │ • Teste manual de métodos │                       │ • Cards de Métricas/KPIs  │
       │ • Payloads JSON e Headers │                       │ • Tabelas customizadas    │
       │ • Schemas e Parâmetros    │                       │ • Ações CRUD e Custom RPC │
       │ • Ideal para depuração    │                       │ • Filtros e Busca Rápida  │
       └───────────────────────────┘                       └───────────────────────────┘
```

---

## 2. API Explorer vs. Dashboard

| Aspecto | API Explorer (`/workspace` e `/operation/:id`) | Dashboard (`/dashboard/:pageSlug`) |
| :--- | :--- | :--- |
| **Foco Principal** | Técnico e centrado no contrato de rotas HTTP. | Operacional e centrado no fluxo de dados de negócio. |
| **Ponto de Partida** | Navegação por endpoints agrupados por tags/recursos. | Páginas operacionais customizadas com URLs amigáveis. |
| **Execução de Métodos** | Invocação direta de qualquer método (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). | Execução contextual automática da lista com ações in-line por registro. |
| **Apresentação de Dados** | Visualizador polimórfico (tabela ou JSON bruto) do retorno direto. | Tabelas configuradas com formatação, ordenação, badges semânticos e paginação. |
| **Métricas e KPIs** | Não aplicável (inspeção de resposta individual). | Cards de métricas avaliados em tempo real (`COUNT`, `SUM`, `AVG`, etc.). |
| **Formulários** | Formulário dinâmico puro baseado no `requestBody` da operação. | Diálogos modais e drawers integrados com pré-população automática de chaves. |
| **Personalização** | Não requer configuração prévia. | Configurador visual (Wizard) para colunas, métricas, ações e rótulos. |

---

## 3. Recursos e Capacidades

- **Conexão OpenAPI Flexível**: Suporte a URLs remotas ou locais de especificações OpenAPI 3.0, 3.1 e Swagger 2.0.
- **Descoberta Heurística de Recursos**: Agrupamento automático por Tags e identificação de operações canônicas (`list`, `details`, `create`, `update`, `delete`).
- **Dashboard Operacional Personalizável**:
  - Wizard em 6 etapas para criação e edição de páginas.
  - Cards de KPIs e métricas agregadas (`COUNT`, `SUM`, `AVG`, `MIN`, `MAX`) com filtros contextuais.
  - Configuração de colunas de tabela (visibilidade, formatação de moeda/data/badge, largura e alinhamento).
  - Ações customizadas (RPC) com estilos de destaque (`danger`, `primary`, `success`, `warning`), ícones e confirmação.
- **Tabelas Dinâmicas Inteligentes**:
  - Detecção de coleções em raiz ou envelopadas (`data`, `items`, `results`, `content`).
  - Formatação inteligente por tipo (UUIDs, timestamps ISO, booleanos, números, enums).
  - Ordenação por coluna, busca com debounce e suporte a paginação (`limit`/`offset`, `page`/`size`).
- **Formulários Dinâmicos Tipados**:
  - Geração automática a partir de JSON Schema com validação reativa (`required`, `min`/`max`, `pattern`).
- **Ações CRUD Contextuais**:
  - **Visualizar Detalhes**: Drawer lateral com busca automática via rota `details` usando chaves da linha.
  - **Editar Registro**: Modal de atualização (`PUT`/`PATCH`) com preenchimento prévio dos dados da linha.
  - **Excluir Registro**: Modal de confirmação com target ID e auto-refresh reativo da lista.
- **Autenticação Segura em Sessão**:
  - Suporte a **Bearer Token** e **API Key** (Header ou Query).
  - **Zero persistência de credenciais em disco** — tokens são mantidos exclusivamente em memória.
- **Design Minimalista Dark Mode**: Interface técnica compacta inspirada em IDEs e developer tools (sem gradientes decorativos ou distrações visuais).

---

## 4. Guia do Dashboard: Criação e Gestão de Páginas

O Dashboard permite criar visões de alta produtividade para qualquer recurso da sua API através de um **Wizard de Configuração em 6 Etapas**:

### 4.1. Passo a Passo do Wizard

1. **Dados Gerais**:
   - Escolha o **Recurso OpenAPI** base (ex.: `Orders`, `Products`, `Users`).
   - Defina o **Título da Página** e o **Slug de URL** (ex.: `/dashboard/pedidos`).
   - Selecione o **Ícone de Identificação** e se a página deve ser a padrão ao acessar o Dashboard.
2. **Operações da Página**:
   - **Associação Automática**: O `ResourceOperationMatcherService` infere as operações canônicas (`list`, `details`, `create`, `update`, `delete`).
   - **Sobrescrita Explícita**: Caso sua API utilize convenções não-padrão (ex.: `POST /orders/search` para listar ou `PATCH /orders/quick-edit` para atualizar), você pode selecionar manualmente qualquer endpoint compatível da lista.
3. **Métricas e KPIs**:
   - Crie cards de resumo agregadores para exibir no topo da página.
   - Configure o **Tipo de Agregação** (`count`, `sum`, `avg`, `min`, `max`), o **Campo Alvo** (ex.: `totalAmount`) e **Condições de Filtro** (ex.: `status == 'pending'`).
   - Defina a cor de destaque (`default`, `primary`, `success`, `warning`, `danger`, `info`).
4. **Colunas da Tabela**:
   - Reordene, ative ou oculte colunas inferidas do schema OpenAPI.
   - Personalize **Rótulos de Cabeçalho**, **Largura Mínima**, **Alinhamento** (`left`, `center`, `right`) e **Formatador Visual** (`text`, `number`, `currency`, `date`, `datetime`, `badge`, `boolean`).
5. **Ações Customizadas (RPC)**:
   - Adicione botões de ação para operações que não sejam o CRUD básico (ex.: `POST /orders/{id}/cancel`, `POST /orders/{id}/dispatch`).
   - Configure estilo visual, ícone, mensagem de confirmação e formulário dinâmico de entrada.
6. **Preview em Tempo Real e Publicação**:
   - Teste a página com dados reais da API ou utilize o modo de simulação.
   - Ao clicar em **Publicar**, a configuração é salva localmente e aplicada instantaneamente ao Dashboard.

### 4.2. Gerenciamento e Remoção de Páginas

- Através do botão **"Configurar Páginas"** na sidebar do Dashboard, você pode reordenar páginas, alternar visibilidade, editar parâmetros existentes ou **excluir páginas** que não sejam mais necessárias.

---

## 5. Exemplo de Configuração Declarativa (Página "Pedidos")

Abaixo está um exemplo de configuração de página em formato JSON.

> **Nota de Generalização**: O exemplo abaixo utiliza a entidade hipotética `Orders`, mas a mesma estrutura declarativa aplica-se a **qualquer recurso** de qualquer API (ex.: Produtos, Usuários, Faturas, Tarefas, Pets, Dispositivos IoT):

```json
{
  "version": 1,
  "pages": {
    "pedidos": {
      "id": "pedidos",
      "slug": "pedidos",
      "title": "Pedidos de Venda",
      "icon": "receipt_long",
      "resourceId": "Orders",
      "order": 1,
      "isDefault": true,
      "operations": {
        "list": "listOrders",
        "create": "createOrder",
        "details": "getOrderById",
        "update": "updateOrder",
        "delete": "deleteOrder"
      },
      "metrics": [
        {
          "id": "m_total",
          "title": "Total de Pedidos",
          "type": "count",
          "icon": "receipt_long",
          "color": "default"
        },
        {
          "id": "m_revenue",
          "title": "Faturamento Aprovado",
          "type": "sum",
          "field": "totalAmount",
          "formatter": "currency",
          "currencyCode": "BRL",
          "icon": "payments",
          "color": "success",
          "filter": {
            "field": "status",
            "operator": "eq",
            "value": "completed"
          }
        },
        {
          "id": "m_pending",
          "title": "Pedidos Pendentes",
          "type": "count",
          "icon": "hourglass_empty",
          "color": "warning",
          "filter": {
            "field": "status",
            "operator": "eq",
            "value": "pending"
          }
        }
      ],
      "table": {
        "columns": [
          { "field": "orderId", "header": "Código", "type": "text", "width": "120px" },
          { "field": "customerName", "header": "Cliente", "type": "text" },
          { "field": "totalAmount", "header": "Valor Total", "type": "currency", "align": "right" },
          { "field": "status", "header": "Status", "type": "badge", "align": "center" },
          { "field": "createdAt", "header": "Data de Criação", "type": "datetime" }
        ],
        "defaultPageSize": 10
      },
      "actions": {
        "customActions": [
          {
            "id": "dispatchOrder",
            "operationId": "dispatchOrder",
            "label": "Despachar",
            "icon": "local_shipping",
            "style": "primary",
            "confirmation": true
          },
          {
            "id": "cancelOrder",
            "operationId": "cancelOrder",
            "label": "Cancelar",
            "icon": "cancel",
            "style": "danger",
            "confirmation": true
          }
        ]
      }
    }
  }
}
```

---

## 6. Persistência Local e Garantias de Segurança

### O Que É Persistido
- **Configurações de UI**: Layouts de páginas, colunas personalizadas, filtros e métricas são salvos no `localStorage` sob o namespace `apicanvas_uiconfig_<hash-da-api>`.
- **Histórico de URLs Recentes**: URLs de especificações OpenAPI conectadas recentemente.

### O Que NÃO É Persistido (Segurança Estrita)
- **Tokens de Autenticação (Bearer / JWT)**: Armazenados estritamente na memória de execução da sessão (`ApiSessionService`). Fechar a aba ou recarregar a aplicação elimina as credenciais.
- **API Keys e Segredos**: Nunca são gravados no `localStorage` nem enviados a qualquer serviço externo que não seja o backend da própria API consumida.
- **Rascunhos não publicados**: Alterações no Wizard são mantidas em um serviço de rascunho em memória (`PageDraftService`) até a confirmação explícita de publicação.

---

## 7. Limitações Conhecidas e Fallback para o API Explorer

Embora o Dashboard atenda com excelência à maioria dos recursos RESTful, certos padrões de API possuem características especiais:

1. **APIs com Rotas Não-REST ou RPC Puras**: Rotas que não retornam coleções de entidades ou exigem parâmetros múltiplos no path são melhor operadas através do **API Explorer**.
2. **Payloads Sem Schema Declarado (`type: object` vazio)**: Quando a documentação OpenAPI omite a declaração de propriedades, a inferência de colunas da tabela exibirá o visualizador JSON genérico.
3. **Múltiplos Níveis de Path Parameters**: Rotas aninhadas complexas (ex.: `/orgs/{orgId}/repos/{repoId}/issues/{issueId}/comments`) são totalmente funcionais no API Explorer e podem ser configuradas no Dashboard associando os parâmetros conhecidos.

> **Dica de Navegação**: A qualquer momento, utilize o botão **"Abrir no API Explorer"** para inspecionar e executar a rota diretamente em baixo nível.

---

## 8. Identidade Visual e Protótipo de Referência

O ApiCanvas implementa a identidade visual **Technical Dark UI**, definida em [`VISUAL_IDENTITY.md`](./VISUAL_IDENTITY.md):

* **Fundo Grafite Profundo**: `#0d1117` e superfícies em `#161b22` / `#21262d`.
* **Tipografia Técnica**: Inter para interface e JetBrains Mono / Fira Code para dados, identificadores e status.
* **Layout Compacto e Sóbrio**: Focado em dados e densidade informacional sem ornamentos supérfluos.
* **Protótipo de Referência**: Consulte [`docs/prototypes/dashboard-pedidos-crud.png`](./docs/prototypes/dashboard-pedidos-crud.png) para visualizar a referência visual canônica do Dashboard.

---

## 9. Instalação e Execução

### Pré-requisitos
- **Node.js**: `v18.x`, `v20.x` (LTS) ou superior.
- **npm**: `v9.x` ou superior.

### Comandos Principais

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento (http://localhost:4200/)
npm start

# Executar suite completa de testes unitários (725+ testes)
npm test -- --watch=false

# Gerar bundle otimizado de produção
npm run build
```

---

## 10. Licença

Este projeto é disponibilizado sob a licença [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)](./LICENSE).

* **Uso Não Comercial**: Proibida a comercialização direta da ferramenta.
* **Compartilhamento Igualitário**: Obras derivadas devem ser mantidas abertas sob a mesma licença.
* **Atribuição**: Exige menção e créditos aos autores originais.
