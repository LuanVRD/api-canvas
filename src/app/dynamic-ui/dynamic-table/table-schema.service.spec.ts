import { TestBed } from '@angular/core/testing';
import { TableSchemaService } from './table-schema.service';

describe('TableSchemaService', () => {
  let service: TableSchemaService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TableSchemaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should infer column descriptors from data sample', () => {
    const sample = [
      { id: 1, name: 'Product A', price: 99.9, inStock: true }
    ];

    const columns = service.inferColumns(sample);
    expect(columns.length).toBe(4);
    expect(columns[0]).toEqual({ key: 'id', label: 'Id', type: 'number' });
    expect(columns[1]).toEqual({ key: 'name', label: 'Name', type: 'string' });
    expect(columns[2]).toEqual({ key: 'price', label: 'Price', type: 'number' });
    expect(columns[3]).toEqual({ key: 'inStock', label: 'In Stock', type: 'boolean' });
  });

  it('should infer columns across multiple records when properties are disjoint', () => {
    const sample = [
      { id: 1, name: 'Product A' },
      { id: 2, name: 'Product B', category: 'Electronics', tags: ['gadget'] },
      { id: 3, createdAt: '2026-03-01T10:00:00Z', metadata: { source: 'api' } }
    ];

    const columns = service.inferColumns(sample);
    const keys = columns.map((c) => c.key);
    expect(keys).toContain('id');
    expect(keys).toContain('name');
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

  it('should handle primitive arrays gracefully with _value column', () => {
    const primitiveSample = ['Admin', 'Manager', 'Developer'];
    const columns = service.inferColumns(primitiveSample);
    expect(columns.length).toBe(1);
    expect(columns[0]).toEqual({ key: '_value', label: 'Value', type: 'string' });

    const numberSample = [10, 20, 30];
    const numCols = service.inferColumns(numberSample);
    expect(numCols[0]).toEqual({ key: '_value', label: 'Value', type: 'number' });
  });

  it('should return empty array for empty input or non-arrays', () => {
    expect(service.inferColumns([])).toEqual([]);
    expect(service.inferColumns(null as unknown as unknown[])).toEqual([]);
    expect(service.inferColumns(undefined as unknown as unknown[])).toEqual([]);
  });
});

