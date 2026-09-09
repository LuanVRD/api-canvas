import { TestBed } from '@angular/core/testing';
import { MAX_RECENT_APIS, StorageService } from './storage.service';

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

  describe('Basic Key-Value Storage', () => {
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

    it('should gracefully handle malformed JSON on getItem', () => {
      localStorage.setItem('apicanvas_corrupted', 'invalid{json:');
      const result = service.getItem('corrupted');
      expect(result).toBeNull();
    });
  });

  describe('Recent APIs Management', () => {
    it('should return an empty array when no recent APIs exist', () => {
      expect(service.getRecentApis()).toEqual([]);
    });

    it('should add a recent API entry and assign an ID and timestamp', () => {
      const entries = service.addRecentApi({
        openApiUrl: 'https://petstore.swagger.io/v2/swagger.json',
        title: 'Swagger Petstore'
      });

      expect(entries.length).toBe(1);
      expect(entries[0].openApiUrl).toBe('https://petstore.swagger.io/v2/swagger.json');
      expect(entries[0].title).toBe('Swagger Petstore');
      expect(entries[0].baseUrl).toBeUndefined();
      expect(entries[0].id).toBeTruthy();
      expect(typeof entries[0].lastConnectedAt).toBe('number');
    });

    it('should persist optional baseUrl when provided', () => {
      const entries = service.addRecentApi({
        openApiUrl: 'https://api.example.com/openapi.json',
        baseUrl: 'https://staging.example.com/api',
        title: 'Example API'
      });

      expect(entries.length).toBe(1);
      expect(entries[0].baseUrl).toBe('https://staging.example.com/api');
    });

    it('should move existing API to the top when added again and update timestamp', () => {
      service.addRecentApi({ openApiUrl: 'https://api1.com/spec.json', title: 'API 1' });
      service.addRecentApi({ openApiUrl: 'https://api2.com/spec.json', title: 'API 2' });

      let list = service.getRecentApis();
      expect(list[0].openApiUrl).toBe('https://api2.com/spec.json');
      expect(list[1].openApiUrl).toBe('https://api1.com/spec.json');

      // Re-add API 1 with an updated title
      service.addRecentApi({ openApiUrl: 'https://api1.com/spec.json', title: 'API 1 Updated' });
      list = service.getRecentApis();

      expect(list.length).toBe(2);
      expect(list[0].openApiUrl).toBe('https://api1.com/spec.json');
      expect(list[0].title).toBe('API 1 Updated');
      expect(list[1].openApiUrl).toBe('https://api2.com/spec.json');
    });

    it(`should limit the number of stored entries to MAX_RECENT_APIS (${MAX_RECENT_APIS})`, () => {
      for (let i = 1; i <= 15; i++) {
        service.addRecentApi({ openApiUrl: `https://api${i}.com/spec.json`, title: `API ${i}` });
      }

      const list = service.getRecentApis();
      expect(list.length).toBe(MAX_RECENT_APIS);
      expect(list[0].openApiUrl).toBe('https://api15.com/spec.json');
      expect(list[list.length - 1].openApiUrl).toBe(`https://api${15 - MAX_RECENT_APIS + 1}.com/spec.json`);
    });

    it('should ignore empty or whitespace-only openApiUrl', () => {
      const initial = service.getRecentApis();
      const result = service.addRecentApi({ openApiUrl: '   ' });
      expect(result).toEqual(initial);
      expect(service.getRecentApis()).toEqual([]);
    });

    it('should remove a recent API entry by ID or URL', () => {
      service.addRecentApi({ openApiUrl: 'https://api1.com/spec.json', title: 'API 1' });
      service.addRecentApi({ openApiUrl: 'https://api2.com/spec.json', title: 'API 2' });

      let list = service.getRecentApis();
      expect(list.length).toBe(2);

      // Remove by URL
      list = service.removeRecentApi('https://api1.com/spec.json');
      expect(list.length).toBe(1);
      expect(list[0].openApiUrl).toBe('https://api2.com/spec.json');

      // Remove by ID
      const remainingId = list[0].id;
      list = service.removeRecentApi(remainingId);
      expect(list.length).toBe(0);
    });

    it('should clear all recent APIs', () => {
      service.addRecentApi({ openApiUrl: 'https://api1.com/spec.json' });
      service.addRecentApi({ openApiUrl: 'https://api2.com/spec.json' });
      expect(service.getRecentApis().length).toBe(2);

      service.clearRecentApis();
      expect(service.getRecentApis().length).toBe(0);
    });
  });

  describe('Resilience to Corrupted or Legacy Data', () => {
    it('should return empty array if recent_apis in localStorage is not an array', () => {
      localStorage.setItem('apicanvas_recent_apis', JSON.stringify({ notAn: 'array' }));
      expect(service.getRecentApis()).toEqual([]);

      localStorage.setItem('apicanvas_recent_apis', JSON.stringify('string-value'));
      expect(service.getRecentApis()).toEqual([]);

      localStorage.setItem('apicanvas_recent_apis', 'invalid-json{{{');
      expect(service.getRecentApis()).toEqual([]);
    });

    it('should filter out corrupted or invalid items inside the array', () => {
      const corruptedData = [
        null,
        undefined,
        123,
        { invalidKey: 'no url' },
        { openApiUrl: '' },
        { openApiUrl: 'https://valid.com/spec.json', title: 'Valid API' }
      ];

      localStorage.setItem('apicanvas_recent_apis', JSON.stringify(corruptedData));
      const result = service.getRecentApis();

      expect(result.length).toBe(1);
      expect(result[0].openApiUrl).toBe('https://valid.com/spec.json');
      expect(result[0].title).toBe('Valid API');
    });
  });

  describe('User Preferences Storage', () => {
    it('should return empty object when no preferences exist', () => {
      expect(service.getPreferences()).toEqual({});
    });

    it('should update and merge user preferences', () => {
      service.updatePreferences({ theme: 'dark', density: 'compact' });
      expect(service.getPreferences()).toEqual({ theme: 'dark', density: 'compact' });

      service.updatePreferences({ sidebarCollapsed: true });
      expect(service.getPreferences()).toEqual({
        theme: 'dark',
        density: 'compact',
        sidebarCollapsed: true
      });
    });

    it('should handle corrupted preferences in localStorage gracefully', () => {
      localStorage.setItem('apicanvas_preferences', 'corrupted{');
      expect(service.getPreferences()).toEqual({});

      localStorage.setItem('apicanvas_preferences', JSON.stringify([1, 2, 3]));
      expect(service.getPreferences()).toEqual({});
    });
  });
});
