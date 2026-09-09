import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiDefinition } from '../models/api-definition.model';
import { ApiOperation } from '../models/api-operation.model';
import { ApiResource } from '../models/api-resource.model';
import { ApiExecutionResult } from '../models/api-execution-result.model';
import { ResourceOperationMatcherService } from './resource-operation-matcher.service';

export interface ApiSessionMetadata {
  openApiUrl?: string;
  rawSpec?: unknown;
  defaultResourceId?: string;
}

export interface ApiResourceMutationEvent {
  resourceId: string;
  operationId: string;
  timestamp: number;
  result?: ApiExecutionResult;
}

@Injectable({
  providedIn: 'root'
})
export class ApiSessionService {
  private readonly matcher = inject(ResourceOperationMatcherService);
  private readonly _apiDefinition = signal<ApiDefinition | null>(null);
  private readonly _selectedResourceId = signal<string | null>(null);
  private readonly _openApiUrl = signal<string | null>(null);
  private readonly _rawSpec = signal<unknown | null>(null);
  private readonly _lastResourceMutation = signal<ApiResourceMutationEvent | null>(null);

  /**
   * Current normalized API definition.
   */
  readonly apiDefinition = this._apiDefinition.asReadonly();

  /**
   * Last resource mutation event (e.g. create/update/delete operation execution).
   */
  readonly lastResourceMutation = this._lastResourceMutation.asReadonly();

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
   * Retrieves an operation by its id or operationId from the active API session.
   */
  getOperation(idOrOperationId: string): ApiOperation | null {
    const def = this._apiDefinition();
    if (!def || !idOrOperationId) return null;

    for (const resource of def.resources) {
      const match = resource.operations.find(
        (op) => op.id === idOrOperationId || op.operationId === idOrOperationId
      );
      if (match) return match;
    }

    return null;
  }

  /**
   * Retrieves the parent resource containing the specified operation by id or operationId.
   */
  getResourceForOperation(idOrOperationId: string): ApiResource | null {
    const def = this._apiDefinition();
    if (!def || !idOrOperationId) return null;

    for (const resource of def.resources) {
      if (
        resource.operations.some(
          (op) => op.id === idOrOperationId || op.operationId === idOrOperationId
        )
      ) {
        return resource;
      }
    }

    return null;
  }

  /**
   * Finds a compatible list operation for the specified resource if one exists.
   */
  getCompatibleListOperation(resourceId: string): ApiOperation | null {
    const def = this._apiDefinition();
    if (!def || !resourceId) return null;

    const resource = def.resources.find((r) => r.id === resourceId);
    if (!resource) return null;

    // 1. First priority: explicit 'list' type operation
    const listOp = resource.operations.find((op) => op.type === 'list');
    if (listOp) return listOp;

    // 2. Second priority: GET operation without path parameters
    const getCollectionOp = resource.operations.find(
      (op) => op.method === 'GET' && !op.parameters.some((p) => p.location === 'path')
    );
    if (getCollectionOp) return getCollectionOp;

    // 3. Fallback: Any GET operation in resource
    return resource.operations.find((op) => op.method === 'GET') ?? null;
  }

  /**
   * Finds a compatible details operation for the specified resource and optional source operation.
   */
  getCompatibleDetailsOperation(
    resourceId: string,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    const def = this._apiDefinition();
    if (!def || !resourceId) return null;

    const resource = def.resources.find((r) => r.id === resourceId);
    if (!resource) return null;

    return this.matcher.findCompatibleDetailsOperation(resource, sourceOperation);
  }

  /**
   * Finds a compatible delete operation for the specified resource and optional source operation.
   */
  getCompatibleDeleteOperation(
    resourceId: string,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    const def = this._apiDefinition();
    if (!def || !resourceId) return null;

    const resource = def.resources.find((r) => r.id === resourceId);
    if (!resource) return null;

    return this.matcher.findCompatibleDeleteOperation(resource, sourceOperation);
  }

  /**
   * Broadcasts a resource mutation event (such as record creation or update).
   */
  notifyResourceMutation(resourceId: string, operationId: string, result?: ApiExecutionResult): void {
    this._lastResourceMutation.set({
      resourceId,
      operationId,
      timestamp: Date.now(),
      result
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
    this._lastResourceMutation.set(null);
  }
}

