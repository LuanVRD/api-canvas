import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiExecutorService } from './api-executor.service';
import { ApiOperation } from '../models/api-operation.model';

describe('ApiExecutorService', () => {
  let service: ApiExecutorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiExecutorService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ApiExecutorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should execute a standard list operation', () => {
    const operation: ApiOperation = {
      id: 'get_products',
      method: 'GET',
      path: '/products',
      type: 'list',
      parameters: [],
      responses: []
    };

    service.execute('https://api.example.com', operation, {}).subscribe((result) => {
      expect(result.isSuccess).toBe(true);
      expect(result.status).toBe(200);
      expect(result.data).toEqual([{ id: '1', name: 'Widget' }]);
    });

    const req = httpMock.expectOne('https://api.example.com/products');
    expect(req.request.method).toBe('GET');
    req.flush([{ id: '1', name: 'Widget' }]);
  });

  it('should execute an action operation (e.g. POST /orders/{id}/approve)', () => {
    const operation: ApiOperation = {
      id: 'approve_order',
      method: 'POST',
      path: '/orders/{id}/approve',
      type: 'action',
      parameters: [],
      responses: []
    };

    service
      .execute('https://api.example.com', operation, {
        path: { id: '123' },
        body: { reason: 'Verified' }
      })
      .subscribe((result) => {
        expect(result.isSuccess).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ approved: true });
      });

    const req = httpMock.expectOne('https://api.example.com/orders/123/approve');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Verified' });
    req.flush({ approved: true });
  });

  it('should execute an unknown operation successfully without blocking execution', () => {
    const operation: ApiOperation = {
      id: 'custom_calc',
      method: 'POST',
      path: '/rpc/calculator/run',
      type: 'unknown',
      parameters: [],
      responses: []
    };

    service
      .execute('https://api.example.com', operation, {
        body: { expr: '2+2' }
      })
      .subscribe((result) => {
        expect(result.isSuccess).toBe(true);
        expect(result.status).toBe(200);
        expect(result.data).toEqual({ result: 4 });
      });

    const req = httpMock.expectOne('https://api.example.com/rpc/calculator/run');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ expr: '2+2' });
    req.flush({ result: 4 });
  });

  it('should handle network errors gracefully returning structured execution result', () => {
    const operation: ApiOperation = {
      id: 'delete_product',
      method: 'DELETE',
      path: '/products/{id}',
      type: 'delete',
      parameters: [],
      responses: []
    };

    service
      .execute('https://api.example.com', operation, {
        path: { id: '999' }
      })
      .subscribe((result) => {
        expect(result.isSuccess).toBe(false);
        expect(result.status).toBe(404);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toBeTruthy();
      });

    const req = httpMock.expectOne('https://api.example.com/products/999');
    expect(req.request.method).toBe('DELETE');
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });
  });

  it('should return structured validation error when required parameters are missing', () => {
    const operation: ApiOperation = {
      id: 'get_user_by_uuid',
      method: 'GET',
      path: '/users/{userUuid}',
      type: 'details',
      parameters: [
        { name: 'userUuid', location: 'path', required: true, schema: { type: 'string' } }
      ],
      responses: []
    };

    service.execute('https://api.example.com', operation, {}).subscribe((result) => {
      expect(result.isSuccess).toBe(false);
      expect(result.status).toBe(0);
      expect(result.statusText).toBe('Validation Error');
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Missing required path parameter "userUuid"');
    });

    // Não deve disparar nenhuma requisição HTTP
    httpMock.expectNone('https://api.example.com/users/{userUuid}');
  });

  it('should pass query parameters and headers correctly to HttpClient', () => {
    const operation: ApiOperation = {
      id: 'filter_items',
      method: 'GET',
      path: '/items',
      type: 'list',
      parameters: [],
      responses: []
    };

    service
      .execute('https://api.example.com', operation, {
        query: { category: 'electronics', tag: ['a', 'b'] },
        headers: { 'X-Custom-Auth': 'token123' }
      })
      .subscribe((result) => {
        expect(result.isSuccess).toBe(true);
      });

    const req = httpMock.expectOne(
      (r) =>
        r.url === 'https://api.example.com/items' &&
        r.params.get('category') === 'electronics' &&
        r.params.getAll('tag')?.length === 2 &&
        r.headers.get('X-Custom-Auth') === 'token123'
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should categorize status 0 as CORS_OR_NETWORK error with helpful diagnostic hint', () => {
    const operation: ApiOperation = {
      id: 'fetch_data',
      method: 'GET',
      path: '/data',
      type: 'list',
      parameters: [],
      responses: []
    };

    service.execute('https://blocked-api.example.com', operation, {}).subscribe((result) => {
      expect(result.isSuccess).toBe(false);
      expect(result.status).toBe(0);
      expect(result.statusText).toBe('CORS or Network Error');
      expect(result.error?.category).toBe('CORS_OR_NETWORK');
      expect(result.error?.hint).toContain('CORS');
    });

    const req = httpMock.expectOne('https://blocked-api.example.com/data');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
  });

  it('should categorize status 500 as HTTP_ERROR with server error details', () => {
    const operation: ApiOperation = {
      id: 'create_item',
      method: 'POST',
      path: '/items',
      type: 'create',
      parameters: [],
      responses: []
    };

    service.execute('https://api.example.com', operation, { body: { name: 'Test' } }).subscribe((result) => {
      expect(result.isSuccess).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error?.category).toBe('HTTP_ERROR');
      expect(result.error?.message).toContain('Database down');
    });

    const req = httpMock.expectOne('https://api.example.com/items');
    req.flush({ message: 'Database down' }, { status: 500, statusText: 'Internal Server Error' });
  });
});
