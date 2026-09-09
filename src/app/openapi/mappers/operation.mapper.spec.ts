import { OperationMapper } from './operation.mapper';
import { SchemaResolverService } from '../services/schema-resolver.service';
import { OperationClassifierService } from '../services/operation-classifier.service';
import { ApiOperation } from '../../core/models/api-operation.model';

describe('OperationMapper', () => {
  let schemaResolver: SchemaResolverService;
  let classifier: OperationClassifierService;

  beforeEach(() => {
    schemaResolver = new SchemaResolverService();
    classifier = new OperationClassifierService();
  });

  describe('toInternal', () => {
    it('should generate ID from operationId when provided, or fallback to HTTP_METHOD + sanitized path', () => {
      const doc = {};
      const opWithId = OperationMapper.toInternal(
        '/users/{id}',
        'get',
        { operationId: 'getUserById' },
        doc,
        schemaResolver,
        classifier
      );
      expect(opWithId.id).toBe('getUserById');
      expect(opWithId.operationId).toBe('getUserById');

      const opWithoutId = OperationMapper.toInternal(
        '/users/{id}/orders',
        'post',
        {},
        doc,
        schemaResolver,
        classifier
      );
      expect(opWithoutId.id).toBe('POST__users__id__orders');
      expect(opWithoutId.operationId).toBeUndefined();
    });

    it('should merge path-level parameters and operation-level parameters, with operation parameters taking precedence', () => {
      const doc = {};
      const pathLevelParams = [
        { name: 'id', in: 'path', required: true, description: 'Path level id' },
        { name: 'X-Tenant', in: 'header', required: false, description: 'Path level header' }
      ];
      const operationParams = [
        { name: 'id', in: 'path', required: true, description: 'Operation level id override' },
        { name: 'limit', in: 'query', required: false }
      ];

      const op = OperationMapper.toInternal(
        '/users/{id}',
        'get',
        { parameters: operationParams },
        doc,
        schemaResolver,
        classifier,
        pathLevelParams
      );

      expect(op.parameters.length).toBe(3);
      const idParam = op.parameters.find((p) => p.name === 'id');
      expect(idParam?.description).toBe('Operation level id override');

      const tenantParam = op.parameters.find((p) => p.name === 'X-Tenant');
      expect(tenantParam?.location).toBe('header');

      const limitParam = op.parameters.find((p) => p.name === 'limit');
      expect(limitParam?.location).toBe('query');
    });

    it('should resolve parameter $ref references', () => {
      const doc = {
        components: {
          parameters: {
            QueryLimit: {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', default: 10 }
            }
          }
        }
      };

      const op = OperationMapper.toInternal(
        '/items',
        'get',
        {
          parameters: [{ $ref: '#/components/parameters/QueryLimit' }]
        },
        doc,
        schemaResolver,
        classifier
      );

      expect(op.parameters.length).toBe(1);
      expect(op.parameters[0].name).toBe('limit');
      expect(op.parameters[0].schema.type).toBe('integer');
      expect(op.parameters[0].default).toBe(10);
    });

    it('should extract OpenAPI 3.x request body with json or form content type', () => {
      const doc = {
        components: {
          schemas: {
            UserPayload: {
              type: 'object',
              properties: { name: { type: 'string' } }
            }
          }
        }
      };

      const op = OperationMapper.toInternal(
        '/users',
        'post',
        {
          requestBody: {
            description: 'User to create',
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UserPayload' }
              }
            }
          }
        },
        doc,
        schemaResolver,
        classifier
      );

      expect(op.requestBody).toBeDefined();
      const body = op.requestBody as import('../../core/models/api-operation.model').ApiRequestBody;
      expect(body.required).toBe(true);
      expect(body.contentType).toBe('application/json');
      expect(body.schema.type).toBe('object');
      expect(body.schema.properties?.['name'].type).toBe('string');
    });

    it('should extract Swagger 2.0 in: body parameter as requestBody', () => {
      const doc = {
        definitions: {
          UpdatePayload: {
            type: 'object',
            properties: { status: { type: 'string' } }
          }
        }
      };

      const op = OperationMapper.toInternal(
        '/items/{id}',
        'put',
        {
          parameters: [
            {
              name: 'body',
              in: 'body',
              required: true,
              schema: { $ref: '#/definitions/UpdatePayload' }
            }
          ]
        },
        doc,
        schemaResolver,
        classifier
      );

      expect(op.requestBody).toBeDefined();
      const body = op.requestBody as import('../../core/models/api-operation.model').ApiRequestBody;
      expect(body.contentType).toBe('application/json');
      expect(body.required).toBe(true);
      expect(body.schema.properties?.['status'].type).toBe('string');
      // in: body should not be in parameters list
      expect(op.parameters.length).toBe(0);
    });

    it('should extract responses and response headers', () => {
      const doc = {};
      const rawResponses = {
        '200': {
          description: 'Success',
          content: {
            'application/json': {
              schema: { type: 'object', properties: { count: { type: 'integer' } } }
            }
          },
          headers: {
            'X-Rate-Limit': {
              schema: { type: 'integer' }
            }
          }
        },
        '404': {
          description: 'Not found'
        }
      };

      const op = OperationMapper.toInternal(
        '/metrics',
        'get',
        { responses: rawResponses },
        doc,
        schemaResolver,
        classifier
      );

      expect(op.responses.length).toBe(2);
      const resp200 = op.responses.find((r) => r.statusCode === '200');
      expect(resp200?.contentType).toBe('application/json');
      expect(resp200?.schema?.properties?.['count'].type).toBe('integer');
      expect(resp200?.headers?.['X-Rate-Limit'].type).toBe('integer');

      const resp404 = op.responses.find((r) => r.statusCode === '404');
      expect(resp404?.description).toBe('Not found');
    });

    it('should extract Swagger 2.0 response schema directly', () => {
      const doc = {};
      const rawResponses = {
        '200': {
          description: 'OK',
          schema: { type: 'string' }
        }
      };

      const op = OperationMapper.toInternal(
        '/status',
        'get',
        { responses: rawResponses },
        doc,
        schemaResolver,
        classifier
      );

      const resp200 = op.responses.find((r) => r.statusCode === '200');
      expect(resp200?.contentType).toBe('application/json');
      expect(resp200?.schema?.type).toBe('string');
    });

    it('should handle security inheritance and overrides correctly', () => {
      const doc = {};
      const globalSecurity = [{ BearerAuth: [] }];

      // 1. Inherits global security
      const opGlobal = OperationMapper.toInternal(
        '/protected',
        'get',
        {},
        doc,
        schemaResolver,
        classifier,
        [],
        globalSecurity
      );
      expect(opGlobal.requiresAuth).toBe(true);
      expect(opGlobal.applicableSecuritySchemes).toEqual(['BearerAuth']);

      // 2. Overrides with empty array (public)
      const opPublic = OperationMapper.toInternal(
        '/public',
        'get',
        { security: [] },
        doc,
        schemaResolver,
        classifier,
        [],
        globalSecurity
      );
      expect(opPublic.requiresAuth).toBe(false);
      expect(opPublic.applicableSecuritySchemes).toEqual([]);

      // 3. Overrides with custom operation security
      const opApiKey = OperationMapper.toInternal(
        '/custom',
        'post',
        { security: [{ ApiKeyHeader: ['read'] }] },
        doc,
        schemaResolver,
        classifier,
        [],
        globalSecurity
      );
      expect(opApiKey.requiresAuth).toBe(true);
      expect(opApiKey.applicableSecuritySchemes).toEqual(['ApiKeyHeader']);
    });
  });
});
