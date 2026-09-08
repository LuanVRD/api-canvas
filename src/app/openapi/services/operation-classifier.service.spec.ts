import { TestBed } from '@angular/core/testing';
import { OperationClassifierService } from './operation-classifier.service';

describe('OperationClassifierService', () => {
  let service: OperationClassifierService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OperationClassifierService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should classify GET /products as list', () => {
    expect(service.classify('GET', '/products')).toBe('list');
  });

  it('should classify GET /products/{id} as details', () => {
    expect(service.classify('GET', '/products/{id}')).toBe('details');
  });

  it('should classify POST /products as create', () => {
    expect(service.classify('POST', '/products')).toBe('create');
  });

  it('should classify DELETE /products/{id} as delete', () => {
    expect(service.classify('DELETE', '/products/{id}')).toBe('delete');
  });

  it('should classify PUT /products/{id} as update', () => {
    expect(service.classify('PUT', '/products/{id}')).toBe('update');
  });
});
