import { Injectable } from '@angular/core';
import { ApiOperation } from '../models/api-operation.model';
import { ApiParameter } from '../models/api-parameter.model';
import { ApiResource } from '../models/api-resource.model';
import { ApiDefinition } from '../models/api-definition.model';
import {
  ResolvedCustomAction,
  ResolvedOperationWarning,
  ResolvedResourcePage,
  ResolveResourcePageOptions
} from '../models/resolved-resource-page.model';
import { UiPageConfiguration, UiResourceConfiguration } from '../models/ui-configuration.model';

export interface ParamResolutionResult {
  canAutoResolve: boolean;
  resolvedParams: Record<string, string>;
  missingParams: ApiParameter[];
}

@Injectable({
  providedIn: 'root'
})
export class ResourceOperationMatcherService {
  /**
   * Common primary key field names used across REST APIs.
   */
  private readonly COMMON_ID_KEYS = [
    'id',
    '_id',
    'uuid',
    'guid',
    'code',
    'slug',
    'key',
    'pk',
    'identifier'
  ];

  /**
   * Resolves all canonical CRUD operations, update variants, custom actions,
   * and diagnostics for a resource page in a single unified execution.
   */
  resolveResourcePage(options: ResolveResourcePageOptions): ResolvedResourcePage {
    const { resource, pageConfig, resourceConfig, apiDefinition, sourceOperation } = options;
    const warnings: ResolvedOperationWarning[] = [];
    const explicitOverrides: ResolvedResourcePage['explicitOverrides'] = {};

    const resourceId = resource?.id || pageConfig?.resourceId || '';

    if (!resource || !resource.operations || resource.operations.length === 0) {
      warnings.push({
        code: 'MISSING_OPERATION',
        message: `O recurso '${resourceId || 'desconhecido'}' não possui operações disponíveis na API.`,
        role: 'list'
      });

      return {
        resourceId,
        resource: resource ?? null,
        pageConfig: pageConfig ?? null,
        list: null,
        create: null,
        details: null,
        update: null,
        delete: null,
        updateOperations: [],
        customActions: [],
        warnings,
        explicitOverrides
      };
    }

    // 1. Resolve List Operation
    const explicitListId = pageConfig?.operations?.list || resourceConfig?.operations?.list;
    let resolvedList: ApiOperation | null = null;

    if (explicitListId && explicitListId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitListId.trim(), resource, apiDefinition);
      if (explicitOp) {
        resolvedList = explicitOp;
        explicitOverrides.list = true;
        if (explicitOp.method !== 'GET') {
          warnings.push({
            code: 'INCOMPATIBLE_METHOD',
            message: `A operação '${explicitOp.id}' configurada para 'list' utiliza o método HTTP ${explicitOp.method}, quando 'GET' era esperado.`,
            role: 'list',
            operationId: explicitOp.id
          });
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A operação '${explicitListId}' explicitamente configurada para 'list' não foi encontrada.`,
          role: 'list',
          operationId: explicitListId
        });
        resolvedList = this.findCompatibleListOperation(resource);
      }
    } else {
      resolvedList = this.findCompatibleListOperation(resource);
      if (!resolvedList) {
        warnings.push({
          code: 'MISSING_OPERATION',
          message: `Nenhuma operação compatível com listagem (GET) foi identificada para o recurso '${resourceId}'.`,
          role: 'list'
        });
      } else {
        const candidateListOps = resource.operations.filter(
          (op) => op.method === 'GET' && !this.hasPathParamInOperation(op)
        );
        if (candidateListOps.length > 1 && !resource.operations.some((op) => op.type === 'list')) {
          warnings.push({
            code: 'AMBIGUOUS_MATCH',
            message: `Múltiplas operações GET de coleção foram encontradas para o recurso '${resourceId}'. Foi selecionada '${resolvedList.id}'.`,
            role: 'list',
            operationId: resolvedList.id
          });
        }
      }
    }

    const effectiveSourceOp = resolvedList || sourceOperation;

    // 2. Resolve Details Operation
    const explicitDetailsId = pageConfig?.operations?.details || resourceConfig?.operations?.details;
    let resolvedDetails: ApiOperation | null = null;

    if (explicitDetailsId && explicitDetailsId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitDetailsId.trim(), resource, apiDefinition);
      if (explicitOp) {
        resolvedDetails = explicitOp;
        explicitOverrides.details = true;
        if (explicitOp.method !== 'GET') {
          warnings.push({
            code: 'INCOMPATIBLE_METHOD',
            message: `A operação '${explicitOp.id}' configurada para 'details' utiliza o método HTTP ${explicitOp.method}, quando 'GET' era esperado.`,
            role: 'details',
            operationId: explicitOp.id
          });
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A operação '${explicitDetailsId}' explicitamente configurada para 'details' não foi encontrada.`,
          role: 'details',
          operationId: explicitDetailsId
        });
        resolvedDetails = this.findCompatibleDetailsOperation(resource, effectiveSourceOp);
      }
    } else {
      resolvedDetails = this.findCompatibleDetailsOperation(resource, effectiveSourceOp);
      if (!resolvedDetails) {
        warnings.push({
          code: 'MISSING_OPERATION',
          message: `Nenhuma operação compatível de detalhes (GET com ID) foi encontrada para o recurso '${resourceId}'.`,
          role: 'details'
        });
      }
    }

    // 3. Resolve Create Operation
    const explicitCreateId =
      pageConfig?.actions?.primaryCreateActionId ||
      pageConfig?.operations?.create ||
      resourceConfig?.operations?.create;
    let resolvedCreate: ApiOperation | null = null;

    if (explicitCreateId && explicitCreateId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitCreateId.trim(), resource, apiDefinition);
      if (explicitOp) {
        resolvedCreate = explicitOp;
        explicitOverrides.create = true;
        if (explicitOp.method !== 'POST' && explicitOp.method !== 'PUT') {
          warnings.push({
            code: 'INCOMPATIBLE_METHOD',
            message: `A operação '${explicitOp.id}' configurada para 'create' utiliza o método HTTP ${explicitOp.method}, quando 'POST' era esperado.`,
            role: 'create',
            operationId: explicitOp.id
          });
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A operação '${explicitCreateId}' explicitamente configurada para 'create' não foi encontrada.`,
          role: 'create',
          operationId: explicitCreateId
        });
        resolvedCreate = this.findCompatibleCreateOperation(resource, effectiveSourceOp);
      }
    } else {
      resolvedCreate = this.findCompatibleCreateOperation(resource, effectiveSourceOp);
      if (!resolvedCreate) {
        warnings.push({
          code: 'MISSING_OPERATION',
          message: `Nenhuma operação compatível de criação (POST) foi identificada para o recurso '${resourceId}'.`,
          role: 'create'
        });
      }
    }

    // 4. Resolve Update Operations
    const explicitUpdateId = pageConfig?.operations?.update || resourceConfig?.operations?.update;
    let resolvedUpdate: ApiOperation | null = null;
    let updateOperations = this.findCompatibleUpdateOperations(
      resource,
      resolvedDetails || effectiveSourceOp
    );

    if (explicitUpdateId && explicitUpdateId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitUpdateId.trim(), resource, apiDefinition);
      if (explicitOp) {
        resolvedUpdate = explicitOp;
        explicitOverrides.update = true;
        if (explicitOp.method !== 'PUT' && explicitOp.method !== 'PATCH') {
          warnings.push({
            code: 'INCOMPATIBLE_METHOD',
            message: `A operação '${explicitOp.id}' configurada para 'update' utiliza o método HTTP ${explicitOp.method}, quando 'PUT' ou 'PATCH' era esperado.`,
            role: 'update',
            operationId: explicitOp.id
          });
        }
        if (!updateOperations.some((op) => op.id === explicitOp.id)) {
          updateOperations = [explicitOp, ...updateOperations];
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A operação '${explicitUpdateId}' explicitamente configurada para 'update' não foi encontrada.`,
          role: 'update',
          operationId: explicitUpdateId
        });
        resolvedUpdate = this.findCompatibleUpdateOperation(
          resource,
          resolvedDetails || effectiveSourceOp
        );
      }
    } else {
      resolvedUpdate = this.findCompatibleUpdateOperation(
        resource,
        resolvedDetails || effectiveSourceOp
      );
      if (!resolvedUpdate && updateOperations.length === 0) {
        warnings.push({
          code: 'MISSING_OPERATION',
          message: `Nenhuma operação compatível de atualização (PUT/PATCH) foi encontrada para o recurso '${resourceId}'.`,
          role: 'update'
        });
      }
    }

    // 5. Resolve Delete Operation
    const explicitDeleteId = pageConfig?.operations?.delete || resourceConfig?.operations?.delete;
    let resolvedDelete: ApiOperation | null = null;

    if (explicitDeleteId && explicitDeleteId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitDeleteId.trim(), resource, apiDefinition);
      if (explicitOp) {
        resolvedDelete = explicitOp;
        explicitOverrides.delete = true;
        if (explicitOp.method !== 'DELETE') {
          warnings.push({
            code: 'INCOMPATIBLE_METHOD',
            message: `A operação '${explicitOp.id}' configurada para 'delete' utiliza o método HTTP ${explicitOp.method}, quando 'DELETE' era esperado.`,
            role: 'delete',
            operationId: explicitOp.id
          });
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A operação '${explicitDeleteId}' explicitamente configurada para 'delete' não foi encontrada.`,
          role: 'delete',
          operationId: explicitDeleteId
        });
        resolvedDelete = this.findCompatibleDeleteOperation(
          resource,
          resolvedDetails || effectiveSourceOp
        );
      }
    } else {
      resolvedDelete = this.findCompatibleDeleteOperation(
        resource,
        resolvedDetails || effectiveSourceOp
      );
      if (!resolvedDelete) {
        warnings.push({
          code: 'MISSING_OPERATION',
          message: `Nenhuma operação compatível de exclusão (DELETE) foi encontrada para o recurso '${resourceId}'.`,
          role: 'delete'
        });
      }
    }

    // 6. Resolve Custom Actions
    const explicitCustomOpIds = [
      ...(pageConfig?.operations?.custom || []),
      ...(pageConfig?.actions?.rowActions?.customActionOperations || []),
      ...(resourceConfig?.operations?.custom || [])
    ];

    const knownCoreOpIds = new Set<string>();
    if (resolvedList) knownCoreOpIds.add(resolvedList.id);
    if (resolvedCreate) knownCoreOpIds.add(resolvedCreate.id);
    if (resolvedDetails) knownCoreOpIds.add(resolvedDetails.id);
    if (resolvedUpdate) knownCoreOpIds.add(resolvedUpdate.id);
    if (resolvedDelete) knownCoreOpIds.add(resolvedDelete.id);
    updateOperations.forEach((op) => knownCoreOpIds.add(op.id));

    const customActions = this.resolveCustomActions(
      resource,
      explicitCustomOpIds,
      knownCoreOpIds,
      apiDefinition,
      warnings
    );

    return {
      resourceId,
      resource,
      pageConfig: pageConfig ?? null,
      list: resolvedList,
      create: resolvedCreate,
      details: resolvedDetails,
      update: resolvedUpdate,
      delete: resolvedDelete,
      updateOperations,
      customActions,
      warnings,
      explicitOverrides
    };
  }

  /**
   * Finds a compatible list operation for the specified resource.
   */
  findCompatibleListOperation(
    resource: ApiResource,
    explicitOpId?: string,
    apiDefinition?: ApiDefinition | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    if (explicitOpId && explicitOpId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitOpId.trim(), resource, apiDefinition);
      if (explicitOp) {
        return explicitOp;
      }
    }

    // 1. Explicitly classified 'list' operation
    const listOp = resource.operations.find((op) => op.type === 'list');
    if (listOp) {
      return listOp;
    }

    // 2. GET operation with no path parameters
    const getNoPathParams = resource.operations.filter(
      (op) => op.method === 'GET' && !this.hasPathParamInOperation(op)
    );

    if (getNoPathParams.length > 0) {
      // Prefer the one with the shortest path (base collection path e.g. /orders vs /orders/summary)
      return getNoPathParams.reduce((shortest, current) =>
        current.path.length < shortest.path.length ? current : shortest
      );
    }

    // 3. Fallback: first GET operation
    return resource.operations.find((op) => op.method === 'GET') ?? null;
  }

  /**
   * Finds a compatible create (POST) operation for the specified resource.
   */
  findCompatibleCreateOperation(
    resource: ApiResource,
    sourceListOperation?: ApiOperation | null,
    explicitOpId?: string,
    apiDefinition?: ApiDefinition | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    if (explicitOpId && explicitOpId.trim() !== '') {
      const explicitOp = this.findOperationInResourceOrApi(explicitOpId.trim(), resource, apiDefinition);
      if (explicitOp) {
        return explicitOp;
      }
    }

    const candidatePosts = resource.operations.filter((op) => op.method === 'POST');
    if (candidatePosts.length === 0) {
      return null;
    }

    // If source list operation is available, match exact base path (e.g. GET /products -> POST /products)
    if (sourceListOperation) {
      const sourceBasePath = sourceListOperation.path.split('?')[0].trim().replace(/\/+$/, '').toLowerCase();
      const exactPathPost = candidatePosts.find((op) => {
        const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '').toLowerCase();
        return candidateBasePath === sourceBasePath;
      });

      if (exactPathPost) {
        return exactPathPost;
      }
    }

    // Prefer classified 'create'
    const classifiedCreate = candidatePosts.find((op) => op.type === 'create');
    if (classifiedCreate) {
      return classifiedCreate;
    }

    // Prefer POST without path parameters (e.g. /orders over /orders/{id}/cancel)
    const postNoPathParams = candidatePosts.find((op) => !this.hasPathParamInOperation(op));
    if (postNoPathParams) {
      return postNoPathParams;
    }

    return null;
  }

  /**
   * Finds the best matching 'details' operation for a given resource and optional source operation (e.g. list GET).
   */
  findCompatibleDetailsOperation(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    const candidateDetails = resource.operations.filter(
      (op) => op.method === 'GET' && op.type === 'details'
    );

    // If source operation is provided, score candidate details by path affinity
    if (sourceOperation && candidateDetails.length > 0) {
      const sourceBasePath = sourceOperation.path.split('?')[0].trim().replace(/\/+$/, '');
      
      // Best: details operation that extends the source list path with exactly one path parameter
      const exactChild = candidateDetails.find((op) => {
        const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
        const sourceSegments = sourceBasePath.split('/').filter(Boolean);
        const candidateSegments = candidateBasePath.split('/').filter(Boolean);

        if (candidateSegments.length === sourceSegments.length + 1) {
          const prefixMatches = sourceSegments.every(
            (seg, idx) => seg.toLowerCase() === candidateSegments[idx].toLowerCase()
          );
          return prefixMatches && this.isPathParam(candidateSegments[candidateSegments.length - 1]);
        }
        return false;
      });

      if (exactChild) {
        return exactChild;
      }

      // Next best: details operation that shares the longest common path prefix with the source
      let bestMatch: ApiOperation | null = null;
      let maxPrefixLength = -1;

      for (const op of candidateDetails) {
        const prefixLen = this.calculateCommonPathLength(sourceBasePath, op.path);
        if (prefixLen > maxPrefixLength) {
          maxPrefixLength = prefixLen;
          bestMatch = op;
        }
      }

      if (bestMatch) {
        return bestMatch;
      }
    }

    // If no source operation or no scored match, return the first details operation
    if (candidateDetails.length > 0) {
      return candidateDetails[0];
    }

    // Fallback: search for any GET operation with path parameters in this resource
    const fallbackGetWithParams = resource.operations.find(
      (op) => op.method === 'GET' && op.parameters.some((p) => p.location === 'path')
    );

    return fallbackGetWithParams ?? null;
  }

  /**
   * Finds the best matching 'delete' operation for a given resource and optional source operation (e.g. list GET).
   */
  findCompatibleDeleteOperation(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null
  ): ApiOperation | null {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return null;
    }

    const candidateDeletes = resource.operations.filter(
      (op) => op.method === 'DELETE'
    );

    if (candidateDeletes.length === 0) {
      return null;
    }

    // If source operation is provided, score candidate deletes by path affinity
    if (sourceOperation) {
      const sourceBasePath = sourceOperation.path.split('?')[0].trim().replace(/\/+$/, '');

      // Best: delete operation that extends the source list path with exactly one path parameter (e.g. /products -> /products/{id})
      const exactChild = candidateDeletes.find((op) => {
        const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
        const sourceSegments = sourceBasePath.split('/').filter(Boolean);
        const candidateSegments = candidateBasePath.split('/').filter(Boolean);

        if (candidateSegments.length === sourceSegments.length + 1) {
          const prefixMatches = sourceSegments.every(
            (seg, idx) => seg.toLowerCase() === candidateSegments[idx].toLowerCase()
          );
          return prefixMatches && this.isPathParam(candidateSegments[candidateSegments.length - 1]);
        }
        return false;
      });

      if (exactChild) {
        return exactChild;
      }

      // Next best: delete operation that shares the longest common path prefix with the source
      let bestMatch: ApiOperation | null = null;
      let maxPrefixLength = -1;

      for (const op of candidateDeletes) {
        const prefixLen = this.calculateCommonPathLength(sourceBasePath, op.path);
        if (prefixLen > maxPrefixLength) {
          maxPrefixLength = prefixLen;
          bestMatch = op;
        }
      }

      if (bestMatch && maxPrefixLength > 0) {
        return bestMatch;
      }
    }

    // Prefer candidate with classified type 'delete' or that contains path parameters
    const preferredDelete = candidateDeletes.find(
      (op) => op.type === 'delete' || op.parameters.some((p) => p.location === 'path')
    );

    return preferredDelete ?? candidateDeletes[0] ?? null;
  }

  /**
   * Finds all matching 'update' operations (PUT or PATCH) for a given resource and optional source operation (e.g. list GET or details GET).
   */
  findCompatibleUpdateOperations(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null
  ): ApiOperation[] {
    if (!resource || !resource.operations || resource.operations.length === 0) {
      return [];
    }

    const candidateUpdates = resource.operations.filter(
      (op) => op.method === 'PUT' || op.method === 'PATCH'
    );

    if (candidateUpdates.length === 0) {
      return [];
    }

    if (!sourceOperation) {
      return candidateUpdates;
    }

    const sourceBasePath = sourceOperation.path.split('?')[0].trim().replace(/\/+$/, '');
    const sourceSegments = sourceBasePath.split('/').filter(Boolean);

    // 1. Exact path match (e.g. if source is details GET /products/{id}, update PUT /products/{id} matches directly)
    const exactMatches = candidateUpdates.filter((op) => {
      const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
      return candidateBasePath.toLowerCase() === sourceBasePath.toLowerCase();
    });

    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // 2. Child path match (e.g. if source is list GET /products, update PUT /products/{id} extends by 1 path parameter)
    const childMatches = candidateUpdates.filter((op) => {
      const candidateBasePath = op.path.split('?')[0].trim().replace(/\/+$/, '');
      const candidateSegments = candidateBasePath.split('/').filter(Boolean);

      if (candidateSegments.length === sourceSegments.length + 1) {
        const prefixMatches = sourceSegments.every(
          (seg, idx) => seg.toLowerCase() === candidateSegments[idx].toLowerCase()
        );
        return prefixMatches && this.isPathParam(candidateSegments[candidateSegments.length - 1]);
      }
      return false;
    });

    if (childMatches.length > 0) {
      return childMatches;
    }

    // 3. Longest common prefix match
    let maxPrefixLength = 0;
    const scoredCandidates: Array<{ op: ApiOperation; score: number }> = [];

    for (const op of candidateUpdates) {
      const prefixLen = this.calculateCommonPathLength(sourceBasePath, op.path);
      if (prefixLen > maxPrefixLength) {
        maxPrefixLength = prefixLen;
      }
      scoredCandidates.push({ op, score: prefixLen });
    }

    if (maxPrefixLength > 0) {
      return scoredCandidates
        .filter((c) => c.score === maxPrefixLength)
        .map((c) => c.op);
    }

    return candidateUpdates;
  }

  /**
   * Finds the best matching 'update' operation (PUT or PATCH) for a given resource and optional source operation.
   */
  findCompatibleUpdateOperation(
    resource: ApiResource,
    sourceOperation?: ApiOperation | null,
    preferMethod?: 'PUT' | 'PATCH'
  ): ApiOperation | null {
    const candidates = this.findCompatibleUpdateOperations(resource, sourceOperation);
    if (candidates.length === 0) {
      return null;
    }

    if (preferMethod) {
      const preferred = candidates.find((op) => op.method === preferMethod);
      if (preferred) {
        return preferred;
      }
    }

    // Default preference: prioritized classified type 'update' or PUT first, then PATCH
    const classifiedUpdate = candidates.find((op) => op.type === 'update');
    if (classifiedUpdate) {
      return classifiedUpdate;
    }

    const putOp = candidates.find((op) => op.method === 'PUT');
    if (putOp) {
      return putOp;
    }

    return candidates[0] ?? null;
  }

  /**
   * Searches for an operation across a resource and optionally the whole API definition
   * using tolerant matching (by id, operationId, case-insensitivity, or method + path).
   */
  findOperationInResourceOrApi(
    identifier: string,
    resource?: ApiResource | null,
    apiDefinition?: ApiDefinition | null
  ): ApiOperation | null {
    if (!identifier || identifier.trim() === '') {
      return null;
    }

    const target = identifier.trim();
    const targetLower = target.toLowerCase();

    // 1. Check in resource operations first
    if (resource && resource.operations) {
      const inRes = this.matchOperationInList(target, targetLower, resource.operations);
      if (inRes) {
        return inRes;
      }
    }

    // 2. Check across entire API definition if available
    if (apiDefinition && apiDefinition.resources) {
      for (const res of apiDefinition.resources) {
        if (res.operations) {
          const inApi = this.matchOperationInList(target, targetLower, res.operations);
          if (inApi) {
            return inApi;
          }
        }
      }
    }

    return null;
  }

  /**
   * Resolves required and optional parameters for a target operation based on a record row object
   * and any active parent path parameters already known in the source execution context.
   */
  resolveParameters(
    targetOperation: ApiOperation,
    record: unknown,
    activeContextParams: Record<string, string> = {}
  ): ParamResolutionResult {
    const resolvedParams: Record<string, string> = {};
    const missingParams: ApiParameter[] = [];

    const recordObj =
      record && typeof record === 'object' && !Array.isArray(record)
        ? (record as Record<string, unknown>)
        : {};

    const pathParams = targetOperation.parameters.filter((p) => p.location === 'path');

    for (const param of pathParams) {
      const resolvedValue = this.inferParamValue(param, recordObj, activeContextParams, targetOperation);

      if (resolvedValue !== null && resolvedValue !== undefined && String(resolvedValue).trim() !== '') {
        resolvedParams[param.name] = String(resolvedValue);
      } else {
        missingParams.push(param);
      }
    }

    return {
      canAutoResolve: missingParams.length === 0,
      resolvedParams,
      missingParams
    };
  }

  /**
   * Resolves custom/RPC actions for a resource, combining explicit configurations and discovered non-CRUD action endpoints.
   */
  private resolveCustomActions(
    resource: ApiResource,
    explicitCustomOpIds: string[],
    knownCoreOpIds: Set<string>,
    apiDefinition: ApiDefinition | null | undefined,
    warnings: ResolvedOperationWarning[]
  ): ResolvedCustomAction[] {
    const result: ResolvedCustomAction[] = [];
    const addedOpIds = new Set<string>();

    // 1. Process explicit custom action IDs
    for (const rawId of explicitCustomOpIds) {
      if (!rawId || typeof rawId !== 'string' || rawId.trim() === '') continue;
      const opId = rawId.trim();

      const op = this.findOperationInResourceOrApi(opId, resource, apiDefinition);
      if (op) {
        if (!addedOpIds.has(op.id)) {
          addedOpIds.add(op.id);
          result.push({
            id: op.id,
            label: op.summary || op.id,
            operation: op,
            isExplicit: true
          });
        }
      } else {
        warnings.push({
          code: 'OPERATION_NOT_FOUND',
          message: `A ação customizada '${opId}' explicitamente configurada não foi encontrada na API.`,
          role: 'custom',
          operationId: opId
        });
      }
    }

    // 2. Discover implicit/non-CRUD endpoints in the resource (e.g. POST /orders/{id}/cancel, POST /tasks/{id}/duplicate)
    if (resource.operations) {
      for (const op of resource.operations) {
        if (knownCoreOpIds.has(op.id) || addedOpIds.has(op.id)) {
          continue;
        }

        // Custom endpoints typically have path parameters or action suffixes
        const hasPathParams = this.hasPathParamInOperation(op);
        const isPostOrPutOrPatch = op.method === 'POST' || op.method === 'PUT' || op.method === 'PATCH';

        if (isPostOrPutOrPatch && (hasPathParams || op.type === 'action')) {
          addedOpIds.add(op.id);
          result.push({
            id: op.id,
            label: op.summary || op.id,
            operation: op,
            isExplicit: false
          });
        }
      }
    }

    return result;
  }

  private matchOperationInList(
    target: string,
    targetLower: string,
    operations: ApiOperation[]
  ): ApiOperation | null {
    // 1. Exact ID
    const byId = operations.find((op) => op.id === target);
    if (byId) return byId;

    // 2. Exact operationId
    const byOpId = operations.find((op) => op.operationId === target);
    if (byOpId) return byOpId;

    // 3. Case-insensitive ID or operationId
    const byCaseInsensitive = operations.find(
      (op) =>
        op.id.toLowerCase() === targetLower ||
        op.operationId?.toLowerCase() === targetLower
    );
    if (byCaseInsensitive) return byCaseInsensitive;

    // 4. Method + Path match (e.g. "POST /orders" or "GET /orders/{id}")
    const byMethodAndPath = operations.find(
      (op) => `${op.method.toLowerCase()} ${op.path.toLowerCase()}` === targetLower
    );
    if (byMethodAndPath) return byMethodAndPath;

    // 5. Exact path match if unique
    const byPath = operations.filter((op) => op.path.toLowerCase() === targetLower);
    if (byPath.length === 1) return byPath[0];

    return null;
  }

  private hasPathParamInOperation(op: ApiOperation): boolean {
    return (
      op.parameters.some((p) => p.location === 'path') ||
      /\{[^}]+\}/.test(op.path)
    );
  }

  /**
   * Intelligently infers the value for a specific parameter using multiple heuristic strategies.
   */
  private inferParamValue(
    param: ApiParameter,
    record: Record<string, unknown>,
    contextParams: Record<string, string>,
    operation: ApiOperation
  ): unknown {
    const paramName = param.name;

    // 1. Inherit from active context if parameter already resolved in parent path (e.g. /users/{userId}/posts/{postId})
    if (contextParams[paramName] !== undefined && contextParams[paramName] !== '') {
      return contextParams[paramName];
    }

    const normalizedParamName = this.normalizeKey(paramName);

    // 2. Direct exact or normalized match in record keys
    for (const [key, val] of Object.entries(record)) {
      if (val === null || val === undefined || val === '') continue;

      if (key === paramName || this.normalizeKey(key) === normalizedParamName) {
        return val;
      }
    }

    // 3. Match variations based on parameter name
    const allPathParams = operation.parameters.filter((p) => p.location === 'path');
    const isTargetItemParam =
      allPathParams.length > 0 && allPathParams[allPathParams.length - 1].name === paramName;

    const candidateKeysToTry: string[] = [
      paramName,
      `${paramName}_id`,
      `${paramName}Id`
    ];

    if (isTargetItemParam || paramName.toLowerCase() === 'id') {
      const resourceNameFromPath = this.extractTargetSegmentName(operation.path);
      candidateKeysToTry.push('id', '_id');
      if (resourceNameFromPath) {
        candidateKeysToTry.push(
          `${resourceNameFromPath}Id`,
          `${resourceNameFromPath}_id`,
          `${resourceNameFromPath}_uuid`,
          `${resourceNameFromPath}Uuid`
        );
      }
    }

    for (const candidate of candidateKeysToTry) {
      const normalizedCandidate = this.normalizeKey(candidate);
      for (const [key, val] of Object.entries(record)) {
        if (val === null || val === undefined || val === '') continue;
        if (this.normalizeKey(key) === normalizedCandidate) {
          return val;
        }
      }
    }

    // 4. Primary key fallback: only if this is the target item parameter or only 1 path param
    if (isTargetItemParam && allPathParams.length === 1) {
      for (const commonKey of this.COMMON_ID_KEYS) {
        const normalizedCommonKey = this.normalizeKey(commonKey);
        for (const [key, val] of Object.entries(record)) {
          if (val === null || val === undefined || val === '') continue;
          if (this.normalizeKey(key) === normalizedCommonKey) {
            return val;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Normalizes a property or parameter name for flexible casing comparison.
   * Strips delimiters, hyphens, underscores and transforms to lowercase.
   */
  private normalizeKey(key: string): string {
    return key.replace(/[-_.\s]/g, '').toLowerCase();
  }

  private isPathParam(segment: string): boolean {
    if (!segment) return false;
    return segment.startsWith('{') && segment.endsWith('}');
  }

  private extractTargetSegmentName(path: string): string {
    const segments = path.split('?')[0].split('/').filter(Boolean);
    if (segments.length >= 2) {
      const secondLast = segments[segments.length - 2];
      if (!this.isPathParam(secondLast)) {
        // Singularize simple trailing 's' (e.g. "users" -> "user", "pets" -> "pet")
        return secondLast.endsWith('s') && secondLast.length > 3
          ? secondLast.slice(0, -1)
          : secondLast;
      }
    }
    return '';
  }

  private calculateCommonPathLength(pathA: string, pathB: string): number {
    const segsA = pathA.split('/').filter(Boolean);
    const segsB = pathB.split('/').filter(Boolean);
    let common = 0;
    const minLen = Math.min(segsA.length, segsB.length);
    for (let i = 0; i < minLen; i++) {
      if (segsA[i].toLowerCase() === segsB[i].toLowerCase()) {
        common++;
      } else {
        break;
      }
    }
    return common;
  }
}
