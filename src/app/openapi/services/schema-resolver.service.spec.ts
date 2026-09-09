import { TestBed } from '@angular/core/testing';
import { SchemaResolverService } from './schema-resolver.service';
import {
  PRIMITIVES_AND_CONSTRAINTS_SPEC,
  REUSED_REFS_SPEC,
  CIRCULAR_REF_SPEC,
  ALL_OF_SPEC,
  INVALID_REF_SPEC
} from '../testing/openapi-fixtures';

describe('SchemaResolverService', () => {
  let service: SchemaResolverService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SchemaResolverService]
    });
    service = TestBed.inject(SchemaResolverService);
  });

  describe('Primitive Types and Constraints', () => {
    it('should resolve and preserve all primitive types with constraints', () => {
      const userSchema = service.resolveRef(
        '#/components/schemas/User',
        PRIMITIVES_AND_CONSTRAINTS_SPEC
      );

      expect(userSchema.type).toBe('object');
      expect(userSchema.requiredProperties).toEqual(['id', 'email', 'age']);
      expect(userSchema.properties).toBeDefined();

      const props = userSchema.properties!;

      // Integer with format and min/max
      expect(props['id'].type).toBe('integer');
      expect(props['id'].format).toBe('int64');
      expect(props['id'].minimum).toBe(1);
      expect(props['id'].maximum).toBe(999999);
      expect(props['id'].required).toBe(true);

      // String with format and min/max length
      expect(props['email'].type).toBe('string');
      expect(props['email'].format).toBe('email');
      expect(props['email'].minLength).toBe(5);
      expect(props['email'].maxLength).toBe(100);
      expect(props['email'].required).toBe(true);

      // Number with format and default
      expect(props['score'].type).toBe('number');
      expect(props['score'].format).toBe('float');
      expect(props['score'].default).toBe(0.0);

      // Enum
      expect(props['status'].type).toBe('string');
      expect(props['status'].enum).toEqual(['ACTIVE', 'INACTIVE', 'PENDING']);
      expect(props['status'].default).toBe('PENDING');

      // Boolean
      expect(props['isActive'].type).toBe('boolean');
      expect(props['isActive'].default).toBe(true);

      // Nullable
      expect(props['bio'].type).toBe('string');
      expect(props['bio'].nullable).toBe(true);
      expect(props['bio'].maxLength).toBe(500);

      // Nested object and array
      expect(props['metadata'].type).toBe('object');
      expect(props['metadata'].properties!['createdAt'].format).toBe('date-time');
      expect(props['metadata'].properties!['tags'].type).toBe('array');
      expect(props['metadata'].properties!['tags'].items!.type).toBe('string');
    });

    it('should support OpenAPI 3.1 multi-type array for nullability', () => {
      const rawSpec = {
        openapi: '3.1.0',
        components: {
          schemas: {
            NullableText: {
              type: ['string', 'null'],
              maxLength: 255
            }
          }
        }
      };

      const resolved = service.resolveRef('#/components/schemas/NullableText', rawSpec);
      expect(resolved.type).toBe('string');
      expect(resolved.nullable).toBe(true);
      expect(resolved.maxLength).toBe(255);
    });
  });

  describe('Reusable References ($ref)', () => {
    it('should resolve direct and nested references cleanly', () => {
      const productSchema = service.resolveRef('#/components/schemas/Product', REUSED_REFS_SPEC);

      expect(productSchema.type).toBe('object');
      expect(productSchema.title).toBe('Product');
      expect(productSchema.requiredProperties).toContain('category');

      const categoryProp = productSchema.properties!['category'];
      expect(categoryProp.type).toBe('object');
      expect(categoryProp.title).toBe('Category');
      expect(categoryProp.properties!['id'].type).toBe('integer');
      expect(categoryProp.properties!['name'].type).toBe('string');
      expect(categoryProp.required).toBe(true);
    });

    it('should resolve schema references independently without polluting instances', () => {
      const product1 = service.resolveRef('#/components/schemas/Product', REUSED_REFS_SPEC);
      const product2 = service.resolveRef('#/components/schemas/Product', REUSED_REFS_SPEC);

      expect(product1).toEqual(product2);
      expect(product1).not.toBe(product2);
    });

    it('should resolve an array with item $ref', () => {
      const arraySchema = {
        type: 'array',
        items: {
          $ref: '#/components/schemas/Product'
        }
      };

      const resolved = service.resolveSchema(arraySchema, REUSED_REFS_SPEC);
      expect(resolved.type).toBe('array');
      expect(resolved.items).toBeDefined();
      expect(resolved.items!.type).toBe('object');
      expect(resolved.items!.title).toBe('Product');
      expect(resolved.items!.properties!['price'].type).toBe('number');
    });
  });

  describe('Circular References', () => {
    it('should handle circular self-referencing schemas without infinite loop or stack overflow', () => {
      const nodeSchema = service.resolveRef(
        '#/components/schemas/CategoryNode',
        CIRCULAR_REF_SPEC
      );

      expect(nodeSchema.type).toBe('object');
      expect(nodeSchema.properties).toBeDefined();

      const parentProp = nodeSchema.properties!['parent'];
      expect(parentProp).toBeDefined();
      expect(parentProp.type).toBe('object');
      expect(parentProp.description).toContain('Auto-referência');

      const subcategoriesProp = nodeSchema.properties!['subcategories'];
      expect(subcategoriesProp.type).toBe('array');
      expect(subcategoriesProp.items).toBeDefined();
      expect(subcategoriesProp.items!.type).toBe('object');
      expect(subcategoriesProp.items!.description).toContain('Auto-referência');
    });
  });

  describe('allOf Composition', () => {
    it('should merge properties and required arrays from all referenced schemas', () => {
      const customerSchema = service.resolveRef('#/components/schemas/Customer', ALL_OF_SPEC);

      expect(customerSchema.type).toBe('object');
      expect(customerSchema.properties).toBeDefined();

      const props = customerSchema.properties!;
      expect(props['id'].type).toBe('string');
      expect(props['id'].format).toBe('uuid');
      expect(props['id'].required).toBe(true);

      expect(props['createdAt'].type).toBe('string');
      expect(props['createdAt'].format).toBe('date-time');

      expect(props['name'].type).toBe('string');
      expect(props['name'].required).toBe(true);

      expect(props['email'].type).toBe('string');
      expect(props['email'].format).toBe('email');
      expect(props['email'].required).toBe(true);

      expect(customerSchema.requiredProperties).toEqual(
        expect.arrayContaining(['id', 'name', 'email'])
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw descriptive error when reference path is not found in document', () => {
      expect(() => {
        service.resolveRef('#/components/schemas/MissingReference', INVALID_REF_SPEC);
      }).toThrowError(/Referência OpenAPI não encontrada/);
    });

    it('should throw error when reference format is empty or invalid', () => {
      expect(() => {
        service.resolveRef('', INVALID_REF_SPEC);
      }).toThrowError(/Referência \$ref inválida/);
    });

    it('should throw error when root document is null or not an object', () => {
      expect(() => {
        service.resolveRef('#/components/schemas/User', null);
      }).toThrowError(/documento raiz inválido/);
    });

    it('should resolve Swagger 2.0 #/definitions/ references correctly', () => {
      const swaggerDoc = {
        swagger: '2.0',
        definitions: {
          Account: {
            type: 'object',
            required: ['accountId'],
            properties: {
              accountId: { type: 'string' }
            }
          }
        }
      };

      const resolved = service.resolveRef('#/definitions/Account', swaggerDoc);
      expect(resolved.type).toBe('object');
      expect(resolved.title).toBe('Account');
      expect(resolved.properties?.['accountId'].type).toBe('string');
      expect(resolved.properties?.['accountId'].required).toBe(true);
    });

    it('should resolve encoded JSON pointer tokens like ~1 for slashes', () => {
      const docWithEscapedKeys = {
        components: {
          schemas: {
            'application/problem+json': {
              type: 'object',
              properties: {
                detail: { type: 'string' }
              }
            }
          }
        }
      };

      const resolved = service.resolveRef('#/components/schemas/application~1problem+json', docWithEscapedKeys);
      expect(resolved.type).toBe('object');
      expect(resolved.properties?.['detail'].type).toBe('string');
    });

    it('should return unknown schema type for undefined rawSchema', () => {
      const resolved = service.resolveSchema(undefined, PRIMITIVES_AND_CONSTRAINTS_SPEC);
      expect(resolved.type).toBe('unknown');
    });
  });
});
