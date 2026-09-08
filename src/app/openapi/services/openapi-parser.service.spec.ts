import { TestBed } from '@angular/core/testing';
import { OpenApiParserService } from './openapi-parser.service';
import { SchemaResolverService } from './schema-resolver.service';
import { OperationClassifierService } from './operation-classifier.service';
import {
  FULL_PETSTORE_SPEC,
  REUSED_REFS_SPEC,
  SWAGGER_2_SPEC,
  UNTAGGED_API_SPEC
} from '../testing/openapi-fixtures';
import { ApiRequestBody } from '../../core/models/api-operation.model';

describe('OpenApiParserService', () => {
  let service: OpenApiParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [OpenApiParserService, SchemaResolverService, OperationClassifierService]
    });
    service = TestBed.inject(OpenApiParserService);
  });

  describe('REUSED_REFS_SPEC parsing', () => {
    it('should parse an OpenAPI 3.x document and resolve all operations, parameters, request bodies and responses', () => {
      const apiDefinition = service.parse(REUSED_REFS_SPEC);

      expect(apiDefinition.title).toBe('Store API');
      expect(apiDefinition.version).toBe('2.1.0');
      expect(apiDefinition.baseUrl).toBe('https://api.store.com/v1');
      expect(apiDefinition.resources.length).toBe(1);

      const productsResource = apiDefinition.resources[0];
      expect(productsResource.name).toBe('Products');
      expect(productsResource.label).toBe('Products');
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
      const reqBody = createOp!.requestBody as ApiRequestBody;
      expect(reqBody.schema.properties!['name'].type).toBe('string');
      expect(reqBody.schema.properties!['price'].type).toBe('number');

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
  });

  describe('FULL_PETSTORE_SPEC parsing', () => {
    it('should parse info metadata, multiple servers, path-level params, and all parameter locations', () => {
      const def = service.parse(FULL_PETSTORE_SPEC);

      expect(def.title).toBe('Petstore Extended API');
      expect(def.version).toBe('1.5.0');
      expect(def.description).toBe('A comprehensive Petstore API with full parameters, headers, cookies, and responses');
      expect(def.baseUrl).toBe('https://api.petstore.com/v1');
      expect(def.servers?.length).toBe(2);
      expect(def.servers?.[0].url).toBe('https://api.petstore.com/v1');
      expect(def.servers?.[1].url).toBe('https://sandbox.petstore.com/v1');

      expect(def.resources.length).toBe(1);
      const petsResource = def.resources[0];
      expect(petsResource.name).toBe('Pets');
      expect(petsResource.label).toBe('Pets');
      expect(petsResource.operations.length).toBe(4);

      // GET /pets: has header (from path-level), query, cookie params
      const findPets = petsResource.operations.find((op) => op.operationId === 'findPets');
      expect(findPets).toBeDefined();
      expect(findPets!.method).toBe('GET');
      expect(findPets!.path).toBe('/pets');
      expect(findPets!.summary).toBe('Find all pets');
      expect(findPets!.description).toBe('Returns a paginated list of pets matching filter criteria');
      expect(findPets!.tags).toEqual(['Pets']);
      expect(findPets!.deprecated).toBe(false);

      // Verify parameters: header, query, cookie
      const headerParam = findPets!.parameters.find((p) => p.name === 'X-Request-ID');
      expect(headerParam).toBeDefined();
      expect(headerParam!.location).toBe('header');
      expect(headerParam!.required).toBe(true);
      expect(headerParam!.schema.type).toBe('string');
      expect(headerParam!.schema.format).toBe('uuid');

      const queryParam = findPets!.parameters.find((p) => p.name === 'limit');
      expect(queryParam).toBeDefined();
      expect(queryParam!.location).toBe('query');
      expect(queryParam!.required).toBe(false);
      expect(queryParam!.schema.type).toBe('integer');
      expect(queryParam!.default).toBe(20);

      const cookieParam = findPets!.parameters.find((p) => p.name === 'session_token');
      expect(cookieParam).toBeDefined();
      expect(cookieParam!.location).toBe('cookie');
      expect(cookieParam!.required).toBe(false);

      // Verify responses and response headers
      const resp200 = findPets!.responses.find((r) => r.statusCode === '200');
      expect(resp200).toBeDefined();
      expect(resp200!.contentType).toBe('application/json');
      expect(resp200!.schema?.type).toBe('array');
      expect(resp200!.headers).toBeDefined();
      expect(resp200!.headers!['X-Total-Count'].type).toBe('integer');

      const respDefault = findPets!.responses.find((r) => r.statusCode === 'default');
      expect(respDefault).toBeDefined();
      expect(respDefault!.description).toBe('Unexpected error');
      expect(respDefault!.schema?.title).toBe('Error');

      // POST /pets: deprecated, requestBody
      const addPet = petsResource.operations.find((op) => op.operationId === 'addPet');
      expect(addPet).toBeDefined();
      expect(addPet!.deprecated).toBe(true);
      expect(addPet!.type).toBe('create');
      expect(addPet!.requestBody).toBeDefined();
      const body = addPet!.requestBody as ApiRequestBody;
      expect(body.required).toBe(true);
      expect(body.contentType).toBe('application/json');
      expect(body.schema.title).toBe('NewPet');

      // DELETE /pets/{id}
      const deletePet = petsResource.operations.find((op) => op.operationId === 'deletePet');
      expect(deletePet).toBeDefined();
      expect(deletePet!.method).toBe('DELETE');
      expect(deletePet!.type).toBe('delete');
    });
  });

  describe('SWAGGER_2_SPEC parsing', () => {
    it('should parse Swagger 2.0 specifications with host/basePath/schemes, in: body and direct responses', () => {
      const def = service.parse(SWAGGER_2_SPEC);

      expect(def.title).toBe('Legacy Swagger API');
      expect(def.baseUrl).toBe('https://legacy.api.com/v2');
      expect(def.resources.length).toBe(1);

      const usersResource = def.resources[0];
      expect(usersResource.name).toBe('Users');
      expect(usersResource.operations.length).toBe(1);

      const createUser = usersResource.operations[0];
      expect(createUser.method).toBe('POST');
      expect(createUser.type).toBe('create');

      // Header param extracted
      const authParam = createUser.parameters.find((p) => p.name === 'Authorization');
      expect(authParam).toBeDefined();
      expect(authParam!.location).toBe('header');
      expect(authParam!.required).toBe(true);

      // in: body mapped to requestBody
      expect(createUser.requestBody).toBeDefined();
      const reqBody = createUser.requestBody as ApiRequestBody;
      expect(reqBody.required).toBe(true);
      expect(reqBody.schema.title).toBe('User');
      expect(reqBody.schema.properties!['username'].type).toBe('string');
      expect(reqBody.schema.properties!['email'].type).toBe('string');

      // 200 response with direct schema
      const resp200 = createUser.responses.find((r) => r.statusCode === '200');
      expect(resp200).toBeDefined();
      expect(resp200!.schema?.title).toBe('User');
    });
  });

  describe('UNTAGGED_API_SPEC parsing', () => {
    it('should group operations into resources based on URL path segments when tags are absent', () => {
      const def = service.parse(UNTAGGED_API_SPEC);

      expect(def.title).toBe('Untagged Routes API');
      expect(def.resources.length).toBe(2);

      const ordersRes = def.resources.find((r) => r.name === 'orders');
      expect(ordersRes).toBeDefined();
      expect(ordersRes!.label).toBe('Orders');
      expect(ordersRes!.operations.length).toBe(1);
      expect(ordersRes!.operations[0].path).toBe('/orders/{orderId}/items');

      const analyticsRes = def.resources.find((r) => r.name === 'analytics');
      expect(analyticsRes).toBeDefined();
      expect(analyticsRes!.label).toBe('Analytics');
      expect(analyticsRes!.operations.length).toBe(1);
      expect(analyticsRes!.operations[0].path).toBe('/analytics/reports');
    });
  });

  describe('Error handling', () => {
    it('should throw controlled error on invalid or empty documents', () => {
      expect(() => service.parse(null)).toThrowError(/Documento OpenAPI inválido/);
      expect(() => service.parse('string')).toThrowError(/Documento OpenAPI inválido/);
      expect(() => service.parse({})).toThrowError(/propriedade "openapi" ou "swagger" não foi encontrada/);
    });
  });
});

