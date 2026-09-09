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
