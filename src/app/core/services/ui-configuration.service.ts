import { inject, Injectable } from '@angular/core';
import {
  CURRENT_UI_CONFIGURATION_VERSION,
  UiConfiguration,
  UiFieldConfiguration,
  UiPageConfiguration,
  UiResourceConfiguration
} from '../models/ui-configuration.model';
import { ApiResource } from '../models/api-resource.model';
import { ApiDefinition } from '../models/api-definition.model';
import { UiValidationResult } from '../models/ui-validation.model';
import { UiConfigurationValidatorService } from './ui-configuration-validator.service';
import { FormFieldDescriptor } from '../../dynamic-ui/dynamic-form/form-field.model';
import { TableColumnDescriptor } from '../../dynamic-ui/dynamic-table/table-schema.service';

@Injectable({
  providedIn: 'root'
})
export class UiConfigurationService {
  private readonly validator = inject(UiConfigurationValidatorService);

  /**
   * Validates a UI configuration against active API definition, producing structured issues.
   */
  validateConfiguration(
    config?: UiConfiguration | null,
    apiDefinition?: ApiDefinition | null
  ): UiValidationResult {
    return this.validator.validate(config, apiDefinition);
  }

  /**
   * Generates a safe, sanitized version of the configuration where broken references are cleansed.
   */
  sanitizeConfiguration(
    config?: UiConfiguration | null,
    apiDefinition?: ApiDefinition | null
  ): UiConfiguration | null {
    return this.validator.sanitizeConfiguration(config, apiDefinition);
  }

  /**
   * Resolves a page configuration safely, applying sanitization and fallback defaults.
   */
  getSafeResolvedPageConfig(
    pageConfig?: UiPageConfiguration | null,
    resourceConfig?: UiResourceConfiguration | null,
    apiDefinition?: ApiDefinition | null
  ): UiPageConfiguration {
    const rawResolved = this.resolvePageConfiguration(pageConfig, resourceConfig);
    const sanitizedConfig = this.validator.sanitizeConfiguration(
      { pages: { active: rawResolved } },
      apiDefinition
    );
    return sanitizedConfig?.pages?.['active'] ?? rawResolved;
  }
  /**
   * Normalizes a configuration object, ensuring valid defaults,
   * schema versioning, and backwards compatibility with older config shapes.
   */
  normalizeConfiguration(
    config?: UiConfiguration | null
  ): UiConfiguration | null {
    if (!config) {
      return null;
    }

    return {
      version: config.version ?? CURRENT_UI_CONFIGURATION_VERSION,
      title: config.title,
      fields: config.fields ? { ...config.fields } : undefined,
      resources: config.resources ? { ...config.resources } : undefined,
      pages: config.pages ? { ...config.pages } : undefined
    };
  }

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
   * Finds the UiPageConfiguration by stable ID, dictionary key, or slug (case-insensitive).
   */
  getPageConfig(
    config?: UiConfiguration | null,
    pageIdOrSlug?: string
  ): UiPageConfiguration | null {
    if (!config || !pageIdOrSlug) {
      return null;
    }

    const target = pageIdOrSlug.toLowerCase().trim();

    // 1. Search in top-level pages dictionary
    if (config.pages) {
      // Direct or case-insensitive key match
      for (const [key, page] of Object.entries(config.pages)) {
        if (
          key.toLowerCase() === target ||
          page.id?.toLowerCase() === target ||
          page.slug?.toLowerCase() === target
        ) {
          return page;
        }
      }
    }

    // 2. Search in resource-embedded page configurations
    if (config.resources) {
      for (const [resKey, resConfig] of Object.entries(config.resources)) {
        if (resConfig.page) {
          if (
            resKey.toLowerCase() === target ||
            resConfig.slug?.toLowerCase() === target ||
            resConfig.page.id?.toLowerCase() === target ||
            resConfig.page.slug?.toLowerCase() === target
          ) {
            return resConfig.page;
          }
        }
      }
    }

    return null;
  }

  /**
   * Retrieves all active custom page configurations, normalizing IDs, titles, and icons,
   * filtering out hidden pages, and ordering them by order field and title.
   */
  getCustomPages(
    config?: UiConfiguration | null,
    resources?: ApiResource[]
  ): UiPageConfiguration[] {
    if (!config) {
      return [];
    }

    const pagesMap = new Map<string, UiPageConfiguration>();

    // 1. Ingest resource-embedded pages
    if (config.resources) {
      for (const [resKey, resConfig] of Object.entries(config.resources)) {
        if (resConfig.hidden === true || resConfig.page?.hidden === true) {
          continue;
        }
        if (resConfig.page) {
          const id = resConfig.page.id || resKey;
          const resourceMatch = resources?.find((r) => r.id === resKey || r.name === resKey);
          const resolvedTitle =
            resConfig.page.title ||
            resConfig.label ||
            resourceMatch?.label ||
            this.formatLabel(resKey);

          pagesMap.set(id, {
            ...resConfig.page,
            id,
            resourceId: resConfig.page.resourceId || resKey,
            title: resolvedTitle,
            icon: resConfig.page.icon || resConfig.icon || 'table_chart',
            order: resConfig.page.order ?? resConfig.order
          });
        }
      }
    }

    // 2. Ingest top-level pages (takes precedence over resource-embedded defaults)
    if (config.pages) {
      for (const [pageKey, pageConfig] of Object.entries(config.pages)) {
        if (pageConfig.hidden === true) {
          pagesMap.delete(pageConfig.id || pageKey);
          continue;
        }

        const id = pageConfig.id || pageKey;
        const resConfig = pageConfig.resourceId
          ? this.getResourceConfig(config, pageConfig.resourceId)
          : null;
        const resourceMatch = pageConfig.resourceId
          ? resources?.find((r) => r.id === pageConfig.resourceId || r.name === pageConfig.resourceId)
          : null;

        const resolvedTitle =
          pageConfig.title ||
          resConfig?.label ||
          resourceMatch?.label ||
          this.formatLabel(id);

        const existing = pagesMap.get(id);
        pagesMap.set(id, {
          ...(existing || {}),
          ...pageConfig,
          id,
          title: resolvedTitle,
          icon: pageConfig.icon || resConfig?.icon || existing?.icon || 'table_chart',
          order: pageConfig.order ?? resConfig?.order ?? existing?.order
        });
      }
    }

    // 3. Sort by order ascending, then alphabetically by title
    return Array.from(pagesMap.values()).sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.title || '').localeCompare(b.title || '');
    });
  }

  /**
   * Finds the page configuration associated with a specific resource, checking either
   * the resource's embedded `.page` or top-level `.pages` referencing `resourceId`.
   */
  getResourcePageConfig(
    config?: UiConfiguration | null,
    resourceIdOrName?: string
  ): UiPageConfiguration | null {
    if (!config || !resourceIdOrName) {
      return null;
    }

    const resConfig = this.getResourceConfig(config, resourceIdOrName);
    if (resConfig?.page) {
      return resConfig.page;
    }

    if (config.pages) {
      const target = resourceIdOrName.toLowerCase().trim();
      for (const page of Object.values(config.pages)) {
        if (page.resourceId?.toLowerCase() === target) {
          return page;
        }
      }
    }

    return null;
  }

  /**
   * Resolves a full UiPageConfiguration by combining page-specific overrides with resource-level defaults.
   */
  resolvePageConfiguration(
    pageConfig?: UiPageConfiguration | null,
    resourceConfig?: UiResourceConfiguration | null
  ): UiPageConfiguration {
    const base: UiPageConfiguration = {
      title: pageConfig?.title || resourceConfig?.label,
      icon: pageConfig?.icon || resourceConfig?.icon,
      slug: pageConfig?.slug || resourceConfig?.slug,
      order: pageConfig?.order ?? resourceConfig?.order,
      hidden: pageConfig?.hidden ?? resourceConfig?.hidden ?? false,
      displayMode: pageConfig?.displayMode || 'dashboard',
      operations: {
        ...(resourceConfig?.operations || {}),
        ...(pageConfig?.operations || {})
      },
      metrics: pageConfig?.metrics ? [...pageConfig.metrics] : [],
      filters: pageConfig?.filters ? { ...pageConfig.filters } : undefined,
      table: {
        ...(pageConfig?.table || {}),
        columns: pageConfig?.table?.columns
          ? [...pageConfig.table.columns]
          : resourceConfig?.list?.columns
            ? resourceConfig.list.columns.map((colKey) => ({
                field: colKey,
                label: this.formatLabel(colKey),
                type: 'text'
              }))
            : []
      },
      pagination: {
        ...(pageConfig?.pagination || {}),
        ...(pageConfig?.table?.pagination || {})
      },
      actions: {
        ...(pageConfig?.actions || {})
      }
    };

    if (pageConfig?.id) {
      base.id = pageConfig.id;
    }
    if (pageConfig?.resourceId) {
      base.resourceId = pageConfig.resourceId;
    }
    if (pageConfig?.description) {
      base.description = pageConfig.description;
    }

    return base;
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
          },
          operations: {
            ...(existing.operations || {}),
            ...(resOverride.operations || {})
          },
          page: this.mergePageConfigs(existing.page, resOverride.page)
        };
      }
    }

    const mergedPages: Record<string, UiPageConfiguration> = {
      ...(base.pages || {})
    };

    if (override.pages) {
      for (const [pageKey, pageOverride] of Object.entries(override.pages)) {
        const existingPage = mergedPages[pageKey];
        mergedPages[pageKey] = this.mergePageConfigs(existingPage, pageOverride)!;
      }
    }

    return {
      version: override.version ?? base.version ?? CURRENT_UI_CONFIGURATION_VERSION,
      title: override.title || base.title,
      fields: {
        ...(base.fields || {}),
        ...(override.fields || {})
      },
      resources: Object.keys(mergedResources).length > 0 ? mergedResources : undefined,
      pages: Object.keys(mergedPages).length > 0 ? mergedPages : undefined
    };
  }

  private mergePageConfigs(
    base?: UiPageConfiguration | null,
    override?: UiPageConfiguration | null
  ): UiPageConfiguration | undefined {
    if (!base && !override) return undefined;
    if (!base) return override ? { ...override } : undefined;
    if (!override) return { ...base };

    return {
      ...base,
      ...override,
      operations: {
        ...(base.operations || {}),
        ...(override.operations || {})
      },
      metrics: override.metrics ? [...override.metrics] : base.metrics ? [...base.metrics] : undefined,
      filters: {
        ...(base.filters || {}),
        ...(override.filters || {})
      },
      table: {
        ...(base.table || {}),
        ...(override.table || {}),
        columns: override.table?.columns
          ? [...override.table.columns]
          : base.table?.columns
            ? [...base.table.columns]
            : undefined,
        pagination: {
          ...(base.table?.pagination || {}),
          ...(override.table?.pagination || {})
        }
      },
      pagination: {
        ...(base.pagination || {}),
        ...(override.pagination || {})
      },
      actions: {
        ...(base.actions || {}),
        ...(override.actions || {}),
        rowActions: {
          ...(base.actions?.rowActions || {}),
          ...(override.actions?.rowActions || {})
        }
      }
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
