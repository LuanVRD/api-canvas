import { TestBed } from '@angular/core/testing';
import { ApiSessionService } from './api-session.service';
import { StorageService } from './storage.service';
import { ApiDefinition } from '../models/api-definition.model';
import { ApiResource } from '../models/api-resource.model';

describe('ApiSessionService', () => {
  let service: ApiSessionService;

  const mockResources: ApiResource[] = [
    {
      id: 'products',
      name: 'products',
      label: 'Products',
      description: 'Product operations',
      operations: [
        {
          id: 'get_products',
          method: 'GET',
          path: '/api/products',
          parameters: [],
          responses: [],
          type: 'list'
        }
      ]
    },
    {
      id: 'orders',
      name: 'orders',
      label: 'Orders',
      description: 'Order operations',
      operations: [
        {
          id: 'get_orders',
          method: 'GET',
          path: '/api/orders',
          parameters: [],
          responses: [],
          type: 'list'
        }
      ]
    }
  ];

  const mockApiDefinition: ApiDefinition = {
    title: 'Store API',
    version: '2.1.0',
    description: 'E-commerce API specification',
    baseUrl: 'https://api.store.com/v2',
    resources: mockResources
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiSessionService]
    });
    service = TestBed.inject(ApiSessionService);
  });

  it('should initialize with empty/null state', () => {
    expect(service.apiDefinition()).toBeNull();
    expect(service.hasActiveApi()).toBe(false);
    expect(service.selectedResourceId()).toBeNull();
    expect(service.selectedResource()).toBeNull();
    expect(service.apiTitle()).toBe('');
    expect(service.apiVersion()).toBe('');
    expect(service.apiDescription()).toBe('');
    expect(service.baseUrl()).toBe('');
    expect(service.resources()).toEqual([]);
    expect(service.openApiUrl()).toBeNull();
    expect(service.rawSpec()).toBeNull();
  });

  it('should set session and compute properties properly', () => {
    service.setSession(mockApiDefinition, {
      openApiUrl: 'https://api.store.com/openapi.json',
      rawSpec: { openapi: '3.0.0' }
    });

    expect(service.hasActiveApi()).toBe(true);
    expect(service.apiDefinition()).toEqual(mockApiDefinition);
    expect(service.apiTitle()).toBe('Store API');
    expect(service.apiVersion()).toBe('2.1.0');
    expect(service.apiDescription()).toBe('E-commerce API specification');
    expect(service.baseUrl()).toBe('https://api.store.com/v2');
    expect(service.resources()).toEqual(mockResources);
    expect(service.openApiUrl()).toBe('https://api.store.com/openapi.json');
    expect(service.rawSpec()).toEqual({ openapi: '3.0.0' });

    // Should default to first resource
    expect(service.selectedResourceId()).toBe('products');
    expect(service.selectedResource()).toEqual(mockResources[0]);
  });

  it('should respect defaultResourceId if provided in metadata and valid', () => {
    service.setSession(mockApiDefinition, {
      defaultResourceId: 'orders'
    });

    expect(service.selectedResourceId()).toBe('orders');
    expect(service.selectedResource()).toEqual(mockResources[1]);
  });

  it('should fallback to first resource if defaultResourceId is not found in definition', () => {
    service.setSession(mockApiDefinition, {
      defaultResourceId: 'non_existing'
    });

    expect(service.selectedResourceId()).toBe('products');
    expect(service.selectedResource()).toEqual(mockResources[0]);
  });

  it('should handle definition with no resources', () => {
    const emptyDef: ApiDefinition = {
      title: 'Empty API',
      baseUrl: 'https://empty.api.com',
      resources: []
    };

    service.setSession(emptyDef);

    expect(service.hasActiveApi()).toBe(true);
    expect(service.selectedResourceId()).toBeNull();
    expect(service.selectedResource()).toBeNull();
    expect(service.resources()).toEqual([]);
  });

  it('should allow selecting resource by string ID or ApiResource object', () => {
    service.setSession(mockApiDefinition);

    service.selectResource('orders');
    expect(service.selectedResourceId()).toBe('orders');
    expect(service.selectedResource()).toEqual(mockResources[1]);

    service.selectResource(mockResources[0]);
    expect(service.selectedResourceId()).toBe('products');
    expect(service.selectedResource()).toEqual(mockResources[0]);

    service.selectResource(null);
    expect(service.selectedResourceId()).toBeNull();
    expect(service.selectedResource()).toBeNull();
  });

  it('should update base URL of active definition', () => {
    service.setSession(mockApiDefinition);

    service.updateBaseUrl('https://custom-proxy.com/api');

    expect(service.baseUrl()).toBe('https://custom-proxy.com/api');
    expect(service.apiDefinition()?.baseUrl).toBe('https://custom-proxy.com/api');
  });

  it('should not throw when updating base URL if no session is active', () => {
    expect(() => service.updateBaseUrl('https://custom-proxy.com/api')).not.toThrow();
    expect(service.baseUrl()).toBe('');
  });

  it('should find operation and resource for operation by id or operationId', () => {
    service.setSession(mockApiDefinition);

    const op = service.getOperation('get_products');
    expect(op).toBeDefined();
    expect(op?.path).toBe('/api/products');

    const resource = service.getResourceForOperation('get_products');
    expect(resource?.id).toBe('products');

    expect(service.getOperation('non_existing')).toBeNull();
    expect(service.getResourceForOperation('non_existing')).toBeNull();
  });

  it('should clear session completely', () => {
    service.setSession(mockApiDefinition, {
      openApiUrl: 'https://api.store.com/openapi.json',
      rawSpec: { openapi: '3.0.0' }
    });

    expect(service.hasActiveApi()).toBe(true);

    service.clearSession();

    expect(service.hasActiveApi()).toBe(false);
    expect(service.apiDefinition()).toBeNull();
    expect(service.selectedResourceId()).toBeNull();
    expect(service.selectedResource()).toBeNull();
    expect(service.openApiUrl()).toBeNull();
    expect(service.rawSpec()).toBeNull();
    expect(service.resources()).toEqual([]);
    expect(service.lastResourceMutation()).toBeNull();
  });

  it('should broadcast and track resource mutation events', () => {
    service.setSession(mockApiDefinition);

    expect(service.lastResourceMutation()).toBeNull();

    service.notifyResourceMutation('products', 'create_product', {
      status: 201,
      statusText: 'Created',
      isSuccess: true,
      data: { id: 101, name: 'New Item' },
      duration: 20,
      durationMs: 20
    });

    const mutation = service.lastResourceMutation();
    expect(mutation).toBeTruthy();
    expect(mutation?.resourceId).toBe('products');
    expect(mutation?.operationId).toBe('create_product');
    expect(mutation?.result?.status).toBe(201);
  });

  it('should find compatible list operation for a resource', () => {
    service.setSession(mockApiDefinition);

    const listOp = service.getCompatibleListOperation('products');
    expect(listOp).toBeTruthy();
    expect(listOp?.id).toBe('get_products');
    expect(listOp?.type).toBe('list');

    expect(service.getCompatibleListOperation('non_existing')).toBeNull();
  });

  it('should manage in-memory bearer token and compute security scheme helpers', () => {
    const authDef: ApiDefinition = {
      ...mockApiDefinition,
      securitySchemes: [
        {
          id: 'bearerAuth',
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          isBearer: true
        },
        {
          id: 'apiKeyAuth',
          type: 'apiKey',
          name: 'X-API-KEY',
          in: 'header',
          isBearer: false
        }
      ]
    };

    service.setSession(authDef);

    expect(service.hasSecuritySchemes()).toBe(true);
    expect(service.hasBearerScheme()).toBe(true);
    expect(service.securitySchemes().length).toBe(2);
    expect(service.bearerSchemes().length).toBe(1);
    expect(service.hasBearerToken()).toBe(false);
    expect(service.bearerToken()).toBeNull();

    // Set Bearer token
    service.setBearerToken('my-secret-jwt-token');
    expect(service.hasBearerToken()).toBe(true);
    expect(service.bearerToken()).toBe('my-secret-jwt-token');

    // Clear Bearer token
    service.clearBearerToken();
    expect(service.hasBearerToken()).toBe(false);
    expect(service.bearerToken()).toBeNull();

    // Set again and ensure clearSession cleans it
    service.setBearerToken('another-token');
    expect(service.hasBearerToken()).toBe(true);

    service.clearSession();
    expect(service.hasBearerToken()).toBe(false);
    expect(service.bearerToken()).toBeNull();
  });

  it('should manage in-memory API keys and check operation auth satisfaction', () => {
    const authDef: ApiDefinition = {
      ...mockApiDefinition,
      securitySchemes: [
        {
          id: 'apiKeyHeader',
          type: 'apiKey',
          name: 'X-API-KEY',
          in: 'header',
          isBearer: false,
          isApiKey: true
        },
        {
          id: 'apiKeyQuery',
          type: 'apiKey',
          name: 'api_key',
          in: 'query',
          isBearer: false,
          isApiKey: true
        }
      ]
    };

    service.setSession(authDef);

    expect(service.hasApiKeyScheme()).toBe(true);
    expect(service.apiKeySchemes().length).toBe(2);
    expect(service.hasAnyApiKey()).toBe(false);
    expect(service.configuredApiKeyCount()).toBe(0);

    // Set single API key
    service.setApiKey('apiKeyHeader', 'secret-key-123');
    expect(service.getApiKey('apiKeyHeader')).toBe('secret-key-123');
    expect(service.hasAnyApiKey()).toBe(true);
    expect(service.hasAnyAuthCredential()).toBe(true);
    expect(service.configuredApiKeyCount()).toBe(1);

    // Set batch API keys
    service.setApiKeys({
      apiKeyHeader: 'updated-key',
      apiKeyQuery: 'query-token-456'
    });
    expect(service.getApiKey('apiKeyHeader')).toBe('updated-key');
    expect(service.getApiKey('apiKeyQuery')).toBe('query-token-456');
    expect(service.configuredApiKeyCount()).toBe(2);

    // Check operation satisfaction
    const headerOp = {
      id: 'secure_op',
      method: 'GET' as const,
      path: '/secure',
      parameters: [],
      responses: [],
      type: 'list' as const,
      requiresAuth: true,
      applicableSecuritySchemes: ['apiKeyHeader']
    };

    expect(service.isOperationAuthSatisfied(headerOp)).toBe(true);
    expect(service.getMissingAuthRequirements(headerOp)).toEqual([]);

    // Clear one key
    service.clearApiKey('apiKeyHeader');
    expect(service.getApiKey('apiKeyHeader')).toBeNull();
    expect(service.isOperationAuthSatisfied(headerOp)).toBe(false);
    expect(service.getMissingAuthRequirements(headerOp).length).toBe(1);
    expect(service.getMissingAuthRequirements(headerOp)[0].id).toBe('apiKeyHeader');

    // Clear all keys
    service.clearApiKeys();
    expect(service.configuredApiKeyCount()).toBe(0);
    expect(service.hasAnyApiKey()).toBe(false);

    // Test clearSession resets all keys
    service.setApiKey('apiKeyQuery', 'some-val');
    expect(service.hasAnyApiKey()).toBe(true);
    service.clearSession();
    expect(service.hasAnyApiKey()).toBe(false);
    expect(service.getApiKey('apiKeyQuery')).toBeNull();
  });

  it('should manage UiConfiguration and merge resource labels/hiding dynamically', () => {
    service.setSession(mockApiDefinition);
    expect(service.uiConfiguration()).toBeNull();
    expect(service.resources()[0].label).toBe('Products');
    expect(service.resources().length).toBe(2);

    // Apply UI Configuration
    service.setUiConfiguration({
      resources: {
        products: { label: 'Store Products' },
        orders: { hidden: true }
      }
    });

    expect(service.uiConfiguration()).toEqual({
      resources: {
        products: { label: 'Store Products' },
        orders: { hidden: true }
      }
    });

    // Computed resources should reflect the config
    const merged = service.resources();
    expect(merged.length).toBe(1);
    expect(merged[0].id).toBe('products');
    expect(merged[0].label).toBe('Store Products');

    // Clear UI configuration
    service.clearUiConfiguration();
    expect(service.uiConfiguration()).toBeNull();
    expect(service.resources().length).toBe(2);
    expect(service.resources()[0].label).toBe('Products');
  });

  it('should accept uiConfiguration in setSession metadata', () => {
    service.setSession(mockApiDefinition, {
      uiConfiguration: {
        resources: {
          products: { label: 'Item Catalog' }
        }
      }
    });

    expect(service.uiConfiguration()).toBeDefined();
    expect(service.resources()[0].label).toBe('Item Catalog');

    // clearSession should also clear uiConfiguration
    service.clearSession();
    expect(service.uiConfiguration()).toBeNull();
  });

  describe('UI Configuration Persistence, Reconnection & Credential Security', () => {
    let storageService: StorageService;
    const testApiUrl = 'https://api.store.com/v1/openapi.json';

    beforeEach(() => {
      storageService = TestBed.inject(StorageService);
      localStorage.clear();
    });

    it('should automatically recover saved UI configuration upon reconnecting to the same API', () => {
      // 1. Initial connection and customization
      service.setSession(mockApiDefinition, { openApiUrl: testApiUrl });
      service.setUiConfiguration({
        title: 'Customized Store UI',
        resources: {
          products: { label: 'Custom Products' },
          orders: { hidden: true }
        },
        pages: {
          custom_page: {
            title: 'Analytics Page',
            displayMode: 'dashboard'
          }
        }
      });

      // 2. Save configuration
      const saved = service.saveCurrentUiConfiguration();
      expect(saved).toBe(true);

      // 3. Clear session (simulate user leaving or closing app)
      service.clearSession();
      expect(service.hasActiveApi()).toBe(false);
      expect(service.uiConfiguration()).toBeNull();

      // 4. Reconnect to the same API
      service.setSession(mockApiDefinition, { openApiUrl: testApiUrl });

      // 5. Verify restored configuration and merged resources
      expect(service.uiConfiguration()).not.toBeNull();
      expect(service.uiConfiguration()?.title).toBe('Customized Store UI');
      expect(service.uiConfiguration()?.pages?.['custom_page']?.title).toBe('Analytics Page');
      expect(service.resources().length).toBe(1);
      expect(service.resources()[0].label).toBe('Custom Products');
    });

    it('should not recover configuration if connecting to a different API URL', () => {
      // Save config for API A
      service.setSession(mockApiDefinition, { openApiUrl: 'https://api.a.com/spec.json' });
      service.setUiConfiguration({ title: 'Config A' });
      service.saveCurrentUiConfiguration();
      service.clearSession();

      // Connect to API B
      service.setSession(mockApiDefinition, { openApiUrl: 'https://api.b.com/spec.json' });
      expect(service.uiConfiguration()).toBeNull();
    });

    it('should never persist Bearer tokens or API keys to storage during UI save operations', () => {
      service.setSession(mockApiDefinition, { openApiUrl: testApiUrl });
      service.setBearerToken('top-secret-bearer-token');
      service.setApiKey('apiKeyHeader', 'secret-api-key-999');

      service.setUiConfiguration({
        title: 'Store Dashboard'
      });
      service.saveCurrentUiConfiguration();

      // Check all raw keys in localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        const val = localStorage.getItem(key)!;
        expect(val).not.toContain('top-secret-bearer-token');
        expect(val).not.toContain('secret-api-key-999');
      }

      // Ensure tokens remain active in memory only
      expect(service.bearerToken()).toBe('top-secret-bearer-token');
      expect(service.getApiKey('apiKeyHeader')).toBe('secret-api-key-999');
    });

    it('should support replaceUiConfiguration, restoreDefaultUiConfiguration, and loadSavedUiConfiguration', () => {
      service.setSession(mockApiDefinition, { openApiUrl: testApiUrl });

      // Replace UI configuration
      service.replaceUiConfiguration({
        title: 'Replaced Title',
        resources: { products: { label: 'Replaced Products' } }
      });

      expect(service.uiConfiguration()?.title).toBe('Replaced Title');
      expect(service.resources()[0].label).toBe('Replaced Products');

      // Load saved manually
      const loaded = service.loadSavedUiConfiguration();
      expect(loaded?.title).toBe('Replaced Title');

      // Restore defaults
      service.restoreDefaultUiConfiguration();
      expect(service.uiConfiguration()).toBeNull();
      expect(service.resources()[0].label).toBe('Products');
      expect(storageService.getApiUiConfiguration(testApiUrl, mockApiDefinition.baseUrl)).toBeNull();
    });

    it('should resolve resource page through resolveResourcePage method', () => {
      service.setSession(mockApiDefinition, { openApiUrl: testApiUrl });
      service.setUiConfiguration({
        pages: {
          productsPage: {
            resourceId: 'products',
            title: 'Produtos Custom',
            operations: {
              list: 'get_products'
            }
          }
        }
      });

      const resolved = service.resolveResourcePage('products');
      expect(resolved).toBeTruthy();
      expect(resolved?.resourceId).toBe('products');
      expect(resolved?.list?.id).toBe('get_products');
      expect(resolved?.explicitOverrides.list).toBe(true);
    });

    it('should return null when calling resolveResourcePage without active session or non-existent resource', () => {
      service.clearSession();
      expect(service.resolveResourcePage('products')).toBeNull();

      service.setSession(mockApiDefinition);
      expect(service.resolveResourcePage('unknown_res')).toBeNull();
    });
  });
});


