import { TestBed } from '@angular/core/testing';
import { ApiSessionService } from './api-session.service';
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
});

