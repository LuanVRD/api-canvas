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

export interface UiMetricConfiguration {
  id?: string;
  label: string;
  icon?: string;
  type?: UiMetricType;
  field?: string;
  matchingValue?: unknown;
  colorScheme?: UiColorScheme;
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
