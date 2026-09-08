import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private readonly PREFIX = 'apicanvas_';

  getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      return item ? JSON.parse(item) as T : null;
    } catch {
      return null;
    }
  }

  setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.PREFIX + key, JSON.stringify(value));
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(this.PREFIX + key);
    } catch {
      // Ignore
    }
  }
}
