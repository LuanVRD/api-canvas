import { TestBed } from '@angular/core/testing';
import { OperationClassifierService } from './operation-classifier.service';
import { HttpMethod } from '../../core/models/api-operation.model';

describe('OperationClassifierService', () => {
  let service: OperationClassifierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OperationClassifierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Conventional REST CRUD endpoints', () => {
    it('should classify GET /products as list', () => {
      expect(service.classify('GET', '/products')).toBe('list');
      expect(service.classify('GET', '/api/v1/products')).toBe('list');
    });

    it('should classify GET /products/{id} as details', () => {
      expect(service.classify('GET', '/products/{id}')).toBe('details');
      expect(service.classify('GET', '/api/v1/products/{id}')).toBe('details');
    });

    it('should classify POST /products as create', () => {
      expect(service.classify('POST', '/products')).toBe('create');
      expect(service.classify('POST', '/api/v1/products')).toBe('create');
    });

    it('should classify PUT /products/{id} as update', () => {
      expect(service.classify('PUT', '/products/{id}')).toBe('update');
      expect(service.classify('PUT', '/api/v1/products/{id}')).toBe('update');
    });

    it('should classify PATCH /products/{id} as update', () => {
      expect(service.classify('PATCH', '/products/{id}')).toBe('update');
      expect(service.classify('PATCH', '/api/v1/products/{id}')).toBe('update');
    });

    it('should classify DELETE /products/{id} as delete', () => {
      expect(service.classify('DELETE', '/products/{id}')).toBe('delete');
      expect(service.classify('DELETE', '/api/v1/products/{id}')).toBe('delete');
    });
  });

  describe('Path parameters with names different from id', () => {
    it('should classify GET with diverse parameter names as details', () => {
      expect(service.classify('GET', '/products/{productId}')).toBe('details');
      expect(service.classify('GET', '/users/{userId}')).toBe('details');
      expect(service.classify('GET', '/items/{item_uuid}')).toBe('details');
      expect(service.classify('GET', '/articles/{slug}')).toBe('details');
      expect(service.classify('GET', '/stores/{storeCode}')).toBe('details');
      expect(service.classify('GET', '/products/:productId')).toBe('details');
    });

    it('should classify PUT / PATCH with diverse parameter names as update', () => {
      expect(service.classify('PUT', '/products/{productId}')).toBe('update');
      expect(service.classify('PATCH', '/users/{user_id}')).toBe('update');
      expect(service.classify('PUT', '/catalog/{code}')).toBe('update');
      expect(service.classify('PATCH', '/items/:sku')).toBe('update');
    });

    it('should classify DELETE with diverse parameter names as delete', () => {
      expect(service.classify('DELETE', '/products/{productId}')).toBe('delete');
      expect(service.classify('DELETE', '/users/{userId}')).toBe('delete');
      expect(service.classify('DELETE', '/records/{uuid}')).toBe('delete');
      expect(service.classify('DELETE', '/categories/:slug')).toBe('delete');
    });
  });

  describe('Nested sub-resources', () => {
    it('should classify GET nested collection as list', () => {
      expect(service.classify('GET', '/users/{userId}/posts')).toBe('list');
      expect(service.classify('GET', '/organizations/{orgId}/departments/{deptId}/members')).toBe('list');
    });

    it('should classify GET nested entity as details', () => {
      expect(service.classify('GET', '/users/{userId}/posts/{postId}')).toBe('details');
      expect(service.classify('GET', '/stores/{storeId}/products/{sku}')).toBe('details');
    });

    it('should classify POST nested collection as create', () => {
      expect(service.classify('POST', '/users/{userId}/posts')).toBe('create');
      expect(service.classify('POST', '/orders/{orderId}/items')).toBe('create');
    });

    it('should classify PUT / PATCH nested entity as update', () => {
      expect(service.classify('PUT', '/users/{userId}/posts/{postId}')).toBe('update');
      expect(service.classify('PATCH', '/stores/{storeId}/products/{productId}')).toBe('update');
    });

    it('should classify DELETE nested entity as delete', () => {
      expect(service.classify('DELETE', '/users/{userId}/posts/{postId}')).toBe('delete');
      expect(service.classify('DELETE', '/stores/{storeId}/inventory/{sku}')).toBe('delete');
    });
  });

  describe('Action endpoints', () => {
    it('should classify POST /orders/{id}/approve as action', () => {
      expect(service.classify('POST', '/orders/{id}/approve')).toBe('action');
      expect(service.classify('POST', '/orders/{orderId}/approve')).toBe('action');
    });

    it('should classify entity actions and workflows as action', () => {
      expect(service.classify('POST', '/users/{id}/activate')).toBe('action');
      expect(service.classify('POST', '/users/{userId}/reset-password')).toBe('action');
      expect(service.classify('POST', '/documents/{docId}/publish')).toBe('action');
      expect(service.classify('POST', '/subscriptions/{subId}/cancel')).toBe('action');
      expect(service.classify('POST', '/payments/{id}/refund')).toBe('action');
      expect(service.classify('POST', '/tasks/{taskId}/retry')).toBe('action');
    });

    it('should classify direct POST on identified item as action', () => {
      expect(service.classify('POST', '/products/{id}')).toBe('action');
      expect(service.classify('POST', '/orders/{orderId}')).toBe('action');
    });

    it('should classify standalone RPC/action verbs as action', () => {
      expect(service.classify('POST', '/auth/login')).toBe('action');
      expect(service.classify('POST', '/auth/logout')).toBe('action');
      expect(service.classify('POST', '/checkout/pay')).toBe('action');
      expect(service.classify('POST', '/calculator/compute')).toBe('action');
      expect(service.classify('POST', '/items/bulk-export')).toBe('action');
      expect(service.classify('GET', '/reports/export')).toBe('action');
    });
  });

  describe('Ambiguous and edge cases (unknown fallback)', () => {
    it('should fallback to unknown for HEAD and OPTIONS methods', () => {
      expect(service.classify('HEAD', '/products')).toBe('unknown');
      expect(service.classify('OPTIONS', '/products/{id}')).toBe('unknown');
    });

    it('should fallback to unknown for empty or root paths', () => {
      expect(service.classify('GET', '')).toBe('unknown');
      expect(service.classify('GET', '/')).toBe('unknown');
      expect(service.classify('POST', '')).toBe('unknown');
      expect(service.classify('POST', '/')).toBe('unknown');
    });

    it('should fallback to unknown for non-conventional collection-level updates/deletes without ID', () => {
      expect(service.classify('PUT', '/products')).toBe('unknown');
      expect(service.classify('PATCH', '/customers')).toBe('unknown');
      expect(service.classify('DELETE', '/products')).toBe('unknown');
    });

    it('should handle query strings in path gracefully', () => {
      expect(service.classify('GET', '/products?page=1&limit=10')).toBe('list');
      expect(service.classify('GET', '/products/{id}?include=details')).toBe('details');
      expect(service.classify('POST', '/orders/{id}/approve?notify=true')).toBe('action');
    });

    it('should fallback to unknown when method or path are invalid', () => {
      expect(service.classify('' as HttpMethod, '/products')).toBe('unknown');
      expect(service.classify('GET', null as unknown as string)).toBe('unknown');
    });
  });
});

