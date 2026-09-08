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
  inferColumns(data: unknown[]): TableColumnDescriptor[] {
    if (!data || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
      return [];
    }

    const sample = data[0] as Record<string, unknown>;
    return Object.keys(sample).map(key => {
      const val = sample[key];
      let type: TableColumnDescriptor['type'] = 'string';

      if (typeof val === 'number') type = 'number';
      else if (typeof val === 'boolean') type = 'boolean';
      else if (Array.isArray(val)) type = 'array';
      else if (typeof val === 'object' && val !== null) type = 'object';

      return {
        key,
        label: this.formatLabel(key),
        type
      };
    });
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  }
}
