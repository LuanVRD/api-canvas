import { ResourceMapper } from './resource.mapper';
import { ApiOperation } from '../../core/models/api-operation.model';

describe('ResourceMapper', () => {
  const createMockOp = (partial: Partial<ApiOperation>): ApiOperation => ({
    id: partial.id || 'op-1',
    method: partial.method || 'GET',
    path: partial.path || '/test',
    type: partial.type || 'list',
    parameters: partial.parameters || [],
    responses: partial.responses || [],
    tags: partial.tags,
    summary: partial.summary
  });

  describe('Tag-based grouping (Priority)', () => {
    it('should group operations by their primary tag when tags are provided', () => {
      const operations: ApiOperation[] = [
        createMockOp({ id: '1', path: '/api/v1/orders', tags: ['Orders'] }),
        createMockOp({ id: '2', path: '/api/v1/orders/{id}', tags: ['Orders'] }),
        createMockOp({ id: '3', path: '/api/v1/users', tags: ['Users'] })
      ];

      const resources = ResourceMapper.groupOperationsByResource(operations);

      expect(resources.length).toBe(2);

      const ordersRes = resources.find((r) => r.name === 'Orders');
      expect(ordersRes).toBeDefined();
      expect(ordersRes!.id).toBe('orders');
      expect(ordersRes!.label).toBe('Orders');
      expect(ordersRes!.operations.length).toBe(2);

      const usersRes = resources.find((r) => r.name === 'Users');
      expect(usersRes).toBeDefined();
      expect(usersRes!.id).toBe('users');
      expect(usersRes!.label).toBe('Users');
      expect(usersRes!.operations.length).toBe(1);
    });

    it('should assign multi-tagged operation to its primary tag to prevent duplicate entries', () => {
      const operations: ApiOperation[] = [
        createMockOp({ id: '1', path: '/orders/{id}/customer', tags: ['Orders', 'Customers'] }),
        createMockOp({ id: '2', path: '/customers/{id}', tags: ['Customers'] })
      ];

      const resources = ResourceMapper.groupOperationsByResource(operations);

      expect(resources.length).toBe(2);
      const ordersRes = resources.find((r) => r.id === 'orders')!;
      const customersRes = resources.find((r) => r.id === 'customers')!;

      expect(ordersRes.operations.length).toBe(1);
      expect(ordersRes.operations[0].id).toBe('1');

      expect(customersRes.operations.length).toBe(1);
      expect(customersRes.operations[0].id).toBe('2');

      const totalGroupedOps = resources.reduce((acc, r) => acc + r.operations.length, 0);
      expect(totalGroupedOps).toBe(operations.length);
    });

    it('should map tag descriptions from root document metadata', () => {
      const operations: ApiOperation[] = [
        createMockOp({ id: '1', path: '/orders', tags: ['Orders'] }),
        createMockOp({ id: '2', path: '/customers', tags: ['Customers'] })
      ];

      const tagsMetadata = [
        { name: 'Orders', description: 'Order placement and lifecycle management' },
        { name: 'Customers', description: 'Customer profiles and accounts' }
      ];

      const resources = ResourceMapper.groupOperationsByResource(operations, tagsMetadata);

      const ordersRes = resources.find((r) => r.id === 'orders')!;
      expect(ordersRes.description).toBe('Order placement and lifecycle management');

      const custRes = resources.find((r) => r.id === 'customers')!;
      expect(custRes.description).toBe('Customer profiles and accounts');
    });

    it('should fallback to path extraction if tag is empty string or whitespace', () => {
      const operations: ApiOperation[] = [
        createMockOp({ id: '1', path: '/api/v1/invoices', tags: ['   ', ''] })
      ];

      const resources = ResourceMapper.groupOperationsByResource(operations);

      expect(resources.length).toBe(1);
      expect(resources[0].name).toBe('invoices');
      expect(resources[0].label).toBe('Invoices');
    });
  });

  describe('Path-based fallback heuristics (When tags are absent)', () => {
    it('should extract resource from standard REST paths', () => {
      expect(ResourceMapper.extractResourceFromPath('/orders')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/orders/{id}')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/orders/{orderId}/items')).toBe('orders');
    });

    it('should strip technical and version prefixes', () => {
      expect(ResourceMapper.extractResourceFromPath('/api/orders')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/api/v1/orders')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/v2/users/{id}')).toBe('users');
      expect(ResourceMapper.extractResourceFromPath('/rest/v3.0/catalog/products')).toBe('catalog');
      expect(ResourceMapper.extractResourceFromPath('/api-v1/billing')).toBe('billing');
      expect(ResourceMapper.extractResourceFromPath('/service/api/inventory/{sku}')).toBe('inventory');
      expect(ResourceMapper.extractResourceFromPath('/v1beta1/models')).toBe('models');
    });

    it('should bypass parameter prefixes to locate the domain resource', () => {
      expect(ResourceMapper.extractResourceFromPath('/{tenantId}/customers')).toBe('customers');
      expect(ResourceMapper.extractResourceFromPath('/{orgId}/v2/{lang}/products')).toBe('products');
      expect(ResourceMapper.extractResourceFromPath('/{region}/api/orders/{id}')).toBe('orders');
    });

    it('should preserve special action endpoints under the domain resource', () => {
      expect(ResourceMapper.extractResourceFromPath('/orders/{id}/approve')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/orders/{id}/cancel')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/auth/tokens/revoke')).toBe('auth');
      expect(ResourceMapper.extractResourceFromPath('/api/v1/subscriptions/{subId}/actions/pause')).toBe(
        'subscriptions'
      );
    });

    it('should handle non-conventional paths, health checks, and edge cases', () => {
      expect(ResourceMapper.extractResourceFromPath('/health')).toBe('health');
      expect(ResourceMapper.extractResourceFromPath('/metrics')).toBe('metrics');
      expect(ResourceMapper.extractResourceFromPath('/ping')).toBe('ping');
      expect(ResourceMapper.extractResourceFromPath('orders/{id}')).toBe('orders');
      expect(ResourceMapper.extractResourceFromPath('/orders?sort=asc#top')).toBe('orders');
    });

    it('should gracefully fallback to "general" or fallback prefix when no semantic resource segment exists', () => {
      expect(ResourceMapper.extractResourceFromPath('')).toBe('general');
      expect(ResourceMapper.extractResourceFromPath('/')).toBe('general');
      expect(ResourceMapper.extractResourceFromPath('/{id}')).toBe('general');
      expect(ResourceMapper.extractResourceFromPath('/{tenantId}/{userId}')).toBe('general');
      expect(ResourceMapper.extractResourceFromPath('/api')).toBe('api');
      expect(ResourceMapper.extractResourceFromPath('/v1')).toBe('v1');
    });
  });

  describe('Friendly label formatting and slug generation', () => {
    it('should convert camelCase and PascalCase to Title Case', () => {
      expect(ResourceMapper.formatLabel('orderItems')).toBe('Order Items');
      expect(ResourceMapper.formatLabel('OrderManagement')).toBe('Order Management');
      expect(ResourceMapper.formatLabel('userProfileService')).toBe('User Profile Service');
    });

    it('should convert kebab-case and snake_case to Title Case', () => {
      expect(ResourceMapper.formatLabel('order-items')).toBe('Order Items');
      expect(ResourceMapper.formatLabel('user_profiles')).toBe('User Profiles');
      expect(ResourceMapper.formatLabel('api_v2_orders')).toBe('Api V2 Orders');
    });

    it('should handle edge cases in formatLabel and slugify', () => {
      expect(ResourceMapper.formatLabel('')).toBe('General');
      expect(ResourceMapper.formatLabel('   ')).toBe('General');
      expect(ResourceMapper.formatLabel('orders')).toBe('Orders');

      expect(ResourceMapper.slugify('Order Items')).toBe('order-items');
      expect(ResourceMapper.slugify('user_profiles')).toBe('user-profiles');
      expect(ResourceMapper.slugify('Special@Characters#Resource!')).toBe('special-characters-resource');
      expect(ResourceMapper.slugify('')).toBe('general');
      expect(ResourceMapper.slugify('   ')).toBe('general');
    });
  });

  describe('Comprehensive operation preservation & deduplication', () => {
    it('should ensure every parsed operation belongs to a resource without omissions or duplicates', () => {
      const ops: ApiOperation[] = [
        createMockOp({ id: 'op-1', path: '/orders', method: 'GET', tags: ['Orders'] }),
        createMockOp({ id: 'op-2', path: '/orders', method: 'POST', tags: ['Orders'] }),
        createMockOp({ id: 'op-3', path: '/orders/{id}', method: 'GET', tags: ['Orders'] }),
        createMockOp({ id: 'op-4', path: '/orders/{id}/approve', method: 'POST' }), // No tag, fallback to 'orders'
        createMockOp({ id: 'op-5', path: '/orders/{id}/cancel', method: 'POST' }), // No tag, fallback to 'orders'
        createMockOp({ id: 'op-6', path: '/api/v2/{tenantId}/billing/invoices', method: 'GET' }), // Fallback to 'billing'
        createMockOp({ id: 'op-7', path: '/health', method: 'GET' }), // Flat path
        createMockOp({ id: 'op-8', path: '/', method: 'GET' }) // Root path -> 'general'
      ];

      const resources = ResourceMapper.groupOperationsByResource(ops);

      const totalGroupedOps = resources.reduce((sum, r) => sum + r.operations.length, 0);
      expect(totalGroupedOps).toBe(ops.length);

      const ordersResource = resources.find((r) => r.id === 'orders');
      expect(ordersResource).toBeDefined();
      expect(ordersResource!.operations.length).toBe(5);
      expect(ordersResource!.operations.map((o) => o.id)).toEqual([
        'op-1',
        'op-2',
        'op-3',
        'op-4',
        'op-5'
      ]);

      const billingResource = resources.find((r) => r.id === 'billing');
      expect(billingResource).toBeDefined();
      expect(billingResource!.operations.length).toBe(1);

      const healthResource = resources.find((r) => r.id === 'health');
      expect(healthResource).toBeDefined();
      expect(healthResource!.operations.length).toBe(1);

      const generalResource = resources.find((r) => r.id === 'general');
      expect(generalResource).toBeDefined();
      expect(generalResource!.operations.length).toBe(1);
    });
  });
});
