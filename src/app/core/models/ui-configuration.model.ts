export type UiFieldControl =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'date'
  | 'datetime'
  | 'json'
  | string;

export interface UiFieldConfiguration {
  label?: string;
  control?: UiFieldControl;
  hidden?: boolean;
  description?: string;
  placeholder?: string;
}

export interface UiListConfiguration {
  /**
   * Ordered list of visible column keys to display in listings.
   */
  columns?: string[];
}

export type UiMetricType =
  | 'count_all'
  | 'count_matching'
  | 'sum_field'
  | string;

export type UiColorScheme =
  | 'default'
  | 'primary'
  | 'warning'
  | 'info'
  | 'success'
  | 'danger'
  | string;

export type UiMetricFormat =
  | 'number'
  | 'currency'
  | 'percent'
  | string;

/**
 * Configuração declarativa de métricas operacionais para cabeçalho de recursos/páginas.
 *
 * NOTA DE ARQUITETURA:
 * Métricas calculadas em memória (como 'count_matching' e 'sum_field') operam sobre o conjunto
 * de dados atualmente carregado no cliente (página ativa). Quando houver paginação server-side
 * (totalCount > items.length), o resultado de 'count_matching' reflete a amostra carregada.
 * A métrica 'count_all' utiliza preferencialmente o totalCount informado pelo backend.
 */
export interface UiMetricConfiguration {
  /** Identificador único opcional da métrica */
  id?: string;
  /** Rótulo legível obrigatório da métrica */
  label: string;
  /** Ícone Material opcional a ser exibido no card */
  icon?: string;
  /** Tipo de agregação: 'count_all', 'count_matching', 'sum_field' */
  type?: UiMetricType;
  /** Campo do registro a ser inspecionado ou somado */
  field?: string;
  /** Valor esperado para contagem quando type = 'count_matching' */
  matchingValue?: unknown;
  /** Cor semântica restrita aos tokens do sistema de design */
  colorScheme?: UiColorScheme;
  /** Formato de apresentação do valor numérico */
  format?: UiMetricFormat;
  /** Descrição ou dica contextual adicional */
  description?: string;
}

export type UiColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'status_badge'
  | 'monospace'
  | string;

export interface UiStatusBadgeOption {
  label?: string;
  color?: string;
  icon?: string;
}

export interface UiColumnConfiguration {
  field: string;
  label?: string;
  type?: UiColumnType;
  sortable?: boolean;
  hidden?: boolean;
  width?: string;
  statusBadgeMap?: Record<string, UiStatusBadgeOption>;
}

export interface UiFilterOption {
  label: string;
  value: unknown;
}

export interface UiFilterBinding {
  /** Nome identificador do campo ou controle */
  name: string;
  /** Nome real do query parameter exposto pela operação OpenAPI GET (ex: 'status', 'category_id', 'role') */
  queryParam?: string;
  /** Rótulo amigável a ser exibido no controle visual */
  label?: string;
  /** Tipo de controle de entrada: 'select', 'text', 'boolean', 'number' */
  type?: 'select' | 'text' | 'boolean' | 'number' | string;
  /** Opções estáticas para controle do tipo 'select'. Se omitido, é derivado do enum do schema OpenAPI */
  options?: UiFilterOption[];
  /** Valor padrão / inicial do filtro */
  default?: unknown;
  /** Placeholder exibido no campo de entrada */
  placeholder?: string;
}

export interface UiFilterConfiguration {
  searchFields?: string[];
  searchPlaceholder?: string;
  /** Nome do query parameter para busca textual (ex: 'q', 'search', 'query', 'filter') */
  searchParam?: string;
  statusField?: string;
  statusParam?: string;
  dateField?: string;
  dateParam?: string;
  enabled?: boolean;
  /** Lista declarativa de bindings para filtros específicos */
  filterBindings?: UiFilterBinding[];
  /** Alias retrocompatível para filterBindings */
  bindings?: UiFilterBinding[];
}

export type UiPaginationMode = 'auto' | 'server' | 'client' | string;
export type UiPaginationIndexMode = '1-based' | '0-based' | 'offset' | string;

export interface UiPaginationConfiguration {
  pageSize?: number;
  pageSizeOptions?: number[];
  enabled?: boolean;
  /** Modo de paginação: 'auto' (detecta parâmetros), 'server' (requisições remotas) ou 'client' (fatiamento em memória) */
  mode?: UiPaginationMode;
  /** Nome do query parameter para o número da página (ex: 'page', '_page', 'pageIndex') */
  pageParam?: string;
  /** Nome do query parameter para a quantidade de itens por página (ex: 'pageSize', 'limit', 'per_page', 'size') */
  pageSizeParam?: string;
  /** Nome do query parameter para deslocamento/offset (ex: 'offset', 'skip') */
  offsetParam?: string;
  /** Modo de indexação: '1-based' (padrão, 1..N), '0-based' (0..N-1), ou 'offset' ((page-1)*pageSize) */
  indexMode?: UiPaginationIndexMode;
  /** Tamanho de página padrão */
  defaultPageSize?: number;
}

export type UiSortFormat = 'separate' | 'prefixed' | 'combined' | string;

export interface UiTableConfiguration {
  columns?: UiColumnConfiguration[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  pageSizeOptions?: number[];
  pagination?: UiPaginationConfiguration;
  /** Caminho por notação de ponto para extrair o array de itens da resposta (ex: 'data.items', 'result.records') */
  dataPath?: string;
  /** Caminho por notação de ponto para extrair o total de registros da resposta (ex: 'meta.pagination.total', 'totalCount') */
  totalPath?: string;
  /** Nome do query parameter para o campo de ordenação (ex: 'sort', 'sortBy', '_sort', 'orderBy') */
  sortParam?: string;
  /** Nome do query parameter para a direção da ordenação (ex: 'order', 'sortOrder', '_order', 'direction') */
  orderParam?: string;
  /** Formato de envio da ordenação: 'separate' (sort=name&order=asc), 'prefixed' (sort=+name ou sort=-name), 'combined' (sort=name,asc) */
  sortFormat?: UiSortFormat;
}

export interface UiOperationReferences {
  list?: string;
  create?: string;
  details?: string;
  update?: string;
  delete?: string;
  custom?: string[];
}

export type UiActionStyle =
  | 'default'
  | 'primary'
  | 'danger'
  | 'warning'
  | 'info'
  | 'success'
  | string;

export type UiActionInputMode = 'auto' | 'dialog' | 'direct' | string;

export interface UiActionConfirmationConfig {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
}

export interface UiCustomActionDescriptor {
  /** Identificador opcional da ação (se omitido, deriva do operationId) */
  id?: string;
  /** ID, operationId ou método + path da operação OpenAPI */
  operationId: string;
  /** Rótulo legível do botão / item de menu */
  label?: string;
  /** Ícone Material a ser exibido no botão */
  icon?: string;
  /** Dica / tooltip exibido ao passar o mouse */
  tooltip?: string;
  /** Estilo visual semântico do botão */
  style?: UiActionStyle;
  /** Flag explícita indicando ação destrutiva (requer atenção reforçada) */
  danger?: boolean;
  /** Confirmação antes da execução (booleano ou configuração personalizada) */
  confirmation?: boolean | UiActionConfirmationConfig;
  /** Modo de entrada: 'auto' (detecta body), 'dialog' (força modal) ou 'direct' (executa diretamente sem dialog se sem body/sem confirmação) */
  inputMode?: UiActionInputMode;
  /** Valores padrão/iniciais para o request body ou parâmetros */
  initialValues?: Record<string, unknown>;
  /** Mapeamento de campos do registro linha para propriedades do payload */
  fieldMapping?: Record<string, string>;
  /** Desabilitar temporariamente a ação */
  disabled?: boolean;
  /** Ocultar a ação na tabela */
  hidden?: boolean;
}

export interface UiRowActionsConfiguration {
  viewDetails?: boolean;
  viewDetailsLabel?: string;
  viewDetailsTooltip?: string;
  edit?: boolean;
  editLabel?: string;
  editTooltip?: string;
  delete?: boolean;
  deleteLabel?: string;
  deleteTooltip?: string;
  customActionOperations?: string[];
  customActions?: UiCustomActionDescriptor[];
  actions?: UiCustomActionDescriptor[];
}

export interface UiPageActionsConfiguration {
  primaryCreateActionId?: string;
  primaryCreateLabel?: string;
  rowActions?: UiRowActionsConfiguration;
}

export type UiPageDisplayMode = 'dashboard' | 'crud' | 'table' | 'custom' | string;

export interface UiPageConfiguration {
  id?: string;
  resourceId?: string;
  title?: string;
  slug?: string;
  isDefault?: boolean;
  default?: boolean;
  icon?: string;
  description?: string;
  order?: number;
  hidden?: boolean;
  displayMode?: UiPageDisplayMode;
  autoLoad?: boolean;

  operations?: UiOperationReferences;
  metrics?: UiMetricConfiguration[];
  filters?: UiFilterConfiguration;
  table?: UiTableConfiguration;
  pagination?: UiPaginationConfiguration;
  actions?: UiPageActionsConfiguration;
  /** Caminho por notação de ponto para extrair o array de itens da resposta (ex: 'data.items', 'result.records') */
  dataPath?: string;
  /** Caminho por notação de ponto para extrair o total de registros da resposta (ex: 'meta.pagination.total', 'totalCount') */
  totalPath?: string;
}

export interface UiResourceConfiguration {
  label?: string;
  icon?: string;
  hidden?: boolean;
  order?: number;
  slug?: string;
  list?: UiListConfiguration;
  fields?: Record<string, UiFieldConfiguration>;
  page?: UiPageConfiguration;
  operations?: UiOperationReferences;
}

export const CURRENT_UI_CONFIGURATION_VERSION = 1;

export interface UiConfiguration {
  version?: number | string;
  title?: string;
  resources?: Record<string, UiResourceConfiguration>;
  fields?: Record<string, UiFieldConfiguration>;
  pages?: Record<string, UiPageConfiguration>;
}
