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
        openApiUrl: 'https://api.example.com/v1/swagger.json',
        title: 'Example Store API'
      });

      expect(entries.length).toBe(1);
      expect(entries[0].openApiUrl).toBe('https://api.example.com/v1/swagger.json');
      expect(entries[0].title).toBe('Example Store API');
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

  describe('API UI Configuration Persistence & Isolation', () => {
    const api1Url = 'https://api.example.com/v1/openapi.json';
    const api1Base = 'https://api.example.com/v1';
    const api2Url = 'https://api.other-service.com/spec.json';

    it('should generate consistent and stable IDs and keys for identical API endpoints', () => {
      const id1 = service.generateApiId(api1Url, api1Base);
      const id2 = service.generateApiId('  ' + api1Url + '  ', '  ' + api1Base + '  ');
      const key1 = service.getApiStorageKey(api1Url, api1Base);
      const key2 = service.getApiStorageKey('  ' + api1Url + '  ', '  ' + api1Base + '  ');

      expect(id1).toBe(id2);
      expect(key1).toBe(key2);
      expect(key1).toContain('ui_config_');
    });

    it('should generate different IDs for distinct APIs or base URLs', () => {
      const id1 = service.generateApiId(api1Url, api1Base);
      const id2 = service.generateApiId(api2Url);
      const id3 = service.generateApiId(api1Url, 'https://staging.example.com/v1');

      expect(id1).not.toBe(id2);
      expect(id1).not.toBe(id3);
    });

    it('should save and retrieve UI configuration for a specific API', () => {
      const uiConfig = {
        title: 'Custom Dashboard',
        pages: {
          dashboard: {
            title: 'Main Dashboard',
            displayMode: 'dashboard',
            metrics: [{ label: 'Total Sales', type: 'count_all' }]
          }
        },
        resources: {
          users: { label: 'Accounts', icon: 'people' }
        }
      };

      const saved = service.saveApiUiConfiguration(api1Url, api1Base, uiConfig);
      expect(saved).toBe(true);

      const retrieved = service.getApiUiConfiguration(api1Url, api1Base);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Custom Dashboard');
      expect(retrieved?.pages?.['dashboard']?.title).toBe('Main Dashboard');
      expect(retrieved?.resources?.['users']?.label).toBe('Accounts');
    });

    it('should ensure complete isolation between different APIs', () => {
      const config1 = { title: 'API One Config', resources: { users: { label: 'App Users' } } };
      const config2 = { title: 'API Two Config', resources: { products: { label: 'Catalog' } } };

      service.saveApiUiConfiguration(api1Url, api1Base, config1);
      service.saveApiUiConfiguration(api2Url, undefined, config2);

      const retrieved1 = service.getApiUiConfiguration(api1Url, api1Base);
      const retrieved2 = service.getApiUiConfiguration(api2Url, undefined);

      expect(retrieved1?.title).toBe('API One Config');
      expect(retrieved1?.resources?.['users']?.label).toBe('App Users');
      expect(retrieved1?.resources?.['products']).toBeUndefined();

      expect(retrieved2?.title).toBe('API Two Config');
      expect(retrieved2?.resources?.['products']?.label).toBe('Catalog');
      expect(retrieved2?.resources?.['users']).toBeUndefined();
    });

    it('should remove and restore defaults for a specific API without affecting others', () => {
      service.saveApiUiConfiguration(api1Url, api1Base, { title: 'API 1' });
      service.saveApiUiConfiguration(api2Url, undefined, { title: 'API 2' });

      service.restoreDefaultApiUiConfiguration(api1Url, api1Base);

      expect(service.getApiUiConfiguration(api1Url, api1Base)).toBeNull();
      expect(service.getApiUiConfiguration(api2Url, undefined)?.title).toBe('API 2');
    });

    it('should clear all stored API configurations with clearAllApiUiConfigurations', () => {
      service.saveApiUiConfiguration(api1Url, api1Base, { title: 'API 1' });
      service.saveApiUiConfiguration(api2Url, undefined, { title: 'API 2' });
      service.updatePreferences({ theme: 'dark' });
      service.addRecentApi({ openApiUrl: api1Url });

      service.clearAllApiUiConfigurations();

      expect(service.getApiUiConfiguration(api1Url, api1Base)).toBeNull();
      expect(service.getApiUiConfiguration(api2Url, undefined)).toBeNull();
      // Preferences and recent APIs must be preserved
      expect(service.getPreferences().theme).toBe('dark');
      expect(service.getRecentApis().length).toBe(1);
    });
  });

  describe('Non-Sensitive Storage & Secret Sanitization', () => {
    const apiUrl = 'https://api.secure-vault.com/openapi.json';

    it('should strictly sanitize and strip sensitive credentials, tokens, api keys, secret headers, and payloads', () => {
      const taintedConfig: any = {
        title: 'Safe UI Title',
        bearerToken: 'secret-bearer-token-12345',
        apiKey: 'sk-live-abcdef123456789',
        apiKeys: { scheme1: 'secret-key-val' },
        password: 'super-secret-password',
        auth: { authorizationHeader: 'Bearer 12345' },
        executedPayload: { sensitiveCustomerData: '123-45-6789' },
        requestBody: { creditCard: '4111-2222-3333-4444' },
        resources: {
          users: {
            label: 'Users Page',
            secretField: 'must-be-removed',
            fields: {
              email: { label: 'E-mail' },
              passwordHash: { label: 'Password', secretToken: 'forbidden-token' }
            }
          }
        },
        pages: {
          dashboard: {
            title: 'Dashboard Page',
            displayMode: 'dashboard',
            rowActions: { viewDetails: true, edit: true, delete: false },
            customActionOperations: ['op1'],
            primaryCreateActionId: 'create_user',
            primaryCreateLabel: 'Novo Usuário',
            executedResponsePayload: { rawData: [1, 2, 3] }
          }
        }
      };

      service.saveApiUiConfiguration(apiUrl, undefined, taintedConfig);

      // Verify raw localStorage entry
      const storageKey = service.getApiStorageKey(apiUrl);
      const rawStoredString = localStorage.getItem('apicanvas_' + storageKey);
      expect(rawStoredString).not.toBeNull();

      expect(rawStoredString).not.toContain('secret-bearer-token-12345');
      expect(rawStoredString).not.toContain('sk-live-abcdef123456789');
      expect(rawStoredString).not.toContain('super-secret-password');
      expect(rawStoredString).not.toContain('4111-2222-3333-4444');
      expect(rawStoredString).not.toContain('must-be-removed');
      expect(rawStoredString).not.toContain('forbidden-token');

      // Verify retrieved parsed config preserves legitimate UI properties
      const retrieved = service.getApiUiConfiguration(apiUrl);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Safe UI Title');
      expect(retrieved?.resources?.['users']?.label).toBe('Users Page');
      expect(retrieved?.pages?.['dashboard']?.displayMode).toBe('dashboard');
      expect((retrieved?.pages?.['dashboard'] as any)?.rowActions?.viewDetails).toBe(true);
    });
  });

  describe('Version Migration & Corrupted Data Handling', () => {
    const apiUrl = 'https://api.example.com/spec.json';

    it('should migrate legacy configurations with older versions to current version', () => {
      const legacyRaw = {
        id: service.generateApiId(apiUrl),
        openApiUrl: apiUrl,
        version: 0,
        updatedAt: Date.now(),
        uiConfiguration: {
          version: 0,
          title: 'Legacy Title',
          resources: {
            items: { label: 'Legacy Items' }
          }
        }
      };

      const storageKey = service.getApiStorageKey(apiUrl);
      localStorage.setItem('apicanvas_' + storageKey, JSON.stringify(legacyRaw));

      const retrieved = service.getApiUiConfiguration(apiUrl);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.version).toBe(1);
      expect(retrieved?.title).toBe('Legacy Title');
      expect(retrieved?.resources?.['items']?.label).toBe('Legacy Items');
    });

    it('should migrate unversioned direct configs to current version', () => {
      const unversionedDirect = {
        title: 'Unversioned Title',
        resources: {
          orders: { label: 'Orders List' }
        }
      };

      const storageKey = service.getApiStorageKey(apiUrl);
      localStorage.setItem('apicanvas_' + storageKey, JSON.stringify(unversionedDirect));

      const retrieved = service.getApiUiConfiguration(apiUrl);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.version).toBe(1);
      expect(retrieved?.title).toBe('Unversioned Title');
      expect(retrieved?.resources?.['orders']?.label).toBe('Orders List');
    });

    it('should return null gracefully for corrupted or non-JSON entries in localStorage', () => {
      const storageKey = service.getApiStorageKey(apiUrl);

      localStorage.setItem('apicanvas_' + storageKey, 'invalid-json{{[}');
      expect(service.getApiUiConfiguration(apiUrl)).toBeNull();

      localStorage.setItem('apicanvas_' + storageKey, JSON.stringify([1, 2, 3]));
      expect(service.getApiUiConfiguration(apiUrl)).toBeNull();

      localStorage.setItem('apicanvas_' + storageKey, JSON.stringify('string-value'));
      expect(service.getApiUiConfiguration(apiUrl)).toBeNull();

      localStorage.setItem('apicanvas_' + storageKey, JSON.stringify(null));
      expect(service.getApiUiConfiguration(apiUrl)).toBeNull();
    });
  });
});

