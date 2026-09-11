import { ResolvedResourcePage } from '../../../core/models/resolved-resource-page.model';
import { UiPageConfiguration } from '../../../core/models/ui-configuration.model';

export type ResourcePageStatus =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'error';

export interface ResourcePageFilterParams {
  page: number;
  pageSize: number;
  searchTerm: string;
  filters: Record<string, unknown>;
  sortField?: string | null;
  sortOrder?: 'asc' | 'desc' | null;
  customParams?: Record<string, unknown>;
}

export interface ResourcePageError {
  message: string;
  category?: string;
  status?: number;
  statusText?: string;
  details?: unknown;
  hint?: string;
}

export interface ResourcePageState<T = unknown> {
  status: ResourcePageStatus;
  resolvedPage: ResolvedResourcePage | null;
  pageConfig: UiPageConfiguration | null;
  data: T[] | null;
  rawResponse: unknown;
  totalCount: number;
  params: ResourcePageFilterParams;
  error: ResourcePageError | null;
  lastExecutionDurationMs?: number;
  lastUpdatedAt?: number;
}
