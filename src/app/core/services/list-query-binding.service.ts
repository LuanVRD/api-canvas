import { Injectable } from '@angular/core';
import { ApiOperation } from '../models/api-operation.model';
import { ApiParameter } from '../models/api-parameter.model';
import { ApiSchema } from '../models/api-schema.model';
import {
  UiFilterBinding,
  UiFilterOption,
  UiPageConfiguration,
  UiPaginationIndexMode,
  UiPaginationMode,
  UiSortFormat
} from '../models/ui-configuration.model';
import { ResourcePageFilterParams } from '../../features/dashboard/models/resource-page-state.model';

export interface ResolvedPaginationMeta {
  mode: 'server' | 'client';
  pageParam?: string;
  pageSizeParam?: string;
  offsetParam?: string;
  indexMode: UiPaginationIndexMode;
  defaultPageSize: number;
  pageSizeOptions: number[];
}

export interface ResolvedSortMeta {
  sortParam: string;
  orderParam?: string;
  format: UiSortFormat;
  defaultSortField?: string | null;
  defaultSortOrder?: 'asc' | 'desc' | null;
}

export interface ResolvedFilterBinding {
  name: string;
  queryParam: string;
  label: string;
  type: 'select' | 'text' | 'boolean' | 'number';
  options: UiFilterOption[];
  default?: unknown;
  placeholder?: string;
}

const COMMON_PAGE_PARAM_NAMES = [
  'page',
  '_page',
  'pageindex',
  'page_index',
  'pagenumber',
  'page_number',
  'p'
];

const COMMON_PAGE_SIZE_PARAM_NAMES = [
  'pagesize',
  'page_size',
  'limit',
  '_limit',
  'per_page',
  'perpage',
  'size',
  'take',
  'top',
  'maxresults',
  'max_results',
  'count'
];

const COMMON_OFFSET_PARAM_NAMES = ['offset', 'skip', '_offset', 'start'];

const COMMON_SEARCH_PARAM_NAMES = [
  'q',
  'search',
  'query',
  'filter',
  'searchterm',
  'search_term',
  'keyword',
  'term'
];

const COMMON_SORT_PARAM_NAMES = [
  'sort',
  'sortby',
  'sort_by',
  '_sort',
  'orderby',
  'order_by'
];

const COMMON_ORDER_PARAM_NAMES = [
  'order',
  'sortorder',
  'sort_order',
  '_order',
  'direction',
  'dir'
];

const COMMON_ITEM_ARRAY_CANDIDATES = [
  'items',
  'records',
  'data',
  'results',
  'content',
  'rows',
  'list',
  'elements',
  'payload'
];

const COMMON_TOTAL_COUNT_CANDIDATES = [
  'total',
  'totalcount',
  'total_count',
  'count',
  'recordstotal',
  'records_total',
  'totalelements',
  'total_elements',
  'allcount'
];

@Injectable({
  providedIn: 'root'
})
export class ListQueryBindingService {
  /**
   * Extrai um valor aninhado por notação de ponto (ex: 'data.items' ou 'meta.pagination.total').
   */
  getNestedValue(target: unknown, path: string): unknown {
    if (!target || typeof target !== 'object' || !path) {
      return undefined;
    }

    const segments = path.split('.').map((s) => s.trim()).filter(Boolean);
    let current: unknown = target;

    for (const segment of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  /**
   * Extrai a lista de registros e o totalizador a partir do payload de resposta,
   * respeitando `dataPath` e `totalPath` configurados ou aplicando inferência por convenção.
   */
  extractItemsAndTotal(
    responseData: unknown,
    options?: { dataPath?: string; totalPath?: string }
  ): { items: unknown[]; totalCount: number } {
    if (responseData === null || responseData === undefined) {
      return { items: [], totalCount: 0 };
    }

    let items: unknown[] | null = null;
    let totalCount: number | null = null;

    // 1. Resolução explícita por dataPath
    if (options?.dataPath) {
      const extracted = this.getNestedValue(responseData, options.dataPath);
      if (Array.isArray(extracted)) {
        items = extracted;
      }
    }

    // 2. Resolução explícita por totalPath
    if (options?.totalPath) {
      const extractedTotal = this.getNestedValue(responseData, options.totalPath);
      if (typeof extractedTotal === 'number' && !isNaN(extractedTotal)) {
        totalCount = extractedTotal;
      } else if (typeof extractedTotal === 'string' && extractedTotal.trim() !== '') {
        const parsed = Number(extractedTotal);
        if (!isNaN(parsed)) {
          totalCount = parsed;
        }
      }
    }

    // 3. Se responseData for diretamente um Array
    if (Array.isArray(responseData)) {
      items = items ?? responseData;
      totalCount = totalCount ?? responseData.length;
      return { items, totalCount };
    }

    // 4. Se for um Objeto sem caminhos explícitos suficientes, inspeciona envelopes conhecidos
    if (typeof responseData === 'object' && responseData !== null) {
      const obj = responseData as Record<string, unknown>;

      // Se ainda não encontrou items, procurar nos candidatos
      if (!items) {
        const foundItems = this.findPropertyInsensitive(obj, COMMON_ITEM_ARRAY_CANDIDATES);
        if (Array.isArray(foundItems)) {
          items = foundItems;
        }
      }

      // Se ainda não encontrou totalCount, procurar nos candidatos raiz
      if (totalCount === null) {
        const foundTotal = this.findPropertyInsensitive(obj, COMMON_TOTAL_COUNT_CANDIDATES);
        if (typeof foundTotal === 'number' && !isNaN(foundTotal)) {
          totalCount = foundTotal;
        } else if (typeof foundTotal === 'string' && foundTotal.trim() !== '') {
          const parsed = Number(foundTotal);
          if (!isNaN(parsed)) {
            totalCount = parsed;
          }
        }
      }

      // Se ainda não encontrou totalCount, procurar em objetos de metadados como `meta`, `pagination`, `page`
      if (totalCount === null) {
        const metaContainers = ['meta', 'pagination', 'page', 'paging', 'info'];
        for (const metaKey of metaContainers) {
          const metaObj = this.findPropertyInsensitive(obj, [metaKey]);
          if (metaObj && typeof metaObj === 'object' && !Array.isArray(metaObj)) {
            const foundMetaTotal = this.findPropertyInsensitive(
              metaObj as Record<string, unknown>,
              COMMON_TOTAL_COUNT_CANDIDATES
            );
            if (typeof foundMetaTotal === 'number' && !isNaN(foundMetaTotal)) {
              totalCount = foundMetaTotal;
              break;
            } else if (typeof foundMetaTotal === 'string' && foundMetaTotal.trim() !== '') {
              const parsed = Number(foundMetaTotal);
              if (!isNaN(parsed)) {
                totalCount = parsed;
                break;
              }
            }
          }
        }
      }
    }

    const finalItems = items ?? [];
    const finalTotal = totalCount ?? finalItems.length;

    return {
      items: finalItems,
      totalCount: finalTotal
    };
  }

  private findPropertyInsensitive(obj: Record<string, unknown>, candidates: string[]): unknown {
    const normCandidates = candidates.map((c) => c.toLowerCase().replace(/[-_]/g, ''));
    for (const [k, v] of Object.entries(obj)) {
      const normK = k.toLowerCase().replace(/[-_]/g, '');
      if (normCandidates.includes(normK)) {
        return v;
      }
    }
    return undefined;
  }

  /**
   * Detecta ou resolve a configuração de paginação para a listagem (Server-Side vs Client-Side).
   */
  detectPaginationMetadata(
    operation: ApiOperation | null | undefined,
    config?: UiPageConfiguration | null
  ): ResolvedPaginationMeta {
    const pageCfg = config?.pagination;
    const tableCfg = config?.table;
    const queryParams = this.extractQueryParams(operation);

    // 1. Procurar parâmetros de paginação na operação
    const detectedPageParam = this.findMatchingParam(queryParams, COMMON_PAGE_PARAM_NAMES);
    const detectedPageSizeParam = this.findMatchingParam(
      queryParams,
      COMMON_PAGE_SIZE_PARAM_NAMES
    );
    const detectedOffsetParam = this.findMatchingParam(
      queryParams,
      COMMON_OFFSET_PARAM_NAMES
    );

    const hasServerPaginationParams = Boolean(
      detectedPageParam || detectedPageSizeParam || detectedOffsetParam
    );

    // 2. Determinar modo ('auto', 'server', 'client')
    let mode: 'server' | 'client' = 'client';
    const explicitMode = pageCfg?.mode;

    if (explicitMode === 'server') {
      mode = 'server';
    } else if (explicitMode === 'client') {
      mode = 'client';
    } else {
      // Modo 'auto' ou não definido: se a API expõe parâmetros de paginação, assume server-side
      mode = hasServerPaginationParams ? 'server' : 'client';
    }

    // 3. Determinar nomes dos parâmetros
    const pageParam = pageCfg?.pageParam || detectedPageParam?.name || (detectedOffsetParam ? undefined : 'page');
    const pageSizeParam = pageCfg?.pageSizeParam || detectedPageSizeParam?.name || 'pageSize';
    const offsetParam = pageCfg?.offsetParam || detectedOffsetParam?.name;

    // 4. IndexMode
    let indexMode: UiPaginationIndexMode = pageCfg?.indexMode || (offsetParam ? 'offset' : '1-based');
    if (pageCfg?.indexMode) {
      indexMode = pageCfg.indexMode;
    }

    // 5. Default Page Size
    let defaultPageSize =
      pageCfg?.pageSize ||
      pageCfg?.defaultPageSize ||
      tableCfg?.pageSize ||
      tableCfg?.pagination?.pageSize ||
      10;

    if (
      !pageCfg?.pageSize &&
      !pageCfg?.defaultPageSize &&
      !tableCfg?.pageSize &&
      detectedPageSizeParam?.default !== undefined
    ) {
      const parsedDef = Number(detectedPageSizeParam.default);
      if (!isNaN(parsedDef) && parsedDef > 0) {
        defaultPageSize = parsedDef;
      }
    }

    const pageSizeOptions =
      pageCfg?.pageSizeOptions ||
      tableCfg?.pageSizeOptions ||
      tableCfg?.pagination?.pageSizeOptions ||
      [10, 25, 50, 100];

    return {
      mode,
      pageParam,
      pageSizeParam,
      offsetParam,
      indexMode,
      defaultPageSize,
      pageSizeOptions
    };
  }

  /**
   * Detecta ou resolve a configuração de ordenação.
   */
  detectSortMetadata(
    operation: ApiOperation | null | undefined,
    config?: UiPageConfiguration | null
  ): ResolvedSortMeta {
    const tableCfg = config?.table;
    const queryParams = this.extractQueryParams(operation);

    const detectedSortParam = this.findMatchingParam(queryParams, COMMON_SORT_PARAM_NAMES);
    const detectedOrderParam = this.findMatchingParam(queryParams, COMMON_ORDER_PARAM_NAMES);

    const sortParam = tableCfg?.sortParam || detectedSortParam?.name || 'sort';
    const orderParam = tableCfg?.orderParam || detectedOrderParam?.name || 'order';
    const format = (tableCfg?.sortFormat as UiSortFormat) || 'separate';

    const defaultSortField = tableCfg?.defaultSortField || null;
    const defaultSortOrder = tableCfg?.defaultSortOrder || 'asc';

    return {
      sortParam,
      orderParam,
      format,
      defaultSortField,
      defaultSortOrder
    };
  }

  /**
   * Detecta o nome do parâmetro de busca textual.
   */
  detectSearchParam(
    operation: ApiOperation | null | undefined,
    config?: UiPageConfiguration | null
  ): string {
    if (config?.filters?.searchParam) {
      return config.filters.searchParam;
    }

    const queryParams = this.extractQueryParams(operation);
    const detected = this.findMatchingParam(queryParams, COMMON_SEARCH_PARAM_NAMES);
    return detected ? detected.name : 'search';
  }

  /**
   * Detecta bindings de filtros visuais, extraindo opções de enum dos schemas OpenAPI.
   */
  detectFilterBindings(
    operation: ApiOperation | null | undefined,
    config?: UiPageConfiguration | null
  ): ResolvedFilterBinding[] {
    const results: ResolvedFilterBinding[] = [];
    const queryParams = this.extractQueryParams(operation);
    const configuredBindings =
      config?.filters?.filterBindings || config?.filters?.bindings || [];

    // Conjunto de query params já mapeados para paginação, busca ou ordenação
    const reservedParamNames = new Set<string>([
      ...COMMON_PAGE_PARAM_NAMES,
      ...COMMON_PAGE_SIZE_PARAM_NAMES,
      ...COMMON_OFFSET_PARAM_NAMES,
      ...COMMON_SEARCH_PARAM_NAMES,
      ...COMMON_SORT_PARAM_NAMES,
      ...COMMON_ORDER_PARAM_NAMES,
      config?.filters?.searchParam?.toLowerCase() || '',
      config?.pagination?.pageParam?.toLowerCase() || '',
      config?.pagination?.pageSizeParam?.toLowerCase() || '',
      config?.pagination?.offsetParam?.toLowerCase() || '',
      config?.table?.sortParam?.toLowerCase() || '',
      config?.table?.orderParam?.toLowerCase() || ''
    ].filter(Boolean));

    // 1. Processar bindings explicitamente configurados
    for (const binding of configuredBindings) {
      const qParamName = binding.queryParam || binding.name;
      const matchedParam = queryParams.find(
        (p) => p.name.toLowerCase() === qParamName.toLowerCase()
      );

      let options = binding.options ? [...binding.options] : [];
      if (options.length === 0 && matchedParam?.schema?.enum) {
        options = matchedParam.schema.enum.map((val) => ({
          label: this.formatLabel(String(val)),
          value: val
        }));
      }

      let controlType = (binding.type as 'select' | 'text' | 'boolean' | 'number') || 'text';
      if (options.length > 0) {
        controlType = 'select';
      } else if (matchedParam?.schema?.type === 'boolean') {
        controlType = 'boolean';
      } else if (
        matchedParam?.schema?.type === 'number' ||
        matchedParam?.schema?.type === 'integer'
      ) {
        controlType = 'number';
      }

      results.push({
        name: binding.name,
        queryParam: qParamName,
        label: binding.label || this.formatLabel(binding.name),
        type: controlType,
        options,
        default: binding.default ?? matchedParam?.default ?? matchedParam?.schema?.default,
        placeholder: binding.placeholder || `Filtrar por ${this.formatLabel(binding.name).toLowerCase()}...`
      });
    }

    // 2. Se houver statusField / statusParam legado no UiFilterConfiguration
    if (config?.filters?.statusField || config?.filters?.statusParam) {
      const statusKey = config.filters.statusField || config.filters.statusParam || 'status';
      const alreadyAdded = results.some((r) => r.name.toLowerCase() === statusKey.toLowerCase());

      if (!alreadyAdded) {
        const matchedParam = queryParams.find(
          (p) => p.name.toLowerCase() === statusKey.toLowerCase()
        );

        let options: UiFilterOption[] = [];
        if (matchedParam?.schema?.enum) {
          options = matchedParam.schema.enum.map((val) => ({
            label: this.formatLabel(String(val)),
            value: val
          }));
        }

        results.push({
          name: statusKey,
          queryParam: config.filters.statusParam || statusKey,
          label: this.formatLabel(statusKey),
          type: options.length > 0 ? 'select' : 'text',
          options,
          default: matchedParam?.default ?? matchedParam?.schema?.default,
          placeholder: `Filtrar por ${this.formatLabel(statusKey).toLowerCase()}...`
        });
      }
    }

    // 3. Auto-detectar parâmetros OpenAPI com schema enum ou boolean que não estejam reservados
    for (const param of queryParams) {
      const lower = param.name.toLowerCase();
      if (reservedParamNames.has(lower)) {
        continue;
      }

      const alreadyMapped = results.some(
        (r) => r.queryParam.toLowerCase() === lower || r.name.toLowerCase() === lower
      );
      if (alreadyMapped) {
        continue;
      }

      // Se tiver enum definido no schema
      if (param.schema?.enum && Array.isArray(param.schema.enum) && param.schema.enum.length > 0) {
        const options = param.schema.enum.map((val) => ({
          label: this.formatLabel(String(val)),
          value: val
        }));

        results.push({
          name: param.name,
          queryParam: param.name,
          label: this.formatLabel(param.name),
          type: 'select',
          options,
          default: param.default ?? param.schema?.default,
          placeholder: `Filtrar por ${this.formatLabel(param.name).toLowerCase()}...`
        });
      }
    }

    return results;
  }

  /**
   * Constrói o dicionário limpo de query parameters a ser enviado na requisição HTTP.
   * Não envia parâmetros vazios ('', null, undefined) e preserva números e booleanos.
   */
  buildQueryParams(
    params: ResourcePageFilterParams,
    paginationMeta: ResolvedPaginationMeta,
    sortMeta: ResolvedSortMeta,
    filterBindings: ResolvedFilterBinding[],
    searchParamName: string
  ): Record<string, unknown> {
    const query: Record<string, unknown> = {};

    // 1. Paginação (apenas no modo server-side)
    if (paginationMeta.mode === 'server') {
      const pageNumber = Math.max(1, params.page || 1);
      const pageSize = Math.max(1, params.pageSize || paginationMeta.defaultPageSize || 10);

      if (paginationMeta.indexMode === 'offset' || paginationMeta.offsetParam) {
        const offsetVal = (pageNumber - 1) * pageSize;
        const offsetKey = paginationMeta.offsetParam || 'offset';
        query[offsetKey] = offsetVal;
      } else if (paginationMeta.indexMode === '0-based') {
        const pageKey = paginationMeta.pageParam || 'page';
        query[pageKey] = pageNumber - 1;
      } else {
        const pageKey = paginationMeta.pageParam || 'page';
        query[pageKey] = pageNumber;
      }

      const pageSizeKey = paginationMeta.pageSizeParam || 'pageSize';
      query[pageSizeKey] = pageSize;
    }

    // 2. Busca textual
    if (params.searchTerm !== undefined && params.searchTerm !== null) {
      const trimmed = String(params.searchTerm).trim();
      if (trimmed !== '') {
        query[searchParamName] = trimmed;
      }
    }

    // 3. Ordenação
    if (params.sortField !== undefined && params.sortField !== null && params.sortField !== '') {
      const field = String(params.sortField).trim();
      const order = params.sortOrder || sortMeta.defaultSortOrder || 'asc';

      if (sortMeta.format === 'prefixed') {
        query[sortMeta.sortParam] = order === 'desc' ? `-${field}` : `+${field}`;
      } else if (sortMeta.format === 'combined') {
        query[sortMeta.sortParam] = `${field},${order}`;
      } else {
        query[sortMeta.sortParam] = field;
        if (sortMeta.orderParam) {
          query[sortMeta.orderParam] = order;
        }
      }
    }

    // 4. Filtros mapeados e dinâmicos
    if (params.filters) {
      for (const [key, rawValue] of Object.entries(params.filters)) {
        if (this.isEmptyValue(rawValue)) {
          continue;
        }

        const binding = filterBindings.find(
          (b) => b.name === key || b.queryParam === key
        );
        const queryKey = binding ? binding.queryParam : key;

        query[queryKey] = this.cleanParamValue(rawValue);
      }
    }

    // 5. Custom parameters adicionais
    if (params.customParams) {
      for (const [key, rawValue] of Object.entries(params.customParams)) {
        if (this.isEmptyValue(rawValue)) {
          continue;
        }
        query[key] = this.cleanParamValue(rawValue);
      }
    }

    return query;
  }

  // --- Helpers Privados ---

  private extractQueryParams(operation: ApiOperation | null | undefined): ApiParameter[] {
    if (!operation || !operation.parameters || !Array.isArray(operation.parameters)) {
      return [];
    }
    return operation.parameters.filter((p) => p.location === 'query');
  }

  private findMatchingParam(
    queryParams: ApiParameter[],
    candidates: string[]
  ): ApiParameter | undefined {
    for (const candidate of candidates) {
      const found = queryParams.find(
        (p) => p.name.toLowerCase() === candidate.toLowerCase()
      );
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  private isEmptyValue(val: unknown): boolean {
    if (val === undefined || val === null) {
      return true;
    }
    if (typeof val === 'string' && val.trim() === '') {
      return true;
    }
    if (Array.isArray(val) && val.length === 0) {
      return true;
    }
    return false;
  }

  private cleanParamValue(val: unknown): unknown {
    if (typeof val === 'string') {
      return val.trim();
    }
    return val;
  }

  private formatLabel(key: string): string {
    if (!key) return '';
    return key
      .replace(/[_-]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^\w/, (c) => c.toUpperCase());
  }
}
