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

  it('should return empty array for empty input', () => {
    expect(service.inferColumns([])).toEqual([]);
  });
});
