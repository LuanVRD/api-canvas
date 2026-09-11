import { Injectable, inject } from '@angular/core';
import { ApiSchema, SchemaPrimitiveType } from '../../core/models/api-schema.model';
import {
  UiFieldConfiguration,
  UiResourceConfiguration
} from '../../core/models/ui-configuration.model';
import { UiConfigurationService } from '../../core/services/ui-configuration.service';

export interface TableColumnDescriptor {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array';
  format?: string;
  description?: string;
  required?: boolean;
  sortable?: boolean;
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

@Injectable({
  providedIn: 'root'
})
export class TableSchemaService {
  private readonly uiConfigService = inject(UiConfigurationService);

  /**
   * Infers column descriptors for rendering a dynamic table from data, optional OpenAPI response schema,
   * and optional UI configuration overrides (ordered list columns, custom labels, hidden fields).
   * Prioritizes the OpenAPI response schema when available, falling back to inspecting the first data record.
   *
   * @param data The collection of items returned by the GET request.
   * @param responseSchema Optional OpenAPI schema representing the response structure.
   * @param resourceConfig Optional resource configuration containing list.columns or field definitions.
   * @param globalFields Optional global field configurations.
   */
  inferColumns(
    data: unknown[],
    responseSchema?: ApiSchema | null,
    resourceConfig?: UiResourceConfiguration | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): TableColumnDescriptor[] {
    let inferred: TableColumnDescriptor[] = [];

    // 1. PRIORITIZE OPENAPI RESPONSE SCHEMA
    if (responseSchema) {
      inferred = this.inferFromOpenApiSchema(responseSchema);
    }

    // 2. FALLBACK: INSPECT DATA
    if (inferred.length === 0) {
      inferred = this.inferFromData(data);
    }

    // 3. APPLY UI CONFIGURATION OVERRIDES (columns, labels, hidden)
    if (resourceConfig || globalFields) {
      return this.uiConfigService.applyTableColumnOverrides(
        inferred,
        resourceConfig,
        globalFields
      );
    }

    return inferred;
  }

  /**
   * Extracts column descriptors from an OpenAPI ApiSchema definition.
   */
  private inferFromOpenApiSchema(schema: ApiSchema): TableColumnDescriptor[] {
    // Case A: Array schema where items defines an object
    if (schema.type === 'array' && schema.items) {
      const itemSchema = schema.items;
      if (itemSchema.properties && Object.keys(itemSchema.properties).length > 0) {
        return this.extractColumnsFromProperties(itemSchema.properties, itemSchema.requiredProperties);
      }
      // Array of primitives defined in schema (e.g. string[], number[])
      if (itemSchema.type && itemSchema.type !== 'object' && itemSchema.type !== 'unknown') {
        return [
          {
            key: '_value',
            label: 'Value',
            type: this.mapSchemaType(itemSchema.type, itemSchema.format),
            format: itemSchema.format,
            description: itemSchema.description
          }
        ];
      }
    }

    // Case B: Direct object schema with properties
    if (schema.type === 'object' && schema.properties && Object.keys(schema.properties).length > 0) {
      return this.extractColumnsFromProperties(schema.properties, schema.requiredProperties);
    }

    // Case C: Schema has properties directly defined without explicit type = 'object'
    if (schema.properties && Object.keys(schema.properties).length > 0) {
      return this.extractColumnsFromProperties(schema.properties, schema.requiredProperties);
    }

    return [];
  }

  /**
   * Converts a dictionary of schema properties into ordered TableColumnDescriptor items.
   */
  private extractColumnsFromProperties(
    properties: Record<string, ApiSchema>,
    requiredProperties?: string[]
  ): TableColumnDescriptor[] {
    return Object.entries(properties).map(([key, propSchema]) => {
      const isRequired = propSchema.required || (requiredProperties ? requiredProperties.includes(key) : false);
      return {
        key,
        label: propSchema.title ? propSchema.title : this.formatLabel(key),
        type: this.mapSchemaType(propSchema.type, propSchema.format),
        format: propSchema.format,
        description: propSchema.description,
        required: isRequired
      };
    });
  }

  /**
   * Maps OpenAPI schema primitive type and format to a TableColumnDescriptor type.
   */
  private mapSchemaType(
    type: SchemaPrimitiveType,
    format?: string
  ): TableColumnDescriptor['type'] {
    if (format === 'date' || format === 'date-time') {
      return 'date';
    }
    switch (type) {
      case 'boolean':
        return 'boolean';
      case 'integer':
      case 'number':
        return 'number';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      case 'string':
      default:
        return 'string';
    }
  }

  /**
   * Infers column descriptors from data records, using the first item as the primary key source.
   */
  private inferFromData(data: unknown[]): TableColumnDescriptor[] {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    // Check if the array contains primitive values (e.g. ['admin', 'manager'] or [1, 2, 3])
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

    const orderedKeys: string[] = [];
    const keySet = new Set<string>();
    const keyTypeMap = new Map<string, TableColumnDescriptor['type']>();

    const sampleLimit = Math.min(data.length, 50);

    // 1. First record properties (primary order)
    const firstItem = data[0];
    if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
      for (const [key, val] of Object.entries(firstItem as Record<string, unknown>)) {
        if (!keySet.has(key)) {
          keySet.add(key);
          orderedKeys.push(key);
          if (val !== null && val !== undefined) {
            keyTypeMap.set(key, this.detectType(val));
          }
        }
      }
    }

    // 2. Discover disjoint / optional keys from remaining items in sample
    for (let i = 1; i < sampleLimit; i++) {
      const item = data[i];
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        for (const [key, val] of Object.entries(record)) {
          if (!keySet.has(key)) {
            keySet.add(key);
            orderedKeys.push(key);
          }
          if (!keyTypeMap.has(key) && val !== null && val !== undefined) {
            keyTypeMap.set(key, this.detectType(val));
          }
        }
      }
    }

    // Fallback pass for keys that were null/undefined across all scanned records
    for (const key of orderedKeys) {
      if (!keyTypeMap.has(key)) {
        keyTypeMap.set(key, 'string');
      }
    }

    return orderedKeys.map((key) => ({
      key,
      label: this.formatLabel(key),
      type: keyTypeMap.get(key) || 'string'
    }));
  }

  /**
   * Detects the column type from an unknown runtime value.
   */
  detectType(val: unknown): TableColumnDescriptor['type'] {
    if (typeof val === 'number') return 'number';
    if (typeof val === 'boolean') return 'boolean';
    if (Array.isArray(val)) return 'array';
    if (val instanceof Date) return 'date';
    if (typeof val === 'string' && ISO_DATE_REGEX.test(val.trim())) {
      const parsed = Date.parse(val.trim());
      if (!isNaN(parsed)) {
        return 'date';
      }
    }
    if (typeof val === 'object' && val !== null) return 'object';
    return 'string';
  }

  /**
   * Formats a raw property name into a readable human-friendly label.
   */
  formatLabel(key: string): string {
    if (!key) return '';

    // Handle acronyms specially
    const acronyms = new Set(['id', 'sku', 'url', 'uri', 'ip', 'api', 'uuid', 'guid', 'http', 'ssl', 'tls']);
    if (acronyms.has(key.toLowerCase())) {
      return key.toUpperCase();
    }

    return key
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((word) => {
        const lower = word.toLowerCase();
        if (acronyms.has(lower)) {
          return lower.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .trim();
  }
}
