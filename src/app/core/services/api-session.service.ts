import { computed, Injectable, signal } from '@angular/core';
import { ApiDefinition } from '../models/api-definition.model';
import { ApiResource } from '../models/api-resource.model';

export interface ApiSessionMetadata {
  openApiUrl?: string;
  rawSpec?: unknown;
  defaultResourceId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiSessionService {
  private readonly _apiDefinition = signal<ApiDefinition | null>(null);
  private readonly _selectedResourceId = signal<string | null>(null);
  private readonly _openApiUrl = signal<string | null>(null);
  private readonly _rawSpec = signal<unknown | null>(null);

  /**
   * Current normalized API definition.
   */
  readonly apiDefinition = this._apiDefinition.asReadonly();

  /**
   * Identifier of the currently selected resource.
   */
  readonly selectedResourceId = this._selectedResourceId.asReadonly();

  /**
   * Source OpenAPI URL if connected via URL.
   */
  readonly openApiUrl = this._openApiUrl.asReadonly();

  /**
   * Unparsed raw specification object or string.
   */
  readonly rawSpec = this._rawSpec.asReadonly();

  /**
   * Indicates whether an active API definition is loaded in session.
   */
  readonly hasActiveApi = computed<boolean>(() => this._apiDefinition() !== null);

  /**
   * Active API title.
   */
  readonly apiTitle = computed<string>(() => this._apiDefinition()?.title ?? '');

  /**
   * Active API version.
   */
  readonly apiVersion = computed<string>(() => this._apiDefinition()?.version ?? '');

  /**
   * Active API description.
   */
  readonly apiDescription = computed<string>(() => this._apiDefinition()?.description ?? '');

  /**
   * Active API Base URL.
   */
  readonly baseUrl = computed<string>(() => this._apiDefinition()?.baseUrl ?? '');

  /**
   * List of resources defined in the active API.
   */
  readonly resources = computed<ApiResource[]>(() => this._apiDefinition()?.resources ?? []);

  /**
   * Currently selected resource object, or null if none is selected or matches.
   */
  readonly selectedResource = computed<ApiResource | null>(() => {
    const def = this._apiDefinition();
    const id = this._selectedResourceId();
    if (!def || !id) return null;
    return def.resources.find((r) => r.id === id) ?? null;
  });

  /**
   * Sets the active API session with a normalized definition and optional metadata.
   * Automatically selects the first available resource if none is explicitly specified.
   */
  setSession(definition: ApiDefinition, metadata?: ApiSessionMetadata): void {
    this._apiDefinition.set(definition);
    this._openApiUrl.set(metadata?.openApiUrl ?? null);
    this._rawSpec.set(metadata?.rawSpec ?? null);

    const availableResources = definition.resources ?? [];
    if (metadata?.defaultResourceId && availableResources.some((r) => r.id === metadata.defaultResourceId)) {
      this._selectedResourceId.set(metadata.defaultResourceId);
    } else if (availableResources.length > 0) {
      this._selectedResourceId.set(availableResources[0].id);
    } else {
      this._selectedResourceId.set(null);
    }
  }

  /**
   * Selects an active resource by its ID or resource object.
   */
  selectResource(resourceOrId: ApiResource | string | null): void {
    if (resourceOrId === null) {
      this._selectedResourceId.set(null);
      return;
    }

    const id = typeof resourceOrId === 'string' ? resourceOrId : resourceOrId.id;
    const currentDef = this._apiDefinition();

    if (currentDef && currentDef.resources.some((r) => r.id === id)) {
      this._selectedResourceId.set(id);
    } else {
      this._selectedResourceId.set(id);
    }
  }

  /**
   * Updates the Base URL of the currently loaded API definition.
   */
  updateBaseUrl(newBaseUrl: string): void {
    const current = this._apiDefinition();
    if (!current) return;

    this._apiDefinition.set({
      ...current,
      baseUrl: newBaseUrl.trim()
    });
  }

  /**
   * Clears the current active session state.
   */
  clearSession(): void {
    this._apiDefinition.set(null);
    this._selectedResourceId.set(null);
    this._openApiUrl.set(null);
    this._rawSpec.set(null);
  }
}
