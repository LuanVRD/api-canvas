import { Injectable } from '@angular/core';
import {
  UiConfiguration,
  UiFieldConfiguration,
  UiResourceConfiguration
} from '../models/ui-configuration.model';
import { ApiResource } from '../models/api-resource.model';
import { FormFieldDescriptor } from '../../dynamic-ui/dynamic-form/form-field.model';
import { TableColumnDescriptor } from '../../dynamic-ui/dynamic-table/table-schema.service';

@Injectable({
  providedIn: 'root'
})
export class UiConfigurationService {
  /**
   * Finds the UiResourceConfiguration matching a resource by ID or name (case-insensitive fallback).
   */
  getResourceConfig(
    config?: UiConfiguration | null,
    resourceIdOrName?: string
  ): UiResourceConfiguration | null {
    if (!config || !config.resources || !resourceIdOrName) {
      return null;
    }

    const resources = config.resources;

    // 1. Direct key match
    if (resources[resourceIdOrName]) {
      return resources[resourceIdOrName];
    }

    // 2. Case-insensitive key match
    const lowerTarget = resourceIdOrName.toLowerCase();
    for (const [key, resConfig] of Object.entries(resources)) {
      if (key.toLowerCase() === lowerTarget) {
        return resConfig;
      }
    }

    // 3. Match normalized plural/singular (e.g. "product" vs "products")
    const cleanTarget = lowerTarget.replace(/[-_]/g, '');
    for (const [key, resConfig] of Object.entries(resources)) {
      const cleanKey = key.toLowerCase().replace(/[-_]/g, '');
      if (
        cleanKey === cleanTarget ||
        cleanKey === cleanTarget + 's' ||
        cleanTarget === cleanKey + 's' ||
        cleanKey === cleanTarget + 'es' ||
        cleanTarget === cleanKey + 'es'
      ) {
        return resConfig;
      }
    }

    return null;
  }

  /**
   * Merges an array of ApiResource items with UiConfiguration, applying label overrides
   * and filtering out any resources marked with hidden: true.
   */
  mergeResources(
    resources: ApiResource[],
    config?: UiConfiguration | null
  ): ApiResource[] {
    if (!resources || resources.length === 0) {
      return [];
    }
    if (!config || !config.resources) {
      return resources;
    }

    return resources
      .filter((resource) => {
        const resConfig =
          this.getResourceConfig(config, resource.id) ||
          this.getResourceConfig(config, resource.name);
        return resConfig?.hidden !== true;
      })
      .map((resource) => {
        const resConfig =
          this.getResourceConfig(config, resource.id) ||
          this.getResourceConfig(config, resource.name);

        if (!resConfig) {
          return resource;
        }

        return {
          ...resource,
          label: resConfig.label?.trim() ? resConfig.label.trim() : resource.label
        };
      });
  }

  /**
   * Resolves field configuration by combining resource-level field overrides with global field overrides.
   * Resource-level config takes precedence over global field config.
   */
  getFieldConfig(
    key: string,
    resourceConfig?: UiResourceConfiguration | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): UiFieldConfiguration | null {
    const resField = resourceConfig?.fields?.[key];
    const globalField = globalFields?.[key];

    if (!resField && !globalField) {
      return null;
    }

    return {
      ...(globalField || {}),
      ...(resField || {})
    };
  }

  /**
   * Applies field-level visual overrides (labels, controls like textarea, descriptions, and hidden fields)
   * to an array of FormFieldDescriptor items.
   */
  applyFieldOverrides(
    fields: FormFieldDescriptor[],
    resourceConfig?: UiResourceConfiguration | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): FormFieldDescriptor[] {
    if (!fields || fields.length === 0) {
      return [];
    }

    const result: FormFieldDescriptor[] = [];

    for (const field of fields) {
      const fieldConfig = this.getFieldConfig(field.key, resourceConfig, globalFields);

      // Omit hidden fields
      if (fieldConfig?.hidden === true) {
        continue;
      }

      let updatedField: FormFieldDescriptor = { ...field };

      // Override label
      if (fieldConfig?.label && fieldConfig.label.trim() !== '') {
        updatedField.label = fieldConfig.label.trim();
      }

      // Override description
      if (fieldConfig?.description !== undefined) {
        updatedField.description = fieldConfig.description;
      }

      // Override control (e.g. 'textarea')
      if (fieldConfig?.control) {
        const ctrl = fieldConfig.control;
        if (ctrl === 'textarea') {
          updatedField.type = 'textarea';
          updatedField.controlType = 'textarea';
        } else if (
          ctrl === 'text' ||
          ctrl === 'number' ||
          ctrl === 'boolean' ||
          ctrl === 'select' ||
          ctrl === 'date' ||
          ctrl === 'datetime' ||
          ctrl === 'json'
        ) {
          updatedField.type = ctrl;
          updatedField.controlType = ctrl;
        }
      }

      // Handle nested object children
      if (updatedField.type === 'object' && updatedField.children) {
        updatedField.children = this.applyFieldOverrides(
          updatedField.children,
          resourceConfig,
          globalFields
        );
      }

      // Handle nested array itemDescriptor
      if (updatedField.type === 'array' && updatedField.itemDescriptor) {
        const itemChildren = updatedField.itemDescriptor.children;
        if (itemChildren) {
          updatedField.itemDescriptor = {
            ...updatedField.itemDescriptor,
            children: this.applyFieldOverrides(itemChildren, resourceConfig, globalFields)
          };
        }
      }

      result.push(updatedField);
    }

    return result;
  }

  /**
   * Applies table column overrides to an array of TableColumnDescriptor items:
   * 1. If list.columns is specified, filters and orders columns to match list.columns.
   * 2. Omit columns marked with hidden: true.
   * 3. Overrides column label if configured in field configs.
   */
  applyTableColumnOverrides(
    columns: TableColumnDescriptor[],
    resourceConfig?: UiResourceConfiguration | null,
    globalFields?: Record<string, UiFieldConfiguration> | null
  ): TableColumnDescriptor[] {
    if (!columns) {
      return [];
    }

    const listColumns = resourceConfig?.list?.columns;
    const colMap = new Map(columns.map((c) => [c.key, c]));

    let targetColumns: TableColumnDescriptor[];

    if (Array.isArray(listColumns) && listColumns.length > 0) {
      // Use configured ordered columns
      targetColumns = [];
      for (const colKey of listColumns) {
        const existing = colMap.get(colKey);
        if (existing) {
          targetColumns.push({ ...existing });
        } else {
          // Column was explicitly requested in list.columns but not in inferred set
          targetColumns.push({
            key: colKey,
            label: this.formatLabel(colKey),
            type: 'string'
          });
        }
      }
    } else {
      // Default inferred columns (filter out hidden)
      targetColumns = columns.filter((col) => {
        const fieldConfig = this.getFieldConfig(col.key, resourceConfig, globalFields);
        return fieldConfig?.hidden !== true;
      }).map((col) => ({ ...col }));
    }

    // Apply label overrides to the resolved columns
    return targetColumns.map((col) => {
      const fieldConfig = this.getFieldConfig(col.key, resourceConfig, globalFields);
      if (fieldConfig?.label && fieldConfig.label.trim() !== '') {
        return {
          ...col,
          label: fieldConfig.label.trim()
        };
      }
      return col;
    });
  }

  /**
   * Merges two UiConfiguration objects (e.g. workspace defaults + custom overlay).
   */
  mergeConfigurations(
    base?: UiConfiguration | null,
    override?: UiConfiguration | null
  ): UiConfiguration | null {
    if (!base && !override) return null;
    if (!base) return override || null;
    if (!override) return base;

    const mergedResources: Record<string, UiResourceConfiguration> = {
      ...(base.resources || {})
    };

    if (override.resources) {
      for (const [resKey, resOverride] of Object.entries(override.resources)) {
        const existing = mergedResources[resKey] || {};
        mergedResources[resKey] = {
          ...existing,
          ...resOverride,
          list: {
            ...(existing.list || {}),
            ...(resOverride.list || {})
          },
          fields: {
            ...(existing.fields || {}),
            ...(resOverride.fields || {})
          }
        };
      }
    }

    return {
      title: override.title || base.title,
      fields: {
        ...(base.fields || {}),
        ...(override.fields || {})
      },
      resources: mergedResources
    };
  }

  private formatLabel(key: string): string {
    if (!key) return '';
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
      .map((w) => (acronyms.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ')
      .trim();
  }
}
