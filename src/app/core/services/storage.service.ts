import { Injectable } from '@angular/core';
import { ApiStoredConfiguration, RecentApiEntry, UserPreferences } from '../models/storage.model';
import { CURRENT_UI_CONFIGURATION_VERSION, UiConfiguration } from '../models/ui-configuration.model';

export const STORAGE_KEYS = {
  RECENT_APIS: 'recent_apis',
  PREFERENCES: 'preferences',
  UI_CONFIG_PREFIX: 'ui_config_'
} as const;

export const MAX_RECENT_APIS = 8;

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'apicanvas_';

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch {
      // Ignore storage errors in restricted/private contexts or quota limits
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch {
      // Ignore
    }
  }

  /**
   * Generates a stable and deterministic identifier for an API based on its OpenAPI URL and Base URL.
   */
  generateApiId(openApiUrl: string, baseUrl?: string): string {
    const cleanUrl = (openApiUrl || '').trim();
    const cleanBase = (baseUrl || '').trim();
    const combined = `${cleanUrl}::${cleanBase}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    return `api_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Derives the stable localStorage key for an API's UI configuration.
   */
  getApiStorageKey(openApiUrl: string, baseUrl?: string): string {
    const id = this.generateApiId(openApiUrl, baseUrl);
    return `${STORAGE_KEYS.UI_CONFIG_PREFIX}${id}`;
  }

  /**
   * Deeply sanitizes a UI configuration object to ensure no sensitive credentials,
   * tokens, API keys, secret headers, or executed payloads are ever stored.
   */
  sanitizeUiConfigurationForStorage(config: UiConfiguration): UiConfiguration {
    const sensitiveKeyPatterns = [
      /token/i,
      /bearer/i,
      /apikey/i,
      /api_key/i,
      /auth/i,
      /secret/i,
      /password/i,
      /credential/i,
      /header/i,
      /payload/i,
      /executed/i,
      /body/i
    ];

    const isSensitiveKey = (key: string): boolean => {
      // Whitelist legitimate UI configuration property names that might contain substring matches
      const whitelistedKeys = new Set([
        'rowActions',
        'actions',
        'displayMode',
        'customActionOperations',
        'primaryCreateActionId',
        'primaryCreateLabel'
      ]);
      if (whitelistedKeys.has(key)) {
        return false;
      }
      return sensitiveKeyPatterns.some((pattern) => pattern.test(key));
    };

    const cleanObject = (obj: any): any => {
      if (obj === null || obj === undefined || typeof obj !== 'object') {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map((item) => cleanObject(item));
      }
      const cleaned: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (isSensitiveKey(k)) {
          continue;
        }
        cleaned[k] = cleanObject(v);
      }
      return cleaned;
    };

    const cloned = JSON.parse(JSON.stringify(config));
    const sanitized = cleanObject(cloned) as UiConfiguration;

    return {
      version: sanitized.version ?? CURRENT_UI_CONFIGURATION_VERSION,
      title: typeof sanitized.title === 'string' ? sanitized.title : undefined,
      resources: sanitized.resources && typeof sanitized.resources === 'object' && !Array.isArray(sanitized.resources) ? sanitized.resources : undefined,
      fields: sanitized.fields && typeof sanitized.fields === 'object' && !Array.isArray(sanitized.fields) ? sanitized.fields : undefined,
      pages: sanitized.pages && typeof sanitized.pages === 'object' && !Array.isArray(sanitized.pages) ? sanitized.pages : undefined
    };
  }

  /**
   * Migrates and normalizes a UI configuration object across schema versions.
   */
  migrateAndNormalizeConfiguration(config: UiConfiguration): UiConfiguration {
    const version = config.version;
    let normalizedVersion: number | string = CURRENT_UI_CONFIGURATION_VERSION;

    if (typeof version === 'number') {
      if (version < CURRENT_UI_CONFIGURATION_VERSION) {
        normalizedVersion = CURRENT_UI_CONFIGURATION_VERSION;
      } else {
        normalizedVersion = version;
      }
    } else if (typeof version === 'string') {
      const parsed = parseInt(version, 10);
      if (!isNaN(parsed) && parsed < CURRENT_UI_CONFIGURATION_VERSION) {
        normalizedVersion = CURRENT_UI_CONFIGURATION_VERSION;
      } else {
        normalizedVersion = CURRENT_UI_CONFIGURATION_VERSION;
      }
    } else {
      normalizedVersion = CURRENT_UI_CONFIGURATION_VERSION;
    }

    return {
      version: normalizedVersion,
      title: typeof config.title === 'string' ? config.title : undefined,
      resources: config.resources && typeof config.resources === 'object' && !Array.isArray(config.resources) ? config.resources : undefined,
      fields: config.fields && typeof config.fields === 'object' && !Array.isArray(config.fields) ? config.fields : undefined,
      pages: config.pages && typeof config.pages === 'object' && !Array.isArray(config.pages) ? config.pages : undefined
    };
  }

  /**
   * Retrieves the saved UI configuration for an API.
   * Tolerant to corrupted, invalid, or legacy data in localStorage.
   */
  getApiUiConfiguration(openApiUrl: string, baseUrl?: string): UiConfiguration | null {
    if (!openApiUrl || openApiUrl.trim().length === 0) {
      return null;
    }

    try {
      const storageKey = this.getApiStorageKey(openApiUrl, baseUrl);
      const raw = this.getItem<unknown>(storageKey);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return null;
      }

      const rawRecord = raw as Record<string, unknown>;
      let uiConfig: UiConfiguration;

      if ('uiConfiguration' in rawRecord && rawRecord['uiConfiguration'] && typeof rawRecord['uiConfiguration'] === 'object' && !Array.isArray(rawRecord['uiConfiguration'])) {
        uiConfig = rawRecord['uiConfiguration'] as UiConfiguration;
      } else if ('resources' in rawRecord || 'pages' in rawRecord || 'fields' in rawRecord || 'title' in rawRecord || 'version' in rawRecord) {
        uiConfig = raw as UiConfiguration;
      } else {
        return null;
      }

      return this.migrateAndNormalizeConfiguration(uiConfig);
    } catch {
      return null;
    }
  }

  /**
   * Saves or updates the UI configuration for an API in localStorage.
   * Strictly filters out any sensitive fields and metadata.
   */
  saveApiUiConfiguration(
    openApiUrl: string,
    baseUrl: string | undefined,
    config: UiConfiguration
  ): boolean {
    if (!openApiUrl || openApiUrl.trim().length === 0 || !config || typeof config !== 'object' || Array.isArray(config)) {
      return false;
    }

    try {
      const cleanUrl = openApiUrl.trim();
      const cleanBase = baseUrl && baseUrl.trim().length > 0 ? baseUrl.trim() : undefined;
      const sanitizedConfig = this.sanitizeUiConfigurationForStorage(config);
      const id = this.generateApiId(cleanUrl, cleanBase);
      const storageKey = this.getApiStorageKey(cleanUrl, cleanBase);

      const envelope: ApiStoredConfiguration = {
        id,
        openApiUrl: cleanUrl,
        baseUrl: cleanBase,
        version: CURRENT_UI_CONFIGURATION_VERSION,
        updatedAt: Date.now(),
        uiConfiguration: sanitizedConfig
      };

      this.setItem(storageKey, envelope);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Explicitly replaces the UI configuration for an API.
   */
  replaceApiUiConfiguration(
    openApiUrl: string,
    baseUrl: string | undefined,
    config: UiConfiguration
  ): boolean {
    return this.saveApiUiConfiguration(openApiUrl, baseUrl, config);
  }

  /**
   * Removes the saved UI configuration for a specific API.
   */
  removeApiUiConfiguration(openApiUrl: string, baseUrl?: string): void {
    if (!openApiUrl) return;
    const storageKey = this.getApiStorageKey(openApiUrl, baseUrl);
    this.removeItem(storageKey);
  }

  /**
   * Restores default UI configuration by removing persisted custom overrides for the API.
   */
  restoreDefaultApiUiConfiguration(openApiUrl: string, baseUrl?: string): void {
    this.removeApiUiConfiguration(openApiUrl, baseUrl);
  }

  /**
   * Clears all saved API UI configurations from localStorage.
   */
  clearAllApiUiConfigurations(): void {
    try {
      const prefix = this.PREFIX + STORAGE_KEYS.UI_CONFIG_PREFIX;
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key.substring(this.PREFIX.length));
        }
      }
      for (const k of keysToRemove) {
        this.removeItem(k);
      }
    } catch {
      // Ignore
    }
  }

  /**
   * Retrieves the list of recent OpenAPI specification connections.
   * Resilient to corrupted or malformed data in localStorage.
   */
  getRecentApis(): RecentApiEntry[] {
    try {
      const raw = this.getItem<unknown>(STORAGE_KEYS.RECENT_APIS);
      if (!Array.isArray(raw)) {
        return [];
      }

      const validEntries: RecentApiEntry[] = [];

      for (const item of raw) {
        if (
          item &&
          typeof item === 'object' &&
          'openApiUrl' in item &&
          typeof (item as { openApiUrl: unknown }).openApiUrl === 'string' &&
          (item as { openApiUrl: string }).openApiUrl.trim().length > 0
        ) {
          const cast = item as Partial<RecentApiEntry>;
          const openApiUrl = cast.openApiUrl!.trim();
          const baseUrl =
            typeof cast.baseUrl === 'string' && cast.baseUrl.trim().length > 0
              ? cast.baseUrl.trim()
              : undefined;
          const title =
            typeof cast.title === 'string' && cast.title.trim().length > 0
              ? cast.title.trim()
              : undefined;
          const lastConnectedAt =
            typeof cast.lastConnectedAt === 'number' && !isNaN(cast.lastConnectedAt)
              ? cast.lastConnectedAt
              : Date.now();
          const id = typeof cast.id === 'string' && cast.id.length > 0 ? cast.id : this.generateApiId(openApiUrl, baseUrl);

          validEntries.push({
            id,
            openApiUrl,
            baseUrl,
            title,
            lastConnectedAt
          });
        }
      }

      // Sort with newest connection first
      return validEntries.sort((a, b) => b.lastConnectedAt - a.lastConnectedAt);
    } catch {
      return [];
    }
  }

  /**
   * Adds or updates a recent API entry.
   * Strictly ignores and never accepts or stores sensitive credentials (tokens, keys).
   */
  addRecentApi(entry: {
    openApiUrl: string;
    baseUrl?: string;
    title?: string;
  }): RecentApiEntry[] {
    const rawUrl = entry.openApiUrl ? entry.openApiUrl.trim() : '';
    if (!rawUrl) {
      return this.getRecentApis();
    }

    const baseUrl = entry.baseUrl && entry.baseUrl.trim().length > 0 ? entry.baseUrl.trim() : undefined;
    const title = entry.title && entry.title.trim().length > 0 ? entry.title.trim() : undefined;
    const id = this.generateApiId(rawUrl, baseUrl);

    const current = this.getRecentApis();
    // Filter out existing matching entry (by URL and baseUrl combination or ID)
    const filtered = current.filter(
      (item) => !(item.openApiUrl === rawUrl && (item.baseUrl ?? '') === (baseUrl ?? ''))
    );

    const newEntry: RecentApiEntry = {
      id,
      openApiUrl: rawUrl,
      baseUrl,
      title,
      lastConnectedAt: Date.now()
    };

    const updated = [newEntry, ...filtered].slice(0, MAX_RECENT_APIS);
    this.setItem(STORAGE_KEYS.RECENT_APIS, updated);
    return updated;
  }

  /**
   * Removes a recent API entry by ID or openApiUrl.
   */
  removeRecentApi(idOrUrl: string): RecentApiEntry[] {
    if (!idOrUrl) return this.getRecentApis();

    const current = this.getRecentApis();
    const updated = current.filter((item) => item.id !== idOrUrl && item.openApiUrl !== idOrUrl);
    this.setItem(STORAGE_KEYS.RECENT_APIS, updated);
    return updated;
  }

  /**
   * Clears the entire list of recent APIs.
   */
  clearRecentApis(): void {
    this.removeItem(STORAGE_KEYS.RECENT_APIS);
  }

  /**
   * Retrieves visual and layout preferences.
   */
  getPreferences(): UserPreferences {
    try {
      const prefs = this.getItem<UserPreferences>(STORAGE_KEYS.PREFERENCES);
      if (prefs && typeof prefs === 'object' && !Array.isArray(prefs)) {
        return prefs;
      }
      return {};
    } catch {
      return {};
    }
  }

  /**
   * Merges and saves partial user preferences.
   */
  updatePreferences(partial: Partial<UserPreferences>): UserPreferences {
    const current = this.getPreferences();
    const updated: UserPreferences = {
      ...current,
      ...partial
    };
    this.setItem(STORAGE_KEYS.PREFERENCES, updated);
    return updated;
  }
}
