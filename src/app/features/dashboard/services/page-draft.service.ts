import { computed, inject, Injectable, signal } from '@angular/core';
import {
  CURRENT_UI_CONFIGURATION_VERSION,
  UiColumnConfiguration,
  UiConfiguration,
  UiMetricConfiguration,
  UiPageConfiguration,
  UiResourceConfiguration
} from '../../../core/models/ui-configuration.model';
import { ApiDefinition } from '../../../core/models/api-definition.model';
import { ApiResource } from '../../../core/models/api-resource.model';
import { ApiSchema } from '../../../core/models/api-schema.model';
import { UiConfigurationValidatorService } from '../../../core/services/ui-configuration-validator.service';
import { UiValidationResult } from '../../../core/models/ui-validation.model';
import { ResourceOperationMatcherService } from '../../../core/services/resource-operation-matcher.service';

export type PageConfigMode = 'create' | 'edit' | 'manage';

@Injectable()
export class PageDraftService {
  private readonly validator = inject(UiConfigurationValidatorService);
  private readonly matcher = inject(ResourceOperationMatcherService);

  private readonly _publishedConfig = signal<UiConfiguration | null>(null);
  private readonly _draftConfig = signal<UiConfiguration>({
    version: CURRENT_UI_CONFIGURATION_VERSION,
    pages: {},
    resources: {}
  });

  private readonly _activeMode = signal<PageConfigMode>('manage');
  private readonly _editingPageId = signal<string | null>(null);
  private readonly _apiDefinition = signal<ApiDefinition | null>(null);
  private readonly _isDirty = signal<boolean>(false);

  /**
   * Published immutable configuration baseline.
   */
  readonly publishedConfig = this._publishedConfig.asReadonly();

  /**
   * Transient editable draft configuration.
   */
  readonly draftConfig = this._draftConfig.asReadonly();

  /**
   * Current dialog mode: 'create' (wizard for new page), 'edit' (wizard for existing page), or 'manage' (page listing).
   */
  readonly activeMode = this._activeMode.asReadonly();

  /**
   * Identifier of the page currently being edited in the wizard.
   */
  readonly editingPageId = this._editingPageId.asReadonly();

  /**
   * Active OpenAPI definition reference for schemas and operation inference.
   */
  readonly apiDefinition = this._apiDefinition.asReadonly();

  /**
   * True if any changes have been made in the draft compared to the published baseline.
   */
  readonly isDirty = this._isDirty.asReadonly();

  /**
   * Normalized array of pages in the current draft ordered by order ascending, then title.
   */
  readonly draftPages = computed<UiPageConfiguration[]>(() => {
    const draft = this._draftConfig();
    const pagesMap = new Map<string, UiPageConfiguration>();

    // Top-level pages in draft
    if (draft.pages) {
      for (const [key, p] of Object.entries(draft.pages)) {
        const id = p.id || key;
        pagesMap.set(id, {
          ...p,
          id,
          slug: p.slug || id,
          title: p.title || id,
          icon: p.icon || 'table_chart',
          order: p.order ?? 999,
          hidden: p.hidden === true
        });
      }
    }

    return Array.from(pagesMap.values()).sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || '').localeCompare(b.title || '');
    });
  });

  /**
   * Currently active page configuration loaded in the wizard, if any.
   */
  readonly activeEditingPage = computed<UiPageConfiguration | null>(() => {
    const pageId = this._editingPageId();
    if (!pageId) return null;
    const pages = this.draftPages();
    return pages.find((p) => p.id === pageId || p.slug === pageId) ?? null;
  });

  /**
   * Real-time validation result for the active draft against the active API definition.
   */
  readonly validationResult = computed<UiValidationResult>(() => {
    const draft = this._draftConfig();
    const apiDef = this._apiDefinition();
    return this.validator.validate(draft, apiDef);
  });

  /**
   * Indicates whether the draft contains blocking errors.
   */
  readonly hasBlockingErrors = computed<boolean>(() => {
    return this.validationResult().hasErrors;
  });

  /**
   * Initializes the draft workspace with the published configuration baseline and target context.
   */
  initDraft(
    publishedConfig: UiConfiguration | null,
    apiDefinition: ApiDefinition | null,
    initialMode: PageConfigMode = 'manage',
    targetPageId?: string
  ): void {
    const cloned = publishedConfig ? JSON.parse(JSON.stringify(publishedConfig)) : {};
    const normalized: UiConfiguration = {
      version: cloned.version ?? CURRENT_UI_CONFIGURATION_VERSION,
      title: cloned.title,
      pages: { ...(cloned.pages || {}) },
      resources: { ...(cloned.resources || {}) },
      fields: { ...(cloned.fields || {}) }
    };

    this._publishedConfig.set(publishedConfig ? JSON.parse(JSON.stringify(publishedConfig)) : null);
    this._draftConfig.set(normalized);
    this._apiDefinition.set(apiDefinition);
    this._isDirty.set(false);

    if (initialMode === 'create') {
      this.startCreatePage();
    } else if (initialMode === 'edit' && targetPageId) {
      this.startEditPage(targetPageId);
    } else {
      this._activeMode.set('manage');
      this._editingPageId.set(null);
    }
  }

  /**
   * Transitions mode to page listing management.
   */
  setMode(mode: PageConfigMode): void {
    this._activeMode.set(mode);
  }

  /**
   * Starts the creation of a new page, initializing default values and navigating to the wizard.
   */
  startCreatePage(resourceId?: string): UiPageConfiguration {
    const apiDef = this._apiDefinition();
    const availableResources = apiDef?.resources ?? [];
    const existingPages = this.draftPages();

    // Pick specified resource or first unmapped resource, or first available resource
    let targetResource: ApiResource | undefined;
    if (resourceId) {
      targetResource = availableResources.find((r) => r.id === resourceId || r.name === resourceId);
    }
    if (!targetResource) {
      targetResource = availableResources.find(
        (r) => !existingPages.some((p) => p.resourceId === r.id || p.id === r.id)
      ) || availableResources[0];
    }

    const defaultPage = this.inferPageDefaultsFromResource(targetResource, existingPages.length + 1);
    const id = defaultPage.id || `page-${Date.now()}`;

    // Add to draft pages
    this._draftConfig.update((prev) => ({
      ...prev,
      pages: {
        ...(prev.pages || {}),
        [id]: defaultPage
      }
    }));

    this._editingPageId.set(id);
    this._activeMode.set('create');
    this._isDirty.set(true);

    return defaultPage;
  }

  /**
   * Starts editing an existing page in the wizard.
   */
  startEditPage(pageId: string): boolean {
    const page = this.draftPages().find((p) => p.id === pageId || p.slug === pageId);
    if (!page || !page.id) return false;

    this._editingPageId.set(page.id);
    this._activeMode.set('edit');
    return true;
  }

  /**
   * Updates an existing page configuration in the draft.
   */
  updatePage(pageId: string, updatedPage: Partial<UiPageConfiguration>): void {
    this._draftConfig.update((prev) => {
      const currentPages = { ...(prev.pages || {}) };
      const existing = currentPages[pageId] || this.draftPages().find((p) => p.id === pageId);
      if (!existing) return prev;

      const merged: UiPageConfiguration = {
        ...existing,
        ...updatedPage,
        id: updatedPage.id || existing.id || pageId
      };

      // If ID changed, delete old key and insert new
      if (merged.id && merged.id !== pageId) {
        delete currentPages[pageId];
        currentPages[merged.id] = merged;
      } else {
        currentPages[pageId] = merged;
      }

      // If set as default, clear default on other pages
      if (merged.isDefault === true || merged.default === true) {
        for (const [k, p] of Object.entries(currentPages)) {
          if (k !== pageId && k !== merged.id) {
            currentPages[k] = { ...p, isDefault: false, default: false };
          }
        }
      }

      return {
        ...prev,
        pages: currentPages
      };
    });

    if (updatedPage.id && updatedPage.id !== pageId) {
      this._editingPageId.set(updatedPage.id);
    }
    this._isDirty.set(true);
  }

  /**
   * Duplicates an existing page in the draft with a unique ID and slug.
   */
  duplicatePage(pageId: string): UiPageConfiguration | null {
    const page = this.draftPages().find((p) => p.id === pageId || p.slug === pageId);
    if (!page) return null;

    const existingPages = this.draftPages();
    const baseSlug = (page.slug || page.id || 'pagina').replace(/-copy(-\d+)?$/, '');
    let counter = 1;
    let newSlug = `${baseSlug}-copy`;
    let newId = `${page.id || baseSlug}-copy`;

    while (existingPages.some((p) => p.slug === newSlug || p.id === newId)) {
      counter++;
      newSlug = `${baseSlug}-copy-${counter}`;
      newId = `${page.id || baseSlug}-copy-${counter}`;
    }

    const duplicated: UiPageConfiguration = {
      ...JSON.parse(JSON.stringify(page)),
      id: newId,
      slug: newSlug,
      title: `${page.title || 'Página'} (Cópia${counter > 1 ? ` ${counter}` : ''})`,
      isDefault: false,
      default: false,
      order: existingPages.length + 1
    };

    this._draftConfig.update((prev) => ({
      ...prev,
      pages: {
        ...(prev.pages || {}),
        [newId]: duplicated
      }
    }));

    this._isDirty.set(true);
    return duplicated;
  }

  /**
   * Deletes a page from the draft.
   */
  deletePage(pageId: string): boolean {
    let deleted = false;
    this._draftConfig.update((prev) => {
      const currentPages = { ...(prev.pages || {}) };
      if (currentPages[pageId]) {
        delete currentPages[pageId];
        deleted = true;
      } else {
        const found = Object.entries(currentPages).find(
          ([_, p]) => p.id === pageId || p.slug === pageId
        );
        if (found) {
          delete currentPages[found[0]];
          deleted = true;
        }
      }
      return {
        ...prev,
        pages: currentPages
      };
    });

    if (this._editingPageId() === pageId) {
      this._editingPageId.set(null);
      this._activeMode.set('manage');
    }

    if (deleted) {
      this._isDirty.set(true);
    }
    return deleted;
  }

  /**
   * Toggles the hidden visibility flag for a page.
   */
  togglePageVisibility(pageId: string): void {
    const page = this.draftPages().find((p) => p.id === pageId || p.slug === pageId);
    if (!page || !page.id) return;

    this.updatePage(page.id, {
      hidden: !page.hidden
    });
  }

  /**
   * Moves a page up or down in the display order.
   */
  movePageOrder(pageId: string, direction: 'up' | 'down'): void {
    const pages = [...this.draftPages()];
    const index = pages.findIndex((p) => p.id === pageId || p.slug === pageId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pages.length) return;

    // Swap positions
    const [moved] = pages.splice(index, 1);
    pages.splice(targetIndex, 0, moved);

    // Reassign orders
    const updatedPages: Record<string, UiPageConfiguration> = {};
    pages.forEach((p, idx) => {
      const id = p.id!;
      updatedPages[id] = {
        ...p,
        order: idx + 1
      };
    });

    this._draftConfig.update((prev) => ({
      ...prev,
      pages: updatedPages
    }));

    this._isDirty.set(true);
  }

  /**
   * Sets a specific page as the default landing page.
   */
  setPageAsDefault(pageId: string): void {
    this._draftConfig.update((prev) => {
      const currentPages = { ...(prev.pages || {}) };
      for (const [k, p] of Object.entries(currentPages)) {
        const isTarget = k === pageId || p.id === pageId || p.slug === pageId;
        currentPages[k] = {
          ...p,
          isDefault: isTarget,
          default: isTarget
        };
      }
      return {
        ...prev,
        pages: currentPages
      };
    });

    this._isDirty.set(true);
  }

  /**
   * Infers sensible initial configuration (title, slug, columns, metrics, operations)
   * for a new page given an OpenAPI resource.
   */
  inferPageDefaultsFromResource(
    resource?: ApiResource,
    order: number = 1
  ): UiPageConfiguration {
    const resourceId = resource?.id || resource?.name || 'recurso';
    const resourceLabel = resource?.label || resource?.name || this.formatLabel(resourceId);
    const slug = resourceId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const id = `${slug}-page`;

    const def = this._apiDefinition();
    const resolvedPage = resource
      ? this.matcher.resolveResourcePage({
          resource,
          apiDefinition: def || undefined
        })
      : null;

    // 1. Infer columns from response schema or fallback properties
    const rawSchema = resolvedPage?.list?.responses?.[0]?.schema;
    const properties = this.extractSchemaProperties(rawSchema);
    const columns: UiColumnConfiguration[] = [];

    if (properties && Object.keys(properties).length > 0) {
      for (const [field, fieldSchema] of Object.entries(properties)) {
        columns.push({
          field,
          label: this.formatLabel(field),
          type: this.inferColumnType(field, fieldSchema),
          sortable: true
        });
      }
    }

    // Default fallback columns if schema has no properties
    if (columns.length === 0) {
      columns.push(
        { field: 'id', label: 'ID', type: 'monospace', sortable: true },
        { field: 'title', label: 'Título', type: 'text', sortable: true },
        { field: 'status', label: 'Status', type: 'status_badge', sortable: true },
        { field: 'createdAt', label: 'Criado em', type: 'datetime', sortable: true }
      );
    }

    // 2. Infer default metrics
    const metrics: UiMetricConfiguration[] = [
      {
        id: 'metric-total',
        label: 'Total',
        type: 'count_all',
        colorScheme: 'default',
        format: 'number',
        icon: 'tag'
      }
    ];

    // If schema contains status or numeric amount, suggest relevant metric cards
    if (properties) {
      for (const [key, prop] of Object.entries(properties)) {
        const lower = key.toLowerCase();
        if ((lower === 'status' || lower.includes('status')) && prop.enum && prop.enum.length > 0) {
          // Add metric for first pending/active enum
          const firstEnum = prop.enum[0];
          metrics.push({
            id: `metric-${key}-${firstEnum}`,
            label: `${this.formatLabel(String(firstEnum))}`,
            type: 'count_matching',
            field: key,
            matchingValue: firstEnum,
            colorScheme: 'warning',
            format: 'number',
            icon: 'pending'
          });
          break;
        }
      }
    }

    // 3. Infer operations from resolved suite
    const operations = {
      list: resolvedPage?.list?.operationId || resolvedPage?.list?.id,
      create: resolvedPage?.create?.operationId || resolvedPage?.create?.id,
      details: resolvedPage?.details?.operationId || resolvedPage?.details?.id,
      update: resolvedPage?.update?.operationId || resolvedPage?.update?.id,
      delete: resolvedPage?.delete?.operationId || resolvedPage?.delete?.id
    };

    return {
      id,
      resourceId: resource?.id || resourceId,
      title: resourceLabel,
      slug,
      icon: 'table_chart',
      description: `Gerenciamento operacional e visualização de ${resourceLabel.toLowerCase()}.`,
      isDefault: order === 1,
      order,
      hidden: false,
      displayMode: 'dashboard',
      operations,
      metrics,
      filters: {
        searchFields: columns.slice(0, 3).map((c) => c.field),
        searchPlaceholder: `Buscar em ${resourceLabel.toLowerCase()}...`,
        statusField: columns.find((c) => c.field.toLowerCase().includes('status'))?.field,
        dateField: columns.find((c) => c.type === 'date' || c.type === 'datetime')?.field
      },
      table: {
        columns,
        pageSize: 10,
        pageSizeOptions: [10, 25, 50, 100]
      },
      actions: {
        primaryCreateActionId: operations.create,
        primaryCreateLabel: `+ Adicionar ${resourceLabel.toLowerCase()}`,
        rowActions: {
          viewDetails: Boolean(operations.details),
          edit: Boolean(operations.update),
          delete: Boolean(operations.delete)
        }
      }
    };
  }

  /**
   * Commits and returns the validated sanitized configuration ready to be published.
   */
  commitDraft(): UiConfiguration {
    const draft = this._draftConfig();
    const apiDef = this._apiDefinition();
    const validation = this.validator.validate(draft, apiDef);

    const committed = validation.sanitizedConfig ?? draft;
    this._publishedConfig.set(JSON.parse(JSON.stringify(committed)));
    this._draftConfig.set(committed);
    this._isDirty.set(false);
    return committed;
  }

  /**
   * Resets the transient draft back to the baseline published configuration.
   */
  resetDraft(): void {
    const published = this._publishedConfig();
    const cloned = published ? JSON.parse(JSON.stringify(published)) : {
      version: CURRENT_UI_CONFIGURATION_VERSION,
      pages: {},
      resources: {}
    };
    this._draftConfig.set(cloned);
    this._isDirty.set(false);
    this._editingPageId.set(null);
    this._activeMode.set('manage');
  }

  // --- Internal Helpers ---

  private inferColumnType(field: string, schema?: ApiSchema): UiColumnConfiguration['type'] {
    const lower = field.toLowerCase();
    if (lower === 'id' || lower.endsWith('_id') || lower === 'uuid' || lower === 'guid' || lower === 'sku') {
      return 'monospace';
    }
    if (lower.includes('status') || lower.includes('state')) {
      return 'status_badge';
    }
    if (lower.includes('price') || lower.includes('amount') || lower.includes('total') || lower.includes('cost') || lower.includes('valor')) {
      return 'currency';
    }
    if (schema?.type === 'integer' || schema?.type === 'number') {
      return 'number';
    }
    if (schema?.type === 'boolean') {
      return 'boolean';
    }
    if (schema?.format === 'date' || lower.endsWith('date') || lower === 'data') {
      return 'date';
    }
    if (schema?.format === 'date-time' || lower.includes('at') || lower.includes('time')) {
      return 'datetime';
    }
    return 'text';
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

  /**
   * Helper to safely extract properties from OpenAPI schemas in object, array, or envelope forms.
   */
  extractSchemaProperties(schema?: ApiSchema | null): Record<string, ApiSchema> | undefined {
    if (!schema) return undefined;
    if (schema.type === 'array' && schema.items?.properties) {
      return schema.items.properties;
    }
    if (schema.properties && Object.keys(schema.properties).length > 0) {
      if (schema.properties['data']?.type === 'array' && schema.properties['data']?.items?.properties) {
        return schema.properties['data'].items.properties;
      }
      if (schema.properties['items']?.type === 'array' && schema.properties['items']?.items?.properties) {
        return schema.properties['items'].items.properties;
      }
      return schema.properties;
    }
    if (schema.items?.properties) {
      return schema.items.properties;
    }
    return undefined;
  }
}
