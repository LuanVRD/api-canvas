import { computed, effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiSessionService } from '../../../core/services/api-session.service';
import { ApiExecutorService } from '../../../core/services/api-executor.service';
import { ApiRequestBuilderService } from '../../../core/services/api-request-builder.service';
import {
  ListQueryBindingService,
  ResolvedFilterBinding,
  ResolvedPaginationMeta,
  ResolvedSortMeta
} from '../../../core/services/list-query-binding.service';
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
  private readonly queryBinding = inject(ListQueryBindingService);

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

  // Bindings & Pagination Computeds
  readonly paginationMeta = computed<ResolvedPaginationMeta>(() => {
    const page = this.resolvedPage();
    const config = this.pageConfig();
    return this.queryBinding.detectPaginationMetadata(page?.list, config);
  });

  readonly isServerPagination = computed<boolean>(() => {
    return this.paginationMeta().mode === 'server';
  });

  readonly sortMeta = computed<ResolvedSortMeta>(() => {
    const page = this.resolvedPage();
    const config = this.pageConfig();
    return this.queryBinding.detectSortMetadata(page?.list, config);
  });

  readonly filterBindings = computed<ResolvedFilterBinding[]>(() => {
    const page = this.resolvedPage();
    const config = this.pageConfig();
    return this.queryBinding.detectFilterBindings(page?.list, config);
  });

  readonly searchParamName = computed<string>(() => {
    const page = this.resolvedPage();
    const config = this.pageConfig();
    return this.queryBinding.detectSearchParam(page?.list, config);
  });

  /**
   * Total de páginas calculado com base no totalCount e pageSize atual.
   */
  readonly totalPages = computed<number>(() => {
    const total = this.totalCount();
    const size = this.params().pageSize || this.paginationMeta().defaultPageSize || 10;
    return Math.max(1, Math.ceil(total / size));
  });

  /**
   * Itens a serem exibidos na tabela.
   * Se for paginação server-side, o backend já entrega a fatia certa.
   * Se for paginação client-side, fatiamos o array em memória preservando o totalCount original.
   */
  readonly visibleItems = computed<unknown[]>(() => {
    const all = this.items();
    if (this.isServerPagination()) {
      return all;
    }

    const page = Math.max(1, this.params().page || 1);
    const size = Math.max(1, this.params().pageSize || this.paginationMeta().defaultPageSize || 10);
    const startIndex = (page - 1) * size;
    return all.slice(startIndex, startIndex + size);
  });

  /**
   * Indica se há algum filtro ou busca ativo diferente do padrão.
   */
  readonly hasActiveFilters = computed<boolean>(() => {
    const p = this.params();
    if (p.searchTerm && p.searchTerm.trim() !== '') return true;
    if (p.filters && Object.keys(p.filters).length > 0) return true;
    if (p.sortField && p.sortField !== this.sortMeta().defaultSortField) return true;
    return false;
  });

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

    const paginationMeta = this.queryBinding.detectPaginationMetadata(resolved.list, config);
    const sortMeta = this.queryBinding.detectSortMetadata(resolved.list, config);

    const defaultPageSize = paginationMeta.defaultPageSize;
    const defaultSortField = sortMeta.defaultSortField;
    const defaultSortOrder = sortMeta.defaultSortOrder;

    const nextParams: ResourcePageFilterParams = {
      ...DEFAULT_PARAMS,
      pageSize: options?.initialParams?.pageSize ?? defaultPageSize,
      sortField: options?.initialParams?.sortField ?? defaultSortField,
      sortOrder: options?.initialParams?.sortOrder ?? defaultSortOrder,
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
   * Updates the current page number and triggers data reload (or client slice update).
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
    const cleanFilters: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(filters || {})) {
      if (v !== undefined && v !== null && v !== '') {
        cleanFilters[k] = v;
      }
    }
    this.updateParamsAndFetch({ filters: cleanFilters, page: 1 });
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
    const paginationMeta = this.paginationMeta();
    const sortMeta = this.sortMeta();

    const nextParams: ResourcePageFilterParams = {
      ...DEFAULT_PARAMS,
      pageSize: paginationMeta.defaultPageSize || DEFAULT_PARAMS.pageSize,
      sortField: sortMeta.defaultSortField,
      sortOrder: sortMeta.defaultSortOrder
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

    // No modo client-side, se apenas a página ou o pageSize mudou e já temos dados carregados,
    // não precisamos re-disparar a requisição HTTP!
    const isClientOnlyPaging =
      !this.isServerPagination() &&
      currentState.data !== null &&
      currentState.status === 'success' &&
      partial.searchTerm === undefined &&
      partial.filters === undefined &&
      partial.sortField === undefined &&
      partial.sortOrder === undefined &&
      partial.customParams === undefined;

    if (isClientOnlyPaging) {
      this._state.update((s) => ({
        ...s,
        params: nextParams
      }));
      return;
    }

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
            const config = this._state().pageConfig;
            const dataPath = config?.dataPath || config?.table?.dataPath;
            const totalPath = config?.totalPath || config?.table?.totalPath;

            const extracted = this.queryBinding.extractItemsAndTotal(res.data, {
              dataPath,
              totalPath
            });
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
    const config = resolved.pageConfig;
    const paginationMeta = this.queryBinding.detectPaginationMetadata(resolved.list, config);
    const sortMeta = this.queryBinding.detectSortMetadata(resolved.list, config);
    const filterBindings = this.queryBinding.detectFilterBindings(resolved.list, config);
    const searchParam = this.queryBinding.detectSearchParam(resolved.list, config);

    const query = this.queryBinding.buildQueryParams(
      params,
      paginationMeta,
      sortMeta,
      filterBindings,
      searchParam
    );

    return {
      query,
      path: {},
      headers: {}
    };
  }
}

