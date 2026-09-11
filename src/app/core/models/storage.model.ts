import { UiConfiguration } from './ui-configuration.model';

export interface RecentApiEntry {
  id: string;
  openApiUrl: string;
  baseUrl?: string;
  title?: string;
  lastConnectedAt: number;
}

export interface UserPreferences {
  theme?: 'dark' | 'light' | 'system';
  sidebarCollapsed?: boolean;
  density?: 'compact' | 'comfortable';
  [key: string]: unknown;
}

export interface ApiStoredConfiguration {
  id: string;
  openApiUrl: string;
  baseUrl?: string;
  version: number | string;
  updatedAt: number;
  uiConfiguration: UiConfiguration;
}
