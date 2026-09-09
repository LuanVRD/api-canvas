import { TestBed } from '@angular/core/testing';
import { TableSchemaService } from './table-schema.service';
import { ApiSchema } from '../../core/models/api-schema.model';

describe('TableSchemaService', () => {
  let service: TableSchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TableSchemaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('OpenAPI response schema prioritization', () => {
    it('should prioritize OpenAPI array item schema over data properties', () => {
      const responseSchema: ApiSchema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sku: { type: 'string', title: 'Product SKU', description: 'Unique SKU identifier' },
            title: { type: 'string' },
            price: { type: 'number' },
            isAvailable: { type: 'boolean' },
            releaseDate: { type: 'string', format: 'date-time' }
          },
          requiredProperties: ['sku', 'title']
        }
      };

      // Even if sample data has different or additional properties, schema definition is prioritized
      const sample = [
        { sku: 'SKU-001', extraProp: 'ignored_or_secondary' }
      ];

      const columns = service.inferColumns(sample, responseSchema);

      expect(columns.length).toBe(5);
      expect(columns[0]).toEqual({
        key: 'sku',
        label: 'Product SKU',
        type: 'string',
        format: undefined,
        description: 'Unique SKU identifier',
        required: true
      });
      expect(columns[1]).toEqual({
        key: 'title',
        label: 'Title',
        type: 'string',
        format: undefined,
        description: undefined,
        required: true
      });
      expect(columns[2]).toEqual({
        key: 'price',
        label: 'Price',
        type: 'number',
        format: undefined,
        description: undefined,
        required: false
      });
      expect(columns[3]).toEqual({
        key: 'isAvailable',
        label: 'Is Available',
        type: 'boolean',
        format: undefined,
        description: undefined,
        required: false
      });
      expect(columns[4]).toEqual({
        key: 'releaseDate',
        label: 'Release Date',
        type: 'date',
        format: 'date-time',
        description: undefined,
        required: false
      });
    });

    it('should extract columns from direct object response schema', () => {
      const objectSchema: ApiSchema = {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          createdAt: { type: 'string', format: 'date' }
        }
      };

      const columns = service.inferColumns([], objectSchema);
      expect(columns.length).toBe(3);
      expect(columns[0]).toEqual({
        key: 'id',
        label: 'ID',
        type: 'number',
        format: undefined,
        description: undefined,
        required: false
      });
      expect(columns[1].type).toBe('string');
      expect(columns[2].type).toBe('date');
    });

    it('should handle schema for array of primitive values', () => {
      const primitiveArraySchema: ApiSchema = {
        type: 'array',
        items: {
          type: 'string',
          format: 'email',
          description: 'List of email addresses'
        }
      };

      const columns = service.inferColumns(['user1@example.com', 'user2@example.com'], primitiveArraySchema);
      expect(columns.length).toBe(1);
      expect(columns[0]).toEqual({
        key: '_value',
        label: 'Value',
        type: 'string',
        format: 'email',
        description: 'List of email addresses'
      });
    });
  });

  describe('Data inspection fallback', () => {
    it('should infer column descriptors from data sample when no schema is provided', () => {
      const sample = [
        { id: 1, name: 'Product A', price: 99.9, inStock: true }
      ];

      const columns = service.inferColumns(sample, null);
      expect(columns.length).toBe(4);
      expect(columns[0]).toEqual({ key: 'id', label: 'ID', type: 'number' });
      expect(columns[1]).toEqual({ key: 'name', label: 'Name', type: 'string' });
      expect(columns[2]).toEqual({ key: 'price', label: 'Price', type: 'number' });
      expect(columns[3]).toEqual({ key: 'inStock', label: 'In Stock', type: 'boolean' });
    });

    it('should prioritize the first item property order and add disjoint keys from subsequent items', () => {
      const sample = [
        { id: 1, name: 'Product A' },
        { id: 2, name: 'Product B', category: 'Electronics', tags: ['gadget'] },
        { id: 3, createdAt: '2026-03-01T10:00:00Z', metadata: { source: 'api' } }
      ];

      const columns = service.inferColumns(sample);
      const keys = columns.map((c) => c.key);

      // First item keys appear first in exact order
      expect(keys[0]).toBe('id');
      expect(keys[1]).toBe('name');

      // Subsequent disjoint keys are appended
      expect(keys).toContain('category');
      expect(keys).toContain('tags');
      expect(keys).toContain('createdAt');
      expect(keys).toContain('metadata');

      const createdCol = columns.find((c) => c.key === 'createdAt');
      expect(createdCol?.type).toBe('date');
      const tagsCol = columns.find((c) => c.key === 'tags');
      expect(tagsCol?.type).toBe('array');
      const metaCol = columns.find((c) => c.key === 'metadata');
      expect(metaCol?.type).toBe('object');
    });

    it('should detect ISO date strings and Date instances as date type', () => {
      const sample = [
        {
          isoWithTime: '2026-09-08T12:00:00Z',
          isoDateOnly: '2026-09-08',
          dateInstance: new Date('2026-09-08'),
          plainString: '2026 is a good year'
        }
      ];

      const columns = service.inferColumns(sample);
      expect(columns.find((c) => c.key === 'isoWithTime')?.type).toBe('date');
      expect(columns.find((c) => c.key === 'isoDateOnly')?.type).toBe('date');
      expect(columns.find((c) => c.key === 'dateInstance')?.type).toBe('date');
      expect(columns.find((c) => c.key === 'plainString')?.type).toBe('string');
    });

    it('should handle primitive arrays gracefully with _value column', () => {
      const stringSample = ['Admin', 'Manager', 'Developer'];
      const stringCols = service.inferColumns(stringSample);
      expect(stringCols.length).toBe(1);
      expect(stringCols[0]).toEqual({ key: '_value', label: 'Value', type: 'string' });

      const numberSample = [10, 20, 30];
      const numCols = service.inferColumns(numberSample);
      expect(numCols[0]).toEqual({ key: '_value', label: 'Value', type: 'number' });

      const boolSample = [true, false, true];
      const boolCols = service.inferColumns(boolSample);
      expect(boolCols[0]).toEqual({ key: '_value', label: 'Value', type: 'boolean' });
    });

    it('should return empty array for empty input or non-arrays when no schema exists', () => {
      expect(service.inferColumns([])).toEqual([]);
      expect(service.inferColumns(null as unknown as unknown[])).toEqual([]);
      expect(service.inferColumns(undefined as unknown as unknown[])).toEqual([]);
    });
  });

  describe('Label formatting', () => {
    it('should format camelCase, snake_case, kebab-case and technical acronyms', () => {
      expect(service.formatLabel('id')).toBe('ID');
      expect(service.formatLabel('sku')).toBe('SKU');
      expect(service.formatLabel('url')).toBe('URL');
      expect(service.formatLabel('ip')).toBe('IP');
      expect(service.formatLabel('created_at')).toBe('Created At');
      expect(service.formatLabel('unit-price')).toBe('Unit Price');
      expect(service.formatLabel('isAvailableForOrder')).toBe('Is Available For Order');
      expect(service.formatLabel('customerUUID')).toBe('Customer UUID');
    });
  });
});
