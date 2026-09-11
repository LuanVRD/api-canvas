import { TestBed } from '@angular/core/testing';
import { ListQueryBindingService } from './list-query-binding.service';
import { ApiOperation } from '../models/api-operation.model';
import { UiPageConfiguration } from '../models/ui-configuration.model';
import { ResourcePageFilterParams } from '../../features/dashboard/models/resource-page-state.model';

describe('ListQueryBindingService', () => {
  let service: ListQueryBindingService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ListQueryBindingService]
    });
    service = TestBed.inject(ListQueryBindingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getNestedValue', () => {
    it('should resolve nested dot notation properties correctly', () => {
      const obj = {
        data: {
          items: [{ id: 1 }, { id: 2 }],
          meta: {
            pagination: {
              total: 100
            }
          }
        }
      };

      expect(service.getNestedValue(obj, 'data.items')).toEqual([{ id: 1 }, { id: 2 }]);
      expect(service.getNestedValue(obj, 'data.meta.pagination.total')).toBe(100);
      expect(service.getNestedValue(obj, 'non.existent.path')).toBeUndefined();
      expect(service.getNestedValue(null, 'data.items')).toBeUndefined();
    });
  });

  describe('extractItemsAndTotal with Envelopes and Paths', () => {
    it('should extract direct array and length', () => {
      const payload = [{ id: 1 }, { id: 2 }];
      const result = service.extractItemsAndTotal(payload);
      expect(result.items).toEqual(payload);
      expect(result.totalCount).toBe(2);
    });

    it('should extract using configured dataPath and totalPath', () => {
      const payload = {
        custom_wrapper: {
          records_list: [{ id: 10 }, { id: 20 }, { id: 30 }],
          pagination_info: {
            total_elements: 250
          }
        }
      };

      const result = service.extractItemsAndTotal(payload, {
        dataPath: 'custom_wrapper.records_list',
        totalPath: 'custom_wrapper.pagination_info.total_elements'
      });

      expect(result.items).toEqual([{ id: 10 }, { id: 20 }, { id: 30 }]);
      expect(result.totalCount).toBe(250);
    });

    it('should fallback to candidate keys for enveloped responses', () => {
      const payload = {
        data: [{ id: 1 }, { id: 2 }],
        totalCount: 50
      };

      const result = service.extractItemsAndTotal(payload);
      expect(result.items).toEqual([{ id: 1 }, { id: 2 }]);
      expect(result.totalCount).toBe(50);
    });

    it('should inspect meta and pagination objects for total count', () => {
      const payload = {
        items: [{ id: 1 }],
        meta: {
          total: 88
        }
      };

      const result = service.extractItemsAndTotal(payload);
      expect(result.items).toEqual([{ id: 1 }]);
      expect(result.totalCount).toBe(88);
    });

    it('should handle null/undefined safely', () => {
      expect(service.extractItemsAndTotal(null)).toEqual({ items: [], totalCount: 0 });
      expect(service.extractItemsAndTotal(undefined)).toEqual({ items: [], totalCount: 0 });
    });
  });

  describe('detectPaginationMetadata (Server vs Client)', () => {
    it('should detect server-side mode when operation has page and limit query params', () => {
      const op: ApiOperation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        type: 'list',
        parameters: [
          { name: 'page', location: 'query', required: false, schema: { type: 'integer', default: 1 } },
          { name: 'limit', location: 'query', required: false, schema: { type: 'integer', default: 20 }, default: 20 }
        ],
        responses: []
      };

      const meta = service.detectPaginationMetadata(op, null);
      expect(meta.mode).toBe('server');
      expect(meta.pageParam).toBe('page');
      expect(meta.pageSizeParam).toBe('limit');
      expect(meta.defaultPageSize).toBe(20);
    });

    it('should detect server-side mode with offset/limit and offset indexMode', () => {
      const op: ApiOperation = {
        id: 'listItems',
        method: 'GET',
        path: '/items',
        type: 'list',
        parameters: [
          { name: 'offset', location: 'query', required: false, schema: { type: 'integer' } },
          { name: 'pageSize', location: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: []
      };

      const meta = service.detectPaginationMetadata(op, null);
      expect(meta.mode).toBe('server');
      expect(meta.offsetParam).toBe('offset');
      expect(meta.indexMode).toBe('offset');
    });

    it('should detect client-side mode when operation has no pagination parameters', () => {
      const op: ApiOperation = {
        id: 'listCategories',
        method: 'GET',
        path: '/categories',
        type: 'list',
        parameters: [],
        responses: []
      };

      const meta = service.detectPaginationMetadata(op, null);
      expect(meta.mode).toBe('client');
    });

    it('should respect explicit configuration override', () => {
      const op: ApiOperation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        type: 'list',
        parameters: [
          { name: 'page', location: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: []
      };

      const config: UiPageConfiguration = {
        pagination: {
          mode: 'client',
          pageSize: 15
        }
      };

      const meta = service.detectPaginationMetadata(op, config);
      expect(meta.mode).toBe('client');
      expect(meta.defaultPageSize).toBe(15);
    });
  });

  describe('detectFilterBindings with Schema Enums', () => {
    it('should extract enum options from OpenAPI query parameter schemas', () => {
      const op: ApiOperation = {
        id: 'listOrders',
        method: 'GET',
        path: '/orders',
        type: 'list',
        parameters: [
          {
            name: 'status',
            location: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'cancelled']
            }
          },
          {
            name: 'priority',
            location: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            }
          }
        ],
        responses: []
      };

      const bindings = service.detectFilterBindings(op, null);
      expect(bindings.length).toBe(2);

      const statusBinding = bindings.find((b) => b.name === 'status');
      expect(statusBinding).toBeDefined();
      expect(statusBinding?.type).toBe('select');
      expect(statusBinding?.options.length).toBe(4);
      expect(statusBinding?.options[0]).toEqual({ label: 'Pending', value: 'pending' });

      const priorityBinding = bindings.find((b) => b.name === 'priority');
      expect(priorityBinding).toBeDefined();
      expect(priorityBinding?.options.length).toBe(3);
    });

    it('should merge explicit filterBindings with operation parameters', () => {
      const op: ApiOperation = {
        id: 'listUsers',
        method: 'GET',
        path: '/users',
        type: 'list',
        parameters: [
          {
            name: 'role_id',
            location: 'query',
            required: false,
            schema: { type: 'string', enum: ['admin', 'editor', 'viewer'] }
          }
        ],
        responses: []
      };

      const config: UiPageConfiguration = {
        filters: {
          filterBindings: [
            {
              name: 'role',
              queryParam: 'role_id',
              label: 'User Role'
            }
          ]
        }
      };

      const bindings = service.detectFilterBindings(op, config);
      expect(bindings.length).toBe(1);
      expect(bindings[0].name).toBe('role');
      expect(bindings[0].queryParam).toBe('role_id');
      expect(bindings[0].label).toBe('User Role');
      expect(bindings[0].options.length).toBe(3);
    });
  });

  describe('buildQueryParams', () => {
    it('should build clean query parameters without empty strings or nulls and preserving numbers', () => {
      const params: ResourcePageFilterParams = {
        page: 2,
        pageSize: 25,
        searchTerm: 'john doe',
        filters: {
          status: 'active',
          emptyFilter: '',
          nullFilter: null,
          countFilter: 42,
          booleanFilter: false
        },
        sortField: 'created_at',
        sortOrder: 'desc',
        customParams: {
          tenantId: 'tenant-123',
          emptyCustom: ''
        }
      };

      const paginationMeta = service.detectPaginationMetadata(null, {
        pagination: { mode: 'server', pageParam: '_page', pageSizeParam: '_limit' }
      });

      const sortMeta = service.detectSortMetadata(null, {
        table: { sortParam: '_sort', orderParam: '_order' }
      });

      const filterBindings = [
        {
          name: 'status',
          queryParam: 'status',
          label: 'Status',
          type: 'select' as const,
          options: []
        }
      ];

      const query = service.buildQueryParams(
        params,
        paginationMeta,
        sortMeta,
        filterBindings,
        'q'
      );

      expect(query['_page']).toBe(2);
      expect(query['_limit']).toBe(25);
      expect(query['q']).toBe('john doe');
      expect(query['_sort']).toBe('created_at');
      expect(query['_order']).toBe('desc');
      expect(query['status']).toBe('active');
      expect(query['countFilter']).toBe(42);
      expect(query['booleanFilter']).toBe(false);
      expect(query['tenantId']).toBe('tenant-123');

      // Empty strings and nulls must NOT be present
      expect(query['emptyFilter']).toBeUndefined();
      expect(query['nullFilter']).toBeUndefined();
      expect(query['emptyCustom']).toBeUndefined();
    });

    it('should support offset-based pagination in query building', () => {
      const params: ResourcePageFilterParams = {
        page: 3,
        pageSize: 10,
        searchTerm: '',
        filters: {}
      };

      const paginationMeta = service.detectPaginationMetadata(null, {
        pagination: { mode: 'server', offsetParam: 'skip', pageSizeParam: 'take', indexMode: 'offset' }
      });
      const sortMeta = service.detectSortMetadata(null, null);

      const query = service.buildQueryParams(params, paginationMeta, sortMeta, [], 'search');

      expect(query['skip']).toBe(20); // (3 - 1) * 10
      expect(query['take']).toBe(10);
      expect(query['search']).toBeUndefined();
    });

    it('should not include pagination params if mode is client-side', () => {
      const params: ResourcePageFilterParams = {
        page: 2,
        pageSize: 10,
        searchTerm: 'test',
        filters: {}
      };

      const paginationMeta = service.detectPaginationMetadata(null, {
        pagination: { mode: 'client' }
      });
      const sortMeta = service.detectSortMetadata(null, null);

      const query = service.buildQueryParams(params, paginationMeta, sortMeta, [], 'search');

      expect(query['page']).toBeUndefined();
      expect(query['pageSize']).toBeUndefined();
      expect(query['search']).toBe('test');
    });

    it('should support prefixed and combined sort formats', () => {
      const params: ResourcePageFilterParams = {
        page: 1,
        pageSize: 10,
        searchTerm: '',
        filters: {},
        sortField: 'name',
        sortOrder: 'desc'
      };

      const paginationMeta = service.detectPaginationMetadata(null, null);

      // Prefixed format
      const sortMetaPrefixed = service.detectSortMetadata(null, {
        table: { sortParam: 'sort', sortFormat: 'prefixed' }
      });
      const queryPrefixed = service.buildQueryParams(params, paginationMeta, sortMetaPrefixed, [], 'q');
      expect(queryPrefixed['sort']).toBe('-name');

      // Combined format
      const sortMetaCombined = service.detectSortMetadata(null, {
        table: { sortParam: 'sort', sortFormat: 'combined' }
      });
      const queryCombined = service.buildQueryParams(params, paginationMeta, sortMetaCombined, [], 'q');
      expect(queryCombined['sort']).toBe('name,desc');
    });
  });
});
