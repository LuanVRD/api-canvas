import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set and get items properly', () => {
    service.setItem('test_key', { url: 'https://api.example.com' });
    const result = service.getItem<{ url: string }>('test_key');
    expect(result).toEqual({ url: 'https://api.example.com' });
  });

  it('should return null for non-existent items', () => {
    const result = service.getItem('missing');
    expect(result).toBeNull();
  });

  it('should remove items correctly', () => {
    service.setItem('temp', 'value');
    expect(service.getItem<string>('temp')).toBe('value');
    service.removeItem('temp');
    expect(service.getItem<string>('temp')).toBeNull();
  });
});
