import { TestBed } from '@angular/core/testing';
import { of, throwError, Subject, delay } from 'rxjs';
import { ResourcePageFacadeService } from './resource-page-facade.service';
import { ApiSessionService } from '../../../core/services/api-session.service';
import { ApiExecutorService } from '../../../core/services/api-executor.service';
import { ApiRequestBuilderService } from '../../../core/services/api-request-builder.service';
import { ApiDefinition } from '../../../core/models/api-definition.model';
import { ResolvedResourcePage } from '../../../core/models/resolved-resource-page.model';
import { UiPageConfiguration } from '../../../core/models/ui-configuration.model';
import { ApiOperation } from '../../../core/models/api-operation.model';
import { ApiExecutionResult } from '../../../core/models/api-execution-result.model';

describe('ResourcePageFacadeService', () => {
  let facade: ResourcePageFacadeService;
  let sessionService: ApiSessionService;
  let apiExecutor: ApiExecutorService;

  const mockListOp: ApiOperation = {
    id: 'getOrders',
    operationId: 'getOrders',
    method: 'GET',
    path: '/orders',
    type: 'list',
    summary: 'List all orders',
    parameters: [],
    responses: []
  };

  const mockApiDefinition: ApiDefinition = {
    title: 'OrderFlow API',
    version: '1.0.0',
    baseUrl: 'https://api.orders.example.com',
    resources: [
      {
        id: 'orders',
        name: 'Orders',
        label: 'Pedidos',
        operations: [mockListOp]
      },
      {
        id: 'customers',
        name: 'Customers',
        label: 'Clientes',
        operations: []
      }
    ]
  };

  const mockOrdersPageConfig: UiPageConfiguration = {
    id: 'orders-page',
    resourceId: 'orders',
    title: 'Pedidos CRUD',
    icon: 'receipt_long',
    slug: 'pedidos',
    table: {
      columns: [{ field: 'id', label: 'ID', type: 'monospace', sortable: true }],
      pageSize: 10,
      pageSizeOptions: [10, 25, 50],
      defaultSortField: 'createdAt',
      defaultSortOrder: 'desc'
    }
  };

  const mockResolvedPage: ResolvedResourcePage = {
    resourceId: 'orders',
    resource: mockApiDefinition.resources[0],
    pageConfig: mockOrdersPageConfig,
    list: mockListOp,
    create: null,
    details: null,
    update: null,
    delete: null,
    updateOperations: [],
    customActions: [],
    warnings: [],
    explicitOverrides: {}
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ResourcePageFacadeService,
        ApiSessionService,
        ApiRequestBuilderService,
        {
          provide: ApiExecutorService,
          useValue: {
            execute: vi.fn()
          }
        }
      ]
    });

    sessionService = TestBed.inject(ApiSessionService);
    apiExecutor = TestBed.inject(ApiExecutorService);
    sessionService.setSession(mockApiDefinition);

    facade = TestBed.inject(ResourcePageFacadeService);
  });

  afterEach(() => {
    facade.destroy();
  });

  describe('Initial / Idle State', () => {
    it('should initialize with idle status, empty data and default params', () => {
      expect(facade.status()).toBe('idle');
      expect(facade.isIdle()).toBe(true);
      expect(facade.isLoading()).toBe(false);
      expect(facade.isRefreshing()).toBe(false);
      expect(facade.isSuccess()).toBe(false);
      expect(facade.isEmpty()).toBe(false);
      expect(facade.isError()).toBe(false);
      expect(facade.data()).toBeNull();
      expect(facade.items()).toEqual([]);
      expect(facade.totalCount()).toBe(0);
      expect(facade.resolvedPage()).toBeNull();
      expect(facade.error()).toBeNull();
    });

    it('should reset to idle when loading null pageInput', () => {
      facade.loadPage(null);
      expect(facade.status()).toBe('idle');
      expect(facade.isIdle()).toBe(true);
    });
  });

  describe('Page Loading & Data Extraction', () => {
    it('should transition to loading and then success when loading a valid resolved page with array data', async () => {
      const mockOrders = [
        { id: 'ORD-1', customer: 'Alice', total: 100 },
        { id: 'ORD-2', customer: 'Bob', total: 250 }
      ];

      const execResult: ApiExecutionResult = {
        status: 200,
        statusText: 'OK',
        data: mockOrders,
        duration: 45,
        durationMs: 45,
        isSuccess: true,
        timestamp: Date.now()
      };

      vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(execResult));

      facade.loadPage(mockResolvedPage);

      expect(facade.isLoading()).toBe(true);
      expect(facade.resolvedPage()?.resourceId).toBe('orders');

      // Wait for promise resolution
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('success');
      expect(facade.isSuccess()).toBe(true);
      expect(facade.isLoading()).toBe(false);
      expect(facade.items().length).toBe(2);
      expect(facade.totalCount()).toBe(2);
      expect(facade.hasData()).toBe(true);
      expect(facade.error()).toBeNull();
      expect(facade.lastExecutionDurationMs()).toBe(45);
    });

    it('should extract items and total count from wrapped response objects (e.g. { items: [], total: 50 })', async () => {
      const execResult: ApiExecutionResult = {
        status: 200,
        statusText: 'OK',
        data: {
          items: [{ id: 'ORD-10' }, { id: 'ORD-11' }],
          total: 50
        },
        duration: 30,
        durationMs: 30,
        isSuccess: true,
        timestamp: Date.now()
      };

      vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(execResult));

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('success');
      expect(facade.items().length).toBe(2);
      expect(facade.totalCount()).toBe(50);
    });

    it('should transition to empty state when list response contains empty array', async () => {
      const execResult: ApiExecutionResult = {
        status: 200,
        statusText: 'OK',
        data: [],
        duration: 20,
        durationMs: 20,
        isSuccess: true,
        timestamp: Date.now()
      };

      vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(execResult));

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('empty');
      expect(facade.isEmpty()).toBe(true);
      expect(facade.items().length).toBe(0);
      expect(facade.totalCount()).toBe(0);
      expect(facade.hasData()).toBe(false);
    });

    it('should resolve page via sessionService when passing UiPageConfiguration', async () => {
      const execResult: ApiExecutionResult = {
        status: 200,
        statusText: 'OK',
        data: [{ id: 'ORD-1' }],
        duration: 15,
        isSuccess: true,
        timestamp: Date.now()
      };

      vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(execResult));

      facade.loadPage(mockOrdersPageConfig);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('success');
      expect(facade.resolvedPage()?.resourceId).toBe('orders');
    });

    it('should handle missing resource in OpenAPI gracefully with error state', () => {
      const invalidConfig: UiPageConfiguration = {
        id: 'unknown-page',
        resourceId: 'non-existent-resource',
        title: 'Non Existent'
      };

      facade.loadPage(invalidConfig);

      expect(facade.status()).toBe('error');
      expect(facade.isError()).toBe(true);
      expect(facade.error()?.category).toBe('RESOURCE_NOT_FOUND');
    });
  });

  describe('Error Handling & Retry', () => {
    it('should transition to error state and capture error details on execution failure', async () => {
      const execResult: ApiExecutionResult = {
        status: 500,
        statusText: 'Internal Server Error',
        data: null,
        duration: 60,
        durationMs: 60,
        isSuccess: false,
        timestamp: Date.now(),
        error: {
          message: 'Database connection failed',
          category: 'HTTP_ERROR',
          status: 500,
          statusText: 'Internal Server Error',
          hint: 'Verifique se o backend está acessível'
        }
      };

      vi.spyOn(apiExecutor, 'execute').mockReturnValue(of(execResult));

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('error');
      expect(facade.isError()).toBe(true);
      expect(facade.error()?.message).toBe('Database connection failed');
      expect(facade.error()?.status).toBe(500);
      expect(facade.error()?.hint).toBe('Verifique se o backend está acessível');
    });

    it('should re-execute the request when calling retry() after an error', async () => {
      const errorResult: ApiExecutionResult = {
        status: 0,
        statusText: 'Network Error',
        data: null,
        duration: 10,
        isSuccess: false,
        timestamp: Date.now(),
        error: { message: 'Network offline' }
      };

      const successResult: ApiExecutionResult = {
        status: 200,
        statusText: 'OK',
        data: [{ id: 'ORD-1' }],
        duration: 15,
        isSuccess: true,
        timestamp: Date.now()
      };

      const executeSpy = vi
        .spyOn(apiExecutor, 'execute')
        .mockReturnValueOnce(of(errorResult))
        .mockReturnValueOnce(of(successResult));

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('error');

      facade.retry();
      expect(facade.status()).toBe('loading');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.status()).toBe('success');
      expect(facade.items().length).toBe(1);
      expect(executeSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Concurrency & Race Condition Immunity', () => {
    it('should discard slower previous responses when a newer request is triggered (switchMap / requestCounter)', async () => {
      const delayedSubject1 = new Subject<ApiExecutionResult>();
      const delayedSubject2 = new Subject<ApiExecutionResult>();

      let callCount = 0;
      vi.spyOn(apiExecutor, 'execute').mockImplementation(() => {
        callCount++;
        return callCount === 1 ? delayedSubject1.asObservable() : delayedSubject2.asObservable();
      });

      // Request 1 started
      facade.loadPage(mockResolvedPage);
      expect(facade.isLoading()).toBe(true);

      // Rapid navigation / search: Request 2 started before Request 1 finishes
      facade.setSearch('new-query');

      // Request 2 finishes FIRST with newer data
      delayedSubject2.next({
        status: 200,
        statusText: 'OK',
        data: [{ id: 'LATEST-DATA' }],
        duration: 20,
        isSuccess: true,
        timestamp: Date.now()
      });
      delayedSubject2.complete();

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(facade.items()).toEqual([{ id: 'LATEST-DATA' }]);
      expect(facade.params().searchTerm).toBe('new-query');

      // Now Request 1 (stale) finally arrives late with old data
      delayedSubject1.next({
        status: 200,
        statusText: 'OK',
        data: [{ id: 'OLD-STALE-DATA' }],
        duration: 150,
        isSuccess: true,
        timestamp: Date.now()
      });
      delayedSubject1.complete();

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Must remain LATEST-DATA — old stale data was ignored!
      expect(facade.items()).toEqual([{ id: 'LATEST-DATA' }]);
      expect(facade.status()).toBe('success');
    });
  });

  describe('Explicit Parameter Management & Filtering', () => {
    beforeEach(async () => {
      vi.spyOn(apiExecutor, 'execute').mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: [{ id: '1' }],
          duration: 10,
          isSuccess: true,
          timestamp: Date.now()
        })
      );
      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should update pagination parameters and trigger reload', async () => {
      const executeSpy = vi.spyOn(apiExecutor, 'execute');

      facade.setPage(2);
      expect(facade.params().page).toBe(2);
      expect(facade.isRefreshing()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executeSpy).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          query: expect.objectContaining({ page: 2 })
        })
      );
    });

    it('should update page size and reset page to 1', async () => {
      facade.setPage(3);
      facade.setPageSize(25);

      expect(facade.params().pageSize).toBe(25);
      expect(facade.params().page).toBe(1);
    });

    it('should update search term and reset page to 1', async () => {
      facade.setPage(4);
      facade.setSearch('client@test.com');

      expect(facade.params().searchTerm).toBe('client@test.com');
      expect(facade.params().page).toBe(1);
    });

    it('should set, update and delete filter keys', async () => {
      facade.setFilter('status', 'PENDING');
      expect(facade.params().filters['status']).toBe('PENDING');

      facade.setFilter('status', '');
      expect(facade.params().filters['status']).toBeUndefined();
    });

    it('should set sort field and sort order', async () => {
      facade.setSort('total', 'asc');
      expect(facade.params().sortField).toBe('total');
      expect(facade.params().sortOrder).toBe('asc');
    });

    it('should reset parameters to default page configuration values', async () => {
      facade.setSearch('some-term');
      facade.setPage(5);
      facade.setFilter('status', 'PAID');

      facade.resetParams();

      expect(facade.params().page).toBe(1);
      expect(facade.params().searchTerm).toBe('');
      expect(facade.params().filters).toEqual({});
      expect(facade.params().sortField).toBe('createdAt');
      expect(facade.params().sortOrder).toBe('desc');
    });
  });

  describe('Resource Mutation Listening & Auto-Refresh', () => {
    it('should automatically soft-refresh the listing when a mutation event matches the active resource', async () => {
      const executeSpy = vi.spyOn(apiExecutor, 'execute').mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: [{ id: 'ORD-1', status: 'PENDING' }],
          duration: 10,
          isSuccess: true,
          timestamp: Date.now()
        })
      );

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Notify mutation on the SAME resource ('orders')
      sessionService.notifyResourceMutation('orders', 'createOrder', {
        status: 201,
        statusText: 'Created',
        data: { id: 'ORD-2' },
        duration: 15,
        isSuccess: true,
        timestamp: Date.now()
      });

      // Allow Angular effect to run and async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(executeSpy).toHaveBeenCalledTimes(2);
      expect(facade.status()).toBe('success');
    });

    it('should NOT refresh when mutation event is for a different resource', async () => {
      const executeSpy = vi.spyOn(apiExecutor, 'execute').mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: [{ id: 'ORD-1' }],
          duration: 10,
          isSuccess: true,
          timestamp: Date.now()
        })
      );

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(executeSpy).toHaveBeenCalledTimes(1);

      // Notify mutation on a DIFFERENT resource ('customers')
      sessionService.notifyResourceMutation('customers', 'updateCustomer', {
        status: 200,
        statusText: 'OK',
        data: { id: 'CUST-1' },
        duration: 10,
        isSuccess: true,
        timestamp: Date.now()
      });

      await new Promise((resolve) => setTimeout(resolve, 30));

      // Should still be 1 (no extra fetch triggered)
      expect(executeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Manual Refresh & Destruction', () => {
    it('should set refreshing status and refetch data on refresh()', async () => {
      const executeSpy = vi.spyOn(apiExecutor, 'execute').mockReturnValue(
        of({
          status: 200,
          statusText: 'OK',
          data: [{ id: 'ORD-1' }],
          duration: 12,
          isSuccess: true,
          timestamp: Date.now()
        })
      );

      facade.loadPage(mockResolvedPage);
      await new Promise((resolve) => setTimeout(resolve, 10));

      facade.refresh();
      expect(facade.status()).toBe('refreshing');
      expect(facade.isRefreshing()).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(facade.status()).toBe('success');
      expect(executeSpy).toHaveBeenCalledTimes(2);
    });

    it('should clean up subscriptions and complete triggers upon destruction', () => {
      facade.destroy();
      // Emitting on destroyed facade should not throw
      expect(() => facade.refresh()).not.toThrow();
    });
  });
});
