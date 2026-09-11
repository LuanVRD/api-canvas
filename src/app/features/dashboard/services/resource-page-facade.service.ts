import { computed, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiSessionService } from '../../../core/services/api-session.service';
import { ApiExecutorService } from '../../../core/services/api-executor.service';
import { ApiRequestBuilderService } from '../../../core/services/api-request-builder.service';
import { ResolvedResourcePage } from '../../../core/models/resolved-resource-page.model';
import { UiPageConfiguration } from '../../../core/models/ui-configuration.model';
import { ApiRequestInput } from '../../../core/models/api-request-input.model';
import { ApiExecutionResult } from '../../../core/models/api-execution-result.model';
import {
  ResourcePageError,
  ResourcePageFilterParams,
  ResourcePageState,
  ResourcePageStatus
} from '../models/resource-page-state.model';

export interface LoadPageOptions {
  resetParams?: boolean;
  initialParams?: Partial<ResourcePageFilterParams>;
  autoLoad?: boolean;
}

export interface RefreshOptions {
  silent?: boolean;
}

const DEFAULT_PARAMS: ResourcePageFilterParams = {
  page: 1,
  pageSize: 10,
  searchTerm: '',
  filters: {},
  sortField: null,
  sortOrder: null,
  customParams: {}
};

const INITIAL_STATE: ResourcePageState = {
  status: 'idle',
  resolvedPage: null,
  pageConfig: null,
  data: null,
  rawResponse: null,
  totalCount: 0,
  params: { ...DEFAULT_PARAMS },
  error: null
};

@Injectable()
export class ResourcePageFacadeService implements OnDestroy {
  private readonly sessionService = inject(ApiSessionService);
  private readonly apiExecutor = inject(ApiExecutorService);
  private readonly requestBuilder = inject(ApiRequestBuilderService);

  // --- Internal Reactive State ---
  private readonly _state = signal<ResourcePageState>({ ...INITIAL_STATE });
  private requestCounter = 0;
  private lastHandledMutationKey: string | null = null;

  // RxJS pipeline for concurrency-safe execution
  private readonly executionTrigger$ = new Subject<{
    requestId: number;
    isRefresh: boolean;
    page: ResolvedResourcePage;
    params: ResourcePageFilterParams;
  }>();

  private readonly subscription = new Subscription();

  // --- Public Computed Signals ---
  readonly state = this._state.asReadonly();
  readonly status = computed<ResourcePageStatus>(() => this._state().status);
  readonly resolvedPage = computed<ResolvedResourcePage | null>(() => this._state().resolvedPage);
  readonly pageConfig = computed<UiPageConfiguration | null>(() => this._state().pageConfig);
  readonly data = computed<unknown[] | null>(() => this._state().data);
  readonly items = computed<unknown[]>(() => this._state().data ?? []);
  readonly totalCount = computed<number>(() => this._state().totalCount);
  readonly params = computed<ResourcePageFilterParams>(() => this._state().params);
  readonly error = computed<ResourcePageError | null>(() => this._state().error);
  readonly lastExecutionDurationMs = computed<number | undefined>(() => this._state().lastExecutionDurationMs);
  readonly lastUpdatedAt = computed<number | undefined>(() => this._state().lastUpdatedAt);

  // Status flags
  readonly isIdle = computed<boolean>(() => this.status() === 'idle');
  readonly isLoading = computed<boolean>(() => this.status() === 'loading');
  readonly isRefreshing = computed<boolean>(() => this.status() === 'refreshing');
  readonly isSuccess = computed<boolean>(() => this.status() === 'success');
  readonly isEmpty = computed<boolean>(() => this.status() === 'empty');
  readonly isError = computed<boolean>(() => this.status() === 'error');
  readonly hasData = computed<boolean>(() => (this.data()?.length ?? 0) > 0);

  constructor() {
    this.initExecutionPipeline();
    this.initMutationListener();
  }

  ngOnDestroy(): void {
    this.destroy();
  }

  destroy(): void {
    this.subscription.unsubscribe();
    this.executionTrigger$.complete();
  }

  /**
   * Loads and activates a page configuration or pre-resolved page.
   */
  loadPage(
    pageInput: UiPageConfiguration | ResolvedResourcePage | null,
    options?: LoadPageOptions
  ): void {
    if (!pageInput) {
      this.resetToIdle();
      return;
    }

    let resolved: ResolvedResourcePage | null = null;
    let config: UiPageConfiguration | null = null;

    if ('resourceId' in pageInput && 'list' in pageInput) {
      // It is already a ResolvedResourcePage
      resolved = pageInput as ResolvedResourcePage;
      config = resolved.pageConfig ?? null;
    } else {
      // It is a UiPageConfiguration
      config = pageInput as UiPageConfiguration;
      if (config?.resourceId) {
        resolved = this.sessionService.resolveResourcePage(config.resourceId, config);
      }
    }

    if (!resolved) {
      this._state.update((s) => ({
        ...s,
        status: 'error',
        resolvedPage: null,
        pageConfig: config,
        data: null,
        rawResponse: null,
        totalCount: 0,
        error: {
          message: `Recurso "${config?.resourceId || 'desconhecido'}" não encontrado na definição OpenAPI conectada.`,
          category: 'RESOURCE_NOT_FOUND',
          hint: 'Verifique se o schema OpenAPI contém a rota e recursos correspondentes.'
        }
      }));
      return;
    }

    const nextParams: ResourcePageFilterParams = options?.resetParams
      ? {
          ...DEFAULT_PARAMS,
          pageSize: config?.table?.pageSize || DEFAULT_PARAMS.pageSize,
          sortField: config?.table?.defaultSortField || DEFAULT_PARAMS.sortField,
          sortOrder: config?.table?.defaultSortOrder || DEFAULT_PARAMS.sortOrder,
          ...(options?.initialParams || {})
        }
      : {
          ...this._state().params,
          pageSize: config?.table?.pageSize || this._state().params.pageSize || DEFAULT_PARAMS.pageSize,
          sortField: config?.table?.defaultSortField ?? this._state().params.sortField,
          sortOrder: config?.table?.defaultSortOrder ?? this._state().params.sortOrder,
          ...(options?.initialParams || {})
        };

    const shouldAutoLoad = options?.autoLoad ?? config?.autoLoad ?? true;

    if (!shouldAutoLoad) {
      this._state.update((s) => ({
        ...s,
        status: 'idle',
        resolvedPage: resolved,
        pageConfig: config,
        data: null,
        rawResponse: null,
        totalCount: 0,
        params: nextParams,
        error: null
      }));
      return;
    }

    const requestId = ++this.requestCounter;

    this._state.update((s) => ({
      ...s,
      status: 'loading',
      resolvedPage: resolved,
      pageConfig: config,
      data: null,
      rawResponse: null,
      totalCount: 0,
      params: nextParams,
      error: null
    }));

    this.executionTrigger$.next({
      requestId,
      isRefresh: false,
      page: resolved,
      params: nextParams
    });
  }

  /**
   * Executes the list operation explicitly (useful when autoLoad is false or in idle state).
   */
  executeList(): void {
    const currentState = this._state();
    const resolved = currentState.resolvedPage;
    if (!resolved) return;

    const requestId = ++this.requestCounter;
    this._state.update((s) => ({
      ...s,
      status: 'loading',
      error: null
    }));

    this.executionTrigger$.next({
      requestId,
      isRefresh: false,
      page: resolved,
      params: currentState.params
    });
  }

  /**
   * Refreshes the current list operation maintaining current filter/pagination parameters.
   * If silent is true, it preserves current status if already success/refreshing.
   */
  refresh(options?: RefreshOptions): void {
    const currentState = this._state();
    const resolved = currentState.resolvedPage;
    if (!resolved) return;

    const requestId = ++this.requestCounter;
    const hasCurrentData = currentState.data !== null;

    this._state.update((s) => ({
      ...s,
      status: hasCurrentData ? 'refreshing' : 'loading',
      error: null
    }));

    this.executionTrigger$.next({
      requestId,
      isRefresh: true,
      page: resolved,
      params: currentState.params
    });
  }

  /**
   * Retries executing the list operation after an error state.
   */
  retry(): void {
    this.refresh();
  }

  /**
   * Updates the current page number and triggers data reload.
   */
  setPage(page: number): void {
    if (page < 1 || page === this._state().params.page) return;
    this.updateParamsAndFetch({ page });
  }

  /**
   * Updates the page size and resets to page 1.
   */
  setPageSize(pageSize: number): void {
    if (pageSize <= 0 || pageSize === this._state().params.pageSize) return;
    this.updateParamsAndFetch({ pageSize, page: 1 });
  }

  /**
   * Sets the global search term and resets to page 1.
   */
  setSearch(searchTerm: string): void {
    const trimmed = searchTerm ?? '';
    if (trimmed === this._state().params.searchTerm) return;
    this.updateParamsAndFetch({ searchTerm: trimmed, page: 1 });
  }

  /**
   * Sets a specific filter key and value and resets to page 1.
   */
  setFilter(key: string, value: unknown): void {
    const currentFilters = { ...this._state().params.filters };
    if (value === undefined || value === null || value === '') {
      delete currentFilters[key];
    } else {
      currentFilters[key] = value;
    }
    this.updateParamsAndFetch({ filters: currentFilters, page: 1 });
  }

  /**
   * Sets or updates multiple filter keys simultaneously and resets to page 1.
   */
  setFilters(filters: Record<string, unknown>): void {
    this.updateParamsAndFetch({ filters: { ...filters }, page: 1 });
  }

  /**
   * Sets the sorting field and order and resets to page 1.
   */
  setSort(sortField: string | null, sortOrder: 'asc' | 'desc' | null = 'asc'): void {
    this.updateParamsAndFetch({ sortField, sortOrder, page: 1 });
  }

  /**
   * Sets arbitrary custom query/path parameters.
   */
  setCustomParams(customParams: Record<string, unknown>): void {
    this.updateParamsAndFetch({
      customParams: { ...this._state().params.customParams, ...customParams },
      page: 1
    });
  }

  /**
   * Clears all filters, search terms and sorts to default values.
   */
  resetParams(): void {
    const config = this._state().pageConfig;
    const nextParams: ResourcePageFilterParams = {
      ...DEFAULT_PARAMS,
      pageSize: config?.table?.pageSize || DEFAULT_PARAMS.pageSize,
      sortField: config?.table?.defaultSortField || DEFAULT_PARAMS.sortField,
      sortOrder: config?.table?.defaultSortOrder || DEFAULT_PARAMS.sortOrder
    };
    this.updateParamsAndFetch(nextParams);
  }

  /**
   * Resets the entire facade to the initial idle state.
   */
  resetToIdle(): void {
    this.requestCounter++;
    this._state.set({ ...INITIAL_STATE });
  }

  // --- Private Helpers ---

  private updateParamsAndFetch(partial: Partial<ResourcePageFilterParams>): void {
    const currentState = this._state();
    const resolved = currentState.resolvedPage;
    if (!resolved) {
      this._state.update((s) => ({ ...s, params: { ...s.params, ...partial } }));
      return;
    }

    const nextParams: ResourcePageFilterParams = {
      ...currentState.params,
      ...partial
    };

    const requestId = ++this.requestCounter;

    this._state.update((s) => ({
      ...s,
      status: s.data !== null ? 'refreshing' : 'loading',
      params: nextParams,
      error: null
    }));

    this.executionTrigger$.next({
      requestId,
      isRefresh: currentState.data !== null,
      page: resolved,
      params: nextParams
    });
  }

  private initExecutionPipeline(): void {
    this.subscription.add(
      this.executionTrigger$
        .pipe(
          switchMap(({ requestId, page, params }) => {
            const listOp = page.list;
            if (!listOp) {
              return Promise.resolve({
                requestId,
                result: null,
                missingListOp: true
              });
            }

            const baseUrl = this.sessionService.baseUrl() || '';
            const requestInput = this.buildRequestInput(page, params);

            return this.apiExecutor
              .execute(baseUrl, listOp, requestInput)
              .toPromise()
              .then((result) => ({
                requestId,
                result: result as ApiExecutionResult,
                missingListOp: false
              }))
              .catch((err) => ({
                requestId,
                result: {
                  status: 0,
                  statusText: 'Client Exception',
                  data: null,
                  duration: 0,
                  durationMs: 0,
                  isSuccess: false,
                  timestamp: Date.now(),
                  error: {
                    message: err instanceof Error ? err.message : 'Falha na execução da requisição',
                    category: 'UNKNOWN'
                  }
                } as ApiExecutionResult,
                missingListOp: false
              }));
          })
        )
        .subscribe((payload) => {
          // Race-condition guard: Only process if payload matches current request counter
          if (payload.requestId !== this.requestCounter) {
            return;
          }

          if (payload.missingListOp) {
            this._state.update((s) => ({
              ...s,
              status: 'error',
              data: [],
              rawResponse: null,
              totalCount: 0,
              error: {
                message: `O recurso "${s.resolvedPage?.resourceId || s.pageConfig?.resourceId || 'selecionado'}" não possui uma operação de listagem configurada.`,
                category: 'OPERATION_NOT_FOUND',
                hint: 'Verifique no API Explorer as operações disponíveis ou configure uma rota de listagem.'
              }
            }));
            return;
          }

          const res = payload.result;
          if (!res) return;

          if (res.isSuccess) {
            const extracted = this.extractItemsAndTotal(res.data);
            const isEmpty = extracted.items.length === 0;

            this._state.update((s) => ({
              ...s,
              status: isEmpty ? 'empty' : 'success',
              data: extracted.items,
              rawResponse: res.data,
              totalCount: extracted.totalCount,
              error: null,
              lastExecutionDurationMs: res.durationMs ?? res.duration,
              lastUpdatedAt: Date.now()
            }));
          } else {
            this._state.update((s) => ({
              ...s,
              status: 'error',
              error: {
                message: res.error?.message || `Erro ${res.status}: ${res.statusText || 'Falha na requisição'}`,
                category: res.error?.category,
                status: res.status,
                statusText: res.statusText,
                details: res.error?.details,
                hint: res.error?.hint
              },
              lastExecutionDurationMs: res.durationMs ?? res.duration
            }));
          }
        })
    );
  }

  private initMutationListener(): void {
    // Listens to mutation signal changes from ApiSessionService
    effect(
      () => {
        const mutation = this.sessionService.lastResourceMutation();
        if (!mutation) return;

        const mutationKey = `${mutation.resourceId}-${mutation.operationId}-${mutation.timestamp}`;
        if (mutationKey === this.lastHandledMutationKey) return;
        this.lastHandledMutationKey = mutationKey;

        const current = this._state();
        const currentResourceId =
          current.resolvedPage?.resourceId || current.pageConfig?.resourceId;

        if (
          currentResourceId &&
          mutation.resourceId &&
          currentResourceId.toLowerCase() === mutation.resourceId.toLowerCase()
        ) {
          // Automatic soft refresh if active page matches mutated resource
          if (current.status !== 'idle' && current.resolvedPage?.list) {
            this.refresh({ silent: true });
          }
        }
      }
    );
  }

  private buildRequestInput(
    resolved: ResolvedResourcePage,
    params: ResourcePageFilterParams
  ): ApiRequestInput {
    const query: Record<string, unknown> = {};
    const path: Record<string, unknown> = {};

    // 1. Pagination parameters
    if (params.page !== undefined && params.page !== null) {
      query['page'] = params.page;
      query['_page'] = params.page;
      query['pageIndex'] = params.page;
    }
    if (params.pageSize !== undefined && params.pageSize !== null) {
      query['pageSize'] = params.pageSize;
      query['limit'] = params.pageSize;
      query['per_page'] = params.pageSize;
      query['_limit'] = params.pageSize;
    }

    // 2. Search parameter
    if (params.searchTerm) {
      query['q'] = params.searchTerm;
      query['search'] = params.searchTerm;
    }

    // 3. Sorting parameters
    if (params.sortField) {
      query['sort'] = params.sortField;
      query['sortBy'] = params.sortField;
      query['_sort'] = params.sortField;
      if (params.sortOrder) {
        query['order'] = params.sortOrder;
        query['sortOrder'] = params.sortOrder;
        query['_order'] = params.sortOrder;
      }
    }

    // 4. Custom filters
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          query[key] = value;
        }
      }
    }

    // 5. Explicit customParams
    if (params.customParams) {
      for (const [key, value] of Object.entries(params.customParams)) {
        if (value !== undefined && value !== null) {
          query[key] = value;
        }
      }
    }

    return {
      query,
      path,
      headers: {}
    };
  }

  private extractItemsAndTotal(responseData: unknown): {
    items: unknown[];
    totalCount: number;
  } {
    if (!responseData) {
      return { items: [], totalCount: 0 };
    }

    // If it is directly an array
    if (Array.isArray(responseData)) {
      return {
        items: responseData,
        totalCount: responseData.length
      };
    }

    if (typeof responseData === 'object') {
      const obj = responseData as Record<string, unknown>;

      // Check common property wrappers
      const candidates = ['items', 'records', 'data', 'results', 'content', 'rows', 'list'];
      for (const prop of candidates) {
        const val = obj[prop];
        if (Array.isArray(val)) {
          const total =
            (typeof obj['total'] === 'number' && obj['total']) ||
            (typeof obj['totalCount'] === 'number' && obj['totalCount']) ||
            (typeof obj['count'] === 'number' && obj['count']) ||
            (typeof obj['recordsTotal'] === 'number' && obj['recordsTotal']) ||
            val.length;

          return {
            items: val,
            totalCount: total
          };
        }
      }
    }

    return { items: [], totalCount: 0 };
  }
}
