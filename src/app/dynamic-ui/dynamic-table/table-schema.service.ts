import { Injectable } from '@angular/core';

export interface TableColumnDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
}

@Injectable({
  providedIn: 'root'
})
export class TableSchemaService {
  /**
   * Infers column descriptors from an array of items.
   * Scans up to 50 sample items to discover all keys and identify appropriate types.
   */
  inferColumns(data: unknown[]): TableColumnDescriptor[] {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Check if the array contains primitive values
    const firstNonNil = data.find((item) => item !== null && item !== undefined);
    if (firstNonNil !== undefined && (typeof firstNonNil !== 'object' || firstNonNil === null)) {
      return [
        {
          key: '_value',
          label: 'Value',
          type: this.detectType(firstNonNil)
        }
      ];
    }

    const keySet = new Set<string>();
    const keyTypeMap = new Map<string, TableColumnDescriptor['type']>();

    const sampleLimit = Math.min(data.length, 50);
    for (let i = 0; i < sampleLimit; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        for (const [key, val] of Object.entries(record)) {
          keySet.add(key);
          if (!keyTypeMap.has(key) && val !== null && val !== undefined) {
            keyTypeMap.set(key, this.detectType(val));
          }
        }
      }
    }

    return Array.from(keySet).map((key) => ({
      key,
      label: this.formatLabel(key),
      type: keyTypeMap.get(key) || 'string'
    }));
  }

  private detectType(val: unknown): TableColumnDescriptor['type'] {
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';
    if (Array.isArray(val)) return 'array';
    if (val instanceof Date) return 'date';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/.test(val)) {
      return 'date';
    }
    if (typeof val === 'object' && val !== null) return 'object';
    return 'string';
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase())
      .trim();
  }
}

