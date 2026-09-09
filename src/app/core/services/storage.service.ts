import { Injectable } from '@angular/core';
import { RecentApiEntry, UserPreferences } from '../models/storage.model';

export const STORAGE_KEYS = {
  RECENT_APIS: 'recent_apis',
  PREFERENCES: 'preferences'
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
          const id = typeof cast.id === 'string' && cast.id.length > 0 ? cast.id : this.generateId(openApiUrl, baseUrl);

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
    const id = this.generateId(rawUrl, baseUrl);

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

  private generateId(url: string, baseUrl?: string): string {
    const combined = `${url}::${baseUrl || ''}`;
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i);
      hash |= 0;
    }
    return `api_${Math.abs(hash).toString(36)}`;
  }
}
