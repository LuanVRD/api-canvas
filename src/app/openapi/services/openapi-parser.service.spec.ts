import { TestBed } from '@angular/core/testing';
import { OpenApiParserService } from './openapi-parser.service';
import { SchemaResolverService } from './schema-resolver.service';
import { OperationClassifierService } from './operation-classifier.service';
import { REUSED_REFS_SPEC } from '../testing/openapi-fixtures';

describe('OpenApiParserService', () => {
  let service: OpenApiParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpenApiParserService, SchemaResolverService, OperationClassifierService]
    });
    service = TestBed.inject(OpenApiParserService);
  });

  describe('Document Parsing and Schema Resolution', () => {
    it('should parse an OpenAPI 3.x document and resolve all operations, parameters, request bodies and responses', () => {
      const apiDefinition = service.parse(REUSED_REFS_SPEC);

      expect(apiDefinition.title).toBe('Store API');
      expect(apiDefinition.version).toBe('2.1.0');
      expect(apiDefinition.baseUrl).toBe('https://api.store.com/v1');
      expect(apiDefinition.resources.length).toBe(1);

      const productsResource = apiDefinition.resources[0];
      expect(productsResource.name).toBe('Products');
      expect(productsResource.operations.length).toBe(3);

      // 1. GET /products (List)
      const listOp = productsResource.operations.find((op) => op.method === 'GET' && op.path === '/products');
      expect(listOp).toBeDefined();
      expect(listOp!.type).toBe('list');
      const listResp200 = listOp!.responses.find((r) => r.statusCode === '200');
      expect(listResp200).toBeDefined();
      expect(listResp200!.schema?.type).toBe('array');
      expect(listResp200!.schema?.items?.title).toBe('Product');
      expect(listResp200!.schema?.items?.properties!['category'].type).toBe('object');

      // 2. POST /products (Create)
      const createOp = productsResource.operations.find((op) => op.method === 'POST');
      expect(createOp).toBeDefined();
      expect(createOp!.type).toBe('create');
      expect(createOp!.requestBody).toBeDefined();
      // requestBody schema
      const reqBody = createOp!.requestBody as { schema: { properties: Record<string, { type: string }> } };
      expect(reqBody.schema.properties['name'].type).toBe('string');
      expect(reqBody.schema.properties['price'].type).toBe('number');

      // 3. GET /products/{id} (Details)
      const detailsOp = productsResource.operations.find((op) => op.method === 'GET' && op.path === '/products/{id}');
      expect(detailsOp).toBeDefined();
      expect(detailsOp!.type).toBe('details');
      expect(detailsOp!.parameters.length).toBe(1);
      expect(detailsOp!.parameters[0].name).toBe('id');
      expect(detailsOp!.parameters[0].location).toBe('path');
      expect(detailsOp!.parameters[0].required).toBe(true);
      expect(detailsOp!.parameters[0].schema.type).toBe('integer');
      expect(detailsOp!.parameters[0].schema.format).toBe('int64');
    });

    it('should throw controlled error on invalid or empty documents', () => {
      expect(() => service.parse(null)).toThrowError(/Documento OpenAPI inválido/);
      expect(() => service.parse({})).toThrowError(/propriedade "openapi" ou "swagger" não foi encontrada/);
    });
  });
});
