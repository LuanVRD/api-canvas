import { TestBed } from '@angular/core/testing';
import { ApiRequestBuilderService } from './api-request-builder.service';
import { ApiOperation } from '../models/api-operation.model';
import { RequestValidationError } from '../models/built-api-request.model';

describe('ApiRequestBuilderService', () => {
  let service: ApiRequestBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiRequestBuilderService]
    });
    service = TestBed.inject(ApiRequestBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Path parameter substitution and encoding', () => {
    it('should correctly replace multiple arbitrary path parameters (not assuming numeric or "id")', () => {
      const operation: ApiOperation = {
        id: 'get_member_role',
        method: 'GET',
        path: '/tenants/{tenantGuid}/departments/{dept_slug}/employees/{employeeUuid}',
        type: 'details',
        parameters: [
          { name: 'tenantGuid', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'dept_slug', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'employeeUuid', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const result = service.build('https://api.enterprise.io/v1', operation, {
        path: {
          tenantGuid: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          dept_slug: 'engineering-devops',
          employeeUuid: '98765432-10fe-dcba-0987-654321fedcba'
        }
      });

      expect(result.url).toBe(
        'https://api.enterprise.io/v1/tenants/a1b2c3d4-e5f6-7890-abcd-ef1234567890/departments/engineering-devops/employees/98765432-10fe-dcba-0987-654321fedcba'
      );
      expect(result.method).toBe('GET');
    });

    it('should URL-encode special characters in path parameters (spaces, symbols, slashes, accents)', () => {
      const operation: ApiOperation = {
        id: 'get_file_by_name',
        method: 'GET',
        path: '/storage/{folderName}/files/{fileName}',
        type: 'details',
        parameters: [
          { name: 'folderName', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'fileName', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        path: {
          folderName: 'Projetos & Relatórios',
          fileName: 'relatório final #1 [2026].pdf'
        }
      });

      expect(result.url).toBe(
        'https://api.example.com/storage/Projetos%20%26%20Relat%C3%B3rios/files/relat%C3%B3rio%20final%20%231%20%5B2026%5D.pdf'
      );
    });

    it('should support numeric values and zero in path parameters', () => {
      const operation: ApiOperation = {
        id: 'get_node',
        method: 'GET',
        path: '/graph/nodes/{nodeId}/offsets/{offset}',
        type: 'details',
        parameters: [],
        responses: []
      };

      const result = service.build('https://api.example.com/', operation, {
        path: {
          nodeId: 42,
          offset: 0
        }
      });

      expect(result.url).toBe('https://api.example.com/graph/nodes/42/offsets/0');
    });

    it('should normalize base URLs and paths with and without trailing/leading slashes', () => {
      const operationWithSlash: ApiOperation = {
        id: 'list_items',
        method: 'GET',
        path: '/items',
        type: 'list',
        parameters: [],
        responses: []
      };

      const operationWithoutSlash: ApiOperation = {
        id: 'list_items_raw',
        method: 'GET',
        path: 'items',
        type: 'list',
        parameters: [],
        responses: []
      };

      expect(service.build('https://api.example.com', operationWithSlash).url).toBe(
        'https://api.example.com/items'
      );
      expect(service.build('https://api.example.com/', operationWithSlash).url).toBe(
        'https://api.example.com/items'
      );
      expect(service.build('https://api.example.com', operationWithoutSlash).url).toBe(
        'https://api.example.com/items'
      );
      expect(service.build('https://api.example.com///', operationWithoutSlash).url).toBe(
        'https://api.example.com/items'
      );
    });
  });

  describe('Query parameter building and encoding', () => {
    it('should build query string with multiple parameters, encoding special characters and GUIDs', () => {
      const operation: ApiOperation = {
        id: 'search_audit_logs',
        method: 'GET',
        path: '/audit-logs',
        type: 'list',
        parameters: [],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        query: {
          correlationId: '123e4567-e89b-12d3-a456-426614174000',
          queryText: 'error: failed to sync & retry',
          page: 1,
          limit: 50,
          active: true
        }
      });

      expect(result.url).toBe('https://api.example.com/audit-logs');
      expect(result.queryString).toBe(
        '?correlationId=123e4567-e89b-12d3-a456-426614174000&queryText=error%3A%20failed%20to%20sync%20%26%20retry&page=1&limit=50&active=true'
      );
      expect(result.fullUrl).toBe(
        'https://api.example.com/audit-logs?correlationId=123e4567-e89b-12d3-a456-426614174000&queryText=error%3A%20failed%20to%20sync%20%26%20retry&page=1&limit=50&active=true'
      );
    });

    it('should preserve falsy values like zero (0) and boolean false in query parameters', () => {
      const operation: ApiOperation = {
        id: 'filter_items',
        method: 'GET',
        path: '/items',
        type: 'list',
        parameters: [],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        query: {
          offset: 0,
          archived: false,
          threshold: 0.0
        }
      });

      expect(result.queryString).toBe('?offset=0&archived=false&threshold=0');
      expect(result.queryParams['offset']).toBe('0');
      expect(result.queryParams['archived']).toBe('false');
    });

    it('should ignore undefined, null and empty string optional query parameters', () => {
      const operation: ApiOperation = {
        id: 'list_users',
        method: 'GET',
        path: '/users',
        type: 'list',
        parameters: [],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        query: {
          search: '',
          filter: undefined,
          tag: null,
          role: 'admin'
        }
      });

      expect(result.queryString).toBe('?role=admin');
      expect(result.queryParams['search']).toBeUndefined();
      expect(result.queryParams['filter']).toBeUndefined();
      expect(result.queryParams['tag']).toBeUndefined();
      expect(result.queryParams['role']).toBe('admin');
    });

    it('should support array query parameters (e.g. repeated keys in query string)', () => {
      const operation: ApiOperation = {
        id: 'filter_by_status',
        method: 'GET',
        path: '/orders',
        type: 'list',
        parameters: [],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        query: {
          status: ['pending', 'processing', 'completed']
        }
      });

      expect(result.queryString).toBe('?status=pending&status=processing&status=completed');
      expect(result.queryParams['status']).toEqual(['pending', 'processing', 'completed']);
    });
  });

  describe('Headers and Request Body handling', () => {
    it('should include custom headers and set Content-Type to application/json for object bodies', () => {
      const operation: ApiOperation = {
        id: 'create_product',
        method: 'POST',
        path: '/products',
        type: 'create',
        parameters: [],
        responses: []
      };

      const requestBody = {
        title: 'Wireless Keyboard',
        price: 99.9,
        sku: 'KB-WL-01',
        tags: ['electronics', 'peripherals']
      };

      const result = service.build('https://api.example.com', operation, {
        headers: {
          'X-Correlation-Id': 'req-987654',
          Authorization: 'Bearer test-token-jwt'
        },
        body: requestBody
      });

      expect(result.method).toBe('POST');
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['X-Correlation-Id']).toBe('req-987654');
      expect(result.headers['Authorization']).toBe('Bearer test-token-jwt');
      expect(result.body).toEqual(requestBody);
    });

    it('should respect explicitly specified contentType from input or operation requestBody', () => {
      const operation: ApiOperation = {
        id: 'upload_document',
        method: 'POST',
        path: '/documents/upload',
        type: 'action',
        parameters: [],
        requestBody: {
          contentType: 'application/pdf',
          required: true,
          schema: { type: 'string', format: 'binary' }
        },
        responses: []
      };

      const binaryData = 'PDF-BINARY-CONTENT';
      const result = service.build('https://api.example.com', operation, {
        body: binaryData
      });

      expect(result.headers['Content-Type']).toBe('application/pdf');
      expect(result.body).toBe(binaryData);
    });

    it('should preserve header parameters defined in operation', () => {
      const operation: ApiOperation = {
        id: 'get_secure_data',
        method: 'GET',
        path: '/secure-data',
        type: 'details',
        parameters: [
          { name: 'X-Api-Key', location: 'header', required: true, schema: { type: 'string' } },
          { name: 'X-Client-Version', location: 'header', required: false, schema: { type: 'string' } }
        ],
        responses: []
      };

      const result = service.build('https://api.example.com', operation, {
        headers: {
          'X-Api-Key': 'secret-123',
          'X-Client-Version': '2.4.0'
        }
      });

      expect(result.headers['X-Api-Key']).toBe('secret-123');
      expect(result.headers['X-Client-Version']).toBe('2.4.0');
    });
  });

  describe('Validation of required parameters', () => {
    it('should validate missing required path parameters from operation definition', () => {
      const operation: ApiOperation = {
        id: 'get_user_order',
        method: 'GET',
        path: '/users/{userId}/orders/{orderId}',
        type: 'details',
        parameters: [
          { name: 'userId', location: 'path', required: true, schema: { type: 'string' } },
          { name: 'orderId', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const validation = service.validate(operation, {
        path: { userId: 'usr-1' } // orderId missing
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].name).toBe('orderId');
      expect(validation.errors[0].location).toBe('path');
    });

    it('should validate missing path parameters when inferred from path template placeholders', () => {
      const operation: ApiOperation = {
        id: 'custom_path_op',
        method: 'GET',
        path: '/organizations/{orgId}/projects/{projectId}',
        type: 'details',
        parameters: [], // no explicit parameters array entry
        responses: []
      };

      const validation = service.validate(operation, {});

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(2);
      expect(validation.errors.map((e) => e.name)).toEqual(['orgId', 'projectId']);
    });

    it('should validate missing required query parameter', () => {
      const operation: ApiOperation = {
        id: 'search_items',
        method: 'GET',
        path: '/items',
        type: 'list',
        parameters: [
          { name: 'q', location: 'query', required: true, schema: { type: 'string' } },
          { name: 'limit', location: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: []
      };

      const validation = service.validate(operation, { query: { limit: 10 } });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].name).toBe('q');
      expect(validation.errors[0].location).toBe('query');
    });

    it('should validate missing required header parameter', () => {
      const operation: ApiOperation = {
        id: 'secured_endpoint',
        method: 'POST',
        path: '/secure-action',
        type: 'action',
        parameters: [
          { name: 'X-API-Signature', location: 'header', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const validation = service.validate(operation, {
        body: { ok: true }
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].name).toBe('X-API-Signature');
      expect(validation.errors[0].location).toBe('header');
    });

    it('should validate missing required request body', () => {
      const operation: ApiOperation = {
        id: 'create_resource',
        method: 'POST',
        path: '/resources',
        type: 'create',
        parameters: [],
        requestBody: {
          required: true,
          schema: { type: 'object' }
        },
        responses: []
      };

      const validation = service.validate(operation, {});

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(1);
      expect(validation.errors[0].name).toBe('body');
      expect(validation.errors[0].location).toBe('body');
    });

    it('should throw RequestValidationError when build is called with invalid parameters', () => {
      const operation: ApiOperation = {
        id: 'update_user',
        method: 'PUT',
        path: '/users/{userGuid}',
        type: 'update',
        parameters: [
          { name: 'userGuid', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      expect(() => {
        service.build('https://api.example.com', operation, {});
      }).toThrowError(RequestValidationError);
    });

    it('should allow skipping validation when requested via options', () => {
      const operation: ApiOperation = {
        id: 'update_user_skip',
        method: 'PUT',
        path: '/users/{userGuid}',
        type: 'update',
        parameters: [
          { name: 'userGuid', location: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: []
      };

      const built = service.build('https://api.example.com', operation, {}, { skipValidation: true });
      expect(built).toBeTruthy();
      expect(built.url).toBe('https://api.example.com/users/{userGuid}');
    });
  });

  describe('Authorization header & Bearer token injection', () => {
    it('should inject Authorization: Bearer <token> only for operations requiring authentication', () => {
      const protectedOp: ApiOperation = {
        id: 'get_secure_data',
        method: 'GET',
        path: '/secure/data',
        type: 'details',
        requiresAuth: true,
        parameters: [],
        responses: []
      };

      const built = service.build('https://api.example.com', protectedOp, {}, {
        bearerToken: 'my-jwt-token-123'
      });

      expect(built.headers['Authorization']).toBe('Bearer my-jwt-token-123');
    });

    it('should not inject Authorization header if operation is public (requiresAuth === false or undefined)', () => {
      const publicOp: ApiOperation = {
        id: 'get_public_status',
        method: 'GET',
        path: '/public/status',
        type: 'details',
        requiresAuth: false,
        parameters: [],
        responses: []
      };

      const built = service.build('https://api.example.com', publicOp, {}, {
        bearerToken: 'my-jwt-token-123'
      });

      expect(built.headers['Authorization']).toBeUndefined();
    });

    it('should not double-prefix if token already starts with "Bearer "', () => {
      const protectedOp: ApiOperation = {
        id: 'get_secure_data',
        method: 'GET',
        path: '/secure/data',
        type: 'details',
        requiresAuth: true,
        parameters: [],
        responses: []
      };

      const built = service.build('https://api.example.com', protectedOp, {}, {
        bearerToken: 'Bearer existing-bearer-token'
      });

      expect(built.headers['Authorization']).toBe('Bearer existing-bearer-token');
    });

    it('should let explicitly provided input.headers["Authorization"] override session bearerToken', () => {
      const protectedOp: ApiOperation = {
        id: 'get_secure_data',
        method: 'GET',
        path: '/secure/data',
        type: 'details',
        requiresAuth: true,
        parameters: [],
        responses: []
      };

      const built = service.build(
        'https://api.example.com',
        protectedOp,
        {
          headers: {
            Authorization: 'CustomScheme custom-token'
          }
        },
        {
          bearerToken: 'session-bearer-token'
        }
      );

      expect(built.headers['Authorization']).toBe('CustomScheme custom-token');
    });

    it('should inject API Key into HTTP header for protected operations requiring apiKey header scheme', () => {
      const apiKeyHeaderOp: ApiOperation = {
        id: 'secure_with_header_key',
        method: 'GET',
        path: '/secure/api-key-header',
        type: 'list',
        requiresAuth: true,
        applicableSecuritySchemes: ['headerKeyScheme'],
        parameters: [],
        responses: []
      };

      const securitySchemes = [
        {
          id: 'headerKeyScheme',
          type: 'apiKey' as const,
          name: 'X-API-KEY',
          in: 'header' as const,
          isBearer: false,
          isApiKey: true
        }
      ];

      const built = service.build(
        'https://api.example.com',
        apiKeyHeaderOp,
        {},
        {
          apiKeys: { headerKeyScheme: 'secret-token-header-999' },
          securitySchemes
        }
      );

      expect(built.headers['X-API-KEY']).toBe('secret-token-header-999');
      expect(built.queryParams['X-API-KEY']).toBeUndefined();
    });

    it('should inject API Key into Query parameter and queryString for protected operations requiring apiKey query scheme', () => {
      const apiKeyQueryOp: ApiOperation = {
        id: 'secure_with_query_key',
        method: 'GET',
        path: '/secure/api-key-query',
        type: 'list',
        requiresAuth: true,
        applicableSecuritySchemes: ['queryKeyScheme'],
        parameters: [],
        responses: []
      };

      const securitySchemes = [
        {
          id: 'queryKeyScheme',
          type: 'apiKey' as const,
          name: 'api_key',
          in: 'query' as const,
          isBearer: false,
          isApiKey: true
        }
      ];

      const built = service.build(
        'https://api.example.com',
        apiKeyQueryOp,
        {
          query: { filter: 'active' }
        },
        {
          apiKeys: { queryKeyScheme: 'query-token-abc' },
          securitySchemes
        }
      );

      expect(built.queryParams['api_key']).toBe('query-token-abc');
      expect(built.queryParams['filter']).toBe('active');
      expect(built.fullUrl).toContain('filter=active');
      expect(built.fullUrl).toContain('api_key=query-token-abc');
      expect(built.headers['api_key']).toBeUndefined();
    });

    it('should NOT inject API Key into headers or query if operation does NOT require authentication', () => {
      const publicOp: ApiOperation = {
        id: 'public_op',
        method: 'GET',
        path: '/public/data',
        type: 'list',
        requiresAuth: false,
        applicableSecuritySchemes: [],
        parameters: [],
        responses: []
      };

      const securitySchemes = [
        {
          id: 'headerKeyScheme',
          type: 'apiKey' as const,
          name: 'X-API-KEY',
          in: 'header' as const,
          isBearer: false,
          isApiKey: true
        },
        {
          id: 'queryKeyScheme',
          type: 'apiKey' as const,
          name: 'api_key',
          in: 'query' as const,
          isBearer: false,
          isApiKey: true
        }
      ];

      const built = service.build(
        'https://api.example.com',
        publicOp,
        {},
        {
          apiKeys: {
            headerKeyScheme: 'secret-header',
            queryKeyScheme: 'secret-query'
          },
          securitySchemes
        }
      );

      expect(built.headers['X-API-KEY']).toBeUndefined();
      expect(built.queryParams['api_key']).toBeUndefined();
      expect(built.queryString).toBe('');
    });

    it('should let explicitly provided input query/header override configured API keys', () => {
      const apiKeyOp: ApiOperation = {
        id: 'secure_op_override',
        method: 'GET',
        path: '/secure/custom',
        type: 'list',
        requiresAuth: true,
        applicableSecuritySchemes: ['keyScheme'],
        parameters: [],
        responses: []
      };

      const securitySchemes = [
        {
          id: 'keyScheme',
          type: 'apiKey' as const,
          name: 'X-CUSTOM-KEY',
          in: 'header' as const,
          isBearer: false,
          isApiKey: true
        }
      ];

      const built = service.build(
        'https://api.example.com',
        apiKeyOp,
        {
          headers: {
            'X-CUSTOM-KEY': 'override-by-manual-input'
          }
        },
        {
          apiKeys: { keyScheme: 'configured-session-key' },
          securitySchemes
        }
      );

      expect(built.headers['X-CUSTOM-KEY']).toBe('override-by-manual-input');
    });
  });
});

