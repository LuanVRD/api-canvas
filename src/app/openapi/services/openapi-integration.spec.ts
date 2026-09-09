import { TestBed } from '@angular/core/testing';
import { OpenApiParserService } from './openapi-parser.service';
import { SchemaResolverService } from './schema-resolver.service';
import { OperationClassifierService } from './operation-classifier.service';
import { TableSchemaService } from '../../dynamic-ui/dynamic-table/table-schema.service';
import { FormSchemaService } from '../../dynamic-ui/dynamic-form/form-schema.service';
import { ApiRequestBuilderService } from '../../core/services/api-request-builder.service';
import {
  ALL_OF_SPEC,
  CIRCULAR_REF_SPEC,
  FULL_EXTENDED_SPEC,
  PRIMITIVES_AND_CONSTRAINTS_SPEC,
  REUSED_REFS_SPEC,
  SWAGGER_2_SPEC,
  UNTAGGED_API_SPEC
} from '../testing/openapi-fixtures';

describe('OpenAPI Integration Pipeline', () => {
  let parser: OpenApiParserService;
  let tableSchemaService: TableSchemaService;
  let formSchemaService: FormSchemaService;
  let requestBuilder: ApiRequestBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OpenApiParserService,
        SchemaResolverService,
        OperationClassifierService,
        TableSchemaService,
        FormSchemaService,
        ApiRequestBuilderService
      ]
    });

    parser = TestBed.inject(OpenApiParserService);
    tableSchemaService = TestBed.inject(TableSchemaService);
    formSchemaService = TestBed.inject(FormSchemaService);
    requestBuilder = TestBed.inject(ApiRequestBuilderService);
  });

  describe('FULL_EXTENDED_SPEC end-to-end integration', () => {
    it('should parse specification, produce valid schemas, and generate working dynamic UI schemas', () => {
      const apiDef = parser.parse(FULL_EXTENDED_SPEC);

      expect(apiDef.title).toBe('Extended API');
      expect(apiDef.resources.length).toBeGreaterThan(0);

      const allOperations = apiDef.resources.flatMap((r) => r.operations);
      expect(allOperations.length).toBe(4);

      // 1. List operation -> TableSchemaService generates columns
      const listOp = allOperations.find((op) => op.type === 'list');
      expect(listOp).toBeDefined();
      const response200 = listOp!.responses.find((r) => r.statusCode === '200');
      expect(response200?.schema).toBeDefined();

      const columns = tableSchemaService.inferColumns([], response200!.schema);
      expect(columns.length).toBeGreaterThan(0);
      expect(columns.map((c) => c.key)).toContain('id');
      expect(columns.map((c) => c.key)).toContain('name');

      // 2. Create operation -> FormSchemaService generates reactive form
      const createOp = allOperations.find((op) => op.type === 'create');
      expect(createOp).toBeDefined();
      expect(createOp!.requestBody).toBeDefined();

      const createBody = createOp!.requestBody as import('../../core/models/api-operation.model').ApiRequestBody;
      const { form, fields } = formSchemaService.buildFormGroup(createBody.schema);
      expect(fields.length).toBeGreaterThan(0);
      expect(form.contains('name')).toBe(true);

      // Verify form validation
      expect(form.valid).toBe(false); // name is required
      form.patchValue({ name: 'Fido', tag: 'dog' });
      expect(form.valid).toBe(true);

      // Convert to request body
      const payload = formSchemaService.toRequestBody(form.value, fields);
      expect(payload).toEqual({ name: 'Fido', tag: 'dog' });

      // 3. RequestBuilder constructs valid request
      const builtReq = requestBuilder.build(apiDef.baseUrl, createOp!, {
        headers: { 'X-Request-ID': 'test-uuid-123' },
        body: payload
      });
      expect(builtReq.method).toBe('POST');
      expect(builtReq.headers['Content-Type']).toBe('application/json');
      expect(builtReq.headers['X-Request-ID']).toBe('test-uuid-123');
      expect(builtReq.body).toEqual({ name: 'Fido', tag: 'dog' });
    });
  });

  describe('SWAGGER_2_SPEC end-to-end integration', () => {
    it('should parse legacy Swagger 2.0 and derive complete UI components', () => {
      const apiDef = parser.parse(SWAGGER_2_SPEC);

      expect(apiDef.title).toBe('Legacy Swagger API');
      expect(apiDef.baseUrl).toBe('https://legacy.api.com/v2');

      const createOp = apiDef.resources[0].operations[0];
      expect(createOp.method).toBe('POST');
      expect(createOp.requestBody).toBeDefined();

      const swaggerBody = createOp.requestBody as import('../../core/models/api-operation.model').ApiRequestBody;
      const { form, fields } = formSchemaService.buildFormGroup(swaggerBody.schema);
      expect(fields.length).toBe(2);
      expect(form.contains('username')).toBe(true);
      expect(form.contains('email')).toBe(true);

      form.patchValue({ username: 'johndoe', email: 'john@example.com' });
      expect(form.valid).toBe(true);

      const builtReq = requestBuilder.build(apiDef.baseUrl, createOp, {
        headers: { Authorization: 'Bearer token-123' },
        body: form.value
      });

      expect(builtReq.url).toBe('https://legacy.api.com/v2/users');
      expect(builtReq.headers['Authorization']).toBe('Bearer token-123');
    });
  });

  describe('ALL_OF_SPEC end-to-end integration', () => {
    it('should compose schemas via allOf and produce form fields with all composite properties', () => {
      const apiDef = parser.parse(ALL_OF_SPEC);
      expect(apiDef.title).toBe('AllOf Schema API');

      // Resolve Customer schema
      const resolver = TestBed.inject(SchemaResolverService);
      const customerSchema = resolver.resolveRef('#/components/schemas/Customer', ALL_OF_SPEC);

      const fields = formSchemaService.extractFields(customerSchema);
      const keys = fields.map((f) => f.key);

      expect(keys).toContain('id');
      expect(keys).toContain('createdAt');
      expect(keys).toContain('name');
      expect(keys).toContain('email');

      const { form } = formSchemaService.buildFormGroup(customerSchema);
      expect(form.contains('id')).toBe(true);
      expect(form.contains('name')).toBe(true);
      expect(form.contains('email')).toBe(true);
    });
  });

  describe('CIRCULAR_REF_SPEC end-to-end integration', () => {
    it('should safely parse circular specs and generate form without stack overflow', () => {
      const apiDef = parser.parse(CIRCULAR_REF_SPEC);
      expect(apiDef.title).toBe('Category Hierarchy API');

      const resolver = TestBed.inject(SchemaResolverService);
      const nodeSchema = resolver.resolveRef('#/components/schemas/CategoryNode', CIRCULAR_REF_SPEC);

      expect(() => {
        const { form, fields } = formSchemaService.buildFormGroup(nodeSchema);
        expect(fields.length).toBeGreaterThan(0);
        expect(form.contains('title')).toBe(true);
      }).not.toThrow();
    });
  });

  describe('REUSED_REFS_SPEC end-to-end integration', () => {
    it('should generate table schema for list, form schema for create, and path builder for details', () => {
      const apiDef = parser.parse(REUSED_REFS_SPEC);
      const productsRes = apiDef.resources[0];

      // List
      const listOp = productsRes.operations.find((o) => o.type === 'list')!;
      const listCols = tableSchemaService.inferColumns([], listOp.responses[0].schema);
      expect(listCols.length).toBeGreaterThan(0);
      expect(listCols.map((c) => c.key)).toContain('id');
      expect(listCols.map((c) => c.key)).toContain('name');

      // Create
      const createOp = productsRes.operations.find((o) => o.type === 'create')!;
      const reusedBody = createOp.requestBody as import('../../core/models/api-operation.model').ApiRequestBody;
      const { form } = formSchemaService.buildFormGroup(reusedBody.schema);
      expect(form.contains('name')).toBe(true);
      expect(form.contains('price')).toBe(true);
      expect(form.contains('categoryId')).toBe(true);

      // Details
      const detailsOp = productsRes.operations.find((o) => o.type === 'details')!;
      const builtDetails = requestBuilder.build(apiDef.baseUrl, detailsOp, {
        path: { id: 42 }
      });
      expect(builtDetails.url).toBe('https://api.store.com/v1/products/42');
    });
  });
});
