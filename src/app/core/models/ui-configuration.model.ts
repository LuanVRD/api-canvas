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

export interface UiFilterConfiguration {
  searchFields?: string[];
  searchPlaceholder?: string;
  statusField?: string;
  dateField?: string;
  enabled?: boolean;
}

export interface UiPaginationConfiguration {
  pageSize?: number;
  pageSizeOptions?: number[];
  enabled?: boolean;
}

export interface UiTableConfiguration {
  columns?: UiColumnConfiguration[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  pageSizeOptions?: number[];
  pagination?: UiPaginationConfiguration;
}

export interface UiOperationReferences {
  list?: string;
  create?: string;
  details?: string;
  update?: string;
  delete?: string;
  custom?: string[];
}

export interface UiRowActionsConfiguration {
  viewDetails?: boolean;
  edit?: boolean;
  delete?: boolean;
  customActionOperations?: string[];
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
